import type { EnemyKind } from "../model/types";

export interface VehicleTuning {
  acceleration: number;
  reverseAcceleration: number;
  brakeStrength: number;
  turnSpeed: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  friction: number;
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
  tickRate: 60,
  snapshotRate: 30,
  arenaPadding: 80,
  player: {
    acceleration: 500,
    reverseAcceleration: 170,
    brakeStrength: 3.8,
    turnSpeed: 2.5, // Lenkgeschwindigkeit - höher = schneller lenken/engere Kurven
    handbrakeTurnSpeed: 3.5, // Lenkgeschwindigkeit mit aktivierter Handbremse - für bessere Kontrolle beim Driften
    maxForwardSpeed: 460,
    maxReverseSpeed: 160,
    friction: 0.9, // Wert 0-1: wie viel Geschwindigkeit pro Sekunde erhalten bleibt (linear decay)
    handbrakeFriction: 0.6, // Reibung mit aktivierter Handbremse - höher = weniger Rutsch
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
    offRoadFactor: 0.7,
    brakeStrength: 8,
    minimumTurningVelocity: 2, // Mindestgeschwindigkeit zum Lenken - niedriger = auch langsamer noch lenken können
    // Drift-Dämpfung für realistische Fahrtdynamik (0-1)
    // Steuert wie schnell die Fahrtrichtung (vx/vy) dem Lenkwinkel folgt:
    // - Höher (z.B. 0.3-0.5): Fahrzeug folgt dem Lenkwinkel direkt und präzise (arcade-like, hochgradig steuerbar)
    // - Mittler (z.B. 0.15-0.25): Balanciertes Verhalten mit natürlichem Drift in Kurven
    // - Niedriger (z.B. 0.05-0.12): Fahrzeug rutscht stark, verzögert Lenkreaktion (simulativ, schwerer zu fahren)
    driftDamping: 0.15,
    handbrakeDriftDamping: 0.04, // Drift-Dämpfung mit aktivierter Handbremse - höher = weniger Drift
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
    cooldown: 5,
    transferDuration: 1.5,
    cargoCount: 10,
    deliveriesToWin: 3,
    interactionDistanceMultiplier: 3.6
  },
  enemies: {
    spawnInterval: 2.5,        // Sekunden zwischen Gegner-Spawns
    minSpawnInterval: 0.35,    // Minimales Spawn-Intervall (hardlimit)
    maxBaseCount: 5,           // Basis-Gegneranzahl (wird mit Spieleranzahl + Danger multipliziert)
    maxActiveCount: 12,        // Maximale gleichzeitig aktive Gegner
    missionPressure: 2         // Zusätzliche Gegner wenn Mission aktiv
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
