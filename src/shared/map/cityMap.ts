import type { CirclePoi, NavigationNode, RectZone, Vec2, WorldMapData } from "../model/types";
import { distance } from "../utils/math";

export const TILE_SIZE = 256;
const MAP_WIDTH_TILES = 26;
const MAP_HEIGHT_TILES = 22;

const tile = (units: number): number => units * TILE_SIZE;
const cellKey = (col: number, row: number): string => `${col},${row}`;

const parseCellKey = (key: string): [number, number] => {
  const [col, row] = key.split(",").map(Number);
  return [col, row];
};

const zone = (id: string, x: number, y: number, width: number, height: number): RectZone => ({
  id,
  x,
  y,
  width,
  height
});

const tileZone = (id: string, col: number, row: number, width: number, height: number): RectZone =>
  zone(id, tile(col), tile(row), tile(width), tile(height));

const point = (col: number, row: number, offsetX = 0.5, offsetY = 0.5): Vec2 => ({
  x: tile(col + offsetX),
  y: tile(row + offsetY)
});

type TileLayoutEntry = readonly [id: string, col: number, row: number, width: number, height: number];

const circlePoi = (id: string, label: string, col: number, row: number, radius: number): CirclePoi => ({
  id,
  label,
  x: tile(col + 0.5),
  y: tile(row + 0.5),
  radius
});

const ROAD_LAYOUT = [
  ["west-artery", 1, 0, 1, 22],
  ["market-west", 4, 0, 1, 22],
  ["civic-avenue", 11, 0, 1, 22],
  ["dispatch-spine", 15, 0, 1, 22],
  ["harbor-spine", 20, 0, 1, 22],
  ["outer-east", 24, 0, 1, 22],
  ["north-loop", 0, 1, 26, 1],
  ["old-town-crossing", 0, 5, 18, 1],
  ["midtown-boulevard", 2, 9, 19, 1],
  ["civic-ring", 0, 13, 21, 1],
  ["harbor-front", 12, 17, 13, 1],
  ["terminal-way", 3, 20, 22, 1]
] as const;

const WATER_LAYOUT: readonly TileLayoutEntry[] = [];

const BRIDGE_LAYOUT: readonly TileLayoutEntry[] = [];

const PARK_LAYOUT = [
  ["west-garden", 2, 14, 2, 3],
  ["riverside-garden", 16, 2, 3, 2],
  ["civic-green", 12, 6, 2, 2],
  ["canal-commons", 16, 14, 3, 2],
  ["terminal-green", 21, 10, 2, 2],
  ["south-pocket-park", 5, 17, 2, 2]
] as const;

const roads = ROAD_LAYOUT.map(([id, col, row, width, height]) => tileZone(id, col, row, width, height));
const water = WATER_LAYOUT.map(([id, col, row, width, height]) => tileZone(id, col, row, width, height));
const bridges = BRIDGE_LAYOUT.map(([id, col, row, width, height]) => tileZone(id, col, row, width, height));
const parks = PARK_LAYOUT.map(([id, col, row, width, height]) => tileZone(id, col, row, width, height));

const collectTileCells = (zones: RectZone[]): Set<string> => {
  const cells = new Set<string>();

  for (const region of zones) {
    const startCol = Math.round(region.x / TILE_SIZE);
    const startRow = Math.round(region.y / TILE_SIZE);
    const width = Math.round(region.width / TILE_SIZE);
    const height = Math.round(region.height / TILE_SIZE);

    for (let col = startCol; col < startCol + width; col += 1) {
      for (let row = startRow; row < startRow + height; row += 1) {
        cells.add(cellKey(col, row));
      }
    }
  }

  return cells;
};

const roadCells = collectTileCells(roads);
const waterCells = collectTileCells(water);
const parkCells = collectTileCells(parks);

const buildNavigationNodes = (cells: Set<string>): NavigationNode[] =>
  Array.from(cells)
    .map(parseCellKey)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([col, row]) => ({
      id: `road-${col}-${row}`,
      x: tile(col + 0.5),
      y: tile(row + 0.5),
      neighbors: [
        [col - 1, row],
        [col + 1, row],
        [col, row - 1],
        [col, row + 1]
      ]
        .filter(([neighborCol, neighborRow]) => cells.has(cellKey(neighborCol, neighborRow)))
        .map(([neighborCol, neighborRow]) => `road-${neighborCol}-${neighborRow}`)
    }));

const navigationNodes = buildNavigationNodes(roadCells);
const navigationNodeById = new Map(navigationNodes.map((node) => [node.id, node] as const));

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const OPEN_LOT_CELLS = new Set([
  cellKey(0, 0),
  cellKey(2, 0),
  cellKey(18, 10),
  cellKey(23, 14),
  cellKey(25, 21)
]);

const createBuildingZone = (
  id: string,
  col: number,
  row: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): RectZone => zone(id, tile(col) + offsetX, tile(row) + offsetY, width, height);

const createBuildingCluster = (col: number, row: number): RectZone[] => {
  const seed = hashString(`${col}:${row}`);
  if (seed % 13 === 0) {
    return [];
  }

  const baseId = `b-${col}-${row}`;
  const make = (
    suffix: string,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number
  ): RectZone => createBuildingZone(`${baseId}-${suffix}`, col, row, offsetX, offsetY, width, height);

  switch (seed % 6) {
    case 0:
      return [
        make("a", 24, 120, 88, 96),
        make("b", 128, 108, 102, 112)
      ];
    case 1:
      return [
        make("a", 28, 88, 122, 136),
        make("b", 162, 132, 60, 78)
      ];
    case 2:
      return [
        make("a", 26, 136, 78, 84),
        make("b", 114, 132, 82, 90),
        make("c", 70, 78, 118, 100)
      ];
    case 3:
      return [
        make("a", 28, 98, 92, 126),
        make("b", 136, 88, 86, 136)
      ];
    case 4:
      return [
        make("a", 28, 134, 74, 84),
        make("b", 112, 136, 72, 80),
        make("c", 64, 76, 124, 110)
      ];
    default:
      return [
        make("a", 36, 102, 142, 122)
      ];
  }
};

const buildings: RectZone[] = [];

for (let row = 0; row < MAP_HEIGHT_TILES; row += 1) {
  for (let col = 0; col < MAP_WIDTH_TILES; col += 1) {
    const key = cellKey(col, row);
    if (roadCells.has(key) || waterCells.has(key) || parkCells.has(key) || OPEN_LOT_CELLS.has(key)) {
      continue;
    }

    buildings.push(...createBuildingCluster(col, row));
  }
}

export const CITY_MAP: WorldMapData = {
  width: TILE_SIZE * MAP_WIDTH_TILES,
  height: TILE_SIZE * MAP_HEIGHT_TILES,
  roads,
  buildings,
  parks,
  water,
  bridges,
  chargeStations: [
    circlePoi("charge-west", "Old Town Charge", 4, 5, 96),
    circlePoi("charge-riverside", "Riverside Charge", 11, 9, 96),
    circlePoi("charge-central", "Civic Charge", 15, 13, 96),
    circlePoi("charge-harbor", "Harbor Charge", 20, 17, 96),
    circlePoi("charge-east", "Skyline Charge", 24, 9, 96)
  ],
  boostLanes: [
    { id: "boost-west", x: tile(4) + 30, y: tile(2) + 20, width: 196, height: tile(3) - 40, heading: Math.PI / 2 },
    { id: "boost-civic", x: tile(11) + 20, y: tile(13) + 30, width: tile(4) - 40, height: 196, heading: 0 },
    { id: "boost-harbor", x: tile(20) + 30, y: tile(14) + 20, width: 196, height: tile(3) - 40, heading: Math.PI / 2 },
    { id: "boost-terminal", x: tile(20) + 24, y: tile(20) + 30, width: tile(4) - 48, height: 196, heading: 0 }
  ],
  dispatchPoints: [
    circlePoi("dispatch-central", "Civic Dispatch", 15, 13, 112)
  ],
  deliveryPoints: [
    circlePoi("delivery-old-town", "Old Town Corner", 1, 1, 110),
    circlePoi("delivery-market", "Riverside Market", 4, 9, 110),
    circlePoi("delivery-midtown", "Midtown Exchange", 11, 5, 110),
    circlePoi("delivery-garden", "Garden Quarter", 15, 17, 110),
    circlePoi("delivery-harbor", "Harbor Plaza", 20, 17, 110),
    circlePoi("delivery-terminal", "Terminal Gate", 24, 20, 110),
    circlePoi("delivery-south", "South Commons", 15, 20, 110)
  ],
  enemyHotspots: [
    circlePoi("hotspot-west", "Old Town Crew", 4, 2, 120),
    circlePoi("hotspot-canal", "Canal North", 11, 9, 120),
    circlePoi("hotspot-central", "Civic Ring", 15, 13, 120),
    circlePoi("hotspot-harbor", "Harbor Pack", 20, 20, 120),
    circlePoi("hotspot-east", "Outer East", 24, 5, 120)
  ],
  navigationNodes,
  playerSpawns: [
    point(15, 13, 0.34, 0.34),
    point(15, 13, 0.66, 0.34),
    point(15, 13, 0.34, 0.66),
    point(15, 13, 0.66, 0.66)
  ]
};

export const findPoiById = (id: string): CirclePoi | undefined =>
  [
    ...CITY_MAP.chargeStations,
    ...CITY_MAP.dispatchPoints,
    ...CITY_MAP.deliveryPoints,
    ...CITY_MAP.enemyHotspots
  ].find((poi) => poi.id === id);

export const findNearestNavigationNode = (position: Vec2): NavigationNode =>
  CITY_MAP.navigationNodes.reduce((best, node) =>
    distance(position, node) < distance(position, best) ? node : best
  );

export const findPath = (startId: string, goalId: string): NavigationNode[] => {
  if (startId === goalId) {
    const node = navigationNodeById.get(startId);
    return node ? [node] : [];
  }

  const queue = [startId];
  const visited = new Set(queue);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    if (currentId === goalId) break;

    const currentNode = navigationNodeById.get(currentId);
    if (!currentNode) continue;

    for (const neighborId of currentNode.neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      previous.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  if (!visited.has(goalId)) {
    return [];
  }

  const pathIds: string[] = [goalId];
  let cursor = goalId;

  while (previous.has(cursor)) {
    cursor = previous.get(cursor)!;
    pathIds.unshift(cursor);
  }

  return pathIds
    .map((pathId) => navigationNodeById.get(pathId))
    .filter((node): node is NavigationNode => Boolean(node));
};
