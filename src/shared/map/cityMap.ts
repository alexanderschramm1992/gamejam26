import type { CirclePoi, NavigationNode, Vec2, WorldMapData } from "../model/types";
import { distance } from "../utils/math";

const navigationNodes: NavigationNode[] = [
  { id: "n1", x: 320, y: 300, neighbors: ["n2", "n5"] },
  { id: "n2", x: 1000, y: 300, neighbors: ["n1", "n3", "n6"] },
  { id: "n3", x: 1800, y: 300, neighbors: ["n2", "n4", "n7"] },
  { id: "n4", x: 2600, y: 300, neighbors: ["n3", "n8"] },
  { id: "n5", x: 320, y: 1100, neighbors: ["n1", "n6", "n9"] },
  { id: "n6", x: 1000, y: 1100, neighbors: ["n2", "n5", "n7", "n10"] },
  { id: "n7", x: 1800, y: 1100, neighbors: ["n3", "n6", "n8", "n11"] },
  { id: "n8", x: 2600, y: 1100, neighbors: ["n4", "n7", "n12"] },
  { id: "n9", x: 320, y: 1900, neighbors: ["n5", "n10"] },
  { id: "n10", x: 1000, y: 1900, neighbors: ["n6", "n9", "n11"] },
  { id: "n11", x: 1800, y: 1900, neighbors: ["n7", "n10", "n12"] },
  { id: "n12", x: 2600, y: 1900, neighbors: ["n8", "n11"] }
];

export const CITY_MAP: WorldMapData = {
  width: 3000,
  height: 2100,
  roads: [
    { id: "road-west", x: 160, y: 200, width: 210, height: 1700 },
    { id: "road-central", x: 870, y: 160, width: 240, height: 1750 },
    { id: "road-east", x: 1600, y: 160, width: 270, height: 1750 },
    { id: "road-far-east", x: 2450, y: 160, width: 240, height: 1750 },
    { id: "road-north", x: 160, y: 190, width: 2540, height: 220 },
    { id: "road-mid", x: 160, y: 920, width: 2540, height: 240 },
    { id: "road-south", x: 160, y: 1700, width: 2540, height: 240 }
  ],
  buildings: [
    // Existing scaled buildings
    { id: "b1", x: 430, y: 440, width: 350, height: 350 },
    { id: "b2", x: 430, y: 1220, width: 350, height: 350 },
    { id: "b3", x: 1240, y: 440, width: 300, height: 350 },
    { id: "b4", x: 1240, y: 1220, width: 300, height: 350 },
    { id: "b5", x: 1950, y: 440, width: 350, height: 350 },
    { id: "b6", x: 1950, y: 1220, width: 350, height: 350 },
    { id: "b7", x: 2550, y: 1270, width: 240, height: 310 },
    // New diverse building clusters
    // North-West residential cluster
    { id: "b8", x: 200, y: 520, width: 180, height: 200 },
    { id: "b9", x: 200, y: 760, width: 180, height: 180 },
    { id: "b10", x: 420, y: 520, width: 160, height: 220 },
    // Central park area with small buildings
    { id: "b11", x: 1100, y: 540, width: 140, height: 140 },
    { id: "b12", x: 1280, y: 540, width: 160, height: 150 },
    { id: "b13", x: 1100, y: 720, width: 170, height: 170 },
    // East downtown high-rises
    { id: "b14", x: 1750, y: 550, width: 220, height: 280 },
    { id: "b15", x: 2000, y: 550, width: 200, height: 260 },
    // South-West industrial area
    { id: "b16", x: 280, y: 1450, width: 320, height: 180 },
    { id: "b17", x: 280, y: 1680, width: 280, height: 160 },
    { id: "b18", x: 620, y: 1480, width: 240, height: 200 },
    // South-Central warehouse district
    { id: "b19", x: 1150, y: 1450, width: 380, height: 200 },
    { id: "b20", x: 1150, y: 1700, width: 360, height: 180 },
    // South-East port area
    { id: "b21", x: 1900, y: 1480, width: 420, height: 160 },
    { id: "b22", x: 1900, y: 1680, width: 400, height: 150 },
    { id: "b23", x: 2360, y: 1500, width: 200, height: 200 }
  ],
  chargeStations: [
    { id: "charge-west", label: "West Charge", x: 315, y: 1530, radius: 96 },
    { id: "charge-central", label: "Metro Charge", x: 1000, y: 700, radius: 96 },
    { id: "charge-east", label: "Arcade Charge", x: 1800, y: 1530, radius: 96 }
  ],
  boostLanes: [
    { id: "boost-1", x: 920, y: 240, width: 160, height: 430, heading: Math.PI / 2 },
    { id: "boost-2", x: 1650, y: 950, width: 170, height: 560, heading: Math.PI / 2 },
    { id: "boost-3", x: 1980, y: 930, width: 510, height: 160, heading: 0 }
  ],
  dispatchPoints: [
    { id: "dispatch-central", label: "Sushi Hub", x: 320, y: 1900, radius: 112 }
  ],
  deliveryPoints: [
    { id: "delivery-docks", label: "Old Port Tower", x: 320, y: 300, radius: 110 },
    { id: "delivery-harbor", label: "Harbor Plaza", x: 2600, y: 300, radius: 110 },
    { id: "delivery-arcade", label: "Arcade Hub", x: 1800, y: 1100, radius: 110 },
    { id: "delivery-solar", label: "Solar Market", x: 2600, y: 1900, radius: 110 }
  ],
  enemyHotspots: [
    { id: "hotspot-north", label: "Diesel Nest", x: 1800, y: 300, radius: 120 },
    { id: "hotspot-west", label: "Tunnel Pack", x: 1000, y: 1900, radius: 120 },
    { id: "hotspot-east", label: "Refinery Pack", x: 2600, y: 1100, radius: 120 }
  ],
  navigationNodes,
  playerSpawns: [
    { x: 245, y: 1780 },
    { x: 325, y: 1860 },
    { x: 405, y: 1780 },
    { x: 485, y: 1860 }
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
