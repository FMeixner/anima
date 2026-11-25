/* Wochenprotokoll: oben die Wochen als Liste (Start = Ausgangswert vor dem Training), darunter das Formular der gewählten Woche.
   Eingaben sind ein Entwurf und werden erst mit „Speichern“ übernommen; das löst auch die Logbuch-Sicherung aus. */
import { useState } from "react";
import { RSI_ITEMS, RSI_MAX } from "../data";
import type { AppState, WeekLog } from "../types";
import { patchLog } from "../engine/actions";
import { addDays, fmtDate } from "../engine/dates";
import { baselineDue, isRsiWeek, logOf, protocolDue, rsiTotal, weekProgress, weekStart } from "../engine/week";

type Update = (fn: (s: AppState) => AppState) => void;
const num = (v: string): number | undefined => (v === "" ? undefined : Math.max(0, Math.min(7, Math.round(Number(v)))));
const span = (state: AppState, w: number) => { const m = weekStart(state, w); return `${fmtDate(m).slice(0, 5)} bis ${fmtDate(addDays(m, 6)).slice(0, 5)}`; };

export function Protocol({ state, update, today, week, selected, onSelect }: {
  state: AppState; update: Update; today: string; week: number; selected: number; onSelect: (w: number) => void;
}) {
  const weeks = Array.from({ length: Math.max(week, 0) + 1 }, (_, i) => i).reverse();
  return (
    <div className="stack">
      <h2 className="serif hero">Protokoll</h2>
      <div className="pane">
        <ul className="blocks">
          {weeks.map((w) => {
            const l = logOf(state, w);
            const p = w >= 1 ? weekProgress(state, w) : null;
            const due = w === 0 ? baselineDue(state) : protocolDue(state, w, today);
            const facts: string[] = [];
            if (p) facts.push(`${p.done} von ${p.planned} Einheiten`);
            if (l?.skipped) facts.push("übersprungen");
            if (l?.heartburnDays != null) facts.push(`Sodbrennen an ${l.heartburnDays} Tagen`);
            const t = rsiTotal(l?.rsiItems);
            if (t != null) facts.push(`RSI ${t}`);
            return (
              <li key={w} className={`weekrow ${w === selected ? "on" : ""}`} onClick={() => onSelect(w)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(w)}>
                <div className="grow">
                  <strong className="serif">{w === 0 ? "Start" : `Woche ${w}`}</strong>
                  <span className="soft small"> {w === 0 ? "Ausgangswert vor dem Training" : span(state, w)}</span>
                  <div className="soft small">{facts.join(" · ") || "noch nichts eingetragen"}</div>
                </div>
                {due && <span className="chip ok">fällig</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <WeekForm key={selected} state={state} update={update} selected={selected} />
      <p className="soft small">RSI: eigene deutsche Formulierung nach Belafsky et al. (2002), keine validierte Fassung. Nur zum Verlauf bei Dir.</p>
    </div>
  );
}

/** Formular einer Woche; per key je Woche neu, damit der Entwurf beim Wechsel frisch startet. */
function WeekForm({ state, update, selected }: { state: AppState; update: Update; selected: number }) {
  const saved = logOf(state, selected);
  const [draft, setDraft] = useState<WeekLog>(saved ?? { week: selected });
  const [ok, setOk] = useState(false);

  const patch = (p: Partial<WeekLog>) => { setDraft((d) => ({ ...d, ...p })); setOk(false); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? { week: selected });
  const save = () => { const { week: _w, ...rest } = draft; void _w; update((s) => patchLog(s, selected, rest)); setOk(true); };

  const prog = selected >= 1 ? weekProgress(state, selected) : null;
  const rsi = isRsiWeek(selected);
  const items = draft.rsiItems ?? Array(RSI_ITEMS.length).fill(0);
  const setItem = (i: number, v: number) => patch({ rsiItems: items.map((x, j) => (j === i ? v : x)) });
  const total = rsiTotal(draft.rsiItems);

  return (
    <div className="pane stack">
      <div className="row between"><h3 className="serif">{selected === 0 ? "Start" : `Woche ${selected}`}</h3>{prog && <span className="soft small">{prog.done} von {prog.planned} Einheiten</span>}</div>
      {selected >= 1 && (
        <label className="field">An wie vielen Tagen diese Woche hattest Du Sodbrennen? (0–7)
          <input type="number" inputMode="numeric" min={0} max={7} value={draft.heartburnDays ?? ""} onChange={(e) => patch({ heartburnDays: num(e.target.value) })} />
        </label>
      )}
      {rsi && (
        <div className="stack">
          <div className="row between"><strong>Reflux Symptom Index</strong><span className="digits">{total === null ? "–" : `${total} / ${RSI_ITEMS.length * RSI_MAX}`}</span></div>
          <p className="soft small">Wie sehr haben Dich diese Beschwerden im letzten Monat belastet? 0 = kein Problem, 5 = sehr schweres Problem.</p>
          {RSI_ITEMS.map((q, i) => (
            <label key={q} className="field">{i + 1}. {q}
              <select value={items[i]} onChange={(e) => setItem(i, Number(e.target.value))}>
                {Array.from({ length: RSI_MAX + 1 }, (_, v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <label className="field">Stimme / Notiz
        <textarea value={draft.note ?? ""} onChange={(e) => patch({ note: e.target.value || undefined })} placeholder="z. B. Stimme morgens, Heiserkeit, Auslöser" />
      </label>
      <button className="btn primary tall wide" disabled={!dirty && !!saved} onClick={save}>{ok && !dirty ? "Gespeichert" : "Speichern"}</button>
      {selected === 0 && !saved && <button className="btn quiet" onClick={() => update((s) => patchLog(s, 0, { skipped: true }))}>Start-RSI überspringen</button>}
      {saved?.skipped && <button className="btn quiet" onClick={() => update((s) => patchLog(s, selected, { skipped: undefined }))}>Überspringen zurücknehmen</button>}
    </div>
  );
}
