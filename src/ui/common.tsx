import { useEffect, useRef, type ReactNode } from "react";
import { CONTEXTS } from "../data";
import type { AppState, ContextId } from "../types";

export function Fold({ title, meta, children, open }: { title: string; meta?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="fold pane" open={open}>
      <summary>{title}{meta ? <span className="soft small"> {meta}</span> : null}</summary>
      <div className="stack" style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}

export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg className={`wave ${className}`} viewBox="0 0 120 14" aria-hidden="true">
      <path d="M2 7 C 12 -1, 22 15, 32 7 S 52 -1, 62 7 S 82 15, 92 7 S 112 -1, 118 7" fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export type Dot = { status: "done" | "skipped" | "open"; today: boolean };

/** Atemring der Woche: eine Perle je geplante Einheit, in der Mitte atmet der Orb. */
export function WeekOrb({ dots, title, sub, inSec, outSec }: { dots: Dot[]; title: string; sub: string; inSec: number; outSec: number }) {
  const R = 124, cx = 150, cy = 150;
  const core = useRef<SVGCircleElement>(null);
  // Der Orb atmet im eigenen Takt: wächst beim Einatmen, schrumpft beim Ausatmen
  useEffect(() => {
    const el = core.current;
    if (!el || !el.animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const a = el.animate(
      [{ transform: "scale(0.94)", easing: "ease-in-out", offset: 0 }, { transform: "scale(1.08)", easing: "ease-in-out", offset: inSec / (inSec + outSec) }, { transform: "scale(0.94)", offset: 1 }],
      { duration: (inSec + outSec) * 1000, iterations: Infinity },
    );
    return () => a.cancel();
  }, [inSec, outSec]);
  return (
    <div className="weekorb">
      <svg viewBox="0 0 300 300" role="img" aria-label={`${title}, ${sub}`}>
        <defs>
          <radialGradient id="core" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="var(--air)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--air)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pearl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--glow)" /><stop offset="100%" stopColor="var(--air-deep)" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R + 14} className="ripple r3" />
        <circle cx={cx} cy={cy} r={R - 20} className="ripple r2" />
        <circle cx={cx} cy={cy} r={R - 44} className="ripple r1" />
        <circle cx={cx} cy={cy} r="88" fill="url(#core)" className="core" ref={core} />
        {dots.map((d, i) => {
          const a = (i / dots.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          return d.status === "done" ? <circle key={i} cx={x} cy={y} r={d.today ? 9 : 7} fill="url(#pearl)" />
            : d.status === "skipped" ? <circle key={i} cx={x} cy={y} r={d.today ? 8 : 6} className="pearl-skip" />
            : <circle key={i} cx={x} cy={y} r={d.today ? 8 : 5.5} className={`pearl-open ${d.today ? "today" : ""}`} />;
        })}
      </svg>
      <div className="weekorb-text"><div className="serif hero">{title}</div><div className="soft">{sub}</div></div>
    </div>
  );
}

export function ContextPicker({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Wo übst du?">
      {CONTEXTS.map((c) => (
        <button key={c.id} role="radio" aria-checked={state.context === c.id} className={state.context === c.id ? "on" : ""}
          onClick={() => update((s) => ({ ...s, context: c.id as ContextId }))}>
          <strong>{c.name}</strong><span>{c.sub}</span>
        </button>
      ))}
    </div>
  );
}
