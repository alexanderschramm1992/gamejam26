import type { CirclePoi, NavigationNode, Vec2, WorldMapData } from "../model/types";
import { distance } from "../utils/math";

const navigationNodes: NavigationNode[] = [
  { id: "n1", x: 240, y: 220, neighbors: ["n2", "n5"] },
  { id: "n2", x: 740, y: 220, neighbors: ["n1", "n3", "n6"] },
  { id: "n3", x: 1280, y: 220, neighbors: ["n2", "n4", "n7"] },
  { id: "n4", x: 1900, y: 220, neighbors: ["n3", "n8"] },
  { id: "n5", x: 240, y: 760, neighbors: ["n1", "n6", "n9"] },
  { id: "n6", x: 740, y: 760, neighbors: ["n2", "n5", "n7", "n10"] },
  { id: "n7", x: 1280, y: 760, neighbors: ["n3", "n6", "n8", "n11"] },
  { id: "n8", x: 1900, y: 760, neighbors: ["n4", "n7", "n12"] },
  { id: "n9", x: 240, y: 1320, neighbors: ["n5", "n10"] },
  { id: "n10", x: 740, y: 1320, neighbors: ["n6", "n9", "n11"] },
  { id: "n11", x: 1280, y: 1320, neighbors: ["n7", "n10", "n12"] },
  { id: "n12", x: 1900, y: 1320, neighbors: ["n8", "n11"] }
];

export const CITY_MAP: WorldMapData = {
  width: 2200,
  height: 1540,
  roads: [
    { id: "road-west", x: 120, y: 150, width: 160, height: 1240 },
    { id: "road-central", x: 650, y: 120, width: 180, height: 1280 },
    { id: "road-east", x: 1180, y: 120, width: 200, height: 1280 },
    { id: "road-far-east", x: 1820, y: 120, width: 180, height: 1280 },
    { id: "road-north", x: 120, y: 140, width: 1880, height: 160 },
    { id: "road-mid", x: 120, y: 670, width: 1880, height: 180 },
    { id: "road-south", x: 120, y: 1240, width: 1880, height: 180 }
  ],
  buildings: [
    { id: "b1", x: 320, y: 320, width: 260, height: 260 },
    { id: "b2", x: 320, y: 890, width: 260, height: 260 },
    { id: "b3", x: 900, y: 320, width: 220, height: 260 },
    { id: "b4", x: 900, y: 890, width: 220, height: 260 },
    { id: "b5", x: 1450, y: 320, width: 260, height: 260 },
    { id: "b6", x: 1450, y: 890, width: 260, height: 260 },
    { id: "b7", x: 1860, y: 920, width: 180, height: 230 }
  ],
  chargeStations: [
    { id: "charge-west", label: "West Charge", x: 235, y: 1120, radius: 72 },
    { id: "charge-central", label: "Metro Charge", x: 740, y: 520, radius: 72 },
    { id: "charge-east", label: "Arcade Charge", x: 1280, y: 1120, radius: 72 }
  ],
  boostLanes: [
    { id: "boost-1", x: 680, y: 180, width: 120, height: 320, heading: Math.PI / 2 },
    { id: "boost-2", x: 1215, y: 720, width: 130, height: 420, heading: Math.PI / 2 },
    { id: "boost-3", x: 1480, y: 700, width: 380, height: 120, heading: 0 }
  ],
  dispatchPoints: [
    { id: "dispatch-central", label: "Dispatch", x: 240, y: 220, radius: 84 }
  ],
  deliveryPoints: [
    { id: "delivery-harbor", label: "Harbor Slices", x: 1900, y: 220, radius: 82 },
    { id: "delivery-arcade", label: "Arcade Hub", x: 1280, y: 760, radius: 82 },
    { id: "delivery-oldtown", label: "Old Town", x: 240, y: 1320, radius: 82 },
    { id: "delivery-solar", label: "Solar Market", x: 1900, y: 1320, radius: 82 }
  ],
  enemyHotspots: [
    { id: "hotspot-north", label: "Diesel Nest", x: 1280, y: 220, radius: 90 },
    { id: "hotspot-west", label: "Tunnel Pack", x: 740, y: 1320, radius: 90 },
    { id: "hotspot-east", label: "Refinery Pack", x: 1900, y: 760, radius: 90 }
  ],
  navigationNodes,
  playerSpawns: [
    { x: 190, y: 260 },
    { x: 255, y: 320 },
    { x: 315, y: 260 },
    { x: 380, y: 320 }
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
