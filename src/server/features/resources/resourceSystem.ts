import { GAME_CONFIG } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp } from "../../../shared/utils/math";
import type { SurfaceInfo } from "../map/worldQueries";

export interface ResourceUpdateResult {
  chargedThisFrame: boolean;
  boostedThisFrame: boolean;
}

export interface ResourceRuntimeOptions {
  chargeMultiplier?: number;
  consumesBattery?: boolean;
}

export const updateVehicleResources = (
  vehicle: VehicleState,
  input: PlayerInput,
  surface: SurfaceInfo,
  dt: number,
  now: number,
  options: ResourceRuntimeOptions = {}
): ResourceUpdateResult => {
  vehicle.charging = false;
  let chargedThisFrame = false;
  let boostedThisFrame = false;
  const chargeMultiplier = options.chargeMultiplier ?? 1;
  const consumesBattery = options.consumesBattery ?? true;

  if (consumesBattery) {
    const throttleDrain = Math.max(0, input.throttle) * GAME_CONFIG.battery.throttleDrain;
    const currentSpeed = Math.hypot(vehicle.vx, vehicle.vy);
    const speedDrain = (currentSpeed / 300) * GAME_CONFIG.battery.speedDrain;
    vehicle.battery = clamp(
      vehicle.battery - (GAME_CONFIG.battery.idleDrain + throttleDrain + speedDrain) * dt,
      0,
      vehicle.maxBattery
    );
  } else {
    vehicle.battery = vehicle.maxBattery;
  }

  if (surface.chargeStation && consumesBattery && Math.hypot(vehicle.vx, vehicle.vy) < 40) {
    vehicle.charging = true;
    chargedThisFrame = true;
    vehicle.battery = clamp(
      vehicle.battery + GAME_CONFIG.battery.chargeRate * chargeMultiplier * dt,
      0,
      vehicle.maxBattery
    );
  }

  if (surface.boostLane) {
    boostedThisFrame = true;
    vehicle.boostedUntil = Math.max(vehicle.boostedUntil, now + GAME_CONFIG.boost.duration);
    if (consumesBattery) {
      vehicle.battery = clamp(
        vehicle.battery + GAME_CONFIG.battery.boostLaneChargeRate * chargeMultiplier * dt,
        0,
        vehicle.maxBattery
      );
    }
  }

  return { chargedThisFrame, boostedThisFrame };
};
