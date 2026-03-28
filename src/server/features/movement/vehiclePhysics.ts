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
  const handbrake = input.brake;

  applyAcceleration(vehicle, forwardInput, tuning, lowBatteryFactor, maxForward, maxReverse, dt, frameFactor);
  applyTurning(vehicle, input.steer, tuning, handbrake, maxForward, dt);
  applyHandbrake(vehicle, handbrake, input.steer, tuning, dt, frameFactor);
  applyMovement(vehicle, tuning, offRoad, dt, frameFactor);
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
  handbrake: boolean,
  maxForward: number,
  dt: number
): void => {
  if (steer === 0 || Math.abs(vehicle.driveVelocity) < 8) {
    return;
  }

  const effectiveTurnSpeed = handbrake ? tuning.turnSpeed * 1.35 : tuning.turnSpeed;
  const gripFactor = clamp(Math.abs(vehicle.driveVelocity) / Math.max(80, maxForward), 0.2, 1);
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * effectiveTurnSpeed * gripFactor * dt * Math.sign(vehicle.driveVelocity)
  );
};

const applyHandbrake = (
  vehicle: VehicleState,
  handbrake: boolean,
  steer: number,
  tuning: VehicleTuning,
  dt: number,
  frameFactor: number
): void => {
  if (!handbrake) {
    vehicle.drift *= Math.pow(tuning.driftDecay, frameFactor);
    if (Math.abs(vehicle.drift) < 1) {
      vehicle.drift = 0;
    }
    return;
  }

  vehicle.driveVelocity *= Math.pow(tuning.handbrakeMultiplier, frameFactor * 0.55);

  if (Math.abs(vehicle.driveVelocity) < 8) {
    vehicle.driveVelocity = 0;
    vehicle.drift = 0;
    return;
  }

  vehicle.drift += steer * tuning.driftGain * dt * Math.sign(vehicle.driveVelocity);
  vehicle.drift *= Math.pow(tuning.driftDecay, frameFactor * 0.7);

  const driftCap = Math.min(tuning.maxDrift, Math.abs(vehicle.driveVelocity) * 0.45 + 18);
  vehicle.drift = clamp(vehicle.drift, -driftCap, driftCap);
};

const applyMovement = (
  vehicle: VehicleState,
  tuning: VehicleTuning,
  offRoad: boolean,
  dt: number,
  frameFactor: number
): void => {
  const forward = fromAngle(vehicle.rotation);
  const lateral = fromAngle(vehicle.rotation + Math.PI / 2);
  const forwardX = forward.x * vehicle.driveVelocity;
  const forwardY = forward.y * vehicle.driveVelocity;
  const driftX = lateral.x * vehicle.drift;
  const driftY = lateral.y * vehicle.drift;

  vehicle.vx = forwardX + driftX;
  vehicle.vy = forwardY + driftY;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
  vehicle.speed = length({ x: vehicle.vx, y: vehicle.vy });

  const surfaceDrag = Math.max(0.84, 1 - (tuning.drag + (offRoad ? 0.85 : 0.18)) * dt);
  vehicle.driveVelocity *= surfaceDrag;

  if (!offRoad && !vehicle.charging) {
    vehicle.drift *= Math.max(0.8, 1 - tuning.grip * 0.0025 * frameFactor);
  } else {
    vehicle.drift *= 0.96;
  }
}
