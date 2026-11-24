// Prüft alle Daten in /data. Läuft mit `npm run validate` und im Build.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

const { exercises } = read("exercises/atmung.json");
const program = read("program.json");
const rsi = read("rsi.json");
const refs = read("references.json").refs;

const ids = new Set();
for (const e of exercises) {
  const f = `exercises/${e.id}`;
  if (!e.id || ids.has(e.id)) err(f, "id fehlt oder doppelt");
  ids.add(e.id);
  if (!e.name || !e.position) err(f, "name und position nötig");
  if (!["core", "extra"].includes(e.kind)) err(f, "kind muss core oder extra sein");
  if (!["broschuere", "ergaenzung"].includes(e.source)) err(f, "source muss broschuere oder ergaenzung sein");
  if (!(e.minutes?.min <= e.minutes?.default && e.minutes?.default <= e.minutes?.max)) err(f, "minutes: min ≤ default ≤ max nötig");
  if (!Array.isArray(e.steps) || e.steps.length < 2) err(f, "mindestens zwei Schritte");
  if (!["Atemzüge", "Sätze"].includes(e.unit)) err(f, "unit muss Atemzüge oder Sätze sein");
  if (!e.hands?.length || (e.handSwap && e.hands.length < 2)) err(f, "hands: bei handSwap zwei Haltungen nötig");
}

let prevTo = 0;
for (const p of program.phases) {
  const f = `program/${p.id}`;
  if (p.from !== prevTo + 1) err(f, `Phase beginnt in Woche ${p.from}, erwartet ${prevTo + 1}`);
  prevTo = p.to ?? Infinity;
  if (!ids.has(p.core) || exercises.find((e) => e.id === p.core)?.kind !== "core") err(f, "core muss eine Kernübung sein");
  for (const x of p.extras) if (!ids.has(x) || exercises.find((e) => e.id === x)?.kind !== "extra") err(f, `extra ${x} unbekannt oder keine Zusatzübung`);
}
if (prevTo !== Infinity) err("program", "die letzte Phase braucht to: null");
if (rsi.items.length !== 9) err("rsi", "9 Fragen nötig");
for (const r of refs) if (!r.id || !r.text || !/^https:\/\//.test(r.url)) err(`references/${r.id}`, "id, text und https-url nötig");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Daten ok: ${exercises.length} Übungen, ${program.phases.length} Phasen.`);
