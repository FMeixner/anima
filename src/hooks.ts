import { useEffect, useRef, useState } from "react";
import { TONES, vibrate } from "./audio";
import type { Settings } from "./types";

/** Uhr nach Wanduhrzeit (nicht nach Zählern): eine kurze Unterbrechung im Hintergrund verschiebt nichts. */
export function useClock(autoStart: boolean, onTick?: (t: number) => void) {
  const [acc, setAcc] = useState(0);
  const [since, setSince] = useState<number | null>(() => (autoStart ? Date.now() : null));
  const [now, setNow] = useState(() => Date.now());
  const cb = useRef(onTick);
  useEffect(() => { cb.current = onTick; });
  useEffect(() => {
    if (since === null) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      cb.current?.((acc + (n - since)) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, [since, acc]);
  const t = (acc + (since !== null ? now - since : 0)) / 1000;
  const start = () => { const n = Date.now(); setNow(n); setSince(n); };
  const pause = () => { if (since !== null) { setAcc(acc + (Date.now() - since)); setSince(null); } };
  return { t, running: since !== null, start, pause, resume: start };
}

/** Ton und Vibration beim Wechsel nach Einstellung */
export function cue(s: Pick<Settings, "tones" | "vibrate">, kind: "block" | "end" | "breath" = "block") {
  if (s.tones !== "off") { if (kind === "end") TONES.done(); else if (kind === "breath") { if (s.tones === "breath") TONES.tick(); } else TONES.gong(); }
  if (s.vibrate && kind !== "breath") vibrate(kind === "end" ? [150, 80, 150] : 120);
}

/** Bildschirm anlassen, solange eine Einheit läuft */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | null = null;
    const get = () => { navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    get();
    const vis = () => { if (document.visibilityState === "visible") get(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); lock?.release().catch(() => {}); };
  }, [active]);
}
