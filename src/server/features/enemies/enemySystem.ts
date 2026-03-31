import { ENEMY_ARCHETYPES, GAME_CONFIG } from "../../../shared/config/gameConfig";
import { CITY_MAP, findNearestNavigationNode, findPath } from "../../../shared/map/cityMap";
import type { AdminSettings, EnemyKind, EnemyState, PlayerInput, PlayerState, ProjectileState, Vec2 } from "../../../shared/model/types";
import { angleOf, clamp, distance, randomBetween, wrapAngle } from "../../../shared/utils/math";
import { fireEnemyProjectile } from "../combat/combatSystem";
import { getNearbyBuildingCollisionRects, getSurfaceInfo, resolveWorldCollision } from "../map/worldQueries";
import { stepVehicle } from "../movement/vehiclePhysics";
import { updateVehicleResources } from "../resources/resourceSystem";

export interface EnemyBrain {
  repathTimer: number;
  waypoints: Vec2[];
  stuckTimer: number;
  reverseTimer: number;
  reverseSteer: number;
  lastX: number;
  lastY: number;
}

interface ObstacleAvoidancePlan {
  steeringTarget: Vec2;
  blocked: boolean;
  sideSign: number;
}

const enemyCycle: EnemyKind[] = ["rammer", "gunner", "drainer", "gunner", "rammer", "drainer"];
const ENEMY_PROJECTILE_SPEED = 700;
const DIRECT_SIGHT_PADDING = 18;
const FEELER_LENGTH = 150;
const FEELER_SIDE_ANGLE = 0.62;
const FEELER_STEP = 18;
const FORCED_REPATH_TIME = 0.12;
const STUCK_SPEED_THRESHOLD = 72;
const STUCK_PROGRESS_THRESHOLD = 18;
const STUCK_TRIGGER_TIME = 0.9;
const REVERSE_RECOVERY_TIME = 0.58;

export const createEnemyBrain = (position: Vec2): EnemyBrain => ({
  repathTimer: 0,
  waypoints: [],
  stuckTimer: 0,
  reverseTimer: 0,
  reverseSteer: 1,
  lastX: position.x,
  lastY: position.y
});

const getLookaheadWaypoint = (waypoints: Vec2[], speed: number, fallback: Vec2): Vec2 => {
  if (waypoints.length === 0) {
    return fallback;
  }

  const lookaheadIndex = speed > 260 ? 2 : speed > 150 ? 1 : 0;
  return waypoints[Math.min(lookaheadIndex, waypoints.length - 1)] ?? fallback;
};

const pointHitsExpandedBuilding = (point: Vec2, padding: number): boolean =>
  getNearbyBuildingCollisionRects(point.x, point.y, padding).some((building) => (
    point.x >= building.x - padding &&
    point.x <= building.x + building.width + padding &&
    point.y >= building.y - padding &&
    point.y <= building.y + building.height + padding
  ));

const pathBlockedByBuildings = (from: Vec2, to: Vec2, padding: number): boolean => {
  const span = distance(from, to);
  if (span <= FEELER_STEP) {
    return false;
  }

  const steps = Math.max(1, Math.ceil(span / FEELER_STEP));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t
    };
    if (pointHitsExpandedBuilding(point, padding)) {
      return true;
    }
  }

  return false;
};

const hasDirectSightLine = (from: Vec2, to: Vec2, radius: number): boolean =>
  !pathBlockedByBuildings(from, to, radius + DIRECT_SIGHT_PADDING);

const sampleRayClearance = (origin: Vec2, angle: number, maxDistance: number, padding: number): number => {
  for (let travelled = FEELER_STEP; travelled <= maxDistance; travelled += FEELER_STEP) {
    const probe = {
      x: origin.x + Math.cos(angle) * travelled,
      y: origin.y + Math.sin(angle) * travelled
    };
    if (pointHitsExpandedBuilding(probe, padding)) {
      return travelled;
    }
  }

  return maxDistance;
};

const chooseNavigationTarget = (enemy: EnemyState, target: PlayerState, brain: EnemyBrain): Vec2 => {
  const protectionRadius = GAME_CONFIG.enemies.playerSpawnProtectionRadius;
  
  // Wenn Ziel in Schutzzone ist, ziehe einen ausweichenden Punkt vor
  let targetPos = { x: target.x, y: target.y };
  let targetInProtection = false;
  for (const spawn of CITY_MAP.playerSpawns) {
    if (distance(targetPos, spawn) < protectionRadius) {
      targetInProtection = true;
      break;
    }
  }
  
  if (hasDirectSightLine(enemy, target, enemy.radius) && !targetInProtection) {
    return { x: target.x, y: target.y };
  }

  const fallback = brain.waypoints[brain.waypoints.length - 1] ?? { x: target.x, y: target.y };
  const currentSpeed = Math.hypot(enemy.vx, enemy.vy);
  return getLookaheadWaypoint(brain.waypoints, currentSpeed, fallback);
};

const applyObstacleAvoidance = (
  enemy: EnemyState,
  steeringTarget: Vec2,
  preferredSideSign: number
): ObstacleAvoidancePlan => {
  const padding = enemy.radius + 10;
  const forwardClearance = sampleRayClearance(enemy, enemy.rotation, FEELER_LENGTH, padding);
  const leftClearance = sampleRayClearance(enemy, enemy.rotation + FEELER_SIDE_ANGLE, FEELER_LENGTH * 0.94, padding);
  const rightClearance = sampleRayClearance(enemy, enemy.rotation - FEELER_SIDE_ANGLE, FEELER_LENGTH * 0.94, padding);
  const blocked =
    forwardClearance < FEELER_LENGTH * 0.78 ||
    pathBlockedByBuildings(enemy, steeringTarget, padding);

  if (!blocked) {
    return {
      steeringTarget,
      blocked: false,
      sideSign: preferredSideSign
    };
  }

  const sideDelta = leftClearance - rightClearance;
  const sideSign = Math.abs(sideDelta) > 8 ? (sideDelta > 0 ? 1 : -1) : preferredSideSign;
  const forwardDistance = Math.max(28, forwardClearance * 0.55);
  const lateralDistance = 88 + (1 - forwardClearance / FEELER_LENGTH) * 72;

  return {
    steeringTarget: {
      x: enemy.x + Math.cos(enemy.rotation) * forwardDistance - Math.sin(enemy.rotation) * lateralDistance * sideSign,
      y: enemy.y + Math.sin(enemy.rotation) * forwardDistance + Math.cos(enemy.rotation) * lateralDistance * sideSign
    },
    blocked: true,
    sideSign
  };
};

const makeInput = (
  enemy: EnemyState,
  target: PlayerState,
  steeringTarget: Vec2,
  aimTarget: Vec2
): PlayerInput => {
  const pathAngle = angleOf({ x: steeringTarget.x - enemy.x, y: steeringTarget.y - enemy.y });
  const pathAngleDelta = wrapAngle(pathAngle - enemy.rotation);
  const aimAngle = angleOf({ x: aimTarget.x - enemy.x, y: aimTarget.y - enemy.y });
  const aimAngleDelta = wrapAngle(aimAngle - enemy.rotation);
  const targetDistance = distance(enemy, target);
  const currentSpeed = Math.hypot(enemy.vx, enemy.vy);

  let throttle = Math.abs(pathAngleDelta) > 2.4 && currentSpeed > 140 ? 0.2 : 1;
  let shoot = false;

  if (enemy.kind === "rammer") {
    throttle = Math.abs(pathAngleDelta) > 2.45 ? 0.45 : 1;
  } else if (enemy.kind === "gunner") {
    throttle =
      Math.abs(pathAngleDelta) > 1.45
        ? 0.18
        : targetDistance < ENEMY_ARCHETYPES.gunner.preferredRange * 0.72
          ? -0.35
          : targetDistance > ENEMY_ARCHETYPES.gunner.preferredRange * 1.05
            ? 0.85
            : 0.15;
    shoot = targetDistance < ENEMY_ARCHETYPES.gunner.preferredRange && Math.abs(aimAngleDelta) < 0.22;
  } else if (enemy.kind === "drainer") {
    throttle =
      Math.abs(pathAngleDelta) > 2.2
        ? 0.4
        : targetDistance < ENEMY_ARCHETYPES.drainer.preferredRange
          ? 0.5
          : 1;
  }

  return {
    throttle,
    steer: pathAngleDelta > 0.08 ? 1 : pathAngleDelta < -0.08 ? -1 : 0,
    shoot,
    interact: false,
    handbrake: false,
    aimAngle,
    seq: 0
  };
};

const updateStuckState = (
  enemy: EnemyState,
  brain: EnemyBrain,
  dt: number,
  collided: boolean,
  onRoad: boolean,
  avoidance: ObstacleAvoidancePlan
): void => {
  const progress = distance(enemy, { x: brain.lastX, y: brain.lastY });
  const currentSpeed = Math.hypot(enemy.vx, enemy.vy);
  const tooSlow = Math.abs(currentSpeed) < STUCK_SPEED_THRESHOLD;
  let stuckDelta = progress < STUCK_PROGRESS_THRESHOLD && tooSlow ? dt : -dt * 0.7;

  if (collided) {
    stuckDelta += dt * 1.8;
  }
  if (!onRoad) {
    stuckDelta += dt * 0.6;
  }
  if (avoidance.blocked && tooSlow) {
    stuckDelta += dt * 0.35;
  }

  brain.stuckTimer = clamp(brain.stuckTimer + stuckDelta, 0, STUCK_TRIGGER_TIME + 0.4);
  brain.lastX = enemy.x;
  brain.lastY = enemy.y;

  if (brain.stuckTimer < STUCK_TRIGGER_TIME) {
    return;
  }

  brain.stuckTimer = 0;
  brain.reverseTimer = REVERSE_RECOVERY_TIME;
  brain.reverseSteer = avoidance.sideSign === 0 ? 1 : avoidance.sideSign;
  brain.repathTimer = 0;
  brain.waypoints = [];
};

const isInSpawnProtectionZone = (position: Vec2): boolean => {
  const protectionRadius = GAME_CONFIG.enemies.playerSpawnProtectionRadius;
  for (const spawn of CITY_MAP.playerSpawns) {
    if (distance(position, spawn) < protectionRadius) {
      return true;
    }
  }
  return false;
};

export const spawnEnemy = (
  id: string,
  stage: number,
  players: PlayerState[],
  healthMultiplier: number
): EnemyState => {
  const hotspot = CITY_MAP.enemyHotspots[stage % CITY_MAP.enemyHotspots.length];
  const kind = enemyCycle[stage % enemyCycle.length];
  const archetype = ENEMY_ARCHETYPES[kind];
  const fallbackTarget = players.find((player) => !player.destroyed && player.ghostTimer <= 0)
    ?? players.find((player) => !player.destroyed);
  const maxHealth = archetype.maxHealth * healthMultiplier;
  
  // Versuche mehrmals einen gültigen Spawn-Punkt zu finden, der nicht in der Schutzzone liegt
  let position: Vec2;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    const spawnAngle = randomBetween(0, Math.PI * 2);
    const spawnDistance = randomBetween(20, hotspot.radius - 10);
    position = {
      x: hotspot.x + Math.cos(spawnAngle) * spawnDistance,
      y: hotspot.y + Math.sin(spawnAngle) * spawnDistance
    };
    attempts++;
  } while (isInSpawnProtectionZone(position) && attempts < maxAttempts);

  return {
    id,
    type: "enemy",
    kind,
    x: position.x,
    y: position.y,
    rotation: randomBetween(-Math.PI, Math.PI),
    vx: 0,
    vy: 0,
    driveVelocity: 0,
    health: maxHealth,
    maxHealth,
    battery: archetype.maxBattery,
    maxBattery: archetype.maxBattery,
    radius: archetype.radius,
    weaponCooldown: randomBetween(0, Math.max(0.1, archetype.fireCooldown)),
    boostedUntil: 0,
    charging: false,
    destroyed: false,
    targetPlayerId: fallbackTarget?.id ?? null
  };
};

const findClosestPlayer = (enemy: EnemyState, players: PlayerState[]): PlayerState => {
  let closestPlayer = players[0]!;
  let closestDistance = distance(enemy, closestPlayer);

  for (let index = 1; index < players.length; index += 1) {
    const candidate = players[index]!;
    const candidateDistance = distance(enemy, candidate);
    if (candidateDistance < closestDistance) {
      closestPlayer = candidate;
      closestDistance = candidateDistance;
    }
  }

  return closestPlayer;
};

// Berechnet einen Fluchtpunkt für Gegner, die zu nah an der Spawn-Schutzzone sind
const getSpawnProtectionEscapeTarget = (enemy: EnemyState): Vec2 | null => {
  const protectionRadius = GAME_CONFIG.enemies.playerSpawnProtectionRadius;
  
  // Prüfe ob Gegner zu nah an einer Schutzzone ist
  for (const spawn of CITY_MAP.playerSpawns) {
    const distToSpawn = distance(enemy, spawn);
    if (distToSpawn < protectionRadius + 150) { // 150er Puffer für frühes Ausweichen
      // Berechne Fluchtrichtung: Weg vom Spawn-Punkt
      const escapeAngle = Math.atan2(enemy.y - spawn.y, enemy.x - spawn.x);
      const escapeDistance = protectionRadius + 250;
      return {
        x: spawn.x + Math.cos(escapeAngle) * escapeDistance,
        y: spawn.y + Math.sin(escapeAngle) * escapeDistance
      };
    }
  }
  
  return null;
};

export const updateEnemies = (
  enemies: EnemyState[],
  players: PlayerState[],
  brains: Map<string, EnemyBrain>,
  now: number,
  dt: number,
  settings: AdminSettings,
  allocateProjectileId: () => string
): ProjectileState[] => {
  const projectiles: ProjectileState[] = [];
  const effectiveFireRate = Math.max(0.25, settings.enemyFireRateMultiplier);
  const livePlayers = players.filter((player) => !player.destroyed);
  if (livePlayers.length === 0) {
    return projectiles;
  }

  const nonGhostPlayers = livePlayers.filter((player) => player.ghostTimer <= 0);
  const targetCandidates = nonGhostPlayers.length > 0 ? nonGhostPlayers : livePlayers;

  for (const enemy of enemies) {
    if (enemy.destroyed) {
      continue;
    }

    enemy.weaponCooldown = Math.max(0, enemy.weaponCooldown - dt);
    const target = findClosestPlayer(enemy, targetCandidates);
    enemy.targetPlayerId = target.id;

    const brain = brains.get(enemy.id) ?? createEnemyBrain(enemy);
    brain.repathTimer -= dt;
    brain.reverseTimer = Math.max(0, brain.reverseTimer - dt);

    if (brain.repathTimer <= 0 || brain.waypoints.length === 0) {
      const startNode = findNearestNavigationNode(enemy);
      const endNode = findNearestNavigationNode(target);
      const pathNodes = findPath(startNode.id, endNode.id);
      brain.waypoints = pathNodes.map((node) => ({ x: node.x, y: node.y }));
      brain.repathTimer = 1.15;
    }

    const arrivalRadius = 45 + Math.min(55, Math.hypot(enemy.vx, enemy.vy) * 0.22);
    if (brain.waypoints.length > 0 && distance(enemy, brain.waypoints[0]) < arrivalRadius) {
      brain.waypoints.shift();
    }

    const navigationTarget = chooseNavigationTarget(enemy, target, brain);
    
    // Prüfe auf Spawn-Schutzzone und berechne ggf. Fluchtweg
    const escapeTarget = getSpawnProtectionEscapeTarget(enemy);
    const finalNavigationTarget = escapeTarget ?? navigationTarget;
    
    const avoidance = applyObstacleAvoidance(enemy, finalNavigationTarget, brain.reverseSteer);
    const leadTime = enemy.kind === "gunner" ? Math.min(0.45, distance(enemy, target) / ENEMY_PROJECTILE_SPEED) : 0;
    const aimTarget = {
      x: target.x + target.vx * leadTime,
      y: target.y + target.vy * leadTime
    };

    const input = makeInput(enemy, target, avoidance.steeringTarget, aimTarget);
    
    // Wenn Gegner flieht, schießt er nicht und navigiert aggressiv weg
    if (escapeTarget) {
      input.shoot = false;
      input.throttle = 1;
      brain.repathTimer = Math.min(brain.repathTimer, FORCED_REPATH_TIME);
    }
    
    if (brain.reverseTimer > 0) {
      input.throttle = -0.72;
      input.shoot = false;
      input.steer = avoidance.sideSign === 0 ? brain.reverseSteer : avoidance.sideSign;
      brain.repathTimer = Math.min(brain.repathTimer, FORCED_REPATH_TIME);
    }

    const surface = getSurfaceInfo(enemy);
    const archetype = ENEMY_ARCHETYPES[enemy.kind];

    stepVehicle(enemy, {
      dt,
      input,
      tuning: archetype,
      crippledBattery: false,
      offRoad: !surface.onRoad,
      boosted: now < enemy.boostedUntil
    });
    updateVehicleResources(enemy, input, surface, dt, now, { consumesBattery: false });
    const collided = resolveWorldCollision(enemy);

    if (collided || !surface.onRoad) {
      brain.repathTimer = Math.min(brain.repathTimer, FORCED_REPATH_TIME);
    }

    updateStuckState(enemy, brain, dt, collided, surface.onRoad, avoidance);

    if (input.shoot && enemy.weaponCooldown <= 0 && archetype.projectileDamage > 0) {
      const damage =
        archetype.projectileDamage * settings.enemyDamageMultiplier * settings.enemyGunnerDamageMultiplier;
      const cooldown = archetype.fireCooldown <= 0 ? 0 : archetype.fireCooldown / effectiveFireRate;
      projectiles.push(fireEnemyProjectile(enemy, allocateProjectileId(), damage, cooldown));
    }

    brains.set(enemy.id, brain);
  }

  return projectiles;
};

export const desiredEnemyCount = (playerCount: number, danger: number, activeMission: boolean): number => {
  const missionPressure = activeMission ? GAME_CONFIG.enemies.missionPressure : 0;
  return Math.min(GAME_CONFIG.enemies.maxActiveCount, GAME_CONFIG.enemies.maxBaseCount + playerCount + danger + missionPressure);
};
