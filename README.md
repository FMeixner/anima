# Anima

Geführtes Atem- und Stimmtraining. Läuft im Browser, lässt sich auf dem Handy wie eine App installieren.

Basis ist das Atemprogramm aus der Grazer Studie (Eherer et al., 2012): zweimal täglich 20–30 Minuten Bauchatmung in Rückenlage über 8 Wochen, danach Erhaltung. Anima führt durch die Einheit, lässt dich jede Woche Einheit für Einheit abhaken und hält das Wochenprotokoll.

## Funktionen

- **Heute**: die Einheiten des Tages (morgens, abends), starten, abhaken oder „fällt aus“
- **Geführte Einheit**: Blöcke zu 5–10 Atemzügen mit Taktgeber, Handwechsel-Hinweis, Ton und Vibration, Bildschirm bleibt an
- **Woche**: Raster Mo–So × morgens/abends, Antippen schaltet offen → erledigt → fällt aus. Eine Woche ist geschafft, sobald alles erledigt oder ausgefallen ist (Logik aus Order)
- **Protokoll**: Einheiten, Tage mit Sodbrennen, PPI und Alginat, RSI in Woche 0, 4, 8, Stimme/Notiz
- **Stimme und Alltag** (ab Woche 3, optional): Bauchatmung im Sitzen und Stehen, Summen auf der Ausatmung, Satz auf einer Ausatmung

## Hinweise

Der RSI ist eine eigene deutsche Formulierung, keine validierte Fassung.

## Inhalte bearbeiten

Alles liegt als JSON in [`data/`](data): `program.json` (Phasen), `exercises/*.json` (Übungen), `rsi.json`, `references.json`. `npm run validate` prüft die Dateien.

## Entwickeln

```bash
npm install
npm run dev          # lokaler Server
npm run validate     # Daten prüfen
npm test             # Tests
npm run build        # Web-Ausgabe in dist/
npm run build:single # eine einzelne HTML-Datei in dist-single/
```

Auf dem Handy installieren: die gebaute Seite über HTTPS ausliefern, in Chrome (Android) oder Safari (iOS) öffnen und „Zum Startbildschirm hinzufügen“. Die Einzeldatei hat keinen Offline-Modus (kein Service Worker). Unter Einstellungen › Sicherung regelmäßig sichern.
