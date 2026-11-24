import { useState } from "react";
import type { AppState } from "../types";
import { todayISO } from "../engine/dates";
import { Wave } from "./common";

type Update = (fn: (s: AppState) => AppState) => void;

export function Onboarding({ update }: { update: Update }) {
  const [start, setStart] = useState(todayISO());
  return (
    <div className="app"><div className="main stack gap-l">
      <div className="center" style={{ paddingTop: 48 }}><h1 className="serif display">anima</h1><Wave className="mid" /></div>
      <p className="center soft">Atem, Körper und Stimme. Morgens ein wechselnder Trainingstag, abends die ruhige Bauchatmung. Du hakst jede Woche Einheit für Einheit ab.</p>
      <label className="field">Erster Übungstag
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <p className="soft small center">Woche 1 ist die Kalenderwoche (Mo–So) mit diesem Tag.</p>
      <button className="btn primary wide tall" disabled={!start} onClick={() => update((s) => ({ ...s, onboarded: true, start }))}>Anfangen</button>
    </div></div>
  );
}
