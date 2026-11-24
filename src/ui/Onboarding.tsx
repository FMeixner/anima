import { useState } from "react";
import type { AppState } from "../types";
import { todayISO } from "../engine/dates";
import { DISCLAIMER, SAFETY } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

export function Onboarding({ update }: { update: Update }) {
  const [start, setStart] = useState(todayISO());
  return (
    <div className="app"><div className="main stack">
      <h1>Anima</h1>
      <p>Geführtes Atem- und Stimmtraining. Das Programm: 8 Wochen, zweimal täglich 20–30 Minuten Bauchatmung, danach Erhaltung. Du hakst jede Woche Einheit für Einheit ab und trägst einmal pro Woche dein Protokoll ein.</p>
      <div className="note warn">{SAFETY}</div>
      <label className="field">Erster Übungstag
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <p className="muted small">Woche 1 ist die Kalenderwoche (Mo–So) mit diesem Tag. Tage davor zählen nicht mit.</p>
      <p className="muted small">{DISCLAIMER} Alle Daten bleiben auf diesem Gerät.</p>
      <button className="btn primary wide" disabled={!start} onClick={() => update((s) => ({ ...s, onboarded: true, start }))}>Los geht’s</button>
    </div></div>
  );
}
