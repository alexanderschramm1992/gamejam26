import { GAME_CONFIG } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp } from "../../../shared/utils/math";
import type { SurfaceInfo } from "../map/worldQueries";

export interface ResourceUpdateResult {
  chargedThisFrame: boolean;
  boostedThisFrame: boolean;
}

export const updateVehicleResources = (
  vehicle: VehicleState,
  input: PlayerInput,
  surface: SurfaceInfo,
  dt: number,
  now: number
): ResourceUpdateResult => {
  vehicle.charging = false;
  let chargedThisFrame = false;
  let boostedThisFrame = false;

  const throttleDrain = Math.max(0, input.throttle) * GAME_CONFIG.battery.throttleDrain;
  const speedDrain = (vehicle.speed / 300) * GAME_CONFIG.battery.speedDrain;
  vehicle.battery = clamp(
    vehicle.battery - (GAME_CONFIG.battery.idleDrain + throttleDrain + speedDrain) * dt,
    0,
    vehicle.maxBattery
  );

  if (surface.chargeStation && (input.brake || vehicle.speed < 40)) {
    vehicle.charging = true;
    chargedThisFrame = true;
    vehicle.battery = clamp(
      vehicle.battery + GAME_CONFIG.battery.chargeRate * dt,
      0,
      vehicle.maxBattery
    );
  }

  if (surface.boostLane) {
    boostedThisFrame = true;
    vehicle.boostedUntil = Math.max(vehicle.boostedUntil, now + GAME_CONFIG.boost.duration);
    vehicle.battery = clamp(
      vehicle.battery + GAME_CONFIG.battery.boostLaneChargeRate * dt,
      0,
      vehicle.maxBattery
    );
  }

  return { chargedThisFrame, boostedThisFrame };
};
