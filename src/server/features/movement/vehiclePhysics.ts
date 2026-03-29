import { GAME_CONFIG, type VehicleTuning } from "../../../shared/config/gameConfig";
import type { PlayerInput, VehicleState } from "../../../shared/model/types";
import { clamp, fromAngle, wrapAngle } from "../../../shared/utils/math";

export interface VehicleStepOptions {
  dt: number;
  input: PlayerInput;
  tuning: VehicleTuning;
  crippledBattery: boolean;
  offRoad: boolean;
  boosted: boolean;
  isPlayerHandbrake?: boolean; // Nur true wenn das der Spieler mit aktivierter Handbremse ist
}

export const stepVehicle = (
  vehicle: VehicleState,
  { dt, input, tuning, crippledBattery, offRoad, boosted, isPlayerHandbrake }: VehicleStepOptions
): void => {
  const lowBatteryFactor = crippledBattery
    ? GAME_CONFIG.vehiclePhysics.crippledBatteryFactor
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
  applyAcceleration(vehicle, limitedAccelerationInput, tuning, lowBatteryFactor, maxForward, maxReverse, isPlayerHandbrake || false, dt);

  // 2. Lenkung und Drift-Dynamik - setzt vx/vy basierend auf driveVelocity
  applyDynamics(vehicle, input.steer, tuning, isPlayerHandbrake || false, dt);

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
  handbrake: boolean,
  dt: number
): void => {

  const frictionFactor = handbrake ? GAME_CONFIG.player.handbrakeFriction : tuning.friction;

  if (accelerationInput === 0) {
    vehicle.driveVelocity *= frictionFactor;
  } else {
    vehicle.driveVelocity += accelerationInput
        * tuning.acceleration
        * frictionFactor
        * dt;
  }

  // Begrenzte auf Max-Geschwindigkeiten
  vehicle.driveVelocity = clamp(
      vehicle.driveVelocity,
      -maxReverse * lowBatteryFactor,
      maxForward * lowBatteryFactor);
};

const applyDynamics = (
  vehicle: VehicleState,
  steer: number,
  tuning: VehicleTuning,
  handbrake: boolean,
  dt: number
): void => {
  // Verwende Handbremse-Lenkgeschwindigkeit wenn aktiviert, sonst normale Lenkgeschwindigkeit
  const turnSpeed = handbrake ? GAME_CONFIG.player.handbrakeTurnSpeed : tuning.turnSpeed;
  
  // Aktualisiere Fahrzeugdrehung basierend auf Lenkung
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * turnSpeed * dt * Math.sign(vehicle.driveVelocity)
  );

  // Berechne Fahrtrichtung mit Drift-Effekt
  const targetDirection = fromAngle(vehicle.rotation);
  // Verwende Handbremse-Drift-Dämpfung wenn aktiviert, sonst normale Drift-Dämpfung
  const driftFactor = handbrake ? GAME_CONFIG.vehiclePhysics.handbrakeDriftDamping : GAME_CONFIG.vehiclePhysics.driftDamping;

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
