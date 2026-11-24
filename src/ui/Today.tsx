import { useState } from "react";
import { setSlot } from "../engine/actions";
import { fmtDate } from "../engine/dates";
import { blockMinutes, ctxOf, dayFor, dayMinutes, resolveDay } from "../engine/plan";
import { baselineDue, plannedSlots, protocolDue, slotSession, slotsOfDate, weekProgress } from "../engine/week";
import type { AppState, Slot } from "../types";
import { ContextPicker, Fold, WeekOrb, type Dot } from "./common";
import type { Launch } from "./SessionRunner";

type Update = (fn: (s: AppState) => AppState) => void;
const LABEL: Record<Slot, string> = { morgens: "Morgens", abends: "Abends" };

export function Today({ state, update, today, week, onStart, onProtocol }: {
  state: AppState; update: Update; today: string; week: number; onStart: (l: Launch) => void; onProtocol: (w: number) => void;
}) {
  const [picks, setPicks] = useState<Record<string, Record<number, string>>>({});
  const ctx = ctxOf(state);
  const due = baselineDue(state) ? 0 : (() => { for (let w = 1; w <= week; w++) if (protocolDue(state, w, today)) return w; return -1; })();
  const banner = due >= 0 && (
    <button className="pane nudge" onClick={() => onProtocol(due)}>
      {due === 0 ? "Start-RSI und Ausgangswerte eintragen" : `Wochenprotokoll für Woche ${due} ausfüllen`}
    </button>
  );

  if (week < 1) {
    return <div className="stack">{banner}<div className="pane"><h2 className="serif">Start am {state.start ? fmtDate(state.start) : "–"}</h2><p className="soft">Bis dahin kannst du den Start-RSI eintragen und in der Bibliothek schon üben.</p></div></div>;
  }

  const prog = weekProgress(state, week);
  const dots: Dot[] = plannedSlots(state, week).map((p) => {
    const s = slotSession(state, p.date, p.slot);
    return { status: s?.status ?? "open", today: p.date === today };
  });

  return (
    <div className="stack gap-l">
      <WeekOrb dots={dots} title={`Woche ${week}`} sub={`${prog.done + prog.skipped} von ${prog.planned}`} />
      {banner}
      <div className="stack"><p className="soft center">Wo übst du heute?</p><ContextPicker state={state} update={update} /></div>

      {slotsOfDate(today).map((slot) => {
        const day = dayFor(today, slot);
        if (!day) return null;
        const key = `${today}|${slot}`;
        const blocks = resolveDay(day, ctx, picks[key]);
        const chosen = blocks.flatMap((b) => (b.chosen ? [b.chosen] : []));
        const minutes = dayMinutes(blocks, state.settings);
        const cur = slotSession(state, today, slot);
        const blocked = blocks.filter((b) => !b.chosen).flatMap((b) => b.blocked.slice(0, 1));
        return (
          <section key={slot} className="pane stack">
            <div className="row between">
              <span className="soft">{LABEL[slot]}</span>
              {cur?.status === "done" && <span className="chip ok">erledigt, {cur.minutes} Min</span>}
              {cur?.status === "skipped" && <span className="chip">fällt aus</span>}
            </div>
            <div><h2 className="serif">{day.name}</h2><p className="soft">{day.tagline}</p></div>
            <ul className="blocks">
              {blocks.map((b, i) => b.chosen && (
                <li key={i}>
                  <span className="grow">{b.chosen.name}<span className="soft small"> {blockMinutes(b.chosen, state.settings)} Min</span></span>
                  {b.options.length > 1 && (
                    <button className="chip action" onClick={() => {
                      const at = b.options.findIndex((o) => o.id === b.chosen?.id);
                      const nxt = b.options[(at + 1) % b.options.length].id;
                      setPicks({ ...picks, [key]: { ...picks[key], [i]: nxt } });
                    }} aria-label={`Variante wechseln: ${b.chosen.name}`}>Variante</button>
                  )}
                </li>
              ))}
            </ul>
            {blocked.length > 0 && <p className="soft small">Entfällt hier: {blocked.map((e) => e.name).join(", ")}</p>}
            {cur ? (
              <button className="btn quiet" style={{ alignSelf: "flex-start" }} onClick={() => update((s) => setSlot(s, today, slot, null))}>Rückgängig</button>
            ) : (
              <div className="row wrap">
                <button className="btn primary grow tall" disabled={!chosen.length} onClick={() => onStart({ title: day.name, date: today, slot, dayId: day.id, blocks: chosen })}>Starten, {minutes} Min</button>
                <button className="btn quiet" onClick={() => update((s) => setSlot(s, today, slot, "done", minutes, chosen.map((e) => e.id), true))}>Abhaken</button>
                <button className="btn quiet" onClick={() => update((s) => setSlot(s, today, slot, "skipped"))}>Fällt aus</button>
              </div>
            )}
          </section>
        );
      })}
      <Fold title="Zum Üben">
        <p className="soft small">Zeitpunkt: möglichst immer zur gleichen Uhrzeit, den Kern am besten vor dem Abendessen oder frühestens 1 Stunde danach. Üben im entspannten Zustand.</p>
      </Fold>
    </div>
  );
}
