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

const enemyCycle: EnemyKind[] = ["scout", "scout", "brute", "gunner"];

const makeInput = (enemy: EnemyState, target: PlayerState, waypoint: Vec2): PlayerInput => {
  const desiredAngle = angleOf({ x: waypoint.x - enemy.x, y: waypoint.y - enemy.y });
  const angleDelta = wrapAngle(desiredAngle - enemy.rotation);
  const throttle = Math.abs(angleDelta) > 2.4 && enemy.speed > 140 ? 0.2 : 1;

  return {
    throttle,
    steer: angleDelta > 0.1 ? 1 : angleDelta < -0.1 ? -1 : 0,
    brake: Math.abs(angleDelta) > 1.9 && enemy.speed > 140,
    shoot:
      enemy.kind === "gunner" &&
      distance(enemy, target) < ENEMY_ARCHETYPES.gunner.preferredRange &&
      Math.abs(angleDelta) < 0.3,
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

    if (brain.waypoints.length > 0 && distance(enemy, brain.waypoints[0]) < 70) {
      brain.waypoints.shift();
    }

    const waypoint = brain.waypoints[0] ?? { x: target.x, y: target.y };
    const input = makeInput(enemy, target, waypoint);
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
