/* Woche abhaken: je Tag Morgens und Abends. Antippen schaltet offen → erledigt → fällt aus → offen. */
import { SLOTS } from "../data";
import type { AppState, Slot } from "../types";
import { cycleCore } from "../engine/actions";
import { WEEKDAYS, addDays, fmtDate } from "../engine/dates";
import { coreSession, phaseOf, plannedSlots, slotsPerDay, weekProgress, weekStart } from "../engine/week";
import { Progress } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;
const LABEL: Record<Slot, string> = { morgens: "Morgens", abends: "Abends" };

export function WeekView({ state, update, today, week, onWeek }: { state: AppState; update: Update; today: string; week: number; onWeek: (w: number) => void }) {
  const mon = weekStart(state, week);
  const prog = weekProgress(state, week);
  const phase = phaseOf(week);
  const planned = new Set(plannedSlots(state, week).map((p) => `${p.date}|${p.slot}`));
  const slots = slotsPerDay(state, week);

  return (
    <div className="stack">
      <div className="row between">
        <button className="btn small" disabled={week <= 1} onClick={() => onWeek(week - 1)} aria-label="Vorige Woche">‹</button>
        <div className="center">
          <h2>Woche {week}</h2>
          <div className="muted small">{fmtDate(mon)}–{fmtDate(addDays(mon, 6))} · {phase.name}</div>
        </div>
        <button className="btn small" onClick={() => onWeek(week + 1)} aria-label="Nächste Woche">›</button>
      </div>
      <div className="card stack">
        <div className="row between"><strong>{prog.done + prog.skipped} von {prog.planned}</strong><span className="muted small">{prog.minutes} Min geübt</span></div>
        <Progress {...prog} />
        {prog.planned > 0 && prog.open === 0 && <div className="chip ok" style={{ alignSelf: "flex-start" }}>Woche geschafft</div>}
      </div>
      <div className="card">
        <div className="wk" style={{ marginBottom: 6 }}>
          <span />{SLOTS.map((sl) => <span key={sl} className="wk-head">{LABEL[sl]}</span>)}
        </div>
        <div className="wk">
          {WEEKDAYS.map((d, i) => {
            const date = addDays(mon, i);
            return [
              <span key={d} className={`day ${date === today ? "today" : ""}`}>{d}<div className="muted small" style={{ fontWeight: 400 }}>{fmtDate(date).slice(0, 5)}</div></span>,
              ...SLOTS.map((sl) => {
                const isPlanned = planned.has(`${date}|${sl}`) && slots.includes(sl);
                const cur = coreSession(state, date, sl);
                const cls = cur?.status === "done" ? "done" : cur?.status === "skipped" ? "skipped" : "";
                return (
                  <button key={`${d}${sl}`} className={`cell ${cls}`} disabled={!isPlanned || date > today} onClick={() => update((s) => cycleCore(s, date, sl))}
                    aria-label={`${d} ${LABEL[sl]}: ${cur?.status === "done" ? "erledigt" : cur?.status === "skipped" ? "fällt aus" : "offen"}`}>
                    {!isPlanned ? "–" : cur?.status === "done" ? "✓" : cur?.status === "skipped" ? "fällt aus" : ""}
                  </button>
                );
              }),
            ];
          })}
        </div>
      </div>
      <p className="muted small">Antippen: erledigt → fällt aus → offen. „Fällt aus“ zählt für die Woche als erledigt, nie als verpasst. Künftige Tage sind gesperrt.</p>
    </div>
  );
}
