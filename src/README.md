# Source

## Zweck
- Oberordner fuer die neue Spielimplementierung.

## Bereiche
- `client`: Rendering, HUD, Input und Audio im Browser.
- `server`: Autoritative Spiellogik und Networking.
- `shared`: Gemeinsame Datenmodelle, Konfiguration und Kartendaten.

## Darf geaendert werden
- Additive Erweiterungen innerhalb der jeweiligen Zustaendigkeiten.

## Nicht stillschweigend aendern
- Modulgrenzen nicht ohne guten Grund von Feature-orientiert auf Layer-orientiert umbauen.
