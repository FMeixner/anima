/* Trainingstage und Varianten: Jeder Tag besteht aus Bausteinen, jeder Baustein hat Varianten in Reihenfolge der Vorliebe.
   Der Ort („Zuhause“, „Raum“, „Unterwegs“) bestimmt, welche Varianten möglich sind. */
import { PLAN, contextById, dayById, exerciseById } from "../data";
import type { AppState, Context, Day, Exercise, Settings, Slot } from "../types";
import { dowIndex } from "./dates";

export const possible = (ex: Exercise, ctx: Context): boolean => ex.needs.every((n) => ctx.has.includes(n));

/** Trainingstag für ein Datum und eine Einheit (morgens/abends) */
export function dayFor(date: string, slot: Slot): Day | undefined {
  const id = PLAN[dowIndex(date)]?.[slot];
  return id ? dayById(id) : undefined;
}

export interface ResolvedBlock {
  /** Varianten, die am gewählten Ort möglich sind und nicht schon früher im Tag vorkommen */
  options: Exercise[];
  /** gewählte Variante, null wenn am Ort nichts möglich ist */
  chosen: Exercise | null;
  /** Varianten, die hier nicht gehen (für den Hinweis „entfällt“) */
  blocked: Exercise[];
}

/** picks: Baustein-Index → Übungs-ID (Wunsch des Nutzers) */
export function resolveDay(day: Day, ctx: Context, picks: Record<number, string> = {}): ResolvedBlock[] {
  const used = new Set<string>();
  return day.blocks.map((b, i) => {
    const all = b.options.map(exerciseById);
    const options = all.filter((e) => possible(e, ctx) && !used.has(e.id));
    const wanted = picks[i] ? options.find((e) => e.id === picks[i]) : undefined;
    const chosen = wanted ?? options[0] ?? null;
    if (chosen) used.add(chosen.id);
    return { options, chosen, blocked: all.filter((e) => !possible(e, ctx)) };
  });
}

export const blockMinutes = (ex: Exercise, s: Pick<Settings, "minutes">): number => (ex.scalable ? s.minutes : ex.minutes);

export const dayMinutes = (blocks: ResolvedBlock[], s: Pick<Settings, "minutes">): number =>
  blocks.reduce((a, b) => a + (b.chosen ? blockMinutes(b.chosen, s) : 0), 0);

export const ctxOf = (state: AppState): Context => contextById(state.context);
