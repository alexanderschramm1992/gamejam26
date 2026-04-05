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

export interface VehicleSelectionStats {
  speed: number;
  battery: number;
  hull: number;
}

export interface VehicleOption {
  id: string;
  name: string;
  assetPath: string;
  accent: string;
  descriptions: string;
  stats: VehicleSelectionStats;
}

export interface VehicleSelectionModifiers {
  speed: number;
  battery: number;
  hull: number;
}

export const DEFAULT_VEHICLE_SELECTION_MODIFIERS: VehicleSelectionModifiers = {
  speed: 1,
  battery: 1,
  hull: 1
};

export const toVehicleSelectionModifiers = (
  stats: VehicleSelectionStats
): VehicleSelectionModifiers => ({
  speed: stats.speed / 100,
  battery: stats.battery / 100,
  hull: stats.hull / 100
});

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: "car-blue",
    name: "Azure",
    assetPath: "/assets/cars/CarBlue.png",
    accent: "#58f0ff",
    descriptions: "Ein ausgewogener Allrounder.",
    stats: { speed: 100, battery: 100, hull: 100 }
  },
  {
    id: "car-green",
    name: "Verge",
    assetPath: "/assets/cars/CarGreen.png",
    accent: "#9ef07f",
    descriptions: "Der Wagen setzt auf Top Speed zu Lasten von Batterie und Stabilitaet.",
    stats: { speed: 120, battery: 90, hull: 90 }
  },
  {
    id: "car-orange",
    name: "Ember",
    assetPath: "/assets/cars/CarOrange.png",
    accent: "#ffb347",
    descriptions: "Gebaut fuer hohe Batterielaufzeit zu Lasten von Hoechstgeschwindigkeit und Stabilitaet.",
    stats: { speed: 90, battery: 120, hull: 90 }
  },
  {
    id: "car-purple",
    name: "Pulse",
    assetPath: "/assets/cars/CarPurple.png",
    accent: "#d38cff",
    descriptions: "Ein schweres stabiles Chassis, zu Lasten der Hoechstgeschwindigkeit und Batterie Groesse.",
    stats: { speed: 90, battery: 90, hull: 120 }
  },
  {
    id: "car-yellow",
    name: "Solar",
    assetPath: "/assets/cars/CarYellow.png",
    accent: "#ffe36a",
    descriptions: "Du willst einen Speedrun Rekord aufstellen, das ist dein Wagen!",
    stats: { speed: 110, battery: 110, hull: 80 }
  }
];

export const PLAYER_COLORS = ["#58f0ff", "#ffa84d", "#c1ff72", "#ff7ad1"];

export const GAME_CONFIG = {
  tickRate: 60,
  snapshotRate: 30,
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
  vehiclePhysics: {
    crippledBatteryFactor: 0.35,
    offRoadFactor: 0.7,
    // Drift-Dämpfung für realistische Fahrtdynamik (0-1)
    // Steuert wie schnell die Fahrtrichtung (vx/vy) dem Lenkwinkel folgt:
    // - Höher (z.B. 0.3-0.5): Fahrzeug folgt dem Lenkwinkel direkt und präzise (arcade-like, hochgradig steuerbar)
    // - Mittler (z.B. 0.15-0.25): Balanciertes Verhalten mit natürlichem Drift in Kurven
    // - Niedriger (z.B. 0.05-0.12): Fahrzeug rutscht stark, verzögert Lenkreaktion (simulativ, schwerer zu fahren)
    driftDamping: 0.15,
    handbrakeDriftDamping: 0.04 // Drift-Dämpfung mit aktivierter Handbremse - höher = weniger Drift
  },
  combat: {
    projectileRadius: 5,
    projectileLife: 1.05
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
    spawnInterval: 5,         // Sekunden zwischen Gegner-Spawns
    minSpawnInterval: 1,      // Minimales Spawn-Intervall (hardlimit)
    maxBaseCount: 3,          // Basis-Gegneranzahl (wird mit Spieleranzahl + Danger multipliziert)
    maxActiveCount: 8,        // Maximale gleichzeitig aktive Gegner
    missionPressure: 1,       // Zusätzliche Gegner wenn Mission aktiv
    playerSpawnProtectionRadius: 400  // Radius um Spieler-Spawn-Punkte, in dem Gegner nicht spawnen dürfen
  },
  ui: {
    feedEventCount: 6
  },
  audio: {
    effectsEnabled: true
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
