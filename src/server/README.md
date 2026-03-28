# Server

## Zweck
- Autoritative Simulation des Multiplayer-Spiels.

## Verantwortlichkeiten
- HTTP-Hosting fuer den Client.
- WebSocket-Synchronisation.
- Fahrphysik, Kampf, Missionen, Akku, Gegner und Spawn-Logik.

## Darf geaendert werden
- Spielregeln und Simulation, solange die Schnittstellen nachvollziehbar bleiben.

## Nicht stillschweigend aendern
- Die Autoritaet des Servers nicht aufbrechen oder kritische State-Entscheidungen in den Client verschieben.
