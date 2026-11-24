/* Zustand der App: im Browser gespeichert (localStorage), exportier- und importierbar als JSON. Nichts verlässt das Gerät. */
import { useCallback, useEffect, useState } from "react";
import type { AppState, Settings } from "./types";

const KEY = "anima:v1";

export const uid = (prefix = "id"): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const defaultSettings = (): Settings => ({
  minutes: 25, breaths: 8, inSec: 4, outSec: 6, pacer: true, tones: "block", vibrate: true,
  maintenancePerDay: 1, maintenanceMinutes: 20,
});

export function emptyState(): AppState {
  return { version: 1, onboarded: false, start: null, settings: defaultSettings(), sessions: [], logs: [] };
}

/** Fehlende Felder aus älteren Ständen ergänzen */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = { ...base, ...(raw as Partial<AppState>) } as AppState;
  s.settings = { ...base.settings, ...(s.settings ?? {}) };
  s.sessions = Array.isArray(s.sessions) ? s.sessions : [];
  s.logs = Array.isArray(s.logs) ? s.logs : [];
  return s;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyState();
  } catch { return emptyState(); }
}

export function useAppState(): [AppState, (fn: (s: AppState) => AppState) => void, (s: AppState) => void] {
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher voll oder gesperrt */ }
  }, [state]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  const replace = useCallback((s: AppState) => setState(migrate(s)), []);
  return [state, update, replace];
}
