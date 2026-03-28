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
  const lowBatteryFactor = crippledBattery
    ? GAME_CONFIG.vehiclePhysics.crippledBatteryFactor
    : lowBattery
      ? GAME_CONFIG.vehiclePhysics.lowBatteryFactor
      : 1;
  const boostFactor = boosted ? GAME_CONFIG.boost.speedMultiplier : 1;
  const roadFactor = offRoad ? GAME_CONFIG.vehiclePhysics.offRoadFactor : 1;
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
  if (steer === 0 || Math.abs(vehicle.driveVelocity) < GAME_CONFIG.vehiclePhysics.minimumTurningVelocity) {
    return;
  }

  const effectiveTurnSpeed = braking
    ? tuning.turnSpeed * GAME_CONFIG.vehiclePhysics.brakingTurnSpeedMultiplier
    : tuning.turnSpeed;

  // Geschwindigkeitsabhängiger Wendekreis: Je höher die Geschwindigkeit, desto größer der Wendekreis
  const speedFactor = clamp(Math.abs(vehicle.driveVelocity) / Math.max(80, maxForward), 0, 1);
  const gripFactor = 1 - speedFactor * GAME_CONFIG.physics.turnSpeedScaling;
  
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

  const brakeDrag = clamp(
    1 - tuning.brakeStrength * GAME_CONFIG.vehiclePhysics.brakeDragStrength * frameFactor,
    GAME_CONFIG.vehiclePhysics.brakeDragMin,
    GAME_CONFIG.vehiclePhysics.brakeDragMax
  );
  vehicle.driveVelocity *= brakeDrag;
  vehicle.driveVelocity *= Math.pow(
    tuning.handbrakeMultiplier,
    frameFactor * GAME_CONFIG.vehiclePhysics.handbrakeFrameFactor
  );
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
