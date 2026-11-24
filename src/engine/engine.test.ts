import { describe, expect, it } from "vitest";
import { exerciseById } from "../data";
import { emptyState } from "../store";
import type { AppState, Session } from "../types";
import { addDays, mondayOf } from "./dates";
import { buildSteps, CLOSE_SECONDS, totalSeconds, locate } from "./session";
import { baselineDue, coreSession, phaseOf, plannedSlots, protocolDue, rsiTotal, slotsPerDay, weekDone, weekNo, weekProgress } from "./week";

// 2026-11-23 ist ein Montag
const MON = "2026-11-23";
const mk = (start = MON): AppState => ({ ...emptyState(), onboarded: true, start });
const sess = (date: string, slot: "morgens" | "abends", status: Session["status"] = "done", minutes = 25): Session =>
  ({ id: `${date}-${slot}`, date, kind: "core", slot, exerciseId: "bauchatmung-liegen", minutes, status });

describe("Programmwochen", () => {
  it("zählt Wochen ab dem Montag der Startwoche", () => {
    const s = mk("2026-11-25"); // Mittwoch
    expect(weekNo(s, "2026-11-22")).toBe(0);
    expect(weekNo(s, "2026-11-23")).toBe(1);
    expect(weekNo(s, "2026-11-29")).toBe(1);
    expect(weekNo(s, "2026-11-30")).toBe(2);
    expect(weekNo(s, addDays(MON, 7 * 8))).toBe(9);
  });
  it("ohne Start gibt es keine Woche", () => {
    expect(weekNo(emptyState(), MON)).toBe(0);
    expect(plannedSlots(emptyState(), 1)).toEqual([]);
  });
  it("Phasen nach Woche", () => {
    expect(phaseOf(1).id).toBe("technik");
    expect(phaseOf(2).id).toBe("technik");
    expect(phaseOf(3).id).toBe("festigen");
    expect(phaseOf(8).id).toBe("festigen");
    expect(phaseOf(9).id).toBe("erhaltung");
    expect(phaseOf(30).id).toBe("erhaltung");
  });
});

describe("Wochen-Abhaken", () => {
  it("volle Woche hat 14 Einheiten, Start am Mittwoch nur 10", () => {
    expect(plannedSlots(mk(), 1)).toHaveLength(14);
    expect(plannedSlots(mk("2026-11-25"), 1)).toHaveLength(10);
    expect(plannedSlots(mk("2026-11-25"), 2)).toHaveLength(14);
  });
  it("Woche ist erst geschafft, wenn alles erledigt oder ausgefallen ist", () => {
    const s = mk();
    const all = plannedSlots(s, 1);
    s.sessions = all.slice(0, 13).map((p) => sess(p.date, p.slot));
    expect(weekDone(s, 1)).toBe(false);
    expect(weekProgress(s, 1)).toMatchObject({ planned: 14, done: 13, open: 1 });
    s.sessions.push(sess(all[13].date, all[13].slot, "skipped", 0));
    expect(weekDone(s, 1)).toBe(true);
    expect(weekProgress(s, 1)).toMatchObject({ done: 13, skipped: 1, open: 0 });
  });
  it("Minuten summieren nur erledigte Einheiten", () => {
    const s = mk();
    s.sessions = [sess(MON, "morgens", "done", 20), sess(MON, "abends", "skipped", 0)];
    expect(weekProgress(s, 1).minutes).toBe(20);
    expect(coreSession(s, MON, "morgens")?.minutes).toBe(20);
  });
  it("Extras zählen nicht für die Woche", () => {
    const s = mk();
    s.sessions = [{ id: "x", date: MON, kind: "extra", exerciseId: "summen-ausatmung", minutes: 5, status: "done" }];
    expect(weekProgress(s, 1).done).toBe(0);
  });
  it("Erhaltung: eine Einheit pro Tag (abends) oder zwei nach Einstellung", () => {
    const s = mk();
    expect(slotsPerDay(s, 8)).toHaveLength(2);
    expect(slotsPerDay(s, 9)).toEqual(["abends"]);
    s.settings.maintenancePerDay = 2;
    expect(slotsPerDay(s, 9)).toHaveLength(2);
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
  it("Start-RSI fällig, bis Woche 0 eingetragen ist", () => {
    const s = mk();
    expect(baselineDue(s)).toBe(true);
    s.logs.push({ week: 0, skipped: true });
    expect(baselineDue(s)).toBe(false);
    expect(baselineDue(emptyState())).toBe(false);
  });
  it("RSI-Summe", () => {
    expect(rsiTotal(undefined)).toBeNull();
    expect(rsiTotal([1, 2, 3, 0, 0, 0, 0, 0, 5])).toBe(11);
  });
});

describe("Geführte Einheit", () => {
  const ex = exerciseById("bauchatmung-liegen");
  const cfg = { breaths: 8, inSec: 4, outSec: 6 };
  it("füllt die Zielzeit ungefähr und endet mit Ausklang", () => {
    for (const minutes of [20, 25, 30]) {
      const steps = buildSteps(ex, minutes, cfg);
      expect(Math.abs(totalSeconds(steps) - minutes * 60)).toBeLessThanOrEqual(60);
      expect(steps[steps.length - 1]).toMatchObject({ kind: "close", seconds: CLOSE_SECONDS });
    }
  });
  it("tauscht die Hände von Block zu Block und hat keine Rast am Ende", () => {
    const steps = buildSteps(ex, 25, cfg);
    const blocks = steps.filter((x) => x.kind === "breaths");
    expect(blocks[0].hint).toBe(ex.hands[0]);
    expect(blocks[1].hint).toBe(ex.hands[1]);
    expect(blocks[2].hint).toBe(ex.hands[0]);
    expect(steps[steps.length - 2].kind).toBe("breaths");
  });
  it("locate findet Schritt und Rest", () => {
    const steps = buildSteps(ex, 20, cfg);
    expect(locate(steps, 0)).toMatchObject({ index: 0, within: 0, finished: false });
    expect(locate(steps, steps[0].seconds + 1)).toMatchObject({ index: 1, within: 1 });
    expect(locate(steps, 99999).finished).toBe(true);
  });
  it("Voice-Übung ohne Handwechsel behält eine Handhaltung", () => {
    const steps = buildSteps(exerciseById("summen-ausatmung"), 5, cfg);
    expect(new Set(steps.filter((x) => x.kind === "breaths").map((x) => x.hint)).size).toBe(1);
  });
});

describe("Datumshelfer", () => {
  it("mondayOf", () => {
    expect(mondayOf("2026-11-29")).toBe(MON);
    expect(mondayOf(MON)).toBe(MON);
  });
});
