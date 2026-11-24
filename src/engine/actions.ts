/* Zustandsänderungen als reine Funktionen (testbar). */
import { uid } from "../store";
import type { AppState, Slot, WeekLog } from "../types";
import { dayFor } from "./plan";
import { slotSession } from "./week";

/** Einheit setzen (erledigt, fällt aus) oder entfernen (status = null) */
export function setSlot(state: AppState, date: string, slot: Slot, status: "done" | "skipped" | null, minutes = 0, exerciseIds: string[] = [], manual = false): AppState {
  const rest = state.sessions.filter((s) => s !== slotSession(state, date, slot));
  if (!status) return { ...state, sessions: rest };
  const dayId = dayFor(date, slot)?.id;
  return { ...state, sessions: [...rest, { id: uid("s"), date, kind: "plan", slot, dayId, exerciseIds: status === "skipped" ? [] : exerciseIds, minutes: status === "skipped" ? 0 : minutes, status, ...(manual ? { manual: true } : {}) }] };
}

/** Antippen im Wochenraster: offen → erledigt → fällt aus → offen */
export function cycleSlot(state: AppState, date: string, slot: Slot, plannedMinutes = 0): AppState {
  const cur = slotSession(state, date, slot);
  if (!cur) return setSlot(state, date, slot, "done", plannedMinutes, [], true);
  if (cur.status === "done") return setSlot(state, date, slot, "skipped");
  return setSlot(state, date, slot, null);
}

export function addFree(state: AppState, date: string, exerciseIds: string[], minutes: number): AppState {
  return { ...state, sessions: [...state.sessions, { id: uid("s"), date, kind: "free", exerciseIds, minutes, status: "done" }] };
}

/** Wochenprotokoll ändern (legt es bei Bedarf an) */
export function patchLog(state: AppState, week: number, patch: Partial<WeekLog>): AppState {
  const cur = state.logs.find((l) => l.week === week) ?? { week };
  const next: WeekLog = { ...cur, ...patch };
  for (const k of Object.keys(next) as (keyof WeekLog)[]) if (next[k] === undefined) delete next[k];
  return { ...state, logs: [...state.logs.filter((l) => l.week !== week), next].sort((a, b) => a.week - b.week) };
}
