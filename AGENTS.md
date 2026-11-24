# Hinweise für Coding-Agenten

Anima ist eine Atem- und Stimmtraining-PWA (Vite, React 19, TypeScript). Aus Order (FMeixner/order) übernommen: Stack, `audio.ts`, `backup.ts`, Wochen-Abhaken.

## Leitlinie
Einfach zu bedienen, aufgeräumt, konkret. Details nur auf Wunsch. UI-Texte Deutsch, Du-Form, knapp.

## Struktur
- `data/` – Inhalte als JSON (`program.json` Phasen, `exercises/*.json`, `rsi.json`, `references.json`), geprüft von `scripts/validate.mjs`.
- `src/engine/` – Logik ohne UI:
  - `week.ts` (Programmwoche aus Startdatum, geplante Einheiten, `weekProgress`, `weekDone`, `protocolDue`; „fällt aus“ zählt als erledigt, nie als verpasst)
  - `session.ts` (`buildSteps`: Blöcke mit Handwechsel und normalen Atemzügen dazwischen, Ausklang; `locate`)
  - `actions.ts` (`setCore`, `cycleCore`, `addExtra`, `patchLog` als reine Funktionen)
  - `dates.ts` (ISO-Datumshelfer, Woche Mo–So)
- `src/ui/` – Ansichten: `Today`, `WeekView` (Abhaken), `Protocol`, `GuidedSession`, `Setup`, `Onboarding`.
- `src/store.ts` – Zustand im `localStorage` unter `anima:v1`.

## Regeln
- Keine persönlichen Daten ins Repo. Protokolldaten bleiben im Browser.
- Kerneinheiten zählen für die Woche, Extras (Stimme/Alltag) nicht.
- Jede Übung aus einer Ergänzung trägt `source: "ergaenzung"` und den Hinweis „mit Logopädie abstimmen“. Neue Übungen und Zahlen erst nach Prüfung durch Friedrich eintragen.
- Jede zitierte Studie steht mit vollständiger Angabe und Link in `data/references.json`; Angaben vor dem Eintragen gegen die Quelle prüfen.
- Typprüfung mit `npx tsc -b`.

## Arbeitsablauf je Release
1. Eintrag in `CHANGELOG.md`, 2. `npm version X.Y.Z --no-git-tag-version`, 3. `npm run build`, 4. `npm test`, 5. Commit und Push.
