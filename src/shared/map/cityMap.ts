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
  ["riverside-west", 6, 0, 1, 22],
  ["civic-avenue", 11, 0, 1, 22],
  ["dispatch-spine", 14, 0, 1, 22],
  ["garden-avenue", 17, 0, 1, 17],
  ["harbor-spine", 20, 0, 1, 22],
  ["outer-east", 23, 0, 1, 22],
  ["north-loop", 0, 1, 26, 1],
  ["old-town-crossing", 0, 4, 18, 1],
  ["market-crossing", 0, 6, 24, 1],
  ["midtown-boulevard", 1, 8, 20, 1],
  ["warehouse-row", 3, 10, 21, 1],
  ["civic-ring", 0, 12, 21, 1],
  ["south-cut", 2, 14, 14, 1],
  ["river-market-road", 0, 16, 20, 1],
  ["harbor-front", 14, 17, 12, 1],
  ["grand-bypass", 0, 18, 24, 1],
  ["terminal-way", 4, 20, 20, 1]
] as const;

const WATER_LAYOUT = [
  ["central-canal", 7, 0, 4, 22],
  ["harbor-basin", 18, 15, 5, 6]
] as const;

const BRIDGE_LAYOUT = [
  ["north-bridge", 7, 1, 4, 1],
  ["midtown-bridge", 7, 8, 4, 1],
  ["civic-bridge", 7, 12, 4, 1],
  ["terminal-bridge", 7, 20, 4, 1],
  ["harbor-front-bridge", 18, 17, 5, 1],
  ["terminal-basin-bridge", 18, 20, 5, 1],
  ["harbor-spine-bridge", 20, 15, 1, 6]
] as const;

const PARK_LAYOUT = [
  ["west-garden", 2, 13, 2, 3],
  ["riverside-garden", 15, 2, 2, 3],
  ["civic-green", 12, 4, 2, 2],
  ["canal-commons", 12, 14, 2, 2],
  ["terminal-green", 21, 9, 2, 2],
  ["harbor-park", 24, 15, 2, 4]
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
  cellKey(5, 18),
  cellKey(18, 9),
  cellKey(24, 14)
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
    circlePoi("charge-west", "Old Town Charge", 4, 6, 96),
    circlePoi("charge-riverside", "Riverside Charge", 11, 8, 96),
    circlePoi("charge-central", "Civic Charge", 14, 12, 96),
    circlePoi("charge-harbor", "Harbor Charge", 20, 18, 96),
    circlePoi("charge-east", "Skyline Charge", 23, 8, 96)
  ],
  boostLanes: [
    { id: "boost-west", x: tile(4) + 30, y: tile(2) + 20, width: 196, height: tile(4) - 40, heading: Math.PI / 2 },
    { id: "boost-civic", x: tile(11) + 20, y: tile(12) + 30, width: tile(5) - 40, height: 196, heading: 0 },
    { id: "boost-harbor", x: tile(20) + 30, y: tile(15) + 20, width: 196, height: tile(4) - 40, heading: Math.PI / 2 },
    { id: "boost-terminal", x: tile(20) + 24, y: tile(20) + 30, width: tile(3) - 48, height: 196, heading: 0 }
  ],
  dispatchPoints: [
    circlePoi("dispatch-central", "Civic Dispatch", 14, 12, 112)
  ],
  deliveryPoints: [
    circlePoi("delivery-old-town", "Old Town Corner", 1, 1, 110),
    circlePoi("delivery-market", "Riverside Market", 6, 6, 110),
    circlePoi("delivery-midtown", "Midtown Exchange", 11, 10, 110),
    circlePoi("delivery-garden", "Garden Quarter", 17, 4, 110),
    circlePoi("delivery-harbor", "Harbor Plaza", 20, 17, 110),
    circlePoi("delivery-terminal", "Terminal Gate", 23, 20, 110),
    circlePoi("delivery-south", "South Commons", 14, 18, 110)
  ],
  enemyHotspots: [
    circlePoi("hotspot-canal-north", "Canal North", 6, 2, 120),
    circlePoi("hotspot-warehouse", "Warehouse Row", 11, 10, 120),
    circlePoi("hotspot-south", "South Commons", 14, 18, 120),
    circlePoi("hotspot-harbor", "Harbor Pack", 20, 20, 120),
    circlePoi("hotspot-east", "Outer East", 23, 6, 120)
  ],
  navigationNodes,
  playerSpawns: [
    point(14, 12, 0.34, 0.34),
    point(14, 12, 0.66, 0.34),
    point(14, 12, 0.34, 0.66),
    point(14, 12, 0.66, 0.66)
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
