/* Geführte Einheit: Blöcke mit Taktgeber, Handwechsel-Hinweis, Töne und Vibration. Die Zeit läuft nach der Uhr,
   nicht nach Zählern, damit eine kurze Unterbrechung im Hintergrund nichts verschiebt. Bildschirm bleibt an (Wake Lock). */
import { useEffect, useMemo, useRef, useState } from "react";
import { TONES, unlockAudio, vibrate } from "../audio";
import type { Exercise, Settings } from "../types";
import { buildSteps, locate, totalSeconds } from "../engine/session";
import { SAFETY } from "./common";

type Phase = "ready" | "running" | "paused" | "end";
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export function GuidedSession({ ex, minutes, settings, onFinish, onCancel }: {
  ex: Exercise; minutes: number; settings: Settings; onFinish: (minutes: number) => void; onCancel: () => void;
}) {
  const steps = useMemo(() => buildSteps(ex, minutes, settings), [ex, minutes, settings]);
  const total = totalSeconds(steps);
  const [phase, setPhase] = useState<Phase>("ready");
  const [acc, setAcc] = useState(0); // Millisekunden bis zur letzten Pause
  const [since, setSince] = useState(0); // Zeitstempel des letzten Starts
  const [now, setNow] = useState(0);
  const lastStep = useRef(-1);
  const lastBreath = useRef(-1);
  const lock = useRef<WakeLockSentinel | null>(null);

  const secAt = (ts: number) => Math.min((acc + (phase === "running" ? ts - since : 0)) / 1000, total);
  const t = secAt(now);
  const loc = locate(steps, t);
  const step = steps[loc.index];
  const breath = step.count ? Math.min(step.count, Math.floor(loc.within / step.cycle) + 1) : 0;
  const inhale = ex.pacer && step.kind === "breaths" && loc.within % step.cycle < settings.inSec;

  const acquire = () => { navigator.wakeLock?.request("screen").then((l) => { lock.current = l; }).catch(() => {}); };
  const release = () => { lock.current?.release().catch(() => {}); lock.current = null; };

  // Takt: alle 200 ms nach der Uhr rechnen, Töne und Vibration auslösen, am Ende abschließen
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      const sec = secAt(ts);
      const l = locate(steps, sec);
      const st = steps[l.index];
      if (l.index !== lastStep.current) {
        const first = lastStep.current === -1;
        lastStep.current = l.index;
        lastBreath.current = -1;
        if (!first) {
          if (settings.tones !== "off") TONES.gong();
          if (settings.vibrate) vibrate(st.kind === "close" ? [80, 60, 80] : 120);
        }
      }
      const b = st.count ? Math.floor(l.within / st.cycle) : -1;
      if (settings.tones === "breath" && st.kind === "breaths" && b !== lastBreath.current && ex.pacer && l.within % st.cycle < settings.inSec) {
        lastBreath.current = b;
        TONES.tick();
      }
      if (l.finished) {
        setAcc(total * 1000);
        release();
        if (settings.tones !== "off") TONES.done();
        if (settings.vibrate) vibrate([150, 80, 150]);
        setPhase("end");
      }
    }, 200);
    const vis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, acc, since, steps, settings, total, ex]);
  useEffect(() => release, []);

  const start = () => { unlockAudio(); const ts = Date.now(); setNow(ts); setSince(ts); setPhase("running"); acquire(); };
  const pause = () => { setAcc(acc + (Date.now() - since)); setPhase("paused"); release(); };
  const resume = () => { const ts = Date.now(); setNow(ts); setSince(ts); setPhase("running"); acquire(); };
  const stop = () => { if (phase === "running") setAcc(acc + (Date.now() - since)); release(); setPhase("end"); };

  const doneMin = Math.floor(Math.min(acc / 1000, total) / 60);
  const completed = acc / 1000 >= total - 1;

  if (phase === "ready") {
    return (
      <div className="guide">
        <div className="stack">
          <div className="row between"><h1>{ex.name}</h1><button className="btn small ghost" onClick={onCancel}>Zurück</button></div>
          <p className="muted">{minutes} Min · {Math.round(settings.breaths)} {ex.unit} je Block{ex.pacer ? ` · Takt ${settings.inSec} s ein, ${settings.outSec} s aus` : ""}</p>
          <div className="card stack">
            <strong>Position</strong><p>{ex.position}</p>
            <strong>So geht’s</strong>
            <ol className="steps">{ex.steps.map((x) => <li key={x}>{x}</li>)}</ol>
            {ex.tip && <p className="muted small">{ex.tip}</p>}
          </div>
          {ex.source === "ergaenzung" && <div className="note warn">Ergänzung zur Broschüre: vor dem Einsatz mit der Logopädie abstimmen.</div>}
          <div className="note warn">{SAFETY}</div>
          <button className="btn primary wide" onClick={start}>Los</button>
        </div>
      </div>
    );
  }

  if (phase === "end") {
    return (
      <div className="guide">
        <div className="stack center" style={{ margin: "auto 0" }}>
          <h1>{completed ? "Geschafft" : "Beendet"}</h1>
          <p className="bignum mono">{completed ? minutes : doneMin} Min</p>
          {!completed && <p className="muted">Geplant waren {minutes} Min. Soll die Einheit trotzdem zählen?</p>}
          <button className="btn primary wide" onClick={() => onFinish(completed ? minutes : doneMin)}>{completed ? "Speichern" : "Als erledigt zählen"}</button>
          <button className="btn ghost wide" onClick={onCancel}>Verwerfen</button>
        </div>
      </div>
    );
  }

  const scale = step.kind === "breaths" && ex.pacer ? (inhale ? 1 : 0.6) : 0.8;
  const dur = inhale ? settings.inSec : settings.outSec;
  return (
    <div className="guide">
      <div className="row between"><span className="mono muted">{mmss(t)} / {mmss(total)}</span><button className="btn small ghost" onClick={stop}>Beenden</button></div>
      <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${(t / total) * 100}%` }} /></div>
      <div className="center" style={{ marginTop: 20 }}>
        <h2>{step.label}</h2>
        {step.hint && <p className="muted" style={{ marginTop: 4 }}>{step.hint}</p>}
      </div>
      <div className="pacer-wrap">
        <div className={`pacer ${step.kind !== "breaths" ? "rest" : ""}`} style={{ transform: `scale(${scale})`, transitionDuration: `${phase === "running" ? dur : 0.3}s` }} aria-live="off">
          {step.kind === "breaths" ? (ex.pacer ? (inhale ? "ein" : "aus") : "") : ""}
        </div>
      </div>
      <div className="center stack">
        {step.count > 0 && <p className="bignum mono">{breath} / {step.count}</p>}
        {step.kind === "close" && <p className="muted">Normal weiteratmen.</p>}
        {phase === "running" ? <button className="btn wide" onClick={pause}>Pause</button> : <button className="btn primary wide" onClick={resume}>Weiter</button>}
      </div>
    </div>
  );
}
