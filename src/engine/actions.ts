/* Zustandsänderungen als reine Funktionen (testbar). */
import { uid } from "../store";
import type { AppState, Slot, WeekLog } from "../types";
import { coreSession, phaseOf } from "./week";

const CORE_ID = () => phaseOf(1).core;

/** Kerneinheit setzen (erledigt, fällt aus) oder entfernen (status = null) */
export function setCore(state: AppState, date: string, slot: Slot, status: "done" | "skipped" | null, minutes?: number, manual = false): AppState {
  const rest = state.sessions.filter((s) => s !== coreSession(state, date, slot));
  if (!status) return { ...state, sessions: rest };
  const m = status === "skipped" ? 0 : minutes ?? state.settings.minutes;
  return { ...state, sessions: [...rest, { id: uid("s"), date, kind: "core", slot, exerciseId: CORE_ID(), minutes: m, status, ...(manual ? { manual: true } : {}) }] };
}

/** Antippen im Wochenraster: offen → erledigt → fällt aus → offen */
export function cycleCore(state: AppState, date: string, slot: Slot): AppState {
  const cur = coreSession(state, date, slot);
  if (!cur) return setCore(state, date, slot, "done", undefined, true);
  if (cur.status === "done") return setCore(state, date, slot, "skipped");
  return setCore(state, date, slot, null);
}

export function addExtra(state: AppState, date: string, exerciseId: string, minutes: number): AppState {
  return { ...state, sessions: [...state.sessions, { id: uid("s"), date, kind: "extra", exerciseId, minutes, status: "done" }] };
}

/** Wochenprotokoll ändern (legt es bei Bedarf an) */
export function patchLog(state: AppState, week: number, patch: Partial<WeekLog>): AppState {
  const cur = state.logs.find((l) => l.week === week) ?? { week };
  const next: WeekLog = { ...cur, ...patch };
  for (const k of Object.keys(next) as (keyof WeekLog)[]) if (next[k] === undefined) delete next[k];
  return { ...state, logs: [...state.logs.filter((l) => l.week !== week), next].sort((a, b) => a.week - b.week) };
}
