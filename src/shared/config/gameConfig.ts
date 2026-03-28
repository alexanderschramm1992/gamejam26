import type { EnemyKind } from "../model/types";

export interface VehicleTuning {
  acceleration: number;
  reverseAcceleration: number;
  brakeStrength: number;
  turnSpeed: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  drag: number;
  grip: number;
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
}

export const PLAYER_COLORS = ["#58f0ff", "#ffa84d", "#c1ff72", "#ff7ad1"];

export const GAME_CONFIG = {
  tickRate: 30,
  arenaPadding: 80,
  player: {
    acceleration: 300,
    reverseAcceleration: 170,
    brakeStrength: 3.8,
    turnSpeed: 2.9,
    maxForwardSpeed: 460,
    maxReverseSpeed: 160,
    drag: 1.25,
    grip: 5.4,
    radius: 22,
    collisionDamage: 0.018,
    maxHealth: 120,
    maxBattery: 100,
    respawnDelay: 4,
    fireCooldown: 0.2,
    projectileSpeed: 860,
    projectileDamage: 18
  },
  battery: {
    idleDrain: 0.8,
    throttleDrain: 4.5,
    speedDrain: 1.8,
    shootDrain: 3.5,
    lowBatteryThreshold: 25,
    crippledThreshold: 8,
    chargeRate: 22,
    boostLaneChargeRate: 10
  },
  boost: {
    speedMultiplier: 1.18,
    duration: 1.2
  },
  combat: {
    projectileRadius: 5,
    projectileLife: 1.05,
    impactImpulse: 120
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
  scout: {
    kind: "scout",
    acceleration: 290,
    reverseAcceleration: 120,
    brakeStrength: 3.2,
    turnSpeed: 2.75,
    maxForwardSpeed: 400,
    maxReverseSpeed: 120,
    drag: 1.2,
    grip: 5.8,
    radius: 20,
    collisionDamage: 0.02,
    maxHealth: 46,
    maxBattery: 1,
    contactDamage: 12,
    projectileDamage: 0,
    fireCooldown: 0,
    preferredRange: 80
  },
  brute: {
    kind: "brute",
    acceleration: 220,
    reverseAcceleration: 90,
    brakeStrength: 2.7,
    turnSpeed: 2.1,
    maxForwardSpeed: 310,
    maxReverseSpeed: 90,
    drag: 1.05,
    grip: 4.6,
    radius: 26,
    collisionDamage: 0.024,
    maxHealth: 82,
    maxBattery: 1,
    contactDamage: 20,
    projectileDamage: 0,
    fireCooldown: 0,
    preferredRange: 60
  },
  gunner: {
    kind: "gunner",
    acceleration: 235,
    reverseAcceleration: 100,
    brakeStrength: 2.8,
    turnSpeed: 2.35,
    maxForwardSpeed: 330,
    maxReverseSpeed: 100,
    drag: 1.1,
    grip: 5,
    radius: 23,
    collisionDamage: 0.02,
    maxHealth: 58,
    maxBattery: 1,
    contactDamage: 10,
    projectileDamage: 10,
    fireCooldown: 1.1,
    preferredRange: 280
  }
};
