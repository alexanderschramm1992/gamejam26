import { ENEMY_ARCHETYPES, GAME_CONFIG } from "../../../shared/config/gameConfig";
import { CITY_MAP, findNearestNavigationNode, findPath } from "../../../shared/map/cityMap";
import type { EnemyKind, EnemyState, PlayerInput, PlayerState, ProjectileState, Vec2 } from "../../../shared/model/types";
import { angleOf, distance, randomBetween, wrapAngle } from "../../../shared/utils/math";
import { fireEnemyProjectile } from "../combat/combatSystem";
import { getSurfaceInfo, resolveWorldCollision } from "../map/worldQueries";
import { stepVehicle } from "../movement/vehiclePhysics";
import { updateVehicleResources } from "../resources/resourceSystem";

export interface EnemyBrain {
  repathTimer: number;
  waypoints: Vec2[];
}

const enemyCycle: EnemyKind[] = ["rammer", "gunner", "drainer", "gunner", "rammer", "drainer"];
const ENEMY_PROJECTILE_SPEED = 700;

const getLookaheadWaypoint = (waypoints: Vec2[], speed: number, fallback: Vec2): Vec2 => {
  if (waypoints.length === 0) {
    return fallback;
  }

  const lookaheadIndex = speed > 260 ? 2 : speed > 150 ? 1 : 0;
  return waypoints[Math.min(lookaheadIndex, waypoints.length - 1)] ?? fallback;
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

  let throttle = Math.abs(pathAngleDelta) > 2.4 && enemy.speed > 140 ? 0.2 : 1;
  let brake = Math.abs(pathAngleDelta) > 1.9 && enemy.speed > 140;
  let shoot = false;

  if (enemy.kind === "rammer") {
    throttle = Math.abs(pathAngleDelta) > 2.45 ? 0.45 : 1;
    brake = Math.abs(pathAngleDelta) > 1.4 && enemy.speed > 175;
  } else if (enemy.kind === "gunner") {
    throttle =
      Math.abs(pathAngleDelta) > 1.45
        ? 0.18
        : targetDistance < ENEMY_ARCHETYPES.gunner.preferredRange * 0.72
          ? -0.35
          : targetDistance > ENEMY_ARCHETYPES.gunner.preferredRange * 1.05
            ? 0.85
            : 0.15;
    brake =
      (Math.abs(pathAngleDelta) > 1.2 && enemy.speed > 115) ||
      (targetDistance < ENEMY_ARCHETYPES.gunner.preferredRange * 0.5 && enemy.speed > 125);
    shoot = targetDistance < ENEMY_ARCHETYPES.gunner.preferredRange && Math.abs(aimAngleDelta) < 0.22;
  } else if (enemy.kind === "drainer") {
    throttle =
      Math.abs(pathAngleDelta) > 2.2
        ? 0.4
        : targetDistance < ENEMY_ARCHETYPES.drainer.preferredRange
          ? 0.5
          : 1;
    brake = Math.abs(pathAngleDelta) > 1.25 && enemy.speed > 150;
  }

  return {
    throttle,
    steer: pathAngleDelta > 0.08 ? 1 : pathAngleDelta < -0.08 ? -1 : 0,
    brake,
    shoot,
    interact: false,
    seq: 0
  };
};

export const spawnEnemy = (id: string, stage: number, players: PlayerState[]): EnemyState => {
  const hotspot = CITY_MAP.enemyHotspots[stage % CITY_MAP.enemyHotspots.length];
  const kind = enemyCycle[stage % enemyCycle.length];
  const archetype = ENEMY_ARCHETYPES[kind];
  const fallbackTarget = players.find((player) => !player.destroyed);
  const spawnAngle = randomBetween(0, Math.PI * 2);
  const spawnDistance = randomBetween(20, hotspot.radius - 10);

  return {
    id,
    type: "enemy",
    kind,
    x: hotspot.x + Math.cos(spawnAngle) * spawnDistance,
    y: hotspot.y + Math.sin(spawnAngle) * spawnDistance,
    rotation: randomBetween(-Math.PI, Math.PI),
    vx: 0,
    vy: 0,
    speed: 0,
    driveVelocity: 0,
    drift: 0,
    health: archetype.maxHealth,
    maxHealth: archetype.maxHealth,
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

export const updateEnemies = (
  enemies: EnemyState[],
  players: PlayerState[],
  brains: Map<string, EnemyBrain>,
  now: number,
  dt: number,
  allocateProjectileId: () => string
): ProjectileState[] => {
  const projectiles: ProjectileState[] = [];

  for (const enemy of enemies) {
    if (enemy.destroyed) {
      continue;
    }

    enemy.weaponCooldown = Math.max(0, enemy.weaponCooldown - dt);
    const livePlayers = players.filter((player) => !player.destroyed);
    if (livePlayers.length === 0) {
      continue;
    }

    const target = livePlayers.reduce((best, player) =>
      distance(enemy, player) < distance(enemy, best) ? player : best
    );
    enemy.targetPlayerId = target.id;

    const brain = brains.get(enemy.id) ?? { repathTimer: 0, waypoints: [] };
    brain.repathTimer -= dt;

    if (brain.repathTimer <= 0 || brain.waypoints.length === 0) {
      const startNode = findNearestNavigationNode(enemy);
      const endNode = findNearestNavigationNode(target);
      const pathNodes = findPath(startNode.id, endNode.id);
      brain.waypoints = pathNodes.map((node) => ({ x: node.x, y: node.y }));
      brain.repathTimer = 1.15;
    }

    const arrivalRadius = 45 + Math.min(55, enemy.speed * 0.22);
    if (brain.waypoints.length > 0 && distance(enemy, brain.waypoints[0]) < arrivalRadius) {
      brain.waypoints.shift();
    }

    const steeringTarget = getLookaheadWaypoint(brain.waypoints, enemy.speed, { x: target.x, y: target.y });
    const leadTime = enemy.kind === "gunner" ? Math.min(0.45, distance(enemy, target) / ENEMY_PROJECTILE_SPEED) : 0;
    const aimTarget = {
      x: target.x + target.vx * leadTime,
      y: target.y + target.vy * leadTime
    };

    const input = makeInput(enemy, target, steeringTarget, aimTarget);
    const surface = getSurfaceInfo(enemy);
    const archetype = ENEMY_ARCHETYPES[enemy.kind];

    stepVehicle(enemy, {
      dt,
      input,
      tuning: archetype,
      lowBattery: false,
      crippledBattery: false,
      offRoad: !surface.onRoad,
      boosted: now < enemy.boostedUntil
    });
    updateVehicleResources(enemy, input, surface, dt, now);
    resolveWorldCollision(enemy);

    if (input.shoot && enemy.weaponCooldown <= 0 && archetype.projectileDamage > 0) {
      projectiles.push(
        fireEnemyProjectile(enemy, allocateProjectileId(), archetype.projectileDamage, archetype.fireCooldown)
      );
    }

    brains.set(enemy.id, brain);
  }

  return projectiles;
};

export const desiredEnemyCount = (playerCount: number, danger: number, activeMission: boolean): number => {
  const missionPressure = activeMission ? 2 : 0;
  return Math.min(12, GAME_CONFIG.enemies.maxBaseCount + playerCount + danger + missionPressure);
};
