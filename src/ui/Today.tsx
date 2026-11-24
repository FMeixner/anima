import { exerciseById } from "../data";
import type { AppState, Exercise, Slot } from "../types";
import { setCore } from "../engine/actions";
import { fmtDate } from "../engine/dates";
import { baselineDue, coreSession, extrasOfWeek, phaseOf, protocolDue, slotsPerDay, weekProgress } from "../engine/week";
import { Collapse, DISCLAIMER, Progress, SAFETY } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;
export interface Launch { ex: Exercise; date: string; slot?: Slot; minutes: number }
const LABEL: Record<Slot, string> = { morgens: "Morgens", abends: "Abends" };

export function Today({ state, update, today, week, onStart, onProtocol }: {
  state: AppState; update: Update; today: string; week: number; onStart: (l: Launch) => void; onProtocol: (w: number) => void;
}) {
  const due = baselineDue(state) ? 0 : (() => { for (let w = 1; w <= week; w++) if (protocolDue(state, w, today)) return w; return -1; })();
  const banner = due >= 0 && (
    <button className="note warn" style={{ textAlign: "left", cursor: "pointer", border: 0 }} onClick={() => onProtocol(due)}>
      {due === 0 ? "Start-RSI und Ausgangswerte eintragen →" : `Wochenprotokoll für Woche ${due} ausfüllen →`}
    </button>
  );

  if (week < 1) {
    return (
      <div className="stack">
        {banner}
        <div className="card"><h2>Start am {state.start ? fmtDate(state.start) : "–"}</h2><p className="muted">Bis dahin kannst du den Start-RSI eintragen.</p></div>
      </div>
    );
  }

  const phase = phaseOf(week);
  const prog = weekProgress(state, week);
  const core = exerciseById(phase.core);
  const minutes = phase.id === "erhaltung" ? state.settings.maintenanceMinutes : state.settings.minutes;
  const extras = phase.extras.map(exerciseById);
  const weekExtras = extrasOfWeek(state, week);

  return (
    <div className="stack">
      {banner}
      <div className="card stack">
        <div className="row between"><h2>Woche {week} · {phase.name}</h2><span className="muted small">{prog.done + prog.skipped} von {prog.planned}</span></div>
        <Progress {...prog} />
        <p className="muted small">{phase.focus}</p>
        {prog.planned > 0 && prog.open === 0 && <span className="chip ok" style={{ alignSelf: "flex-start" }}>Woche geschafft</span>}
      </div>

      {slotsPerDay(state, week).map((slot) => {
        const cur = coreSession(state, today, slot);
        return (
          <div key={slot} className="card stack">
            <div className="row between">
              <h3>{LABEL[slot]}</h3>
              {cur?.status === "done" && <span className="chip ok">erledigt · {cur.minutes} Min</span>}
              {cur?.status === "skipped" && <span className="chip">fällt aus</span>}
            </div>
            <p className="muted small">{core.name}, {minutes} Min</p>
            {cur ? (
              <button className="btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => update((s) => setCore(s, today, slot, null))}>Rückgängig</button>
            ) : (
              <div className="row wrap">
                <button className="btn primary grow" onClick={() => onStart({ ex: core, date: today, slot, minutes })}>Starten</button>
                <button className="btn small" onClick={() => update((s) => setCore(s, today, slot, "done", minutes, true))}>Abhaken</button>
                <button className="btn small ghost" onClick={() => update((s) => setCore(s, today, slot, "skipped"))}>Fällt aus</button>
              </div>
            )}
          </div>
        );
      })}

      {extras.length > 0 && (
        <Collapse title="Stimme und Alltag" meta={weekExtras.length ? `${weekExtras.length}× diese Woche` : "optional"}>
          <p className="muted small">Zählt nicht für die Woche. Ergänzungen zur Broschüre: vor dem Einsatz mit der Logopädie abstimmen.</p>
          {extras.map((ex) => (
            <div key={ex.id} className="row between">
              <div className="grow"><strong>{ex.name}</strong><div className="muted small">{ex.minutes.default} Min</div></div>
              <button className="btn small" onClick={() => onStart({ ex, date: today, minutes: ex.minutes.default })}>Starten</button>
            </div>
          ))}
        </Collapse>
      )}

      <Collapse title="Hinweise">
        <p className="small">{SAFETY}</p>
        <p className="muted small">Zeitpunkt: möglichst immer zur gleichen Uhrzeit, am besten vor dem Abendessen oder frühestens 1 Stunde danach. Üben nur im entspannten Zustand.</p>
        <p className="muted small">{DISCLAIMER}</p>
      </Collapse>
    </div>
  );
}
