import { useRef } from "react";
import { REFERENCES } from "../data";
import { download } from "../backup";
import { emptyState } from "../store";
import type { AppState, Settings } from "../types";
import { Fold } from "./common";

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
    <div className="stack gap-l">
      <div className="row between"><h2 className="serif hero">Einstellungen</h2><button className="btn quiet" onClick={onClose}>Fertig</button></div>

      <section className="pane stack">
        <h3 className="serif">Eigene Texte</h3>
        <label className="field">Wortpaare für „Abspannen in Wörtern“, eines pro Zeile (betont wird das letzte Wort)
          <textarea rows={8} value={state.texts.woerter.join("\n")} onChange={(e) => update((s) => ({ ...s, texts: { ...s.texts, woerter: e.target.value.split("\n") } }))} />
        </label>
        <label className="field">Gedicht
          <textarea rows={8} value={state.texts.gedicht} onChange={(e) => update((s) => ({ ...s, texts: { ...s.texts, gedicht: e.target.value } }))} placeholder="Hier den Text einfügen" />
        </label>
      </section>

      <section className="pane stack">
        <h3 className="serif">Kernübung und Takt</h3>
        <label className="field">Dauer der Bauchatmung in Minuten (20–30)<input type="number" inputMode="numeric" value={set.minutes} onChange={(e) => put("minutes", clamp(e.target.value, 20, 30))} /></label>
        <label className="field">Atemzüge je Block vor dem Handwechsel (5–10)<input type="number" inputMode="numeric" value={set.breaths} onChange={(e) => put("breaths", clamp(e.target.value, 5, 10))} /></label>
        <label className="check"><input type="checkbox" checked={set.pacer} onChange={(e) => put("pacer", e.target.checked)} /> Atemkreis als Taktgeber</label>
        <div className="row">
          <label className="field grow">Einatmen (s)<input type="number" inputMode="numeric" value={set.inSec} onChange={(e) => put("inSec", clamp(e.target.value, 2, 8))} /></label>
          <label className="field grow">Ausatmen (s)<input type="number" inputMode="numeric" value={set.outSec} onChange={(e) => put("outSec", clamp(e.target.value, 2, 12))} /></label>
        </div>
        <label className="field">Töne
          <select value={set.tones} onChange={(e) => put("tones", e.target.value as Settings["tones"])}>
            <option value="off">Aus</option><option value="block">Beim Wechsel</option><option value="breath">Bei jedem Atemzug</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={set.vibrate} onChange={(e) => put("vibrate", e.target.checked)} /> Vibration beim Wechsel</label>
      </section>

      <section className="pane stack">
        <h3 className="serif">Programm</h3>
        <label className="field">Erster Übungstag
          <input type="date" value={state.start ?? ""} onChange={(e) => e.target.value && update((s) => ({ ...s, start: e.target.value }))} />
        </label>
        <label className="field">Darstellung
          <select value={state.theme ?? ""} onChange={(e) => update((s) => ({ ...s, theme: (e.target.value || undefined) as AppState["theme"] }))}>
            <option value="">Wie das Gerät</option><option value="light">Hell</option><option value="dark">Dunkel</option>
          </select>
        </label>
      </section>

      <section className="pane stack">
        <h3 className="serif">Sicherung</h3>
        <p className="soft small">{state.lastBackup ? `Letzte Sicherung: ${state.lastBackup}.` : "Noch nicht gesichert."}</p>
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
        <button className="btn danger" style={{ alignSelf: "flex-start" }} onClick={() => { if (confirm("Alle Daten auf diesem Gerät löschen?")) replace(emptyState()); }}>Alles zurücksetzen</button>
      </section>

      <Fold title="Quellen">
        <ul className="steps">{REFERENCES.map((r) => <li key={r.id} className="small">{r.text} <a href={r.url} target="_blank" rel="noreferrer">Link</a></li>)}</ul>
        <p className="soft small">Anima {__APP_VERSION__}</p>
      </Fold>
    </div>
  );
}
