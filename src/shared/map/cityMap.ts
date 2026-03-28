import type { CirclePoi, NavigationNode, Vec2, WorldMapData } from "../model/types";
import { distance } from "../utils/math";

// Grid-based map using 256px tiles
// Tile size: 256x256 (asset size)
// Street widths: multiples of 256
// Street lengths: multiples of 256

// Grid constants (in tiles)
const TILE_SIZE = 256;
const MAP_WIDTH_TILES = 13; // 13 * 256 = 3328px
const MAP_HEIGHT_TILES = 11; // 11 * 256 = 2816px

const navigationNodes: NavigationNode[] = [
  // Row 1 (North)
  { id: "n1", x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5, neighbors: ["n2", "n5"] },
  { id: "n2", x: TILE_SIZE * 4.5, y: TILE_SIZE * 1.5, neighbors: ["n1", "n3", "n6"] },
  { id: "n3", x: TILE_SIZE * 7.5, y: TILE_SIZE * 1.5, neighbors: ["n2", "n4", "n7"] },
  { id: "n4", x: TILE_SIZE * 10.5, y: TILE_SIZE * 1.5, neighbors: ["n3", "n8"] },
  // Row 2 (Central)
  { id: "n5", x: TILE_SIZE * 1.5, y: TILE_SIZE * 5.5, neighbors: ["n1", "n6", "n9"] },
  { id: "n6", x: TILE_SIZE * 4.5, y: TILE_SIZE * 5.5, neighbors: ["n2", "n5", "n7", "n10"] },
  { id: "n7", x: TILE_SIZE * 7.5, y: TILE_SIZE * 5.5, neighbors: ["n3", "n6", "n8", "n11"] },
  { id: "n8", x: TILE_SIZE * 10.5, y: TILE_SIZE * 5.5, neighbors: ["n4", "n7", "n12"] },
  // Row 3 (South)
  { id: "n9", x: TILE_SIZE * 1.5, y: TILE_SIZE * 9.5, neighbors: ["n5", "n10"] },
  { id: "n10", x: TILE_SIZE * 4.5, y: TILE_SIZE * 9.5, neighbors: ["n6", "n9", "n11"] },
  { id: "n11", x: TILE_SIZE * 7.5, y: TILE_SIZE * 9.5, neighbors: ["n7", "n10", "n12"] },
  { id: "n12", x: TILE_SIZE * 10.5, y: TILE_SIZE * 9.5, neighbors: ["n8", "n11"] }
];

export const CITY_MAP: WorldMapData = {
  width: TILE_SIZE * MAP_WIDTH_TILES,  // 3328px
  height: TILE_SIZE * MAP_HEIGHT_TILES,  // 2816px
  roads: [
    // Vertical roads (width = 1 tile = 256px)
    { id: "road-west", x: TILE_SIZE, y: 0, width: TILE_SIZE, height: TILE_SIZE * 11 },
    { id: "road-central", x: TILE_SIZE * 4, y: 0, width: TILE_SIZE, height: TILE_SIZE * 11 },
    { id: "road-east", x: TILE_SIZE * 7, y: 0, width: TILE_SIZE, height: TILE_SIZE * 11 },
    { id: "road-far-east", x: TILE_SIZE * 10, y: 0, width: TILE_SIZE, height: TILE_SIZE * 11 },
    // Horizontal roads (height = 1 tile = 256px)
    { id: "road-north", x: 0, y: TILE_SIZE, width: TILE_SIZE * 13, height: TILE_SIZE },
    { id: "road-mid", x: 0, y: TILE_SIZE * 5, width: TILE_SIZE * 13, height: TILE_SIZE },
    { id: "road-south", x: 0, y: TILE_SIZE * 9, width: TILE_SIZE * 13, height: TILE_SIZE }
  ],
  buildings: [
    // BLOCK 1: x: 512-1024 (between road-west and road-central)
    // North section (y: 520-1270)
    { id: "b1", x: 530, y: 540, width: 180, height: 180 },
    { id: "b2", x: 530, y: 750, width: 180, height: 160 },
    { id: "b3", x: 530, y: 950, width: 160, height: 180 },
    { id: "b4", x: 750, y: 540, width: 200, height: 200 },
    { id: "b5", x: 750, y: 780, width: 180, height: 190 },
    // South section (y: 1544-2294)
    { id: "b6", x: 530, y: 1560, width: 180, height: 180 },
    { id: "b7", x: 530, y: 1800, width: 200, height: 160 },
    { id: "b8", x: 530, y: 2000, width: 170, height: 170 },
    { id: "b9", x: 750, y: 1560, width: 190, height: 190 },
    { id: "b10", x: 750, y: 1800, width: 180, height: 200 },

    // BLOCK 2: x: 1280-1792 (between road-central and road-east)
    // North section (y: 520-1270)
    { id: "b11", x: 1300, y: 540, width: 200, height: 180 },
    { id: "b12", x: 1300, y: 750, width: 180, height: 190 },
    { id: "b13", x: 1300, y: 970, width: 160, height: 180 },
    { id: "b14", x: 1520, y: 540, width: 180, height: 200 },
    { id: "b15", x: 1520, y: 780, width: 190, height: 170 },
    // South section (y: 1544-2294)
    { id: "b16", x: 1300, y: 1560, width: 180, height: 180 },
    { id: "b17", x: 1300, y: 1800, width: 190, height: 200 },
    { id: "b18", x: 1300, y: 2040, width: 200, height: 160 },
    { id: "b19", x: 1520, y: 1560, width: 170, height: 190 },
    { id: "b20", x: 1520, y: 1800, width: 180, height: 180 },

    // BLOCK 3: x: 2048-2560 (between road-east and road-far-east)
    // North section (y: 520-1270)
    { id: "b21", x: 2070, y: 540, width: 190, height: 190 },
    { id: "b22", x: 2070, y: 770, width: 180, height: 200 },
    { id: "b23", x: 2070, y: 1010, width: 200, height: 170 },
    { id: "b24", x: 2290, y: 540, width: 180, height: 180 },
    { id: "b25", x: 2290, y: 760, width: 200, height: 190 },
    // South section (y: 1544-2294)
    { id: "b26", x: 2070, y: 1560, width: 200, height: 180 },
    { id: "b27", x: 2070, y: 1800, width: 180, height: 190 },
    { id: "b28", x: 2070, y: 2020, width: 190, height: 170 },
    { id: "b29", x: 2290, y: 1560, width: 180, height: 200 },
    { id: "b30", x: 2290, y: 1800, width: 190, height: 180 }
  ],
  chargeStations: [
    { id: "charge-west", label: "West Charge", x: TILE_SIZE * 2.5, y: TILE_SIZE * 6.5, radius: 96 },
    { id: "charge-central", label: "Metro Charge", x: TILE_SIZE * 5.5, y: TILE_SIZE * 3.5, radius: 96 },
    { id: "charge-east", label: "Arcade Charge", x: TILE_SIZE * 8.5, y: TILE_SIZE * 6.5, radius: 96 }
  ],
  boostLanes: [
    { id: "boost-1", x: TILE_SIZE * 4 + 30, y: TILE_SIZE * 2 + 20, width: 196, height: 768, heading: Math.PI / 2 },
    { id: "boost-2", x: TILE_SIZE * 7 + 30, y: TILE_SIZE * 6 + 20, width: 196, height: 768, heading: Math.PI / 2 },
    { id: "boost-3", x: TILE_SIZE * 4 + 20, y: TILE_SIZE * 8 + 20, width: 768, height: 196, heading: 0 }
  ],
  dispatchPoints: [
    { id: "dispatch-central", label: "Sushi Hub", x: TILE_SIZE * 1.5, y: TILE_SIZE * 9.5, radius: 112 }
  ],
  deliveryPoints: [
    { id: "delivery-docks", label: "Old Port Tower", x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5, radius: 110 },
    { id: "delivery-harbor", label: "Harbor Plaza", x: TILE_SIZE * 10.5, y: TILE_SIZE * 1.5, radius: 110 },
    { id: "delivery-arcade", label: "Arcade Hub", x: TILE_SIZE * 7.5, y: TILE_SIZE * 5.5, radius: 110 },
    { id: "delivery-solar", label: "Solar Market", x: TILE_SIZE * 10.5, y: TILE_SIZE * 9.5, radius: 110 }
  ],
  enemyHotspots: [
    { id: "hotspot-north", label: "Diesel Nest", x: TILE_SIZE * 7.5, y: TILE_SIZE * 1.5, radius: 120 },
    { id: "hotspot-west", label: "Tunnel Pack", x: TILE_SIZE * 4.5, y: TILE_SIZE * 9.5, radius: 120 },
    { id: "hotspot-east", label: "Refinery Pack", x: TILE_SIZE * 10.5, y: TILE_SIZE * 5.5, radius: 120 }
  ],
  navigationNodes,
  playerSpawns: [
    { x: TILE_SIZE * 1.5 - 40, y: TILE_SIZE * 9.5 - 40 },
    { x: TILE_SIZE * 1.5 + 40, y: TILE_SIZE * 9.5 - 40 },
    { x: TILE_SIZE * 1.5 - 40, y: TILE_SIZE * 9.5 + 40 },
    { x: TILE_SIZE * 1.5 + 40, y: TILE_SIZE * 9.5 + 40 }
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
    const node = CITY_MAP.navigationNodes.find((candidate) => candidate.id === startId);
    return node ? [node] : [];
  }

  const queue = [startId];
  const visited = new Set(queue);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    if (currentId === goalId) break;

    const currentNode = CITY_MAP.navigationNodes.find((candidate) => candidate.id === currentId);
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
    .map((pathId) => CITY_MAP.navigationNodes.find((node) => node.id === pathId))
    .filter((node): node is NavigationNode => Boolean(node));
};
