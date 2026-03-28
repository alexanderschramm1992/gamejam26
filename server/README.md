# Server

## Zweck
- Autoritative Spielsimulation fuer Multiplayer.
- HTTP-Auslieferung des gebauten Clients.
- WebSocket-Kommunikation fuer Eingaben und Snapshot-Sync.

## Dateien
- `server.mjs`: Startpunkt, Spiel-Loop, HTTP-Server und Weltzustand.
- `websocket.mjs`: Kleine WebSocket-Implementierung ohne externe Bibliothek.

## Darf geaendert werden
- Netzprotokoll, Spieltick, Serverlogik, Gegner- und Missionssimulation.
- HTTP-Serving, solange der Client weiter aus `dist/` ausgeliefert wird.

## Nicht stillschweigend aendern
- Snapshot-Grundstruktur zwischen Server und Client.
- Autoritative Rolle des Servers.
- URL-Pfad `/ws` fuer Multiplayer ohne klare Begruendung.

## Abhaengigkeiten
- Gemeinsame Karten- und Spielkonstanten aus `shared/game.js`.
- Gebauter Client aus `dist/`.
