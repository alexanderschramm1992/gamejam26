import { GAME_CONFIG } from "../../../shared/config/gameConfig";
import type { EnemyState, PlayerState, ProjectileState, VehicleState, WorldEvent } from "../../../shared/model/types";
import { distance, fromAngle } from "../../../shared/utils/math";
import { resolveWorldCollision } from "../map/worldQueries";

const projectileFrom = (
  owner: VehicleState,
  ownerType: "player" | "enemy",
  id: string,
  damage: number,
  speed: number,
  angle: number
): ProjectileState => {
  const forward = fromAngle(angle);
  return {
    id,
    ownerId: owner.id,
    ownerType,
    x: owner.x + forward.x * (owner.radius + 12),
    y: owner.y + forward.y * (owner.radius + 12),
    vx: owner.vx + forward.x * speed,
    vy: owner.vy + forward.y * speed,
    radius: GAME_CONFIG.combat.projectileRadius,
    damage,
    life: GAME_CONFIG.combat.projectileLife
  };
};

export const firePlayerProjectile = (
  player: PlayerState,
  id: string,
  damageMultiplier = 1,
  aimAngle = player.rotation
): ProjectileState => {
  player.weaponCooldown = GAME_CONFIG.player.fireCooldown;
  player.battery = Math.max(0, player.battery - GAME_CONFIG.battery.shootDrain);
  return projectileFrom(
    player,
    "player",
    id,
    GAME_CONFIG.player.projectileDamage * damageMultiplier,
    GAME_CONFIG.player.projectileSpeed,
    aimAngle
  );
};

export const fireEnemyProjectile = (
  enemy: EnemyState,
  id: string,
  damage: number,
  cooldown: number
): ProjectileState => {
  enemy.weaponCooldown = cooldown;
  return projectileFrom(enemy, "enemy", id, damage, 700, enemy.rotation);
};

export const updateProjectiles = (
  projectiles: ProjectileState[],
  players: PlayerState[],
  enemies: EnemyState[],
  dt: number,
  pushEvent: (type: WorldEvent["type"], text: string, x?: number, y?: number, entityId?: string) => void
): ProjectileState[] => {
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < projectiles.length; readIndex += 1) {
    const projectile = projectiles[readIndex]!;
    projectile.life -= dt;
    if (projectile.life <= 0) {
      continue;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const worldProxy = {
      x: projectile.x,
      y: projectile.y,
      vx: projectile.vx,
      vy: projectile.vy,
      radius: projectile.radius
    };

    if (resolveWorldCollision(worldProxy)) {
      continue;
    }

    let consumed = false;
    if (projectile.ownerType === "player") {
      for (const enemy of enemies) {
        if (enemy.destroyed || distance(projectile, enemy) > projectile.radius + enemy.radius) {
          continue;
        }
        enemy.health -= projectile.damage;
        enemy.vx += projectile.vx * 0.04;
        enemy.vy += projectile.vy * 0.04;
        pushEvent("hit", `Hit ${enemy.kind}`, enemy.x, enemy.y, enemy.id);
        consumed = true;
        break;
      }
    } else {
      for (const player of players) {
        if (player.destroyed || player.ghostTimer > 0 || distance(projectile, player) > projectile.radius + player.radius) {
          continue;
        }
        player.health -= projectile.damage;
        player.vx += projectile.vx * 0.03;
        player.vy += projectile.vy * 0.03;
        pushEvent("hit", "Player hit", player.x, player.y, player.id);
        consumed = true;
        break;
      }
    }

    if (!consumed) {
      projectiles[writeIndex] = projectile;
      writeIndex += 1;
    }
  }

  projectiles.length = writeIndex;
  return projectiles;
};
