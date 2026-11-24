/* Player je Übungsart: pacer (Atemtakt), timer (Zeitphasen), reps (Wiederholungen), list (Wortpaare), text (Gedicht). */
import { useRef, useState } from "react";
import { cue, useClock } from "../hooks";
import type { Exercise, Settings, Texts } from "../types";
import { buildSteps, locate, totalSeconds } from "../engine/session";

export interface PlayerProps { ex: Exercise; minutes: number; settings: Settings; texts: Texts; onDone: (seconds: number) => void }

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function Ring({ value, children }: { value: number; children: React.ReactNode }) {
  const r = 92, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={r} className="ring-track" />
        <circle cx="100" cy="100" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

function Controls({ running, onPause, onResume, onEnd }: { running: boolean; onPause: () => void; onResume: () => void; onEnd: () => void }) {
  return (
    <div className="row center-x">
      {running ? <button className="btn" onClick={onPause}>Pause</button> : <button className="btn primary" onClick={onResume}>Weiter</button>}
      <button className="btn quiet" onClick={onEnd}>Fertig</button>
    </div>
  );
}

export function TimerPlayer({ ex, settings, onDone }: PlayerProps) {
  const phases = ex.phases ?? [];
  const total = phases.reduce((a, p) => a + p.seconds, 0);
  const last = useRef(0);
  const done = useRef(false);
  const finish = (t: number) => { if (!done.current) { done.current = true; cue(settings, "end"); onDone(Math.min(t, total)); } };
  const clock = useClock(true, (t) => {
    if (t >= total) return finish(total);
    let a = 0, idx = 0;
    for (; idx < phases.length; idx++) { if (t < a + phases[idx].seconds) break; a += phases[idx].seconds; }
    if (idx !== last.current) { last.current = idx; cue(settings, "block"); }
  });
  let acc = 0, idx = 0;
  for (; idx < phases.length - 1; idx++) { if (clock.t < acc + phases[idx].seconds) break; acc += phases[idx].seconds; }
  const ph = phases[idx];
  const remain = Math.max(0, ph.seconds - (clock.t - acc));
  return (
    <div className="stage">
      <div className="center"><h2 className="serif big">{ph.label}</h2>{phases.length > 1 && <p className="soft">Teil {idx + 1} von {phases.length}</p>}</div>
      <Ring value={(clock.t - acc) / ph.seconds}><span className="digits">{mmss(Math.ceil(remain))}</span></Ring>
      <Controls running={clock.running} onPause={clock.pause} onResume={clock.resume} onEnd={() => finish(clock.t)} />
    </div>
  );
}

export function PacerPlayer({ ex, minutes, settings, onDone }: PlayerProps) {
  const steps = buildSteps(ex, minutes, settings);
  const total = totalSeconds(steps);
  const inSec = ex.inSec ?? settings.inSec, outSec = ex.outSec ?? settings.outSec;
  const lastStep = useRef(-1), lastBreath = useRef(-1), done = useRef(false);
  const finish = (t: number) => { if (!done.current) { done.current = true; cue(settings, "end"); onDone(Math.min(t, total)); } };
  const clock = useClock(true, (t) => {
    const l = locate(steps, t);
    const st = steps[l.index];
    if (l.index !== lastStep.current) { const first = lastStep.current === -1; lastStep.current = l.index; lastBreath.current = -1; if (!first) cue(settings, "block"); }
    const b = st.count ? Math.floor(l.within / st.cycle) : -1;
    if (st.kind === "breaths" && b !== lastBreath.current && l.within % st.cycle < inSec) { lastBreath.current = b; cue(settings, "breath"); }
    if (l.finished) finish(total);
  });
  const t = Math.min(clock.t, total);
  const loc = locate(steps, t);
  const step = steps[loc.index];
  const breath = step.count ? Math.min(step.count, Math.floor(loc.within / step.cycle) + 1) : 0;
  const inhale = step.kind === "breaths" && loc.within % step.cycle < inSec;
  const live = settings.pacer && step.kind === "breaths";
  const scale = live ? (inhale ? 1 : 0.62) : 0.8;
  const dur = clock.running ? (inhale ? inSec : outSec) : 0.4;
  return (
    <div className="stage">
      <div className="row between small soft"><span className="digits">{mmss(t)}</span><span className="digits">{mmss(total)}</span></div>
      <div className="thread"><i style={{ width: `${(t / total) * 100}%` }} /></div>
      <div className="center">
        <h2 className="serif big">{step.label}</h2>
        {step.hint && <p className="soft">{step.hint}</p>}
      </div>
      <div className="orb-wrap">
        <div className={`orb ${step.kind !== "breaths" ? "rest" : ""}`} style={{ transform: `scale(${scale})`, transitionDuration: `${dur}s` }}>
          <span>{live ? (inhale ? "ein" : "aus") : ""}</span>
        </div>
      </div>
      <div className="center">{step.count > 0 ? <p className="digits big">{breath} <span className="soft">/ {step.count}</span></p> : <p className="soft">Normal weiteratmen.</p>}</div>
      <Controls running={clock.running} onPause={clock.pause} onResume={clock.resume} onEnd={() => finish(t)} />
    </div>
  );
}

export function RepsPlayer({ ex, settings, onDone }: PlayerProps) {
  const total = ex.reps ?? 5;
  const [n, setN] = useState(0);
  const clock = useClock(true);
  const next = () => {
    if (n + 1 >= total) { cue(settings, "end"); onDone(clock.t); } else { setN(n + 1); cue(settings, "block"); }
  };
  return (
    <div className="stage">
      <div className="center"><h2 className="serif big">{ex.repLabel} {n + 1} <span className="soft">von {total}</span></h2><p className="soft">{ex.repCue}</p></div>
      <div className="dots" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i < n ? "on" : i === n ? "now" : ""} />)}</div>
      <button className="btn primary wide tall" onClick={next}>{n + 1 >= total ? "Letzte geschafft" : "Geschafft"}</button>
      <div className="row center-x"><button className="btn quiet" disabled={n === 0} onClick={() => setN(n - 1)}>Eine zurück</button><button className="btn quiet" onClick={() => onDone(clock.t)}>Fertig</button></div>
    </div>
  );
}

export function ListPlayer({ ex, settings, texts, onDone }: PlayerProps) {
  const items = (ex.textKey === "woerter" ? texts.woerter : []).map((x) => x.trim()).filter(Boolean);
  const [i, setI] = useState(0);
  const clock = useClock(true);
  if (!items.length) return <div className="stage center"><p className="soft">Die Wortliste ist leer. Trag Wörter unter Einstellungen ein.</p><button className="btn" onClick={() => onDone(0)}>Weiter</button></div>;
  const words = items[i].split(/\s+/);
  const next = () => { if (i + 1 >= items.length) { cue(settings, "end"); onDone(clock.t); } else { setI(i + 1); cue(settings, "block"); } };
  return (
    <div className="stage">
      <p className="soft center">{i + 1} von {items.length}</p>
      <div className="phrase serif" aria-live="polite">{words.map((w, k) => <span key={k} className={ex.emphasis === "last" && k === words.length - 1 ? "hit" : ""}>{w} </span>)}</div>
      <p className="soft center">Auf der hervorgehobenen Silbe abspannen, dann lösen.</p>
      <button className="btn primary wide tall" onClick={next}>{i + 1 >= items.length ? "Fertig" : "Weiter"}</button>
      <div className="row center-x"><button className="btn quiet" disabled={i === 0} onClick={() => setI(i - 1)}>Zurück</button></div>
    </div>
  );
}

export function TextPlayer({ settings, texts, onDone }: PlayerProps) {
  const clock = useClock(true);
  const text = texts.gedicht.trim();
  return (
    <div className="stage">
      {text ? <div className="poem serif">{text}</div> : <p className="soft center">Noch kein Text. Füge dein Gedicht unter Einstellungen ein.</p>}
      <button className="btn primary wide tall" onClick={() => { cue(settings, "end"); onDone(clock.t); }}>{text ? "Fertig" : "Weiter"}</button>
    </div>
  );
}

export function Player(p: PlayerProps) {
  switch (p.ex.mode) {
    case "timer": return <TimerPlayer {...p} />;
    case "pacer": return <PacerPlayer {...p} />;
    case "reps": return <RepsPlayer {...p} />;
    case "list": return <ListPlayer {...p} />;
    case "text": return <TextPlayer {...p} />;
  }
}
