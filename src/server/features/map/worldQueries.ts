import { getBuildingCollisionRect } from "../../../shared/map/buildingAssets";
import { CITY_MAP } from "../../../shared/map/cityMap";
import type { BoostLane, CirclePoi } from "../../../shared/model/types";
import { circleIntersectsRect, clamp, distance, pointInRect } from "../../../shared/utils/math";

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface SurfaceInfo {
  onRoad: boolean;
  chargeStation?: CirclePoi;
  boostLane?: BoostLane;
}

const isOnBridge = (body: Pick<PhysicsBody, "x" | "y" | "radius">): boolean =>
  CITY_MAP.bridges.some((bridge) => circleIntersectsRect(body, body.radius, bridge));

export const getSurfaceInfo = (body: Pick<PhysicsBody, "x" | "y" | "radius">): SurfaceInfo => {
  const onRoad = CITY_MAP.roads.some((road) => circleIntersectsRect(body, body.radius, road));
  const chargeStation = CITY_MAP.chargeStations.find(
    (station) => distance(body, station) <= station.radius + body.radius
  );
  const boostLane = CITY_MAP.boostLanes.find((lane) => circleIntersectsRect(body, body.radius, lane));

  return {
    onRoad,
    chargeStation,
    boostLane
  };
};

export const resolveWorldCollision = (body: PhysicsBody): boolean => {
  let collided = false;

  const clampedX = clamp(body.x, body.radius, CITY_MAP.width - body.radius);
  const clampedY = clamp(body.y, body.radius, CITY_MAP.height - body.radius);
  if (clampedX !== body.x) {
    body.x = clampedX;
    body.vx *= -0.32;
    collided = true;
  }
  if (clampedY !== body.y) {
    body.y = clampedY;
    body.vy *= -0.32;
    collided = true;
  }

  for (const buildingZone of CITY_MAP.buildings) {
    const building = getBuildingCollisionRect(buildingZone);
    if (!circleIntersectsRect(body, body.radius, building)) {
      continue;
    }

    const nearestX = clamp(body.x, building.x, building.x + building.width);
    const nearestY = clamp(body.y, building.y, building.y + building.height);
    let dx = body.x - nearestX;
    let dy = body.y - nearestY;
    let distanceToWall = Math.hypot(dx, dy);

    if (distanceToWall === 0) {
      const left = Math.abs(body.x - building.x);
      const right = Math.abs(body.x - (building.x + building.width));
      const top = Math.abs(body.y - building.y);
      const bottom = Math.abs(body.y - (building.y + building.height));
      const minimum = Math.min(left, right, top, bottom);

      if (minimum === left) {
        dx = -1;
        dy = 0;
        distanceToWall = 1;
      } else if (minimum === right) {
        dx = 1;
        dy = 0;
        distanceToWall = 1;
      } else if (minimum === top) {
        dx = 0;
        dy = -1;
        distanceToWall = 1;
      } else {
        dx = 0;
        dy = 1;
        distanceToWall = 1;
      }
    }

    const overlap = body.radius - distanceToWall;
    if (overlap > 0) {
      const nx = dx / distanceToWall;
      const ny = dy / distanceToWall;
      body.x += nx * overlap;
      body.y += ny * overlap;
      body.vx -= nx * (body.vx * nx + body.vy * ny) * 1.2;
      body.vy -= ny * (body.vx * nx + body.vy * ny) * 1.2;
      collided = true;
    }
  }

  if (!isOnBridge(body)) {
    for (const waterZone of CITY_MAP.water) {
      if (!circleIntersectsRect(body, body.radius, waterZone)) {
        continue;
      }

      const nearestX = clamp(body.x, waterZone.x, waterZone.x + waterZone.width);
      const nearestY = clamp(body.y, waterZone.y, waterZone.y + waterZone.height);
      let dx = body.x - nearestX;
      let dy = body.y - nearestY;
      let distanceToEdge = Math.hypot(dx, dy);

      if (distanceToEdge === 0) {
        const left = Math.abs(body.x - waterZone.x);
        const right = Math.abs(body.x - (waterZone.x + waterZone.width));
        const top = Math.abs(body.y - waterZone.y);
        const bottom = Math.abs(body.y - (waterZone.y + waterZone.height));
        const minimum = Math.min(left, right, top, bottom);

        if (minimum === left) {
          dx = -1;
          dy = 0;
        } else if (minimum === right) {
          dx = 1;
          dy = 0;
        } else if (minimum === top) {
          dx = 0;
          dy = -1;
        } else {
          dx = 0;
          dy = 1;
        }

        distanceToEdge = 1;
      }

      const overlap = body.radius - distanceToEdge;
      if (overlap > 0) {
        const nx = dx / distanceToEdge;
        const ny = dy / distanceToEdge;
        body.x += nx * overlap;
        body.y += ny * overlap;
        body.vx -= nx * (body.vx * nx + body.vy * ny) * 1.35;
        body.vy -= ny * (body.vx * nx + body.vy * ny) * 1.35;
        collided = true;
      }
    }
  }

  return collided;
};

export const isInsideDispatch = (x: number, y: number): boolean => {
  const dispatch = CITY_MAP.dispatchPoints[0];
  return distance({ x, y }, dispatch) <= dispatch.radius;
};

export const isWithinBounds = (x: number, y: number): boolean =>
  pointInRect({ x, y }, { id: "bounds", x: 0, y: 0, width: CITY_MAP.width, height: CITY_MAP.height });
