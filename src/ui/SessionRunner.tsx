/* Läuft einen ganzen Trainingstag Baustein für Baustein ab: Einführung, Übung, nächster Baustein, Abschluss. */
import { useState } from "react";
import { REFERENCES } from "../data";
import { blockMinutes } from "../engine/plan";
import { useWakeLock } from "../hooks";
import { unlockAudio } from "../audio";
import type { Exercise, Settings, Texts } from "../types";
import { Player } from "./players";

export interface Launch { title: string; date: string; slot?: "morgens" | "abends"; dayId?: string; blocks: Exercise[] }

const NEED_LABEL: Record<string, string> = { gymball: "Gymnastikball", wurfball: "Ball", schlauch: "Schlauch und Wasser", platz: "Platz", boden: "Boden", laut: "Stimme" };

export function SessionRunner({ launch, settings, texts, onFinish, onCancel }: {
  launch: Launch; settings: Settings; texts: Texts; onFinish: (minutes: number, ids: string[]) => void; onCancel: () => void;
}) {
  const { blocks } = launch;
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<"intro" | "run" | "end">("intro");
  const [secs, setSecs] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  useWakeLock(stage === "run");

  const ex = blocks[i];
  const advance = (spent: number, counted: boolean) => {
    const nextDone = counted ? [...done, ex.id] : done;
    setSecs(secs + spent);
    setDone(nextDone);
    if (i + 1 >= blocks.length) setStage("end"); else { setI(i + 1); setStage("intro"); }
  };

  if (stage === "end") {
    const minutes = Math.max(1, Math.round(secs / 60));
    return (
      <div className="guide"><div className="stage center">
        <h1 className="serif hero">Geschafft</h1>
        <p className="digits big">{minutes} Min</p>
        <p className="soft">{done.length} von {blocks.length} Bausteinen</p>
        <button className="btn primary wide tall" onClick={() => onFinish(minutes, done)}>Speichern</button>
        <button className="btn quiet" onClick={onCancel}>Verwerfen</button>
      </div></div>
    );
  }

  const header = (
    <div className="row between">
      <span className="soft small">{launch.title}{blocks.length > 1 ? `, Baustein ${i + 1} von ${blocks.length}` : ""}</span>
      <button className="btn quiet small" onClick={() => (secs > 0 || done.length ? setStage("end") : onCancel())}>Beenden</button>
    </div>
  );

  if (stage === "run") {
    return <div className="guide">{header}<Player key={ex.id} ex={ex} minutes={blockMinutes(ex, settings)} settings={settings} texts={texts} onDone={(s) => advance(s, true)} /></div>;
  }

  const refs = (ex.refs ?? []).map((id) => REFERENCES.find((r) => r.id === id)).filter(Boolean);
  return (
    <div className="guide">
      {header}
      <div className="stage">
        <div><h1 className="serif hero">{ex.name}</h1><p className="soft">{blockMinutes(ex, settings)} Min{ex.needs.length ? ` · braucht ${ex.needs.map((n) => NEED_LABEL[n]).join(", ")}` : ""}</p></div>
        <div className="pane stack">
          <p>{ex.position}</p>
          <ol className="steps">{ex.steps.map((x) => <li key={x}>{x}</li>)}</ol>
          {ex.tip && <p className="soft">{ex.tip}</p>}
        </div>
        {ex.evidence && (
          <details className="fold"><summary>Einordnung</summary>
            <p className="soft small">{ex.evidence}</p>
            {refs.map((r) => r && <p key={r.id} className="small"><a href={r.url} target="_blank" rel="noreferrer">{r.text}</a></p>)}
          </details>
        )}
        <button className="btn primary wide tall" onClick={() => { unlockAudio(); setStage("run"); }}>Los</button>
        {blocks.length > 1 && <button className="btn quiet" onClick={() => advance(0, false)}>Überspringen</button>}
      </div>
    </div>
  );
}
