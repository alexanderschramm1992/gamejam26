# Client

## Zweck
- Browser-Client fuer Rendering, Eingabe, HUD und Audio.
- Verbindet sich per WebSocket mit dem autoritativen Server.

## Dateien
- `main.ts`: Einstieg, Input, Rendering, HUD und Netzwerkfluss.
- `audio.ts`: Kleines WebAudio-Feedback fuer SFX und Hintergrundstimmung.
- `types.ts`: Snapshot- und Event-Typen fuer den Client.
- `style.css`: HUD-, Overlay- und Canvas-Layout.

## Darf geaendert werden
- Darstellung, HUD, Client-Eingabe, Audio und visuelles Feedback.
- Client-seitige Hilfen, solange der Server autoritativ bleibt.

## Nicht stillschweigend aendern
- Netzwerkvertrag mit dem Server.
- Objektiv-Anzeige nur ueber den oberen Richtungs-Pfeil.
- Feste POIs wie Spawnpunkt, Lieferziel und Ladestationen ohne Abstimmung.

## Abhaengigkeiten
- Snapshot-Daten vom Server.
- Statische Weltdefinition aus `shared/game.js`.
