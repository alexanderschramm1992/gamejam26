# Map Module

## Zweck
- Definiert die Stadtkarte mit Straßen, Gebäuden, POIs und Navigationspfaden.
- Stellt Abfragefunktionen für Missionen, Spawns und Navigation bereit.

## Kartengröße und Struktur

### Grid-Basis (seit Rebuild)
- **Tile-Größe**: 256px × 256px (entspricht Asset-Größe)
- **Kartengröße**: 13 Tiles × 11 Tiles = **3328px × 2816px**
- **Straßen-Breite**: 256px (1 Tile)
- **Straßen-Länge**: Vielfache von 256px

### Straßen-Layout
```
Vertikal (von West nach Ost):
- road-west:     x=256,   width=256, height=2816 (11 Tiles)
- road-central:  x=1024,  width=256, height=2816
- road-east:     x=1792,  width=256, height=2816
- road-far-east: x=2560,  width=256, height=2816

Horizontal (von Nord nach Süd):
- road-north:    y=256,   height=256, width=3328 (13 Tiles)
- road-mid:      y=1280,  height=256, width=3328
- road-south:    y=2304,  height=256, width=3328
```

### Tile-Positionen der Navigation Nodes
```
        Tile 1   Tile 4   Tile 7   Tile 10
Row 1   n1       n2       n3       n4      (y = 384)
Row 2   n5       n6       n7       n8      (y = 1408)
Row 3   n9       n10      n11      n12     (y = 2432)
```

## Inhalt der Datei

### cityMap.ts
- **CITY_MAP**: Hauptkartenobject mit:
  - `width`, `height`: Kartendimensionen
  - `roads`: Straßengeometrie
  - `buildings`: Gebäude als Kollisionsobjekte
  - `chargeStations`: Ladestationen (POIs)
  - `boostLanes`: Schnellladespuren
  - `dispatchPoints`: Dispatch-Zentrale
  - `deliveryPoints`: Lieferziele
  - `enemyHotspots`: Gegner-Spawn-Zonen
  - `navigationNodes`: Navigationsgraph-Knoten
  - `playerSpawns`: Spieler-Startpositionen

### Hilfsfunktionen
- `findPoiById(id)`: Findet POI nach ID
- `findNearestNavigationNode(position)`: Findet nächsten Navigationspunkt
- `findPath(startId, goalId)`: Berechnet Navigationspfad (BFS)

## Darf geändert werden
- Koordinaten und Positionen der POIs (sollten aber auf Tile-Grenzen bleiben)
- Gebäudepositionen und -größen
- Navigation Node Positionen und Verbindungen
- Neue POIs oder Gebäude hinzufügen

## Nicht stillschweigend ändern
- **Straßen-Geometrie**: Breite und Länge müssen Vielfache von 256 bleiben
- **Kartendimensionen**: Müssen Vielfache von 256 bleiben
- **Navigationsgraph**: Nur mit Vorsicht ändern (beeinflusst pathfinding)
- Die TILE_SIZE-Konstante: Ist zentral für Asset-Alignment

## Performance-Hinweise
- Navigation Nodes sollten nicht zu dicht beieinander liegen (>200px minimum)
- Gebäude-Kollisionen sind achsenausgerichtet (AABB)
- Boost-Lanes und POIs verwenden Kreis-Kollisionen

## Abhängigkeiten
- **client/StreetTileRenderer.ts**: Rendert die Kartengröße und Straßen
- **server/features/map/worldQueries.ts**: Nutzt Kartendaten für Abfragen
- **shared/config/gameConfig.ts**: Nutzt Map-Dimensionen für Arena-Padding

## Zusammenhang mit Assets
- Street Tiles sind alle 256×256px
- Vertikale Straßen verwenden road-02 Tiles (oder Varianten)
- Horizontale Straßen verwenden road-01 Tiles (oder Varianten)
- Kreuzungen entstehen automatisch durch Überlagerung

