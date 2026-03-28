# Client

## Zweck
- Browser-Client fuer Rendering, HUD, Input und lokales Feedback.

## Verantwortlichkeiten
- WebSocket-Verbindung zum Server.
- Canvas-Rendering der Spielwelt.
- HUD, Minimap und Dispatch-Feed.
- Eingabeerfassung und synthetisches Audio-Feedback.

## Darf geaendert werden
- Clientseitige Darstellung, Interpolation, UX und Eingabeverarbeitung.

## Nicht stillschweigend aendern
- Autoritative Spielregeln nicht in den Client verlagern.
