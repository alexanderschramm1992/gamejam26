# Sushi Sprint Protocol

Frisch gebautes Koop-Multiplayer-Actionspiel nach den aktuellen Vorgaben aus `FEATURES.md`, `ARCHITECTURE.md` und `AGENTS.md`.

## Was drin ist
- Autoritativer Node.js-Server mit Socket.io.
- Vanilla-TypeScript-Client mit HTML5-Canvas.
- Handgebaute Stadtkarte mit Straßen, Gebäuden, Ladestationen, Dispatch, Lieferzielen und Boost-Spuren.
- 1 bis 4 Spieler im Koop.
- Akku, Drift-/Trägheits-Fahrverhalten, Projektilkampf und Zombie-Diesel-Gegner.
- Sushi-Liefermissions-Loop mit Eskalation und synchronisiertem HUD.

## Projektstruktur
- `src/server`: Serverlogik und Simulation.
- `src/client`: Rendering, Input, HUD und Audio-Feedback.
- `src/shared`: Gemeinsame Datenmodelle, Konfiguration und Kartendaten.
- `public`: HTML/CSS für den Browser-Client.
- `assets`: Statische Assets; aktuell ungenutzt, damit kein alter Prototyp übernommen wird.

## Start
1. `npm install`
2. `npm run build`
3. `npm start`
4. `http://localhost:3000` im Browser öffnen

## Steuerung
- `WASD` oder Pfeiltasten: Fahren / Lenken
- `Space`: Schießen
- `E`: Mission am Dispatch annehmen
- `Shift`: Bremsen / kontrollierter laden auf Station

## Was nicht verändert werden soll
- `AGENTS.md`, `ARCHITECTURE.md` und `FEATURES.md` bleiben Referenzdokumente.
