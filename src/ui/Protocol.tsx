/* Wochenprotokoll wie in der Tabelle: Einheiten (von N), Tage mit Sodbrennen, PPI, Alginat, RSI in Woche 0, 4, 8, Stimme/Notiz. */
import { RSI_ITEMS, RSI_MAX } from "../data";
import type { AppState, WeekLog } from "../types";
import { patchLog } from "../engine/actions";
import { baselineDue, isRsiWeek, logOf, protocolDue, rsiTotal, weekProgress } from "../engine/week";

type Update = (fn: (s: AppState) => AppState) => void;
const dash = (n: number | undefined) => (n === undefined ? "–" : String(n));
const num = (v: string): number | undefined => (v === "" ? undefined : Math.max(0, Math.min(7, Math.round(Number(v)))));

export function Protocol({ state, update, today, week, selected, onSelect }: {
  state: AppState; update: Update; today: string; week: number; selected: number; onSelect: (w: number) => void;
}) {
  const weeks = Array.from({ length: Math.max(week, 0) + 1 }, (_, i) => i).reverse();
  const log = logOf(state, selected);
  const patch = (p: Partial<WeekLog>) => update((s) => patchLog(s, selected, p));
  const prog = selected >= 1 ? weekProgress(state, selected) : null;
  const rsi = isRsiWeek(selected);
  const items = log?.rsiItems ?? Array(RSI_ITEMS.length).fill(0);
  const setItem = (i: number, v: number) => patch({ rsiItems: items.map((x, j) => (j === i ? v : x)) });
  const total = rsiTotal(log?.rsiItems);

  return (
    <div className="stack">
      <h2 className="serif hero">Protokoll</h2>
      <div className="pane" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Woche</th><th>Einh.</th><th>Sodbr.</th><th>PPI</th><th>Alg.</th><th>RSI</th></tr></thead>
          <tbody>
            {weeks.map((w) => {
              const l = logOf(state, w);
              const p = w >= 1 ? weekProgress(state, w) : null;
              return (
                <tr key={w} className={w === selected ? "sel" : ""} onClick={() => onSelect(w)}>
                  <td>{w === 0 ? "0 (Start)" : w}{(w === 0 ? baselineDue(state) : protocolDue(state, w, today)) && " •"}</td>
                  <td>{p ? `${p.done}/${p.planned}` : "–"}</td>
                  <td>{l?.skipped ? "übersp." : dash(l?.heartburnDays)}</td>
                  <td>{dash(l?.ppiDays)}</td>
                  <td>{dash(l?.alginateDays)}</td>
                  <td>{isRsiWeek(w) ? dash(rsiTotal(l?.rsiItems) ?? undefined) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="soft small" style={{ marginTop: 6 }}>Einheiten = erledigte von geplanten. • = Protokoll fällig.</p>
      </div>

      <div className="pane stack">
        <div className="row between"><h3 className="serif">{selected === 0 ? "Start (Woche 0)" : `Woche ${selected}`}</h3>{prog && <span className="soft small">Einheiten {prog.done} von {prog.planned}</span>}</div>
        {selected >= 1 && (
          <div className="row">
            <label className="field grow">Tage mit Sodbrennen<input type="number" inputMode="numeric" min={0} max={7} value={log?.heartburnDays ?? ""} onChange={(e) => patch({ heartburnDays: num(e.target.value) })} /></label>
            <label className="field grow">Tage mit PPI<input type="number" inputMode="numeric" min={0} max={7} value={log?.ppiDays ?? ""} onChange={(e) => patch({ ppiDays: num(e.target.value) })} /></label>
            <label className="field grow">Tage mit Alginat<input type="number" inputMode="numeric" min={0} max={7} value={log?.alginateDays ?? ""} onChange={(e) => patch({ alginateDays: num(e.target.value) })} /></label>
          </div>
        )}
        {rsi && (
          <div className="stack">
            <div className="row between"><strong>Reflux Symptom Index</strong><span className="mono">{total === null ? "–" : `${total} / ${RSI_ITEMS.length * RSI_MAX}`}</span></div>
            <p className="soft small">Wie sehr haben dich diese Beschwerden im letzten Monat belastet? 0 = kein Problem, 5 = sehr schweres Problem.</p>
            {RSI_ITEMS.map((q, i) => (
              <label key={q} className="field">{i + 1}. {q}
                <select value={items[i]} onChange={(e) => setItem(i, Number(e.target.value))}>
                  {Array.from({ length: RSI_MAX + 1 }, (_, v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
            {!log?.rsiItems && <button className="btn" onClick={() => patch({ rsiItems: items })}>Alle mit 0 eintragen</button>}
          </div>
        )}
        <label className="field">Stimme / Notiz
          <textarea value={log?.note ?? ""} onChange={(e) => patch({ note: e.target.value || undefined })} placeholder="z. B. Stimme morgens, Heiserkeit, Technik-Fragen für die Logopädie" />
        </label>
        {selected === 0 && !log && <button className="btn quiet" onClick={() => patch({ skipped: true })}>Start-RSI überspringen</button>}
        {log?.skipped && <button className="btn quiet" onClick={() => patch({ skipped: undefined })}>Überspringen zurücknehmen</button>}
        {selected >= 1 && !log && <button className="btn primary tall" onClick={() => patch({})}>Woche ohne Angaben abschließen</button>}
      </div>
      <p className="soft small">RSI: eigene deutsche Formulierung nach Belafsky et al. (2002), keine validierte Fassung. Nur zum Verlauf bei dir.</p>
    </div>
  );
}
