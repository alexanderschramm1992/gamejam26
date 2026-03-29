/**
 * StreetTileRenderer.ts
 * Manages loading and rendering of street tile assets for the city map.
 * Replaces geometric road drawing with tiled sprite rendering.
 */

import { CITY_MAP, TILE_SIZE } from "../shared/map/cityMap";

export interface TileAsset {
  name: string;
  image: HTMLImageElement | null;
  tileSize: number;
  loadingPromise: Promise<void> | null;
}

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PreparedRoadTile {
  x: number;
  y: number;
  col: number;
  row: number;
  tileName: string;
  rotation: number;
}

// Tile asset catalog, loaded from street tile files named after the directions they connect.
const TILE_CATALOG: Record<string, string> = {
  left: "/assets/street_tiles/left.png",
  left2: "/assets/street_tiles/left2.png",
  left3: "/assets/street_tiles/left3.png",
  left4: "/assets/street_tiles/left4.png",
  left_down: "/assets/street_tiles/left_down.png",
  left_down2: "/assets/street_tiles/left_down2.png",
  left_down3: "/assets/street_tiles/left_down3.png",
  left_down4: "/assets/street_tiles/left_down4.png",
  left_right: "/assets/street_tiles/left_right.png",
  left_right2: "/assets/street_tiles/left_right2.png",
  left_right4: "/assets/street_tiles/left_right4.png",
  left_right5: "/assets/street_tiles/left_right5.png",
  left_right_down: "/assets/street_tiles/left_right_down.png",
  left_right_down2: "/assets/street_tiles/left_right_down2.png",
  left_right_down3: "/assets/street_tiles/left_right_down3.png",
  left_right_down4: "/assets/street_tiles/left_right_down4.png",
  left_right_down_up: "/assets/street_tiles/left_right_down_up.png",
  left_right_down_up2: "/assets/street_tiles/left_right_down_up2.png",
  left_right_down_up3: "/assets/street_tiles/left_right_down_up3.png",
  none: "/assets/street_tiles/none.png"
};

const ROAD_TILE_SIZE = TILE_SIZE;
const DIRECTION_ORDER = ["left", "right", "down", "up"] as const;
type Direction = (typeof DIRECTION_ORDER)[number];

const tiles: Map<string, TileAsset> = new Map();
let masterLoadingPromise: Promise<void> | null = null;

const normalizeConnectionKey = (directions: string[]): string => {
  return directions
    .filter((direction): direction is Direction => DIRECTION_ORDER.includes(direction as Direction))
    .sort((a, b) => DIRECTION_ORDER.indexOf(a as Direction) - DIRECTION_ORDER.indexOf(b as Direction))
    .join("_");
};

const tileVariantsByKey = (() => {
  const map = new Map<string, string[]>();

  for (const tileName of Object.keys(TILE_CATALOG)) {
    const cleanedName = tileName.replace(/\d+$/, "");
    const key = cleanedName === "none" ? "" : normalizeConnectionKey(cleanedName.split("_"));
    const list = map.get(key) ?? [];
    list.push(tileName);
    map.set(key, list);
  }

  return map;
})();

const ROTATION_MAPPINGS: Record<Direction, Direction>[] = [
  { left: "left", right: "right", up: "up", down: "down" },
  { left: "up", up: "right", right: "down", down: "left" },
  { left: "right", right: "left", up: "down", down: "up" },
  { left: "down", down: "right", right: "up", up: "left" }
];

const rotationAngle = (rotationIndex: number): number => {
  return (rotationIndex * Math.PI) / 2;
};

const stableTileIndex = (col: number, row: number, count: number): number => {
  return Math.abs((col * 31 + row * 17) % count);
};

const rotateDirections = (directions: Direction[], rotationIndex: number): Direction[] => {
  const mapping = ROTATION_MAPPINGS[rotationIndex];
  return directions.map((direction) => mapping[direction]).sort((a, b) => DIRECTION_ORDER.indexOf(a) - DIRECTION_ORDER.indexOf(b));
};

const chooseTileVariant = (
  connections: Direction[],
  col: number,
  row: number
): { tileName: string; rotation: number } | null => {
  const normalizedTarget = normalizeConnectionKey(connections);

  if (normalizedTarget === "") {
    const noneCandidates = tileVariantsByKey.get("") ?? [];
    if (noneCandidates.length === 0) return null;
    return {
      tileName: noneCandidates[stableTileIndex(col, row, noneCandidates.length)],
      rotation: 0
    };
  }

  const candidates: Array<{ tileName: string; rotation: number }> = [];

  for (const [shapeKey, tileNames] of tileVariantsByKey.entries()) {
    if (!shapeKey) continue;

    const baseDirections = shapeKey.split("_") as Direction[];

    for (let rotationIndex = 0; rotationIndex < ROTATION_MAPPINGS.length; rotationIndex += 1) {
      const rotated = normalizeConnectionKey(rotateDirections(baseDirections, rotationIndex));
      if (rotated === normalizedTarget) {
        const tileName = tileNames[stableTileIndex(col, row, tileNames.length)];
        candidates.push({ tileName, rotation: rotationAngle(rotationIndex) });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const selectionIndex = stableTileIndex(col, row, candidates.length);
  return candidates[selectionIndex];
};

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

const getTile = (name: string): HTMLImageElement | null => {
  const asset = tiles.get(name);
  return asset?.image ?? null;
};

const buildRoadGrid = (): Set<string> => {
  const cells = new Set<string>();

  CITY_MAP.roads.forEach((road) => {
    const startCol = road.x / ROAD_TILE_SIZE;
    const startRow = road.y / ROAD_TILE_SIZE;
    const endCol = (road.x + road.width) / ROAD_TILE_SIZE;
    const endRow = (road.y + road.height) / ROAD_TILE_SIZE;

    for (let col = startCol; col < endCol; col += 1) {
      for (let row = startRow; row < endRow; row += 1) {
        cells.add(`${col},${row}`);
      }
    }
  });

  return cells;
};

const hasRoadAt = (cells: Set<string>, col: number, row: number): boolean => {
  return cells.has(`${col},${row}`);
};

const getConnectionsForCell = (cells: Set<string>, col: number, row: number): Direction[] => {
  if (!hasRoadAt(cells, col, row)) {
    return [];
  }

  const connections: Direction[] = [];
  if (hasRoadAt(cells, col - 1, row)) connections.push("left");
  if (hasRoadAt(cells, col + 1, row)) connections.push("right");
  if (hasRoadAt(cells, col, row + 1)) connections.push("down");
  if (hasRoadAt(cells, col, row - 1)) connections.push("up");

  return connections;
};

const roadCells = buildRoadGrid();

const preparedRoadTiles: PreparedRoadTile[] = (() => {
  const cols = CITY_MAP.width / ROAD_TILE_SIZE;
  const rows = CITY_MAP.height / ROAD_TILE_SIZE;
  const tilesToDraw: PreparedRoadTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!hasRoadAt(roadCells, col, row)) {
        continue;
      }

      const connections = getConnectionsForCell(roadCells, col, row);
      const variant = chooseTileVariant(connections, col, row);
      tilesToDraw.push({
        x: col * ROAD_TILE_SIZE,
        y: row * ROAD_TILE_SIZE,
        col,
        row,
        tileName: variant?.tileName ?? "none",
        rotation: variant?.rotation ?? 0
      });
    }
  }

  return tilesToDraw;
})();

const intersectsBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  bounds?: ViewportBounds
): boolean => {
  if (!bounds) {
    return true;
  }

  return x < bounds.right && x + width > bounds.left && y < bounds.bottom && y + height > bounds.top;
};

const drawRoadTile = (
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  tileName: string,
  rotation: number
): void => {
  const tileImage = getTile(tileName);
  if (!tileImage) {
    ctx.fillStyle = "#18384b";
    ctx.fillRect(col * ROAD_TILE_SIZE, row * ROAD_TILE_SIZE, ROAD_TILE_SIZE, ROAD_TILE_SIZE);
    return;
  }

  if (rotation === 0) {
    ctx.drawImage(
      tileImage,
      0,
      0,
      tileImage.width,
      tileImage.height,
      col * ROAD_TILE_SIZE,
      row * ROAD_TILE_SIZE,
      ROAD_TILE_SIZE,
      ROAD_TILE_SIZE
    );
    return;
  }

  const centerX = col * ROAD_TILE_SIZE + ROAD_TILE_SIZE / 2;
  const centerY = row * ROAD_TILE_SIZE + ROAD_TILE_SIZE / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.drawImage(
    tileImage,
    0,
    0,
    tileImage.width,
    tileImage.height,
    -ROAD_TILE_SIZE / 2,
    -ROAD_TILE_SIZE / 2,
    ROAD_TILE_SIZE,
    ROAD_TILE_SIZE
  );
  ctx.restore();
};

export const drawTiledRoads = (ctx: CanvasRenderingContext2D, bounds?: ViewportBounds): void => {
  for (const tile of preparedRoadTiles) {
    if (!intersectsBounds(tile.x, tile.y, ROAD_TILE_SIZE, ROAD_TILE_SIZE, bounds)) {
      continue;
    }

    drawRoadTile(ctx, tile.col, tile.row, tile.tileName, tile.rotation);
  }

  drawRoadMarkings(ctx, bounds);
};

const drawRoadMarkings = (ctx: CanvasRenderingContext2D, bounds?: ViewportBounds): void => {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 4;
  for (const road of CITY_MAP.roads) {
    if (!intersectsBounds(road.x, road.y, road.width, road.height, bounds)) {
      continue;
    }

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
