import { useRef } from "react";
import { REFERENCES } from "../data";
import { download } from "../backup";
import { emptyState } from "../store";
import type { AppState, Settings } from "../types";
import { Collapse, DISCLAIMER, SAFETY } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

export function Setup({ state, update, replace, today, onClose }: { state: AppState; update: Update; replace: (s: AppState) => void; today: string; onClose: () => void }) {
  const set = state.settings;
  const put = <K extends keyof Settings>(k: K, v: Settings[K]) => update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const file = useRef<HTMLInputElement>(null);
  const clamp = (v: string, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(v)) || lo));

  const importFile = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      if (raw?.version !== 1) throw new Error("falsches Format");
      if (confirm("Aktuelle Daten durch die Sicherung ersetzen?")) replace(raw);
    } catch { alert("Die Datei ist keine Anima-Sicherung."); }
  };

  return (
    <div className="stack">
      <div className="row between"><h2>Einstellungen</h2><button className="btn small ghost" onClick={onClose}>Fertig</button></div>

      <div className="card stack">
        <h3>Einheit</h3>
        <label className="field">Dauer Kerneinheit (Min, 20–30)<input type="number" inputMode="numeric" value={set.minutes} onChange={(e) => put("minutes", clamp(e.target.value, 20, 30))} /></label>
        <label className="field">Atemzüge je Block vor dem Handwechsel (5–10)<input type="number" inputMode="numeric" value={set.breaths} onChange={(e) => put("breaths", clamp(e.target.value, 5, 10))} /></label>
        <label className="check"><input type="checkbox" checked={set.pacer} onChange={(e) => put("pacer", e.target.checked)} /> Taktgeber (Kreis)</label>
        <div className="row">
          <label className="field grow">Einatmen (s)<input type="number" inputMode="numeric" value={set.inSec} onChange={(e) => put("inSec", clamp(e.target.value, 2, 8))} /></label>
          <label className="field grow">Ausatmen (s)<input type="number" inputMode="numeric" value={set.outSec} onChange={(e) => put("outSec", clamp(e.target.value, 2, 12))} /></label>
        </div>
        <p className="muted small">Ein- und Ausatmung sollen sich natürlich anfühlen. Wähle den Takt so, dass du nicht pressen musst.</p>
        <label className="field">Töne
          <select value={set.tones} onChange={(e) => put("tones", e.target.value as Settings["tones"])}>
            <option value="off">Aus</option><option value="block">Bei Blockwechsel</option><option value="breath">Bei jedem Atemzug</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={set.vibrate} onChange={(e) => put("vibrate", e.target.checked)} /> Vibration beim Blockwechsel</label>
      </div>

      <div className="card stack">
        <h3>Ab Woche 9: Erhaltung</h3>
        <p className="muted small">Der Langzeiteffekt zeigte sich nur bei denen, die weiter geübt haben. Den Umfang mit der Logopädie festlegen; die Werte hier sind nur ein Platzhalter.</p>
        <div className="row">
          <label className="field grow">Einheiten pro Tag
            <select value={set.maintenancePerDay} onChange={(e) => put("maintenancePerDay", Number(e.target.value) as 1 | 2)}><option value={1}>1 (abends)</option><option value={2}>2</option></select>
          </label>
          <label className="field grow">Minuten<input type="number" inputMode="numeric" value={set.maintenanceMinutes} onChange={(e) => put("maintenanceMinutes", clamp(e.target.value, 5, 30))} /></label>
        </div>
      </div>

      <div className="card stack">
        <h3>Programm</h3>
        <label className="field">Erster Übungstag
          <input type="date" value={state.start ?? ""} onChange={(e) => e.target.value && update((s) => ({ ...s, start: e.target.value }))} />
        </label>
        <label className="field">Darstellung
          <select value={state.theme ?? ""} onChange={(e) => update((s) => ({ ...s, theme: (e.target.value || undefined) as AppState["theme"] }))}>
            <option value="">Wie das Gerät</option><option value="dark">Dunkel</option><option value="light">Hell</option>
          </select>
        </label>
      </div>

      <div className="card stack">
        <h3>Sicherung</h3>
        <p className="muted small">Alle Daten liegen nur auf diesem Gerät. Eine Sicherung schützt vor Verlust beim Löschen der Browserdaten.{state.lastBackup ? ` Letzte Sicherung: ${state.lastBackup}.` : ""}</p>
        <div className="row wrap">
          <button className="btn" onClick={() => { download(state, "anima-sicherung.json"); update((s) => ({ ...s, lastBackup: today })); }}>Sicherung speichern</button>
          <button className="btn" onClick={() => file.current?.click()}>Sicherung laden</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
        </div>
        <label className="field">Automatisch sichern
          <select value={state.autoBackup ?? "week"} onChange={(e) => update((s) => ({ ...s, autoBackup: e.target.value as AppState["autoBackup"] }))}>
            <option value="week">Wöchentlich nach einer Einheit</option><option value="session">Nach jeder Einheit</option><option value="off">Aus</option>
          </select>
        </label>
        <button className="btn danger small" style={{ alignSelf: "flex-start" }} onClick={() => { if (confirm("Alle Daten auf diesem Gerät löschen?")) replace(emptyState()); }}>Alles zurücksetzen</button>
      </div>

      <Collapse title="Hinweise und Quellen">
        <p className="small">{SAFETY}</p>
        <p className="muted small">{DISCLAIMER}</p>
        <p className="muted small">Das Programm stammt aus der Grazer Studie (Eherer et al., 2012) und der zugehörigen Broschüre. Die Phasen, die Erhaltung und alle Stimm-Übungen sind Ergänzungen und mit der Logopädie abzustimmen.</p>
        <ul className="steps">{REFERENCES.map((r) => <li key={r.id} className="small">{r.text} <a href={r.url} target="_blank" rel="noreferrer">Link</a></li>)}</ul>
        <p className="muted small">Anima {__APP_VERSION__}</p>
      </Collapse>
    </div>
  );
}
