# Client

## Zweck
- Browser-Client fuer Rendering, HUD, Input und lokales Feedback.

## Verantwortlichkeiten
- WebSocket-Verbindung zum Server.
- Canvas-Rendering der Spielwelt.
- HUD, Minimap und Dispatch-Feed.
- Eingabeerfassung und synthetisches Audio-Feedback.
- Reifenspuren-Rendering (TireTrackRenderer.ts).

## Darf geaendert werden
- Clientseitige Darstellung, Interpolation, UX und Eingabeverarbeitung.
- Visuelle Effekte wie Reifenspuren.

## Nicht stillschweigend aendern
- Autoritative Spielregeln nicht in den Client verlagern.
## Kartenprinzip

Die Karte bleibt asset-kompatibel und tile-aligned auf einem 256px-Modulraster.
Sie soll aber bewusst nicht wie eine symmetrische Grid-Stadt wirken.

Erwünscht sind:
- asymmetrische Straßenführung
- Sackgassen
- unterschiedlich große und rechteckige Häuserblocks
- Parks und Grünflächen
- ein Fluss mit festen Brücken
- klar unterscheidbare Stadtbereiche

Nicht Teil des aktuellen Scopes sind:
- Kurvenstraßen
- diagonale Straßen
- freie Polygon-Geometrie für Straßen

## Technische Leitplanken

- Straßen, Fluss, Brücken und Gebäude bleiben auf 256px ausgerichtet.
- Die Karte darf per Seed generiert werden.
- POIs, Spawns und Navigation müssen aus der Kartendefinition ableitbar sein.
- Die Generierung soll asymmetrische, glaubwürdige Stadtlayouts erzeugen und keine Standard-Schachbrettkarte.
