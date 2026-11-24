export type Slot = "morgens" | "abends";
export type Need = "gymball" | "wurfball" | "schlauch" | "platz" | "boden" | "laut";
export type Mode = "pacer" | "timer" | "reps" | "list" | "text";
export type Group = "koerper" | "atem" | "zwerchfell" | "stimme" | "sprechen";
export type ContextId = "zuhause" | "raum" | "unterwegs";

export interface TimedPhase { label: string; seconds: number }

export interface Exercise {
  id: string;
  name: string;
  group: Group;
  mode: Mode;
  /** eigen = aus deiner Schulung, broschuere = Studienbroschüre, recherche = von mir recherchiert */
  source: "eigen" | "broschuere" | "recherche";
  /** Was gebraucht wird: Geräte, Platz, Boden, Stimme (Geräusch) */
  needs: Need[];
  /** Richtwert in Minuten */
  minutes: number;
  /** Dauer kommt aus den Einstellungen (Kernübung) */
  scalable?: boolean;
  position: string;
  steps: string[];
  tip?: string;
  evidence?: string;
  refs?: string[];
  // pacer
  unit?: "Atemzüge";
  handSwap?: boolean;
  hands?: string[];
  inSec?: number;
  outSec?: number;
  // timer
  phases?: TimedPhase[];
  // reps
  reps?: number;
  repLabel?: string;
  repCue?: string;
  // list, text
  textKey?: "woerter" | "gedicht";
  emphasis?: "last";
}

export interface DayBlock { options: string[] }
export interface Day { id: string; name: string; tagline: string; blocks: DayBlock[] }
export interface Context { id: ContextId; name: string; sub: string; has: Need[] }

export interface Settings {
  /** Dauer der Kernübung in Minuten (20–30) */
  minutes: number;
  /** Atemzüge je Block vor dem Handwechsel (5–10) */
  breaths: number;
  /** Standardtakt für den Taktgeber, wenn die Übung keinen eigenen hat */
  inSec: number;
  outSec: number;
  pacer: boolean;
  tones: "off" | "block" | "breath";
  vibrate: boolean;
}

export interface Texts {
  /** Wortpaare für „Abspannen in Wörtern“, eines pro Eintrag; betont wird das letzte Wort */
  woerter: string[];
  gedicht: string;
}

export interface Session {
  id: string;
  date: string;
  /** plan = geplante Einheit im Wochenplan, free = freies Üben aus der Bibliothek */
  kind: "plan" | "free";
  slot?: Slot;
  dayId?: string;
  exerciseIds: string[];
  /** tatsächlich geübte Minuten (0 bei „fällt aus“) */
  minutes: number;
  status: "done" | "skipped";
  manual?: boolean;
}

export interface WeekLog {
  week: number;
  skipped?: boolean;
  heartburnDays?: number;
  ppiDays?: number;
  alginateDays?: number;
  rsiItems?: number[];
  note?: string;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  /** Erster Übungstag. Woche 1 ist die Kalenderwoche (Mo–So), in die er fällt. */
  start: string | null;
  context: ContextId;
  settings: Settings;
  texts: Texts;
  sessions: Session[];
  logs: WeekLog[];
  theme?: "dark" | "light";
  autoBackup?: "off" | "session" | "week";
  lastBackup?: string;
}
