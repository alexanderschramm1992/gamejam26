# Shared

## Zweck
- Gemeinsame Karten-, Balance- und Hilfsdaten fuer Client und Server.

## Dateien
- `game.js`: Weltgroesse, POIs, Gebaeude, Gegnerdefinitionen und Geometrie-Helfer.

## Darf geaendert werden
- Statische Map-Daten, Balancing-Werte und pure Hilfsfunktionen.

## Nicht stillschweigend aendern
- Koordinatensystem der Welt.
- Benennung zentraler POIs wie Spawnpunkt und Lieferziel.
- Pure Hilfsfunktionen so umbauen, dass Client und Server voneinander abweichen.

## Abhaengigkeiten
- Wird vom Browser-Client und vom Node-Server verwendet.
