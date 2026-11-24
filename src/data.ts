/* Inhalte aus data/*.json, typisiert. Geprüft von scripts/validate.mjs. */
import koerper from "../data/exercises/koerper.json";
import atem from "../data/exercises/atem.json";
import zwerchfell from "../data/exercises/zwerchfell.json";
import stimme from "../data/exercises/stimme.json";
import sprechen from "../data/exercises/sprechen.json";
import days from "../data/days.json";
import contexts from "../data/contexts.json";
import program from "../data/program.json";
import rsi from "../data/rsi.json";
import references from "../data/references.json";
import type { Context, Day, Exercise, Group, Slot } from "./types";

const files: { exercises: unknown[] }[] = [koerper, atem, zwerchfell, stimme, sprechen];
export const EXERCISES = files.flatMap((f) => f.exercises) as Exercise[];
export const DAYS = days.days as Day[];
export const CONTEXTS = contexts.contexts as Context[];
export const SLOTS = program.slots as Slot[];
export const PLAN = program.plan as Record<Slot, string>[];
export const RSI_WEEKS = program.rsiWeeks as number[];
export const RSI_ITEMS = rsi.items as string[];
export const RSI_MAX = rsi.scale.max;
export const REFERENCES = references.refs as { id: string; text: string; url: string }[];

export const GROUPS: { id: Group; name: string }[] = [
  { id: "koerper", name: "Körper" }, { id: "atem", name: "Atem" }, { id: "zwerchfell", name: "Zwerchfell" },
  { id: "stimme", name: "Stimme" }, { id: "sprechen", name: "Sprechen" },
];

export const exerciseById = (id: string): Exercise => {
  const e = EXERCISES.find((x) => x.id === id);
  if (!e) throw new Error(`Übung fehlt: ${id}`);
  return e;
};
export const dayById = (id: string): Day => {
  const d = DAYS.find((x) => x.id === id);
  if (!d) throw new Error(`Trainingstag fehlt: ${id}`);
  return d;
};
export const contextById = (id: string): Context => CONTEXTS.find((c) => c.id === id) ?? CONTEXTS[0];
