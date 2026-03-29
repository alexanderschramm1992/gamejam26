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

  // 1. Berechne Fahrtgeschwindigkeit mit Beschleunigung und Reibung
  applyAcceleration(vehicle, forwardInput, tuning, lowBatteryFactor, maxForward, maxReverse, dt);

  // 2. Lenkung und Drift-Dynamik - setzt vx/vy basierend auf driveVelocity
  applyDynamics(vehicle, input.steer, tuning, maxForward, dt);

  // 3. Position aktualisieren
  applyMovement(vehicle, offRoad, dt);
};

const applyAcceleration = (
  vehicle: VehicleState,
  forwardInput: number,
  tuning: VehicleTuning,
  lowBatteryFactor: number,
  maxForward: number,
  maxReverse: number,
  dt: number
): void => {
  // Beschleunige basierend auf Input
  if (forwardInput > 0) {
    // Vorwärts-Beschleunigung
    vehicle.driveVelocity += tuning.acceleration * forwardInput * lowBatteryFactor * dt;
  } else if (forwardInput < 0) {
    // Rückwärts-Beschleunigung (oder Bremsen wenn wir gerade vorwärts fahren)
    const targetDirection = -Math.abs(forwardInput); // Zielrichtung: rückwärts
    
    if (vehicle.driveVelocity > 0) {
      // Wir fahren vorwärts, aber der Spieler will rückwärts fahren -> bremsen
      // Nutze brakeStrength für schnelleres Abbremsen
      const brakeFactor = 1 - tuning.brakeStrength * GAME_CONFIG.vehiclePhysics.brakeDragStrength * dt * 60;
      vehicle.driveVelocity *= Math.max(brakeFactor, 0.3); // Min 0.3 um nicht zu hart zu bremsen
    } else {
      // Bereits rückwärts oder stillstehen -> beschleunige rückwärts
      vehicle.driveVelocity -= tuning.reverseAcceleration * Math.abs(forwardInput) * dt;
    }
  } else {
    // Kein Input -> natürliche Reibung
    // friction ist der Anteil der Geschwindigkeit, der pro Sekunde erhalten bleibt
    // z.B. friction=0.95 bedeutet: 5% pro Sekunde verloren
    const decayFactor = Math.pow(tuning.friction, dt);
    vehicle.driveVelocity *= decayFactor;
  }

  // Begrenzte auf Max-Geschwindigkeiten
  vehicle.driveVelocity = clamp(vehicle.driveVelocity, -maxReverse, maxForward);
};

const applyDynamics = (
  vehicle: VehicleState,
  steer: number,
  tuning: VehicleTuning,
  maxForward: number,
  dt: number
): void => {
  // Nutze driveVelocity als die primäre Geschwindigkeitsmagnitude
  const driveSpeed = Math.abs(vehicle.driveVelocity);
  
  // Unter minimaler Geschwindigkeit kann nicht gelenkt werden
  if (driveSpeed < GAME_CONFIG.vehiclePhysics.minimumTurningVelocity) {
    // Bei niedriger Geschwindigkeit: Fahrtrichtung folgt rotation sofort
    // Aber behalte das Vorzeichen von driveVelocity (Vorwärts/Rückwärts)
    if (Math.abs(vehicle.driveVelocity) > 0.5) {
      const forward = fromAngle(vehicle.rotation);
      vehicle.vx = forward.x * vehicle.driveVelocity;
      vehicle.vy = forward.y * vehicle.driveVelocity;
    } else {
      // Nur wenn wirklich stillstehen
      vehicle.vx = 0;
      vehicle.vy = 0;
    }
    return;
  }

  // Berechne geschwindigkeitsabhängigen Lenkradius
  // Bei niedriger Geschwindigkeit: volle Lenkwirkung
  // Bei hoher Geschwindigkeit: reduzierte Lenkwirkung (breitere Kurven)
  const maxSpeed = Math.max(80, maxForward);
  const speedRatio = driveSpeed / maxSpeed; // 0 = langsam, 1 = maxSpeed
  
  // Lenkradius-Faktor: bei 0 Geschwindigkeit = 1.0 (volle Lenkung), bei maxSpeed = turnSpeedScaling
  // Je höher turnSpeedScaling, desto mehr wird das Lenken bei hoher Geschwindigkeit reduziert
  const turnRadiusFactor = 1 - (speedRatio * GAME_CONFIG.physics.turnSpeedScaling);

  // Berechne die effektive Lenkgeschwindigkeit
  const effectiveTurnSpeed = tuning.turnSpeed * turnRadiusFactor;
  
  // Rotiere die Fahrzeugausrichtung basierend auf Lenkung
  vehicle.rotation = wrapAngle(
    vehicle.rotation + steer * effectiveTurnSpeed * dt * Math.sign(vehicle.driveVelocity)
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
  const lateralGrip = GAME_CONFIG.vehiclePhysics.lateralGrip;
  
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
