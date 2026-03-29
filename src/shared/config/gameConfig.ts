import type { EnemyKind } from "../model/types";

export interface VehicleTuning {
  acceleration: number;
  reverseAcceleration: number;
  brakeStrength: number;
  turnSpeed: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  friction: number; // Wert 0-1: wie viel Geschwindigkeit pro Sekunde erhalten bleibt (linear decay)
  radius: number;
  collisionDamage: number;
}

export interface EnemyArchetype extends VehicleTuning {
  kind: EnemyKind;
  maxHealth: number;
  maxBattery: number;
  contactDamage: number;
  projectileDamage: number;
  fireCooldown: number;
  preferredRange: number;
  batteryDrain: number;
}

export const PLAYER_COLORS = ["#58f0ff", "#ffa84d", "#c1ff72", "#ff7ad1"];

export const GAME_CONFIG = {
  tickRate: 30,
  arenaPadding: 80,
  player: {
    acceleration: 500,
    reverseAcceleration: 170,
    brakeStrength: 3.8,
    turnSpeed: 3.5, // Lenkgeschwindigkeit - höher = schneller lenken/engere Kurven
    maxForwardSpeed: 460,
    maxReverseSpeed: 160,
    friction: 0.93,
    radius: 22,
    collisionDamage: 0.018,
    maxHealth: 120,
    maxBattery: 100,
    respawnDelay: 4,
    respawnGhostDuration: 2,
    fireCooldown: 0.2,
    projectileSpeed: 1180,
    projectileDamage: 18
  },
  battery: {
    idleDrain: 0.8,
    throttleDrain: 1.5,
    speedDrain: 1,
    shootDrain: 1,
    lowBatteryThreshold: 25,
    crippledThreshold: 8,
    chargeRate: 50,
    boostLaneChargeRate: 50
  },
  boost: {
    speedMultiplier: 1.18,
    duration: 1.2
  },
  physics: {
    turnSpeedScaling: 0.5, // Wendekreis-Faktor: je höher, desto mehr beeinflusst Geschwindigkeit den Wendekreis
  },
  vehiclePhysics: {
    crippledBatteryFactor: 0.35,
    lowBatteryFactor: 0.72,
    offRoadFactor: 0.7,
    brakeStrength: 8,
    brakeDragStrength: 0.015,
    brakeDragMin: 0.5,
    brakeDragMax: 0.96,
    minimumTurningVelocity: 8, // Mindestgeschwindigkeit zum Lenken - niedriger = auch langsamer noch lenken können
    // Drift-Parameter für realistische Fahrtdynamik
    driftResponse: 0.3, // Wie schnell die Fahrtrichtung dem Lenkwinkel folgt (0-1) - höher = direktere Lenkreaktion
    lateralGrip: 0.6, // Seitenhaftung in Kurven - höher = besserer Grip beim Lenken (0-1)
    angularVelocityMax: 4.0 // Max Rotationsgeschwindigkeit pro Sekunde - höher = schnellere Drehbewegungen
  },
  combat: {
    projectileRadius: 5,
    projectileLife: 1.05,
    impactImpulse: 120
  },
  tireSlip: {
    thresholdDegrees: 10, // Winkel-Schwellenwert ab dem Reifenspuren sichtbar sind
    durationMs: 500, // Wie lange Reifenspuren sichtbar bleiben
    trailSpacing: 12 // Abstand zwischen einzelnen Spur-Markierungen in Pixeln
  },
  mission: {
    baseReward: 150,
    baseTimeLimit: 70,
    cooldown: 5
  },
  enemies: {
    spawnInterval: 2.5,
    maxBaseCount: 5
  },
  ui: {
    feedEventCount: 6
  }
} as const;

export const ENEMY_ARCHETYPES: Record<EnemyKind, EnemyArchetype> = {
  rammer: {
    kind: "rammer",
    acceleration: 245,
    reverseAcceleration: 90,
    brakeStrength: 2.4,
    turnSpeed: 2.2,
    maxForwardSpeed: 355,
    maxReverseSpeed: 90,
    friction: 0.95,
    radius: 27,
    collisionDamage: 0.028,
    maxHealth: 88,
    maxBattery: 10,
    contactDamage: 24,
    projectileDamage: 0,
    fireCooldown: 0,
    preferredRange: 55,
    batteryDrain: 0
  },
  gunner: {
    kind: "gunner",
    acceleration: 225,
    reverseAcceleration: 105,
    brakeStrength: 3.1,
    turnSpeed: 2.45,
    maxForwardSpeed: 325,
    maxReverseSpeed: 105,
    friction: 0.94,
    radius: 23,
    collisionDamage: 0.02,
    maxHealth: 58,
    maxBattery: 20,
    contactDamage: 9,
    projectileDamage: 11,
    fireCooldown: 1.0,
    preferredRange: 280,
    batteryDrain: 0
  },
  drainer: {
    kind: "drainer",
    acceleration: 285,
    reverseAcceleration: 130,
    brakeStrength: 3.0,
    turnSpeed: 2.85,
    maxForwardSpeed: 390,
    maxReverseSpeed: 125,
    friction: 0.944,
    radius: 21,
    collisionDamage: 0.019,
    maxHealth: 52,
    maxBattery: 100,
    contactDamage: 8,
    projectileDamage: 0,
    fireCooldown: 0.85,
    preferredRange: 70,
    batteryDrain: 18
  }
};
