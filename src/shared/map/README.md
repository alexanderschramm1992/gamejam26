# Map Module

## Zweck
- Definiert die Stadtkarte mit Straßen, Gebäuden, POIs und Navigationspfaden.
- Stellt Abfragefunktionen für Missionen, Spawns und Navigation bereit.

## Kartengröße und Struktur

### Grid-Basis
- **Tile-Größe**: 256px × 256px
- **Kartengröße**: 26 Tiles × 22 Tiles = **6656px × 5632px**
- **Straßen-Breite**: 256px (1 Tile)
- **Straßen, Wasser und Brücken** bleiben auf dem 256er Raster, damit Street-Tiles und Welt-Assets proportional bleiben.

### Layout-Prinzip
- Die Karte ist 4x so groß in der Fläche wie zuvor.
- Die Tile-Größe bleibt unverändert; vergrößert wurde nur das Stadtlayout.
- Das Straßennetz wird über Tile-Zonen definiert und im Client automatisch mit Street-Tiles belegt.
- Navigationsknoten werden aus allen Straßen-Tiles automatisch erzeugt.
- Gebäude werden auf freien Blockflächen verteilt, ohne Straßen, Wasser, Brücken oder Parks zu überdecken.

## Inhalt der Datei

### cityMap.ts
- **CITY_MAP**: Hauptkartenobjekt mit `width`, `height`, `roads`, `buildings`, `parks`, `water`, `bridges`, `chargeStations`, `boostLanes`, `dispatchPoints`, `deliveryPoints`, `enemyHotspots`, `navigationNodes` und `playerSpawns`
- **TILE_SIZE**: Zentrale Rastergröße für Kartenlogik und Street-Tile-Rendering
- Hilfsfunktionen für Tile-Zonen, POIs, Navigation und Pfadsuche

## Darf geändert werden
- Straßen-, Park-, Wasser- und Brückenzonen, solange sie auf dem 256er Raster bleiben
- Positionen und Anzahl von POIs, Spawns und Hotspots
- Verteilung und Größe der Gebäude innerhalb freier Flächen

## Nicht stillschweigend ändern
- **TILE_SIZE** ohne passende Anpassung im Renderer und Asset-Alignment
- Kartendimensionen auf Werte, die keine Vielfachen von 256 sind
- Navigationslogik so, dass Straßenzellen nicht mehr zusammenhängend erreichbar sind

## Abhängigkeiten
- **client/StreetTileRenderer.ts**: Rendert Straßen anhand der Tile-Zonen
- **client/render.ts**: Zeichnet Weltgeometrie, Gebäude, Parks, Wasser und POIs
- **server/features/map/worldQueries.ts**: Nutzt Kartendaten für Kollisionen und Oberflächenabfragen
- **server/features/missions/missionSystem.ts** und **server/features/enemies/enemySystem.ts**: Nutzen Delivery- und Hotspot-POIs
