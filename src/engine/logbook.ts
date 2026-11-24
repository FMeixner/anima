/* Übungslogbuch als Markdown. Oben lesbar (Wochen, Einheiten, Protokolle), unten ein Datenblock,
   aus dem sich der ganze Zustand wiederherstellen lässt. Die Datei ist also Sicherung und Logbuch in einem. */
import { dayById, exerciseById } from "../data";
import type { AppState, Session } from "../types";
import { addDays } from "./dates";
import { rsiTotal, weekNo, weekProgress, weekStart } from "./week";

const FENCE = "anima-daten";
const BLOCK = new RegExp("```json " + FENCE + "\\r?\\n([\\s\\S]*?)\\r?\\n```");

const safe = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };
const de = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

function sessionLine(s: Session): string {
  const day = s.dayId ? safe(() => dayById(s.dayId!).name, s.dayId) : "Freies Üben";
  const names = s.exerciseIds.map((id) => safe(() => exerciseById(id).name, id)).join(", ");
  const slot = s.slot ?? "frei";
  const status = s.status === "done" ? `${s.minutes} Min` : "fällt aus";
  return `- ${de(s.date)} ${slot} · ${day} · ${status}${names && s.status === "done" ? ` — ${names}` : ""}`;
}

export function toMarkdown(state: AppState, today: string): string {
  const out: string[] = ["# Anima – Übungslogbuch", ""];
  const doneAll = state.sessions.filter((s) => s.status === "done");
  const minutes = doneAll.reduce((a, s) => a + s.minutes, 0);
  out.push(`Stand: ${de(today)} · Start: ${state.start ? de(state.start) : "offen"} · ${doneAll.length} Einheiten, ${minutes} Min insgesamt`, "");

  if (state.start) {
    const now = Math.max(weekNo(state, today), 1);
    out.push("## Wochen", "", "| Woche | von – bis | erledigt | ausgefallen | Min |", "|---|---|---|---|---|");
    for (let w = now; w >= 1; w--) {
      const p = weekProgress(state, w), mon = weekStart(state, w);
      out.push(`| ${w} | ${de(mon).slice(0, 5)}–${de(addDays(mon, 6)).slice(0, 5)} | ${p.done} von ${p.planned} | ${p.skipped} | ${p.minutes} |`);
    }
    out.push("");
  }

  const sessions = [...state.sessions].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  out.push("## Einheiten", "", ...(sessions.length ? sessions.map(sessionLine) : ["Noch keine."]), "");

  const logs = [...state.logs].sort((a, b) => b.week - a.week);
  if (logs.length) {
    out.push("## Wochenprotokolle", "");
    for (const l of logs) {
      const parts: string[] = [];
      if (l.skipped) parts.push("übersprungen");
      if (l.heartburnDays != null) parts.push(`Sodbrennen ${l.heartburnDays} Tage`);
      if (l.ppiDays != null) parts.push(`PPI ${l.ppiDays} Tage`);
      if (l.alginateDays != null) parts.push(`Alginat ${l.alginateDays} Tage`);
      const t = rsiTotal(l.rsiItems);
      if (t != null) parts.push(`RSI ${t}`);
      if (l.note) parts.push(`Notiz: ${l.note}`);
      out.push(`- ${l.week === 0 ? "Start" : `Woche ${l.week}`}: ${parts.join(" · ") || "leer"}`);
    }
    out.push("");
  }

  const data = JSON.stringify(state, null, 1).replace(/`/g, "\\u0060");
  out.push("## Daten", "", "Dieser Block stellt die App wieder her (Einstellungen → Logbuch laden). Bitte nicht ändern.", "", "```json " + FENCE, data, "```", "");
  return out.join("\n");
}

/** Liest einen Zustand aus einem Logbuch (.md) oder aus reinem JSON. Gibt null zurück, wenn nichts passt. */
export function fromBackup(text: string): unknown | null {
  try {
    const m = BLOCK.exec(text);
    const raw = JSON.parse(m ? m[1] : text);
    return raw && typeof raw === "object" && (raw as { version?: number }).version === 1 ? raw : null;
  } catch { return null; }
}
