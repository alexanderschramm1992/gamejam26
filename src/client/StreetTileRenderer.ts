/**
 * StreetTileRenderer.ts
 * Manages loading and rendering of street tile assets for the city map.
 * Replaces geometric road drawing with tiled sprite rendering.
 */

import { CITY_MAP } from "../shared/map/cityMap";

export interface TileAsset {
  name: string;
  image: HTMLImageElement | null;
  tileSize: number;
  loadingPromise: Promise<void> | null;
}

// Tile asset catalog
const TILE_CATALOG: Record<string, string> = {
  // straight roads
  roadStraight: "/assets/street_tiles/DQ-SF_city_tiles_road_01A.png",
  // curve roads
  roadCurve: "/assets/street_tiles/DQ-SF_city_tiles_road_03A.png",
  // intersection roads
  roadIntersection: "/assets/street_tiles/DQ-SF_city_tiles_road_05A.png"
};

// Tile loading state
const tiles: Map<string, TileAsset> = new Map();
let masterLoadingPromise: Promise<void> | null = null;

/**
 * Load a single tile asset
 */
const loadTile = (name: string, path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      tiles.set(name, {
        name,
        image: img,
        tileSize: Math.min(img.width, img.height),
        loadingPromise: null
      });
      console.log(`[StreetTiles] Loaded ${name}: ${img.width}x${img.height}`);
      resolve();
    };
    img.onerror = () => {
      console.error(`[StreetTiles] Failed to load ${name} from ${path}`);
      reject(new Error(`Failed to load tile: ${name}`));
    };
    img.src = path;
  });
};

/**
 * Load all street tile assets
 */
export const loadStreetTiles = (): Promise<void> => {
  if (masterLoadingPromise) {
    return masterLoadingPromise;
  }

  masterLoadingPromise = Promise.all(
    Object.entries(TILE_CATALOG).map(([name, path]) => loadTile(name, path))
  ).then(() => {
    console.log(`[StreetTiles] All ${tiles.size} tiles loaded successfully`);
  });

  return masterLoadingPromise;
};

/**
 * Get a tile asset by name
 */
const getTile = (name: string): HTMLImageElement | null => {
  const asset = tiles.get(name);
  return asset?.image ?? null;
};

/**
 * Find all intersection areas if a road segment overlaps with other roads
 */
const findAllIntersectionAreas = (road: any, allRoads: any[]): any[] => {
  const intersections: any[] = [];
  
  // Für vertikale Straßen: suche horizontale Straßen zum Kreuzen
  if (road.width < road.height) {
    for (const otherRoad of allRoads) {
      if (otherRoad.width > otherRoad.height && otherRoad !== road) { // horizontale Straße
        // Prüfe ob sie sich kreuzen
        const xOverlap = !(road.x + road.width < otherRoad.x || road.x > otherRoad.x + otherRoad.width);
        const yOverlap = !(road.y + road.height < otherRoad.y || road.y > otherRoad.y + otherRoad.height);
        
        if (xOverlap && yOverlap) {
          // Berechne die Kreuzungsfläche
          intersections.push({
            x: Math.max(road.x, otherRoad.x),
            y: Math.max(road.y, otherRoad.y),
            width: Math.min(road.x + road.width, otherRoad.x + otherRoad.width) - Math.max(road.x, otherRoad.x),
            height: Math.min(road.y + road.height, otherRoad.y + otherRoad.height) - Math.max(road.y, otherRoad.y)
          });
        }
      }
    }
  }
  
  // Für horizontale Straßen: suche vertikale Straßen zum Kreuzen
  if (road.height < road.width) {
    for (const otherRoad of allRoads) {
      if (otherRoad.width < otherRoad.height && otherRoad !== road) { // vertikale Straße
        // Prüfe ob sie sich kreuzen
        const xOverlap = !(road.x + road.width < otherRoad.x || road.x > otherRoad.x + otherRoad.width);
        const yOverlap = !(road.y + road.height < otherRoad.y || road.y > otherRoad.y + otherRoad.height);
        
        if (xOverlap && yOverlap) {
          // Berechne die Kreuzungsfläche
          intersections.push({
            x: Math.max(road.x, otherRoad.x),
            y: Math.max(road.y, otherRoad.y),
            width: Math.min(road.x + road.width, otherRoad.x + otherRoad.width) - Math.max(road.x, otherRoad.x),
            height: Math.min(road.y + road.height, otherRoad.y + otherRoad.height) - Math.max(road.y, otherRoad.y)
          });
        }
      }
    }
  }
  
  return intersections;
};

/**
 * Draw a tiled road segment using street tile assets
 */
const drawTiledRoad = (
  ctx: CanvasRenderingContext2D,
  road: any
): void => {
  const tileVariant = "roadStraight";
  const tileImage = getTile(tileVariant);

  if (!tileImage) {
    // Fallback: draw solid color if tile not loaded
    ctx.fillStyle = "#18384b";
    ctx.fillRect(road.x, road.y, road.width, road.height);
    return;
  }

  // Calculate tile size for rendering (adapt to road dimensions)
  const tileSize = 64; // Standard tile size for rendering
  const isHorizontal = road.width > road.height;

  // Determine how to tile the road
  if (isHorizontal) {
    // Tile horizontally
    for (let x = road.x; x < road.x + road.width; x += tileSize) {
      const drawWidth = Math.min(tileSize, road.x + road.width - x);
      ctx.drawImage(
        tileImage,
        0, 0, tileImage.width, tileImage.height,
        x, road.y, drawWidth, road.height
      );
    }
  } else {
    // Tile vertically with 90-degree rotation
    for (let y = road.y; y < road.y + road.height; y += tileSize) {
      const drawHeight = Math.min(tileSize, road.y + road.height - y);
      
      // Save current context state
      ctx.save();
      
      // Move to the center of the tile and rotate 90 degrees
      const centerX = road.x + road.width / 2;
      const centerY = y + drawHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI / 2);
      
      // Draw the rotated tile (swap width and height for the destination)
      ctx.drawImage(
        tileImage,
        0, 0, tileImage.width, tileImage.height,
        -drawHeight / 2, -road.width / 2, drawHeight, road.width
      );
      
      // Restore context state
      ctx.restore();
    }
  }
};

/**
 * Draw the complete tiled road network
 */
export const drawTiledRoads = (ctx: CanvasRenderingContext2D): void => {
  // Draw base background
  ctx.fillStyle = "#102231";
  ctx.fillRect(0, 0, CITY_MAP.width, CITY_MAP.height);

  // Draw each road with tiled sprites (straight roads)
  CITY_MAP.roads.forEach((road) => {
    drawTiledRoad(ctx, road);
  });

  // Draw intersections/curves on top
  drawIntersections(ctx);

  // Optional: Draw road markings (lane dividers) if desired
  drawRoadMarkings(ctx);
};

/**
 * Draw intersection areas with intersection tiles
 */
const drawIntersections = (ctx: CanvasRenderingContext2D): void => {
  const tileImage = getTile("roadIntersection");
  if (!tileImage) return;

  const drawnIntersections = new Set<string>(); // Verhindere doppelte Zeichnung

  // Finde alle Kreuzungsbereiche
  for (const road of CITY_MAP.roads) {
    const intersections = findAllIntersectionAreas(road, CITY_MAP.roads);
    
    for (const intersection of intersections) {
      const key = `${intersection.x},${intersection.y}`;
      if (!drawnIntersections.has(key)) {
        drawnIntersections.add(key);

        // Zeichne die gesamte Kreuzungsfläche mit einem einzelnen skaliertem Bild
        ctx.drawImage(
          tileImage,
          0, 0, tileImage.width, tileImage.height,
          intersection.x, intersection.y, intersection.width, intersection.height
        );
      }
    }
  }
};

/**
 * Draw road markings (lane dividers) on top of tiles
 */
const drawRoadMarkings = (ctx: CanvasRenderingContext2D): void => {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 4;
  for (const road of CITY_MAP.roads) {
    if (road.width > road.height) {
      const y = road.y + road.height / 2;
      for (let x = road.x + 20; x < road.x + road.width - 20; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y);
        ctx.stroke();
      }
    } else {
      const x = road.x + road.width / 2;
      for (let y = road.y + 20; y < road.y + road.height - 20; y += 42) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 20);
        ctx.stroke();
      }
    }
  }
};






