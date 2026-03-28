# gamejam26

Koop-faehiges Top-Down-Arcade-Spiel mit Server/Client-Architektur fuer eine Zombie-Apokalypse-Lieferfahrt.

## Start
- `npm install`
- `npm run start`
- Browser auf `http://localhost:3000` oeffnen

## Entwicklung
- `npm run dev` startet nur den Vite-Client.
- `npm run server` startet nur den autoritativen Node-Server.
- `npm run test` fuehrt die vorhandenen Vitest-Tests aus.

## Aktueller Umfang
- Autoritativer Multiplayer-Server mit WebSocket-Sync.
- Fahrbares E-Auto mit Akku, Boost, Schiessen und Kollisionslogik.
- Feste Stadtkarte mit Strassen, Gebaeuden, Spawnpunkt, Lieferziel, Ladestationen und Boost-Spuren.
- Zombie-Fahrzeuggegner, Powerups, Deliveries und HUD mit Richtungs-Pfeil.
