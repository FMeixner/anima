/* Bibliothek: alle Übungen, nach Bereich geordnet. Jede lässt sich einzeln üben, wenn der Ort es zulässt. */
import { EXERCISES, GROUPS, REFERENCES } from "../data";
import { ctxOf, possible } from "../engine/plan";
import type { AppState, Exercise } from "../types";
import { ContextPicker } from "./common";
import type { Launch } from "./SessionRunner";

type Update = (fn: (s: AppState) => AppState) => void;
const NEED: Record<string, string> = { gymball: "Gymnastikball", wurfball: "Ball", schlauch: "Schlauch", platz: "Platz", boden: "Boden", laut: "Stimme" };
const SRC: Record<Exercise["source"], string> = { eigen: "aus deiner Schulung", broschuere: "aus der Studienbroschüre", recherche: "recherchiert" };

export function Library({ state, update, today, onStart }: { state: AppState; update: Update; today: string; onStart: (l: Launch) => void }) {
  const ctx = ctxOf(state);
  return (
    <div className="stack gap-l">
      <div><h2 className="serif hero">Bibliothek</h2><p className="soft">Jede Übung einzeln, wenn du zwischendurch üben willst.</p></div>
      <ContextPicker state={state} update={update} />
      {GROUPS.map((g) => (
        <section key={g.id} className="stack">
          <h3 className="serif soft">{g.name}</h3>
          {EXERCISES.filter((e) => e.group === g.id).map((e) => {
            const ok = possible(e, ctx);
            const refs = (e.refs ?? []).map((id) => REFERENCES.find((r) => r.id === id)).filter(Boolean);
            return (
              <details key={e.id} className={`pane fold ${ok ? "" : "dim"}`}>
                <summary><span>{e.name}</span><span className="soft small"> {e.scalable ? state.settings.minutes : e.minutes} Min{e.needs.length ? `, ${e.needs.map((n) => NEED[n]).join(", ")}` : ", ohne alles"}</span></summary>
                <div className="stack" style={{ marginTop: 12 }}>
                  <p>{e.position}</p>
                  <ol className="steps">{e.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                  {e.tip && <p className="soft">{e.tip}</p>}
                  <p className="soft small">{SRC[e.source]}{e.evidence ? `. ${e.evidence}` : ""}</p>
                  {refs.map((r) => r && <p key={r.id} className="small"><a href={r.url} target="_blank" rel="noreferrer">{r.text}</a></p>)}
                  <button className="btn primary" disabled={!ok} onClick={() => onStart({ title: "Freies Üben", date: today, blocks: [e] })}>{ok ? "Üben" : "Hier nicht möglich"}</button>
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}
