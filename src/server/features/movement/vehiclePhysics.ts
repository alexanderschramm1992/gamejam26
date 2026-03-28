import { GAME_CONFIG, type VehicleTuning } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp, fromAngle, length, wrapAngle } from "../../../shared/utils/math";

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
  const frameFactor = dt * 60;
  const lowBatteryFactor = crippledBattery ? 0.35 : lowBattery ? 0.72 : 1;
  const boostFactor = boosted ? GAME_CONFIG.boost.speedMultiplier : 1;
  const roadFactor = offRoad ? 0.7 : 1;
  const maxForward = tuning.maxForwardSpeed * boostFactor * roadFactor;
  const maxReverse = tuning.maxReverseSpeed * roadFactor;
  const forwardInput = clamp(input.throttle, -1, 1);
  const braking = input.brake;

  applyAcceleration(vehicle, forwardInput, tuning, lowBatteryFactor, maxForward, maxReverse, dt, frameFactor);
  applyTurning(vehicle, input.steer, tuning, braking, maxForward, dt);
  applyBrake(vehicle, braking, tuning, frameFactor);
  applyMovement(vehicle, offRoad, dt);
};

const applyAcceleration = (
  vehicle: VehicleState,
  forwardInput: number,
  tuning: VehicleTuning,
  lowBatteryFactor: number,
  maxForward: number,
  maxReverse: number,
  dt: number,
  frameFactor: number
): void => {
  if (forwardInput > 0) {
    vehicle.driveVelocity += tuning.acceleration * forwardInput * lowBatteryFactor * dt;
  } else if (forwardInput < 0) {
    vehicle.driveVelocity -= tuning.reverseAcceleration * Math.abs(forwardInput) * dt;
  } else {
    vehicle.driveVelocity *= Math.pow(tuning.friction, frameFactor);
  }

  vehicle.driveVelocity = clamp(vehicle.driveVelocity, -maxReverse, maxForward);
};

const applyTurning = (
  vehicle: VehicleState,
  steer: number,
  tuning: VehicleTuning,
  braking: boolean,
  maxForward: number,
  dt: number
): void => {
  if (steer === 0 || Math.abs(vehicle.driveVelocity) < 8) {
    return;
  }

  const effectiveTurnSpeed = braking ? tuning.turnSpeed * 1.2 : tuning.turnSpeed;
  const gripFactor = clamp(Math.abs(vehicle.driveVelocity) / Math.max(80, maxForward), 0.2, 1);
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * effectiveTurnSpeed * gripFactor * dt * Math.sign(vehicle.driveVelocity)
  );
};

const applyBrake = (
  vehicle: VehicleState,
  braking: boolean,
  tuning: VehicleTuning,
  frameFactor: number
): void => {
  if (!braking) {
    return;
  }

  const brakeDrag = clamp(1 - tuning.brakeStrength * 0.015 * frameFactor, 0.5, 0.96);
  vehicle.driveVelocity *= brakeDrag;
  vehicle.driveVelocity *= Math.pow(tuning.handbrakeMultiplier, frameFactor * 0.35);
};

const applyMovement = (
  vehicle: VehicleState,
  offRoad: boolean,
  dt: number
): void => {
  const forward = fromAngle(vehicle.rotation);
  const forwardX = forward.x * vehicle.driveVelocity;
  const forwardY = forward.y * vehicle.driveVelocity;

  vehicle.vx = forwardX;
  vehicle.vy = forwardY;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
  vehicle.speed = length({ x: vehicle.vx, y: vehicle.vy });
};
