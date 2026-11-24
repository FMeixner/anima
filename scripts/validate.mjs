// Prüft alle Daten in /data. Läuft mit `npm run validate` und im Build.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

const exercises = ["koerper", "atem", "zwerchfell", "stimme", "sprechen"].flatMap((f) => read(`exercises/${f}.json`).exercises);
const { days } = read("days.json");
const { contexts } = read("contexts.json");
const program = read("program.json");
const rsi = read("rsi.json");
const refs = read("references.json").refs;

const NEEDS = ["gymball", "wurfball", "schlauch", "platz", "boden", "laut"];
const MODES = ["pacer", "timer", "reps", "list", "text"];
const GROUPS = ["koerper", "atem", "zwerchfell", "stimme", "sprechen"];
const refIds = new Set(refs.map((r) => r.id));
const ids = new Set();
for (const e of exercises) {
  const f = `exercises/${e.id}`;
  if (!e.id || ids.has(e.id)) err(f, "id fehlt oder doppelt");
  ids.add(e.id);
  if (!e.name || !e.position) err(f, "name und position nötig");
  if (!GROUPS.includes(e.group)) err(f, "unbekannte group");
  if (!MODES.includes(e.mode)) err(f, "unbekannter mode");
  if (!["eigen", "broschuere", "recherche"].includes(e.source)) err(f, "source ungültig");
  if (!Array.isArray(e.needs) || e.needs.some((n) => !NEEDS.includes(n))) err(f, "needs ungültig");
  if (!(e.minutes > 0)) err(f, "minutes > 0 nötig");
  if (!Array.isArray(e.steps) || e.steps.length < 2) err(f, "mindestens zwei Schritte");
  for (const r of e.refs ?? []) if (!refIds.has(r)) err(f, `refs: ${r} fehlt in references.json`);
  if (e.mode === "pacer" && (!e.hands?.length || (e.handSwap && e.hands.length < 2))) err(f, "pacer: hands nötig, bei handSwap zwei");
  if (e.mode === "timer" && !(e.phases?.length && e.phases.every((p) => p.label && p.seconds > 0))) err(f, "timer: phases nötig");
  if (e.mode === "reps" && !(e.reps > 0 && e.repLabel && e.repCue)) err(f, "reps: reps, repLabel, repCue nötig");
  if ((e.mode === "list" || e.mode === "text") && !["woerter", "gedicht"].includes(e.textKey)) err(f, "list/text: textKey nötig");
}

const dayIds = new Set();
for (const d of days) {
  dayIds.add(d.id);
  if (!d.name || !d.tagline || !d.blocks?.length) err(`days/${d.id}`, "name, tagline, blocks nötig");
  for (const [i, b] of d.blocks.entries()) {
    if (!b.options?.length) err(`days/${d.id}[${i}]`, "options fehlen");
    for (const o of b.options) if (!ids.has(o)) err(`days/${d.id}[${i}]`, `Übung ${o} unbekannt`);
  }
}
// Jeder Tag muss an jedem Ort mindestens einen Baustein ermöglichen
for (const c of contexts) for (const d of days) {
  const ok = d.blocks.some((b) => b.options.some((o) => exercises.find((e) => e.id === o).needs.every((n) => c.has.includes(n))));
  if (!ok) err(`days/${d.id}`, `am Ort „${c.id}“ ist kein Baustein möglich`);
}
if (program.plan.length !== 7) err("program", "plan braucht 7 Tage (Mo–So)");
for (const [i, p] of program.plan.entries()) for (const s of program.slots) if (p[s] && !dayIds.has(p[s])) err(`program/plan[${i}]`, `Trainingstag ${p[s]} unbekannt`);
if (rsi.items.length !== 9) err("rsi", "9 Fragen nötig");
for (const r of refs) if (!r.id || !r.text || !/^https:\/\//.test(r.url)) err(`references/${r.id}`, "id, text und https-url nötig");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Daten ok: ${exercises.length} Übungen, ${days.length} Trainingstage, ${contexts.length} Orte.`);
