import type { CirclePoi, NavigationNode, RectZone, Vec2, WorldMapData } from "../model/types";
import { distance } from "../utils/math";

const TILE_SIZE = 256;
const MAP_WIDTH_TILES = 13;
const MAP_HEIGHT_TILES = 11;

const tile = (units: number): number => units * TILE_SIZE;

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

const navigationNodes: NavigationNode[] = [
  { id: "west-gate", x: tile(1.5), y: tile(1.5), neighbors: ["market-north", "old-town-west"] },
  { id: "market-north", x: tile(4.5), y: tile(1.5), neighbors: ["west-gate", "east-north", "old-town-market"] },
  { id: "east-north", x: tile(9.5), y: tile(1.5), neighbors: ["market-north", "east-slip-junction", "east-bridge"] },
  { id: "riverside-deadend", x: tile(6.5), y: tile(2.5), neighbors: ["riverside-crossing"] },
  { id: "east-slip-junction", x: tile(9.5), y: tile(3.5), neighbors: ["east-north", "harbor-slip", "east-bridge"] },
  { id: "harbor-slip", x: tile(11.5), y: tile(3.5), neighbors: ["east-slip-junction", "harbor-mid"] },
  { id: "old-town-west", x: tile(1.5), y: tile(4.5), neighbors: ["west-gate", "old-town-market", "south-west"] },
  { id: "old-town-market", x: tile(4.5), y: tile(4.5), neighbors: ["market-north", "old-town-west", "riverside-crossing", "bridge-west"] },
  { id: "riverside-crossing", x: tile(6.5), y: tile(4.5), neighbors: ["riverside-deadend", "old-town-market", "bridge-west", "river-south"] },
  { id: "bridge-west", x: tile(4.5), y: tile(5.5), neighbors: ["old-town-market", "riverside-crossing", "east-bridge", "market-south"] },
  { id: "east-bridge", x: tile(9.5), y: tile(5.5), neighbors: ["east-north", "east-slip-junction", "bridge-west", "harbor-mid", "east-south"] },
  { id: "harbor-mid", x: tile(11.5), y: tile(5.5), neighbors: ["harbor-slip", "east-bridge", "harbor-south"] },
  { id: "south-west", x: tile(1.5), y: tile(8.5), neighbors: ["old-town-west", "market-south", "dispatch-lane"] },
  { id: "market-south", x: tile(4.5), y: tile(8.5), neighbors: ["south-west", "river-south", "bridge-west", "dispatch-east", "east-south"] },
  { id: "river-south", x: tile(6.5), y: tile(8.5), neighbors: ["riverside-crossing", "market-south", "east-south"] },
  { id: "east-south", x: tile(9.5), y: tile(8.5), neighbors: ["east-bridge", "market-south", "river-south", "harbor-south", "east-tail"] },
  { id: "harbor-south", x: tile(11.5), y: tile(8.5), neighbors: ["harbor-mid", "east-south", "harbor-tail"] },
  { id: "dispatch-lane", x: tile(1.5), y: tile(9.5), neighbors: ["south-west", "dispatch-east"] },
  { id: "dispatch-east", x: tile(4.5), y: tile(9.5), neighbors: ["dispatch-lane", "market-south"] },
  { id: "east-tail", x: tile(9.5), y: tile(9.5), neighbors: ["east-south", "harbor-tail"] },
  { id: "harbor-tail", x: tile(11.5), y: tile(9.5), neighbors: ["harbor-south", "east-tail"] }
];

const roads: RectZone[] = [
  tileZone("west-artery", 1, 0, 1, 11),
  tileZone("market-street", 4, 0, 1, 11),
  tileZone("riverside-drive", 6, 2, 1, 8),
  tileZone("east-avenue", 9, 0, 1, 10),
  tileZone("harbor-lane", 11, 3, 1, 8),
  tileZone("north-bridge-boulevard", 0, 1, 13, 1),
  tileZone("old-town-avenue", 0, 4, 7, 1),
  tileZone("central-bridge", 4, 5, 9, 1),
  tileZone("east-slip-road", 9, 3, 4, 1),
  tileZone("south-bypass", 0, 8, 13, 1),
  tileZone("dispatch-lane", 0, 9, 6, 1)
];

const parks: RectZone[] = [
  zone("founders-park", 550, 1330, 420, 650),
  zone("east-garden", 2580, 1560, 180, 440)
];

const water: RectZone[] = [
  tileZone("canal", 7, 0, 2, 11)
];

const bridges: RectZone[] = [
  tileZone("north-bridge", 7, 1, 2, 1),
  tileZone("market-bridge", 7, 5, 2, 1),
  tileZone("south-bridge", 7, 8, 2, 1)
];

const buildings: RectZone[] = [
  zone("b1", 540, 540, 180, 200),
  zone("b2", 760, 560, 190, 170),
  zone("b3", 560, 790, 155, 170),
  zone("b4", 760, 780, 195, 205),
  zone("b5", 1310, 540, 180, 200),
  zone("b6", 1310, 780, 190, 210),
  zone("b7", 1305, 1560, 185, 170),
  zone("b8", 1305, 1770, 195, 220),
  zone("b9", 40, 540, 170, 250),
  zone("b10", 50, 820, 150, 150),
  zone("b11", 35, 1560, 185, 420),
  zone("b12", 40, 2600, 170, 170),
  zone("b13", 2585, 540, 170, 180),
  zone("b14", 2580, 1060, 180, 170),
  zone("b15", 3095, 540, 180, 180),
  zone("b16", 3090, 1060, 190, 170),
  zone("b17", 3090, 1580, 185, 420),
  zone("b18", 2580, 2600, 180, 170),
  zone("b19", 3090, 2600, 180, 170)
];

export const CITY_MAP: WorldMapData = {
  width: TILE_SIZE * MAP_WIDTH_TILES,
  height: TILE_SIZE * MAP_HEIGHT_TILES,
  roads,
  buildings,
  parks,
  water,
  bridges,
  chargeStations: [
    circlePoi("charge-market", "Market Charge", 4, 5, 96),
    circlePoi("charge-east", "Bridge Charge", 9, 5, 96),
    circlePoi("charge-harbor", "Harbor Charge", 10, 8, 96)
  ],
  boostLanes: [
    { id: "boost-market", x: tile(4) + 30, y: tile(2) + 20, width: 196, height: 720, heading: Math.PI / 2 },
    { id: "boost-bypass", x: tile(5) + 20, y: tile(8) + 30, width: 980, height: 196, heading: 0 },
    { id: "boost-east", x: tile(9) + 30, y: tile(5) + 20, width: 196, height: 700, heading: Math.PI / 2 }
  ],
  dispatchPoints: [
    circlePoi("dispatch-central", "Founders Dispatch", 1, 9, 112)
  ],
  deliveryPoints: [
    circlePoi("delivery-old-town", "Old Town Corner", 1, 1, 110),
    circlePoi("delivery-parkside", "Parkside Exchange", 4, 8, 110),
    circlePoi("delivery-east-garden", "East Garden", 9, 8, 110),
    circlePoi("delivery-harbor", "Harbor Plaza", 11, 3, 110)
  ],
  enemyHotspots: [
    circlePoi("hotspot-riverside", "Canal Cutters", 6, 2, 120),
    circlePoi("hotspot-east-tail", "Slip Road Crew", 9, 9, 120),
    circlePoi("hotspot-harbor", "Harbor Pack", 11, 9, 120)
  ],
  navigationNodes,
  playerSpawns: [
    point(1, 9, 0.34, 0.34),
    point(1, 9, 0.66, 0.34),
    point(1, 9, 0.34, 0.66),
    point(1, 9, 0.66, 0.66)
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
