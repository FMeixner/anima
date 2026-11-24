/* Woche abhaken: je Tag Morgens und Abends als Kreis. Antippen schaltet offen → erledigt → fällt aus → offen. */
import { SLOTS } from "../data";
import type { AppState, Slot } from "../types";
import { cycleSlot } from "../engine/actions";
import { WEEKDAYS, addDays, fmtDate } from "../engine/dates";
import { dayFor, resolveDay, dayMinutes, ctxOf } from "../engine/plan";
import { plannedSlots, slotSession, weekProgress, weekStart } from "../engine/week";

type Update = (fn: (s: AppState) => AppState) => void;
const LABEL: Record<Slot, string> = { morgens: "Morgens", abends: "Abends" };

export function WeekView({ state, update, today, week, onWeek }: { state: AppState; update: Update; today: string; week: number; onWeek: (w: number) => void }) {
  const mon = weekStart(state, week);
  const prog = weekProgress(state, week);
  const planned = new Set(plannedSlots(state, week).map((p) => `${p.date}|${p.slot}`));
  const ctx = ctxOf(state);

  return (
    <div className="stack gap-l">
      <div className="row between">
        <button className="btn quiet round" disabled={week <= 1} onClick={() => onWeek(week - 1)} aria-label="Vorige Woche">‹</button>
        <div className="center">
          <h2 className="serif hero">Woche {week}</h2>
          <p className="soft">{fmtDate(mon)} bis {fmtDate(addDays(mon, 6))}</p>
        </div>
        <button className="btn quiet round" onClick={() => onWeek(week + 1)} aria-label="Nächste Woche">›</button>
      </div>
      <div className="pane stack">
        <div className="row between"><span>{prog.done + prog.skipped} von {prog.planned}</span><span className="soft">{prog.minutes} Min geübt</span></div>
        <div className="thread"><i style={{ width: `${prog.planned ? ((prog.done + prog.skipped) / prog.planned) * 100 : 0}%` }} /></div>
        {prog.planned > 0 && prog.open === 0 && <span className="chip ok" style={{ alignSelf: "flex-start" }}>Woche geschafft</span>}
      </div>
      <div className="pane weekgrid">
        <span />{SLOTS.map((sl) => <span key={sl} className="soft small center">{LABEL[sl]}</span>)}
        {WEEKDAYS.map((d, i) => {
          const date = addDays(mon, i);
          return [
            <span key={d} className={`dayname ${date === today ? "today" : ""}`}>{d}<small>{fmtDate(date).slice(0, 5)}</small></span>,
            ...SLOTS.map((sl) => {
              const isPlanned = planned.has(`${date}|${sl}`);
              const cur = slotSession(state, date, sl);
              const day = dayFor(date, sl);
              const caption = day ? day.name.split(" ")[0] : "";
              const mins = day ? dayMinutes(resolveDay(day, ctx), state.settings) : 0;
              const cls = cur?.status === "done" ? "done" : cur?.status === "skipped" ? "skipped" : "";
              return (
                <button key={`${d}${sl}`} className={`pearl ${cls}`} disabled={!isPlanned || date > today}
                  onClick={() => update((s) => cycleSlot(s, date, sl, mins))}
                  aria-label={`${d} ${LABEL[sl]}, ${caption}: ${cur?.status === "done" ? "erledigt" : cur?.status === "skipped" ? "fällt aus" : "offen"}`}>
                  <i>{!isPlanned ? "" : cur?.status === "done" ? "✓" : cur?.status === "skipped" ? "–" : ""}</i>
                  <small>{caption}</small>
                </button>
              );
            }),
          ];
        })}
      </div>
      <p className="soft small center">Antippen: erledigt, fällt aus, offen. „Fällt aus“ zählt für die Woche als erledigt.</p>
    </div>
  );
}
