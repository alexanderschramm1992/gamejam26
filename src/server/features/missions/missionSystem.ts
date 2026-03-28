import { GAME_CONFIG } from "../../../shared/config/gameConfig";
import { CITY_MAP } from "../../../shared/map/cityMap";
import type { MissionState, PlayerState } from "../../../shared/model/types";
import { distance } from "../../../shared/utils/math";

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
    cooldownRemaining: 0
  };
};

export const acceptMission = (mission: MissionState, playerId: string): void => {
  mission.status = "active";
  mission.acceptedBy = playerId;
  mission.timeRemaining = mission.timeLimit;
  mission.cooldownRemaining = 0;
};

export const updateMissionTimers = (mission: MissionState, dt: number): void => {
  if (mission.status === "active") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - dt);
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
  const dispatch = CITY_MAP.dispatchPoints[0];
  return distance(player, dispatch) <= dispatch.radius + player.radius;
};
