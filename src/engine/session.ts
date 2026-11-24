/* Ablauf einer geführten Einheit: Blöcke zu N Atemzügen mit Handwechsel, dazwischen normale Atemzüge. */
import type { Exercise, Settings } from "../types";

export interface Step {
  kind: "breaths" | "rest" | "close";
  label: string;
  hint?: string;
  count: number;
  /** Dauer eines Atemzugs in Sekunden (Taktgeber) */
  cycle: number;
  seconds: number;
}

/** Normale Atemzüge zwischen den Blöcken und die Dauer eines normalen Atemzugs (Sekunden) */
export const REST_BREATHS = 3;
export const REST_CYCLE = 5;
export const CLOSE_SECONDS = 30;

export function buildSteps(ex: Exercise, minutes: number, s: Pick<Settings, "breaths" | "inSec" | "outSec">): Step[] {
  const cycle = ex.pacer ? s.inSec + s.outSec : 8;
  const blockSec = s.breaths * cycle;
  const restSec = REST_BREATHS * REST_CYCLE;
  const total = minutes * 60 - CLOSE_SECONDS;
  const n = Math.max(1, Math.round((total + restSec) / (blockSec + restSec)));
  const steps: Step[] = [];
  for (let i = 0; i < n; i++) {
    const hint = ex.handSwap ? ex.hands[i % ex.hands.length] : ex.hands[0];
    steps.push({ kind: "breaths", label: `Block ${i + 1} von ${n}`, hint, count: s.breaths, cycle, seconds: blockSec });
    if (i < n - 1) steps.push({ kind: "rest", label: ex.handSwap ? "Hände tauschen, normal atmen" : "Normal atmen", count: REST_BREATHS, cycle: REST_CYCLE, seconds: restSec });
  }
  steps.push({ kind: "close", label: "Ausklang: normal atmen, dann langsam aufrichten", count: 0, cycle: REST_CYCLE, seconds: CLOSE_SECONDS });
  return steps;
}

export const totalSeconds = (steps: Step[]): number => steps.reduce((a, b) => a + b.seconds, 0);

/** Position im Ablauf nach `t` Sekunden */
export function locate(steps: Step[], t: number): { index: number; within: number; finished: boolean } {
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    if (t < acc + steps[i].seconds) return { index: i, within: t - acc, finished: false };
    acc += steps[i].seconds;
  }
  return { index: steps.length - 1, within: steps[steps.length - 1].seconds, finished: true };
}
