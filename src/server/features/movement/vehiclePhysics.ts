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

/**
 * OPTION 2: Klassisches Fahrzeug-Physik-Modell
 * 
 * Das System modelliert nun echte Fahrtdynamik mit Drift-Effekt:
 * - rotation: Fahrzeug-Ausrichtung (visuell)
 * - vx/vy: Echte Bewegungsvektoren (unabhängig von rotation)
 * - Lenkung beeinflusst allmählich die Bewegungsrichtung, nicht sofort die Ausrichtung
 * - Ermöglicht Driften: Fahrzeug kann sich in andere Richtung bewegen als es zeigt
 */

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
  const handbraking = input.handbrake;

  // 1. Berechne Fahrtgeschwindigkeit (skalare "Triebkraft")
  applyAcceleration(vehicle, forwardInput, tuning, lowBatteryFactor, maxForward, maxReverse, dt, frameFactor, handbraking);

  // 2. Bremsen wirken auf den Geschwindigkeitsvektor
  applyBrake(vehicle, handbraking, tuning, frameFactor);

  // 3. Lenkung und Drift-Dynamik
  applyDynamics(vehicle, input.steer, tuning, handbraking, maxForward, dt);

  // 4. Position basierend auf echtem Bewegungsvektor aktualisieren
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
  frameFactor: number,
  handbraking: boolean
): void => {
  // Wenn Handbremse aktiv, wird Beschleunigung ignoriert
  if (handbraking) {
    forwardInput = 0;
  }

  // driveVelocity ist hier ein interner Zustand für die Triebkraft (nicht direkt sichtbar)
  if (forwardInput > 0) {
    vehicle.driveVelocity += tuning.acceleration * forwardInput * lowBatteryFactor * dt;
  } else if (forwardInput < 0) {
    vehicle.driveVelocity -= tuning.reverseAcceleration * Math.abs(forwardInput) * dt;
  } else {
    vehicle.driveVelocity *= Math.pow(tuning.friction, frameFactor);
  }

  vehicle.driveVelocity = clamp(vehicle.driveVelocity, -maxReverse, maxForward);
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
  
  // Bremsen wirken auf den echten Geschwindigkeitsvektor
  vehicle.vx *= brakeDrag;
  vehicle.vy *= brakeDrag;
};

const applyDynamics = (
  vehicle: VehicleState,
  steer: number,
  tuning: VehicleTuning,
  handbraking: boolean,
  maxForward: number,
  dt: number
): void => {
  // Nutze driveVelocity als die primäre Geschwindigkeitsmagnitude
  const driveSpeed = Math.abs(vehicle.driveVelocity);
  
  // Unter minimaler Geschwindigkeit kann nicht gelenkt werden
  if (driveSpeed < GAME_CONFIG.vehiclePhysics.minimumTurningVelocity) {
    // Wenn wir sehr langsam sind, richte die Fahrtrichtung sofort aus
    if (driveSpeed > 0) {
      const forward = fromAngle(vehicle.rotation);
      vehicle.vx = forward.x * vehicle.driveVelocity;
      vehicle.vy = forward.y * vehicle.driveVelocity;
    }
    return;
  }

  // Berechne die gewünschte Fahrtrichtung basierend auf Lenkung
  const effectiveTurnSpeed = handbraking
    ? tuning.turnSpeed * GAME_CONFIG.vehiclePhysics.brakingTurnSpeedMultiplier
    : tuning.turnSpeed;

  // Geschwindigkeitsabhängiger Wendekreis
  const speedFactor = clamp(driveSpeed / Math.max(80, maxForward), 0, 1);
  const gripFactor = 1 - speedFactor * GAME_CONFIG.physics.turnSpeedScaling;
  
  // Rotiere die Fahrzeugausrichtung basierend auf Lenkung
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * effectiveTurnSpeed * gripFactor * dt * Math.sign(vehicle.driveVelocity)
  );

  // Drift-Effekt: Der Geschwindigkeitsvektor folgt der Rotation mit Verzögerung
  // Das erzeugt Rutschen/Driften wenn das Fahrzeug schnell lenkt
  const desiredDirection = fromAngle(vehicle.rotation);
  
  // Berechne die aktuelle Fahrtrichtung (normalisiert)
  const currentVelocityMag = length({ x: vehicle.vx, y: vehicle.vy });
  const currentDirection = currentVelocityMag > 0
    ? { x: vehicle.vx / currentVelocityMag, y: vehicle.vy / currentVelocityMag }
    : desiredDirection; // Fallback zur gewünschten Richtung
  
  // Interpoliere die Fahrtrichtung gegen die gewünschte Richtung
  const driftResponse = GAME_CONFIG.vehiclePhysics.driftResponse;
  const baseLateralGrip = GAME_CONFIG.vehiclePhysics.lateralGrip;
  const lateralGrip = handbraking
    ? baseLateralGrip * GAME_CONFIG.vehiclePhysics.handbrakeLateralGripMultiplier
    : baseLateralGrip;
  
  const blendedDirection = {
    x: currentDirection.x + (desiredDirection.x - currentDirection.x) * driftResponse * lateralGrip,
    y: currentDirection.y + (desiredDirection.y - currentDirection.y) * driftResponse * lateralGrip
  };
  
  // Normalisiere die Richtung und wende die aktuelle Geschwindigkeit an
  const blendedLength = length(blendedDirection) || 1;
  const normalizedBlended = {
    x: blendedDirection.x / blendedLength,
    y: blendedDirection.y / blendedLength
  };
  
  // Wende driveVelocity als Magnitude an (das ist die beschleunigte Geschwindigkeit)
  vehicle.vx = normalizedBlended.x * vehicle.driveVelocity;
  vehicle.vy = normalizedBlended.y * vehicle.driveVelocity;
};

const applyMovement = (
  vehicle: VehicleState,
  offRoad: boolean,
  dt: number
): void => {
  // Aktualisiere Position basierend auf echtem Geschwindigkeitsvektor
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;
};
