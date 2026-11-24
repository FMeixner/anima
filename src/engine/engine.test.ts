import { describe, expect, it } from "vitest";
import { CONTEXTS, DAYS, EXERCISES, contextById, dayById, exerciseById } from "../data";
import { emptyState, migrate } from "../store";
import type { AppState, Session } from "../types";
import { fromBackup, toMarkdown } from "./logbook";
import { cycleSlot, setSlot } from "./actions";
import { addDays, mondayOf } from "./dates";
import { blockMinutes, dayFor, resolveDay } from "./plan";
import { buildSteps, CLOSE_SECONDS, locate, totalSeconds } from "./session";
import { baselineDue, plannedSlots, protocolDue, rsiTotal, slotSession, weekDone, weekNo, weekProgress } from "./week";

// 2026-11-23 ist ein Montag
const MON = "2026-11-23";
const mk = (start = MON): AppState => ({ ...emptyState(), onboarded: true, start });
const sess = (date: string, slot: "morgens" | "abends", status: Session["status"] = "done", minutes = 25): Session =>
  ({ id: `${date}-${slot}`, date, kind: "plan", slot, exerciseIds: [], minutes, status });

describe("Programmwochen", () => {
  it("zählt Wochen ab dem Montag der Startwoche", () => {
    const s = mk("2026-11-25");
    expect(weekNo(s, "2026-11-22")).toBe(0);
    expect(weekNo(s, MON)).toBe(1);
    expect(weekNo(s, "2026-11-30")).toBe(2);
  });
  it("ohne Start gibt es keine Woche", () => {
    expect(weekNo(emptyState(), MON)).toBe(0);
    expect(plannedSlots(emptyState(), 1)).toEqual([]);
  });
});

describe("Wochen-Abhaken", () => {
  it("volle Woche hat 14 Einheiten, Start am Mittwoch nur 10", () => {
    expect(plannedSlots(mk(), 1)).toHaveLength(14);
    expect(plannedSlots(mk("2026-11-25"), 1)).toHaveLength(10);
  });
  it("Woche ist erst geschafft, wenn alles erledigt oder ausgefallen ist", () => {
    const s = mk();
    const all = plannedSlots(s, 1);
    s.sessions = all.slice(0, 13).map((p) => sess(p.date, p.slot));
    expect(weekDone(s, 1)).toBe(false);
    s.sessions.push(sess(all[13].date, all[13].slot, "skipped", 0));
    expect(weekDone(s, 1)).toBe(true);
    expect(weekProgress(s, 1)).toMatchObject({ done: 13, skipped: 1, open: 0 });
  });
  it("freies Üben zählt nicht für die Woche", () => {
    const s = mk();
    s.sessions = [{ id: "x", date: MON, kind: "free", exerciseIds: ["lippenflattern"], minutes: 2, status: "done" }];
    expect(weekProgress(s, 1).done).toBe(0);
  });
  it("Antippen schaltet erledigt → fällt aus → offen", () => {
    let s = mk();
    s = cycleSlot(s, MON, "morgens", 20);
    expect(slotSession(s, MON, "morgens")).toMatchObject({ status: "done", minutes: 20, manual: true });
    s = cycleSlot(s, MON, "morgens");
    expect(slotSession(s, MON, "morgens")).toMatchObject({ status: "skipped", minutes: 0 });
    s = cycleSlot(s, MON, "morgens");
    expect(slotSession(s, MON, "morgens")).toBeUndefined();
  });
  it("setSlot merkt den Trainingstag", () => {
    const s = setSlot(mk(), MON, "morgens", "done", 22, ["schuetteln"]);
    expect(slotSession(s, MON, "morgens")).toMatchObject({ dayId: "loesen", exerciseIds: ["schuetteln"], minutes: 22 });
  });
});

describe("Protokoll", () => {
  it("fällig, sobald die Woche geschafft oder vorbei ist", () => {
    const s = mk();
    expect(protocolDue(s, 1, MON)).toBe(false);
    expect(protocolDue(s, 1, addDays(MON, 7))).toBe(true);
    s.sessions = plannedSlots(s, 1).map((p) => sess(p.date, p.slot));
    expect(protocolDue(s, 1, MON)).toBe(true);
    s.logs.push({ week: 1 });
    expect(protocolDue(s, 1, addDays(MON, 7))).toBe(false);
  });
  it("Start-RSI und RSI-Summe", () => {
    const s = mk();
    expect(baselineDue(s)).toBe(true);
    s.logs.push({ week: 0, skipped: true });
    expect(baselineDue(s)).toBe(false);
    expect(rsiTotal([1, 2, 3, 0, 0, 0, 0, 0, 5])).toBe(11);
  });
});

describe("Trainingstage und Varianten", () => {
  const zuhause = contextById("zuhause"), raum = contextById("raum"), unterwegs = contextById("unterwegs");
  it("Wochenplan: Montag Lösen, Dienstag Klang, abends Kern", () => {
    expect(dayFor(MON, "morgens")?.id).toBe("loesen");
    expect(dayFor(addDays(MON, 1), "morgens")?.id).toBe("klang");
    expect(dayFor(MON, "abends")?.id).toBe("kern");
  });
  it("Zuhause: Ball und Schlauch werden gewählt", () => {
    const loesen = resolveDay(dayById("loesen"), zuhause).map((b) => b.chosen?.id);
    expect(loesen).toEqual(["schuetteln", "armschwingen", "wirbel-aufrichten", "ballatmung"]);
    const klang = resolveDay(dayById("klang"), zuhause).map((b) => b.chosen?.id);
    expect(klang[1]).toBe("blubberschlauch");
  });
  it("Raum ohne Geräte: Schlauch entfällt, Ersatz kommt", () => {
    const klang = resolveDay(dayById("klang"), raum).map((b) => b.chosen?.id);
    expect(klang[1]).toBe("summen-resonanz");
    const loesen = resolveDay(dayById("loesen"), raum).map((b) => b.chosen?.id);
    expect(loesen[3]).toBe("bauchatmung-sitzen");
  });
  it("Unterwegs leise: nur lautlose Übungen ohne Gerät", () => {
    for (const d of DAYS) for (const b of resolveDay(d, unterwegs)) if (b.chosen) expect(b.chosen.needs).toEqual([]);
  });
  it("Jeder Tag hat an jedem Ort mindestens einen Baustein", () => {
    for (const c of CONTEXTS) for (const d of DAYS) expect(resolveDay(d, c).some((b) => b.chosen)).toBe(true);
  });
  it("keine Übung kommt an einem Tag doppelt vor", () => {
    for (const c of CONTEXTS) for (const d of DAYS) {
      const ids = resolveDay(d, c).flatMap((b) => (b.chosen ? [b.chosen.id] : []));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("Wunschvariante wird übernommen, wenn sie möglich ist", () => {
    const r = resolveDay(dayById("kuppel"), zuhause, { 1: "abspannen-impuls" });
    expect(r[1].chosen?.id).toBe("abspannen-impuls");
    const r2 = resolveDay(dayById("kuppel"), unterwegs, { 1: "abspannen-hopp" });
    expect(r2[1].chosen?.id).toBe("abspannen-lautlos");
  });
  it("Kernübung nimmt die Dauer aus den Einstellungen", () => {
    expect(blockMinutes(exerciseById("bauchatmung-liegen"), { minutes: 22 })).toBe(22);
    expect(blockMinutes(exerciseById("schuetteln"), { minutes: 22 })).toBe(1);
  });
});

describe("Geführte Atem-Einheit", () => {
  const ex = exerciseById("bauchatmung-liegen");
  const cfg = { breaths: 8, inSec: 4, outSec: 6 };
  it("füllt die Zielzeit ungefähr und endet mit Ausklang", () => {
    for (const minutes of [20, 25, 30]) {
      const steps = buildSteps(ex, minutes, cfg);
      expect(Math.abs(totalSeconds(steps) - minutes * 60)).toBeLessThanOrEqual(60);
      expect(steps[steps.length - 1]).toMatchObject({ kind: "close", seconds: CLOSE_SECONDS });
    }
  });
  it("tauscht die Hände und nutzt den Takt der Übung", () => {
    const blocks = buildSteps(ex, 25, cfg).filter((x) => x.kind === "breaths");
    expect(blocks[0].hint).toBe(ex.hands?.[0]);
    expect(blocks[1].hint).toBe(ex.hands?.[1]);
    expect(buildSteps(exerciseById("resonanzatmung"), 5, cfg)[0].cycle).toBe(10);
    expect(buildSteps(exerciseById("lippenbremse"), 4, cfg)[0].cycle).toBe(9);
  });
  it("locate findet Schritt und Rest", () => {
    const steps = buildSteps(ex, 20, cfg);
    expect(locate(steps, steps[0].seconds + 1)).toMatchObject({ index: 1, within: 1 });
    expect(locate(steps, 99999).finished).toBe(true);
  });
});

describe("Bibliothek", () => {
  it("alle Übungen haben passende Felder zu ihrem Modus", () => {
    for (const e of EXERCISES) {
      if (e.mode === "timer") expect(e.phases?.length).toBeGreaterThan(0);
      if (e.mode === "reps") expect(e.reps).toBeGreaterThan(0);
      if (e.mode === "pacer") expect(e.hands?.length).toBeGreaterThan(0);
    }
  });
  it("Lippenflattern: erst ohne, dann mit Stimme; Blubberschlauch stimmlos, dann stimmhaft", () => {
    expect(exerciseById("lippenflattern").phases?.map((p) => p.label)).toEqual(["Ohne Stimme", "Mit Stimme"]);
    expect(exerciseById("blubberschlauch").phases?.map((p) => p.label)).toEqual(["Stimmlos", "Stimmhaft"]);
  });
});

describe("Migration", () => {
  it("hebt Stand 0.1 aufs neue Modell", () => {
    const old = { ...emptyState(), sessions: [{ id: "a", date: MON, kind: "core", slot: "abends", exerciseId: "bauchatmung-liegen", minutes: 25, status: "done" }] };
    const s = migrate(old);
    expect(s.sessions[0]).toMatchObject({ kind: "plan", exerciseIds: ["bauchatmung-liegen"] });
    expect(s.texts.woerter.length).toBeGreaterThan(2);
  });
  it("mondayOf", () => expect(mondayOf("2026-11-29")).toBe(MON));
});

describe("Logbuch", () => {
  it("schreibt Markdown und stellt den Zustand daraus wieder her", () => {
    let s: AppState = { ...emptyState(), onboarded: true, start: "2026-11-24" };
    s = setSlot(s, "2026-11-24", "morgens", "done", 10, ["lippenflattern"], false);
    s = { ...s, texts: { ...s.texts, gedicht: "Zeile `eins`\n```\nZeile zwei" }, logs: [{ week: 0, rsiItems: [1, 2], note: "Start" }] };
    const md = toMarkdown(s, "2026-11-24");
    expect(md).toContain("# Anima – Übungslogbuch");
    expect(md).toContain("Lippenflattern");
    expect(md).toContain("RSI 3");
    expect(fromBackup(md)).toEqual(s);
  });
  it("liest auch reines JSON und lehnt Fremdes ab", () => {
    const s = emptyState();
    expect(fromBackup(JSON.stringify(s))).toEqual(s);
    expect(fromBackup("# nur Text")).toBeNull();
  });
});
