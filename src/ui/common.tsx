import type { ReactNode } from "react";

export function Collapse({ title, meta, children, open }: { title: string; meta?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="card" open={open}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        {title}{meta ? <span className="muted small" style={{ fontWeight: 400 }}> · {meta}</span> : null}
      </summary>
      <div className="stack" style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

export const SAFETY = "Bei Schwindel oder Benommenheit abbrechen, normal weiteratmen und erst nach dem Abklingen fortsetzen.";
export const DISCLAIMER = "Anima ersetzt keine ärztliche oder therapeutische Beratung. Die Studien zur Bauchatmung bei Reflux sind klein; Mechanismus plausibel, Risiko gering.";

export function Progress({ done, skipped, planned }: { done: number; skipped: number; planned: number }) {
  const pct = planned ? Math.round(((done + skipped) / planned) * 100) : 0;
  return <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>;
}
