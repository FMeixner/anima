export type Slot = "morgens" | "abends";
export type ExKind = "core" | "extra";

export interface Exercise {
  id: string;
  name: string;
  kind: ExKind;
  /** broschuere = aus der Studienbroschüre, ergaenzung = eigene Ergänzung (mit Logopädie abstimmen) */
  source: "broschuere" | "ergaenzung";
  minutes: { default: number; min: number; max: number };
  position: string;
  steps: string[];
  unit: "Atemzüge" | "Sätze";
  handSwap: boolean;
  hands: string[];
  pacer: boolean;
  tip?: string;
}

export interface Phase {
  id: string;
  from: number;
  to: number | null;
  name: string;
  focus: string;
  core: string;
  extras: string[];
}

export interface Settings {
  /** Dauer einer Kerneinheit in Minuten (20–30) */
  minutes: number;
  /** Atemzüge je Block vor dem Handwechsel (5–10) */
  breaths: number;
  /** Einatmen und Ausatmen in Sekunden für den Taktgeber */
  inSec: number;
  outSec: number;
  pacer: boolean;
  tones: "off" | "block" | "breath";
  vibrate: boolean;
  /** Ab Woche 9: Einheiten pro Tag und Dauer, mit der Logopädie festlegen */
  maintenancePerDay: 1 | 2;
  maintenanceMinutes: number;
}

export interface Session {
  id: string;
  date: string;
  kind: ExKind;
  /** nur bei Kerneinheiten */
  slot?: Slot;
  exerciseId: string;
  /** tatsächlich geübte Minuten (0 bei „fällt aus“) */
  minutes: number;
  status: "done" | "skipped";
  manual?: boolean;
}

export interface WeekLog {
  week: number;
  skipped?: boolean;
  /** Tage mit Sodbrennen, PPI, Alginat (0–7) */
  heartburnDays?: number;
  ppiDays?: number;
  alginateDays?: number;
  /** Einzelwerte des RSI (9 × 0–5), nur in den RSI-Wochen */
  rsiItems?: number[];
  note?: string;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  /** Erster Übungstag. Woche 1 ist die Kalenderwoche (Mo–So), in die er fällt. */
  start: string | null;
  settings: Settings;
  sessions: Session[];
  logs: WeekLog[];
  theme?: "dark" | "light";
  autoBackup?: "off" | "session" | "week";
  lastBackup?: string;
}
