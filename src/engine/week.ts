/* Programmwochen und Wochen-Abhaken. Übernommen aus Order: eine Woche (Mo–So) ist geschafft, sobald jede geplante
   Einheit erledigt oder ausgefallen ist („Fällt aus“ zählt als erledigt, nie als verpasst). */
import { PHASES, RSI_WEEKS, SLOTS } from "../data";
import type { AppState, Phase, Session, Slot, WeekLog } from "../types";
import { addDays, mondayOf, daysBetween } from "./dates";

/** Programmwoche zu einem Datum: 1 = Woche des ersten Übungstags, 0 = davor oder ohne Start */
export function weekNo(state: AppState, date: string): number {
  if (!state.start) return 0;
  const n = daysBetween(mondayOf(state.start), mondayOf(date)) / 7 + 1;
  return n >= 1 ? n : 0;
}
export const weekStart = (state: AppState, week: number): string => addDays(mondayOf(state.start ?? ""), (week - 1) * 7);

export const phaseOf = (week: number): Phase =>
  PHASES.find((p) => week >= p.from && (p.to === null || week <= p.to)) ?? PHASES[PHASES.length - 1];

/** Einheiten pro Tag: Wochen 1–8 zweimal; in der Erhaltung nach Einstellung (einmal = abends, vor dem Abendessen) */
export function slotsPerDay(state: AppState, week: number): Slot[] {
  if (phaseOf(week).id !== "erhaltung" || state.settings.maintenancePerDay === 2) return SLOTS;
  return ["abends"];
}

export interface Planned { date: string; slot: Slot }

/** Geplante Einheiten der Woche. Tage vor dem ersten Übungstag zählen nicht. */
export function plannedSlots(state: AppState, week: number): Planned[] {
  if (!state.start || week < 1) return [];
  const mon = weekStart(state, week);
  const out: Planned[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(mon, i);
    if (date < state.start) continue;
    for (const slot of slotsPerDay(state, week)) out.push({ date, slot });
  }
  return out;
}

export const coreSession = (state: AppState, date: string, slot: Slot): Session | undefined =>
  state.sessions.find((s) => s.kind === "core" && s.date === date && s.slot === slot);

export interface Progress { planned: number; done: number; skipped: number; open: number; minutes: number }

export function weekProgress(state: AppState, week: number): Progress {
  const plan = plannedSlots(state, week);
  let done = 0, skipped = 0, minutes = 0;
  for (const p of plan) {
    const s = coreSession(state, p.date, p.slot);
    if (s?.status === "done") { done++; minutes += s.minutes; }
    else if (s?.status === "skipped") skipped++;
  }
  return { planned: plan.length, done, skipped, open: plan.length - done - skipped, minutes };
}

export const weekDone = (state: AppState, week: number): boolean => {
  const p = weekProgress(state, week);
  return p.planned > 0 && p.open === 0;
};

export const weekOver = (state: AppState, week: number, today: string): boolean =>
  week >= 1 && !!state.start && today > addDays(weekStart(state, week), 6);

export const logOf = (state: AppState, week: number): WeekLog | undefined => state.logs.find((l) => l.week === week);
export const isRsiWeek = (week: number) => RSI_WEEKS.includes(week);

/** Wochenprotokoll fällig: Woche geschafft oder vorbei, noch nicht ausgefüllt */
export const protocolDue = (state: AppState, week: number, today: string): boolean =>
  week >= 1 && !logOf(state, week) && (weekDone(state, week) || weekOver(state, week, today));

/** Start-RSI (Woche 0): fällig, bis er eingetragen oder übersprungen ist */
export const baselineDue = (state: AppState): boolean => !!state.start && !logOf(state, 0);

export const rsiTotal = (items?: number[]): number | null =>
  items && items.length ? items.reduce((a, b) => a + b, 0) : null;

/** Extra-Übungen (Stimme, Alltag) einer Woche, nur zur Anzeige, zählen nicht für die Woche */
export const extrasOfWeek = (state: AppState, week: number): Session[] => {
  if (!state.start || week < 1) return [];
  const mon = weekStart(state, week), sun = addDays(mon, 6);
  return state.sessions.filter((s) => s.kind === "extra" && s.status === "done" && s.date >= mon && s.date <= sun);
};
