# ARCHITECTURE.md

## Gesamtstruktur
- Das Projekt ist in einen Browser-Client, einen autoritativen Node-Server und ein Shared-Modul aufgeteilt.
- Singleplayer ist ein Spezialfall derselben Multiplayer-Architektur.
- Der Server simuliert den kompletten Spielzustand.
- Der Client rendert nur Snapshots, sammelt Eingaben und spielt lokales Feedback ab.

## Module
- `server/`: HTTP-Serving, WebSocket-Verbindungen, Weltsimulation, Gegner, Missionen, Powerups.
- `src/`: Rendering, Eingabe, HUD, Richtungs-Pfeil, Audio, lokale UX.
- `shared/`: Kartenlayout, POIs, Balancewerte und Geometrie-Helfer fuer Client und Server.

## Kommunikation
- Browser verbindet sich ueber WebSocket mit `/ws`.
- Client sendet nur Eingaben.
- Server sendet autoritative Snapshots mit Spielern, Gegnern, Projektilen, Events und Effekten.

## Weltmodell
- Feste Karte mit definierter Weltgroesse.
- Statische POIs: Spawnpunkt, Lieferziel, Ladestationen, Boost-Zonen, Gebaeude.
- Spielziel entsteht ueber denselben Spawnpunkt und dasselbe Lieferziel.

## Gameplay-Verantwortung
- Server: Fahrphysik, Akku, Deliveries, Respawn, Combat, Gegnerverhalten, Powerups.
- Client: Kamera, Zeichnen, Richtungs-Pfeil, Spielerlisten, Toasts, Audio-Signale.

## Technische Entscheidungen
- Keine externe Multiplayer-Bibliothek; WebSocket wird leichtgewichtig direkt im Server behandelt.
- Keine Minimap; Navigation erfolgt nur ueber den Richtungs-Pfeil in der oberen Bildschirmmitte.
- Additive Modulstruktur statt globalem Umbau des gesamten Projekts.
