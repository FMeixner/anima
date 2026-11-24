/* Zustand der App: im Browser gespeichert (localStorage), exportier- und importierbar als JSON. Nichts verlässt das Gerät. */
import { useCallback, useEffect, useState } from "react";
import type { AppState, Settings, Texts } from "./types";

const KEY = "anima:v1";

export const uid = (prefix = "id"): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const defaultSettings = (): Settings => ({ minutes: 25, breaths: 8, inSec: 4, outSec: 6, pacer: true, tones: "block", vibrate: true });

export const defaultTexts = (): Texts => ({
  woerter: ["Komm mit", "Geh weg", "Mach zu", "Bleib da", "Lass los", "Hol ihn", "Sei still", "Schau hin"],
  gedicht: "",
});

export function emptyState(): AppState {
  return { version: 1, onboarded: false, start: null, context: "zuhause", settings: defaultSettings(), texts: defaultTexts(), sessions: [], logs: [] };
}

/** Fehlende Felder aus älteren Ständen ergänzen */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = { ...base, ...(raw as Partial<AppState>) } as AppState;
  s.settings = { ...base.settings, ...(s.settings ?? {}) };
  s.texts = { ...base.texts, ...(s.texts ?? {}) };
  // Stand 0.1 (kind core/extra, exerciseId) auf das neue Modell heben
  s.sessions = (Array.isArray(s.sessions) ? s.sessions : []).map((x) => {
    const o = x as unknown as Record<string, unknown>;
    if (o.kind === "core" || o.kind === "extra") {
      const { exerciseId, ...rest } = o;
      return { ...rest, kind: o.kind === "core" ? "plan" : "free", exerciseIds: [String(exerciseId)] } as unknown as typeof x;
    }
    return x;
  });
  s.logs = Array.isArray(s.logs) ? s.logs : [];
  if ((s.autoBackup as string) === "week") s.autoBackup = "session";
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
