import { GAME_CONFIG } from "../../../shared/config/gameConfig";
import { findBuildingById, CITY_MAP, SUSHI_SHOP_BUILDING_ID } from "../../../shared/map/cityMap";
import { getBuildingCollisionRect } from "../../../shared/map/buildingAssets";
import type { MissionState, PlayerState, RectZone } from "../../../shared/model/types";
import { clamp, distance } from "../../../shared/utils/math";

const pointToRectDistance = (point: PlayerState, rect: RectZone): number => {
  const nearestX = clamp(point.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(point.y, rect.y, rect.y + rect.height);
  return Math.hypot(point.x - nearestX, point.y - nearestY);
};

export const createMission = (stage: number): MissionState => {
  const destination = CITY_MAP.deliveryPoints[stage % CITY_MAP.deliveryPoints.length];

  return {
    id: `mission-${stage}`,
    status: "ready",
    dispatchId: CITY_MAP.dispatchPoints[0].id,
    destinationId: destination.id,
    acceptedBy: null,
    stage,
    reward: GAME_CONFIG.mission.baseReward + stage * 40,
    timeLimit: Math.max(40, GAME_CONFIG.mission.baseTimeLimit - stage * 2),
    timeRemaining: 0,
    transferDuration: GAME_CONFIG.mission.transferDuration,
    transferRemaining: 0,
    cargoCount: GAME_CONFIG.mission.cargoCount,
    cooldownRemaining: 0
  };
};

export const acceptMission = (mission: MissionState, playerId: string, transferDuration: number): void => {
  mission.status = "loading";
  mission.acceptedBy = playerId;
  mission.timeRemaining = 0;
  mission.transferDuration = transferDuration;
  mission.transferRemaining = transferDuration;
  mission.cooldownRemaining = 0;
};

export const updateMissionTimers = (mission: MissionState, dt: number): void => {
  if (mission.status === "active" || mission.status === "unloading") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - dt);
  }
  if (mission.status === "loading" || mission.status === "unloading") {
    mission.transferRemaining = Math.max(0, mission.transferRemaining - dt);
  }
  if (mission.status === "cooldown") {
    mission.cooldownRemaining = Math.max(0, mission.cooldownRemaining - dt);
  }
};

export const isPlayerAtDestination = (mission: MissionState, player: PlayerState): boolean => {
  const destination = CITY_MAP.deliveryPoints.find((poi) => poi.id === mission.destinationId);
  if (!destination) {
    return false;
  }

  return distance(player, destination) <= destination.radius + player.radius;
};

export const isPlayerAtDispatch = (player: PlayerState): boolean => {
  const shopBuilding = findBuildingById(SUSHI_SHOP_BUILDING_ID);
  const interactionRange = player.radius * GAME_CONFIG.mission.interactionDistanceMultiplier;

  if (shopBuilding) {
    return pointToRectDistance(player, getBuildingCollisionRect(shopBuilding)) <= interactionRange;
  }

  const dispatch = CITY_MAP.dispatchPoints[0];
  return distance(player, dispatch) <= dispatch.radius + player.radius;
};
