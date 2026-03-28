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
  friction: number;
  handbrakeMultiplier: number;
  driftGain: number;
  driftDecay: number;
  maxDrift: number;
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
    acceleration: 300,
    reverseAcceleration: 170,
    brakeStrength: 3.8,
    turnSpeed: 2.9,
    maxForwardSpeed: 460,
    maxReverseSpeed: 160,
    drag: 1.25,
    grip: 5.4,
    friction: 0.95,
    handbrakeMultiplier: 0.72,
    driftGain: 10,
    driftDecay: 0.92,
    maxDrift: 155,
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
  rammer: {
    kind: "rammer",
    acceleration: 245,
    reverseAcceleration: 90,
    brakeStrength: 2.4,
    turnSpeed: 2.2,
    maxForwardSpeed: 355,
    maxReverseSpeed: 90,
    drag: 1.02,
    grip: 4.7,
    friction: 0.955,
    handbrakeMultiplier: 0.76,
    driftGain: 8,
    driftDecay: 0.93,
    maxDrift: 115,
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
    drag: 1.12,
    grip: 5.2,
    friction: 0.948,
    handbrakeMultiplier: 0.8,
    driftGain: 7,
    driftDecay: 0.93,
    maxDrift: 95,
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
    drag: 1.18,
    grip: 5.9,
    friction: 0.952,
    handbrakeMultiplier: 0.78,
    driftGain: 9,
    driftDecay: 0.92,
    maxDrift: 125,
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
