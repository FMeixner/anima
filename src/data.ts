/* Inhalte aus data/*.json, typisiert. Geprüft von scripts/validate.mjs. */
import atmung from "../data/exercises/atmung.json";
import program from "../data/program.json";
import rsi from "../data/rsi.json";
import references from "../data/references.json";
import type { Exercise, Phase, Slot } from "./types";

export const EXERCISES = atmung.exercises as Exercise[];
export const PHASES = program.phases as Phase[];
export const SLOTS = program.slots as Slot[];
export const RSI_WEEKS = program.rsiWeeks as number[];
export const RSI_ITEMS = rsi.items as string[];
export const RSI_MAX = rsi.scale.max;
export const REFERENCES = references.refs as { id: string; text: string; url: string }[];

export const exerciseById = (id: string): Exercise => {
  const e = EXERCISES.find((x) => x.id === id);
  if (!e) throw new Error(`Übung fehlt: ${id}`);
  return e;
};
