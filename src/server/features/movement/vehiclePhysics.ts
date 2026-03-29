import { GAME_CONFIG, type VehicleTuning } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp, fromAngle, wrapAngle } from "../../../shared/utils/math";

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
  const lowBatteryFactor = crippledBattery
    ? GAME_CONFIG.vehiclePhysics.crippledBatteryFactor
    : lowBattery
      ? GAME_CONFIG.vehiclePhysics.lowBatteryFactor
      : 1;
  const boostFactor = boosted ? GAME_CONFIG.boost.speedMultiplier : 1;
  const roadFactor = offRoad ? GAME_CONFIG.vehiclePhysics.offRoadFactor : 1;
  const maxForward = tuning.maxForwardSpeed * boostFactor * roadFactor;
  const maxReverse = tuning.maxReverseSpeed * roadFactor;
  const limitedAccelerationInput = input.throttle > 0
      ? 1
      : input.throttle < 0
          ? -1
          : 0;

  // 1. Berechne Fahrtgeschwindigkeit mit Beschleunigung und Reibung
  applyAcceleration(vehicle, limitedAccelerationInput, tuning, lowBatteryFactor, maxForward, maxReverse, dt);

  // 2. Lenkung und Drift-Dynamik - setzt vx/vy basierend auf driveVelocity
  applyDynamics(vehicle, input.steer, tuning, dt);

  // 3. Position aktualisieren
  applyMovement(vehicle, dt);
};

const applyAcceleration = (
  vehicle: VehicleState,
  accelerationInput: number,
  tuning: VehicleTuning,
  lowBatteryFactor: number,
  maxForward: number,
  maxReverse: number,
  dt: number
): void => {
  vehicle.driveVelocity += accelerationInput
      * tuning.acceleration
      * tuning.friction
      * lowBatteryFactor
      * dt;
  // Begrenzte auf Max-Geschwindigkeiten
  vehicle.driveVelocity = clamp(vehicle.driveVelocity, -maxReverse, maxForward);
};

const applyDynamics = (
  vehicle: VehicleState,
  steer: number,
  tuning: VehicleTuning,
  dt: number
): void => {
  // Aktualisiere Fahrzeugdrehung basierend auf Lenkung
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * tuning.turnSpeed * dt * Math.sign(vehicle.driveVelocity)
  );

  // Berechne Fahrtrichtung mit Drift-Effekt
  const targetDirection = fromAngle(vehicle.rotation);
  const driftFactor = GAME_CONFIG.vehiclePhysics.driftDamping;
  
  // Interpoliere zwischen aktueller und gewünschter Richtung für Drift
  vehicle.vx += (targetDirection.x * vehicle.driveVelocity - vehicle.vx) * driftFactor;
  vehicle.vy += (targetDirection.y * vehicle.driveVelocity - vehicle.vy) * driftFactor;
};

const applyMovement = (
  vehicle: VehicleState,
  dt: number
): void => {
  // Aktualisiere Position basierend auf echtem Geschwindigkeitsvektor
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
};
