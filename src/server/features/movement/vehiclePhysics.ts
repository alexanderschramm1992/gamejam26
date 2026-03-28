import { GAME_CONFIG, type VehicleTuning } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp, dot, fromAngle, length, perp, scale, wrapAngle } from "../../../shared/utils/math";

export interface VehicleStepOptions {
  dt: number;
  input: PlayerInput;
  tuning: VehicleTuning;
  lowBattery: boolean;
  crippledBattery: boolean;
  offRoad: boolean;
  boosted: boolean;
}

export const stepVehicle = (
  vehicle: VehicleState,
  { dt, input, tuning, lowBattery, crippledBattery, offRoad, boosted }: VehicleStepOptions
): void => {
  const forward = fromAngle(vehicle.rotation);
  const lowBatteryFactor = crippledBattery ? 0.35 : lowBattery ? 0.72 : 1;
  const boostFactor = boosted ? GAME_CONFIG.boost.speedMultiplier : 1;
  const roadFactor = offRoad ? 0.65 : 1;
  const maxForward = tuning.maxForwardSpeed * boostFactor * roadFactor;
  const maxReverse = tuning.maxReverseSpeed * roadFactor;

  const accelerationInput = clamp(input.throttle, -1, 1);
  if (accelerationInput > 0) {
    const acceleration = tuning.acceleration * accelerationInput * lowBatteryFactor;
    vehicle.vx += forward.x * acceleration * dt;
    vehicle.vy += forward.y * acceleration * dt;
  } else if (accelerationInput < 0) {
    const reverseAcceleration = tuning.reverseAcceleration * Math.abs(accelerationInput);
    vehicle.vx -= forward.x * reverseAcceleration * dt;
    vehicle.vy -= forward.y * reverseAcceleration * dt;
  }

  if (input.brake) {
    vehicle.vx *= Math.max(0, 1 - tuning.brakeStrength * dt);
    vehicle.vy *= Math.max(0, 1 - tuning.brakeStrength * dt);
  }

  const speedBeforeTurn = dot({ x: vehicle.vx, y: vehicle.vy }, forward);
  const turnGrip = clamp(Math.abs(speedBeforeTurn) / Math.max(140, maxForward), 0.18, 1);
  vehicle.rotation = wrapAngle(vehicle.rotation + input.steer * tuning.turnSpeed * turnGrip * dt);

  const adjustedForward = fromAngle(vehicle.rotation);
  const adjustedSideways = perp(adjustedForward);
  const forwardSpeed = dot({ x: vehicle.vx, y: vehicle.vy }, adjustedForward);
  const sidewaysSpeed = dot({ x: vehicle.vx, y: vehicle.vy }, adjustedSideways);

  const lateralCorrection = tuning.grip * dt;
  const correctedSideways = sidewaysSpeed * Math.max(0, 1 - lateralCorrection);
  const retainedForward = clamp(forwardSpeed, -maxReverse, maxForward);
  const combinedVelocity = {
    x: adjustedForward.x * retainedForward + adjustedSideways.x * correctedSideways,
    y: adjustedForward.y * retainedForward + adjustedSideways.y * correctedSideways
  };

  const drag = tuning.drag + (offRoad ? 0.9 : 0);
  const dragFactor = Math.max(0, 1 - drag * dt);
  const draggedVelocity = scale(combinedVelocity, dragFactor);
  vehicle.vx = draggedVelocity.x;
  vehicle.vy = draggedVelocity.y;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
  vehicle.speed = length({ x: vehicle.vx, y: vehicle.vy });
};
