import type { Server as SocketServer, Socket } from "socket.io";
import { ENEMY_ARCHETYPES, GAME_CONFIG, PLAYER_COLORS } from "../../shared/config/gameConfig";
import { CITY_MAP } from "../../shared/map/cityMap";
import type {
  EnemyState,
  GameSnapshot,
  MissionState,
  PlayerInput,
  PlayerState,
  ProjectileState,
  TeamState,
  WorldEvent,
  WorldEventType
} from "../../shared/model/types";
import { distance } from "../../shared/utils/math";
import { updateProjectiles, firePlayerProjectile } from "../features/combat/combatSystem";
import {
  desiredEnemyCount,
  spawnEnemy,
  type EnemyBrain,
  updateEnemies
} from "../features/enemies/enemySystem";
import { resolveWorldCollision, getSurfaceInfo } from "../features/map/worldQueries";
import {
  acceptMission,
  createMission,
  isPlayerAtDestination,
  isPlayerAtDispatch,
  updateMissionTimers
} from "../features/missions/missionSystem";
import { stepVehicle } from "../features/movement/vehiclePhysics";
import { updateVehicleResources } from "../features/resources/resourceSystem";

const neutralInput: PlayerInput = {
  throttle: 0,
  steer: 0,
  brake: false,
  shoot: false,
  interact: false,
  seq: 0
};

export class GameServer {
  private readonly io: SocketServer;
  private readonly players = new Map<string, PlayerState>();
  private readonly inputs = new Map<string, PlayerInput>();
  private readonly enemyBrains = new Map<string, EnemyBrain>();
  private enemies: EnemyState[] = [];
  private projectiles: ProjectileState[] = [];
  private mission: MissionState = createMission(0);
  private readonly team: TeamState = { deliveries: 0, score: 0, danger: 0 };
  private readonly recentEvents: WorldEvent[] = [];
  private tickCounter = 0;
  private entityCounter = 0;
  private eventCounter = 0;
  private spawnTimer = 0;

  constructor(io: SocketServer) {
    this.io = io;
  }

  public start(): void {
    const stepMs = 1000 / GAME_CONFIG.tickRate;
    setInterval(() => this.tick(stepMs / 1000), stepMs);
  }

  public addSocket(socket: Socket): void {
    const player = this.createPlayer(socket.id);
    this.players.set(player.id, player);
    this.inputs.set(player.id, neutralInput);

    socket.emit("hello", { playerId: player.id });
    socket.on("input", (input: PlayerInput) => {
      this.inputs.set(player.id, input);
    });
    socket.on("disconnect", () => {
      this.players.delete(player.id);
      this.inputs.delete(player.id);
    });

    this.pushEvent("mission-accepted", `${player.name} entered the city.`, player.x, player.y, player.id);
  }

  private createPlayer(id: string): PlayerState {
    const index = this.players.size % CITY_MAP.playerSpawns.length;
    const spawn = CITY_MAP.playerSpawns[index];
    const name = `Driver ${this.players.size + 1}`;

    return {
      id,
      type: "player",
      name,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      x: spawn.x,
      y: spawn.y,
      rotation: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      health: GAME_CONFIG.player.maxHealth,
      maxHealth: GAME_CONFIG.player.maxHealth,
      battery: GAME_CONFIG.player.maxBattery,
      maxBattery: GAME_CONFIG.player.maxBattery,
      radius: GAME_CONFIG.player.radius,
      weaponCooldown: 0,
      boostedUntil: 0,
      charging: false,
      destroyed: false,
      connected: true,
      score: 0,
      respawnTimer: 0,
      lastProcessedInput: 0
    };
  }

  private tick(dt: number): void {
    this.tickCounter += 1;
    const now = this.tickCounter / GAME_CONFIG.tickRate;

    this.updatePlayers(dt, now);
    this.handleVehicleContacts();

    const enemyShots = updateEnemies(
      this.enemies,
      Array.from(this.players.values()),
      this.enemyBrains,
      now,
      dt,
      () => this.allocateId("projectile")
    );
    this.projectiles.push(...enemyShots);

    this.projectiles = updateProjectiles(
      this.projectiles,
      Array.from(this.players.values()),
      this.enemies,
      dt,
      (type, text, x, y, entityId) => this.pushEvent(type, text, x, y, entityId)
    );

    this.cleanupDestroyedEntities();
    this.updateMission(dt);
    this.updateEnemySpawning(dt);
    this.broadcastSnapshot(now);
  }

  private updatePlayers(dt: number, now: number): void {
    for (const player of this.players.values()) {
      const input = this.inputs.get(player.id) ?? neutralInput;
      player.lastProcessedInput = input.seq;
      player.weaponCooldown = Math.max(0, player.weaponCooldown - dt);

      if (player.destroyed) {
        player.respawnTimer = Math.max(0, player.respawnTimer - dt);
        if (player.respawnTimer === 0) {
          this.respawnPlayer(player);
        }
        continue;
      }

      const surface = getSurfaceInfo(player);
      stepVehicle(player, {
        dt,
        input,
        tuning: GAME_CONFIG.player,
        lowBattery: player.battery <= GAME_CONFIG.battery.lowBatteryThreshold,
        crippledBattery: player.battery <= GAME_CONFIG.battery.crippledThreshold,
        offRoad: !surface.onRoad,
        boosted: now < player.boostedUntil
      });
      const resourceResult = updateVehicleResources(player, input, surface, dt, now);
      const hitWall = resolveWorldCollision(player);
      if (hitWall) {
        player.health -= Math.max(2, player.speed * GAME_CONFIG.player.collisionDamage * 0.5);
      }

      if (input.shoot && player.weaponCooldown <= 0 && player.battery > GAME_CONFIG.battery.shootDrain) {
        this.projectiles.push(firePlayerProjectile(player, this.allocateId("projectile")));
        this.pushEvent("shot", `${player.name} fired`, player.x, player.y, player.id);
      }

      if (resourceResult.chargedThisFrame && this.tickCounter % 20 === 0) {
        this.pushEvent("charge", `${player.name} is charging`, player.x, player.y, player.id);
      }
      if (resourceResult.boostedThisFrame && this.tickCounter % 18 === 0) {
        this.pushEvent("boost", `${player.name} hit a boost lane`, player.x, player.y, player.id);
      }

      if (input.interact && this.mission.status === "ready" && isPlayerAtDispatch(player)) {
        acceptMission(this.mission, player.id);
        this.pushEvent("mission-accepted", `${player.name} accepted ${this.mission.id}`, player.x, player.y, player.id);
      }

      if (player.health <= 0) {
        this.destroyPlayer(player);
      }
    }
  }

  private handleVehicleContacts(): void {
    const activePlayers = Array.from(this.players.values()).filter((player) => !player.destroyed);
    const entities = [...activePlayers, ...this.enemies.filter((enemy) => !enemy.destroyed)];

    for (let index = 0; index < entities.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < entities.length; otherIndex += 1) {
        const a = entities[index];
        const b = entities[otherIndex];
        const combinedRadius = a.radius + b.radius;
        const currentDistance = distance(a, b);
        if (currentDistance === 0 || currentDistance >= combinedRadius) {
          continue;
        }

        const overlap = combinedRadius - currentDistance;
        const nx = (a.x - b.x) / currentDistance;
        const ny = (a.y - b.y) / currentDistance;
        a.x += nx * overlap * 0.5;
        a.y += ny * overlap * 0.5;
        b.x -= nx * overlap * 0.5;
        b.y -= ny * overlap * 0.5;

        a.vx += nx * 80;
        a.vy += ny * 80;
        b.vx -= nx * 80;
        b.vy -= ny * 80;

        const impactDamage = Math.max(0, (a.speed + b.speed) * 0.018);
        if (a.type === "player" && b.type === "enemy") {
          this.applyEnemyContact(a, b, impactDamage);
        } else if (a.type === "enemy" && b.type === "player") {
          this.applyEnemyContact(b, a, impactDamage);
        }
      }
    }
  }

  private applyEnemyContact(player: PlayerState, enemy: EnemyState, impactDamage: number): void {
    const archetype = ENEMY_ARCHETYPES[enemy.kind];
    player.health -= impactDamage + archetype.contactDamage * 0.35;
    enemy.health -= impactDamage * 0.45;

    if (enemy.kind === "rammer") {
      player.health -= archetype.contactDamage * 0.45;
      enemy.health -= impactDamage * 0.1;
      this.pushEvent("hit", `${enemy.kind} slammed ${player.name}`, player.x, player.y, player.id);
      return;
    }

    if (enemy.kind === "drainer") {
      if (enemy.weaponCooldown <= 0) {
        const drainAmount = Math.min(player.battery, archetype.batteryDrain);
        if (drainAmount > 0) {
          player.battery -= drainAmount;
          enemy.battery = Math.min(enemy.maxBattery, enemy.battery + drainAmount);
          enemy.health = Math.min(enemy.maxHealth, enemy.health + drainAmount * 0.18);
          enemy.weaponCooldown = archetype.fireCooldown;
          this.pushEvent("drain", `${enemy.kind} drained ${drainAmount.toFixed(0)} battery`, player.x, player.y, player.id);
        }
      }
      return;
    }

    this.pushEvent("hit", `${enemy.kind} clipped ${player.name}`, player.x, player.y, player.id);
  }

  private updateMission(dt: number): void {
    updateMissionTimers(this.mission, dt);

    if (this.mission.status === "active") {
      const players = Array.from(this.players.values()).filter((player) => !player.destroyed);
      const finisher = players.find((player) => isPlayerAtDestination(this.mission, player));
      if (finisher) {
        finisher.score += this.mission.reward;
        this.team.deliveries += 1;
        this.team.score += this.mission.reward;
        this.team.danger += 1;
        this.pushEvent("mission-completed", `${finisher.name} delivered the sushi set`, finisher.x, finisher.y, finisher.id);
        this.mission.status = "cooldown";
        this.mission.cooldownRemaining = GAME_CONFIG.mission.cooldown;
      } else if (this.mission.timeRemaining <= 0) {
        this.team.danger += 1;
        this.pushEvent("mission-failed", `${this.mission.id} expired`, undefined, undefined, this.mission.id);
        this.mission.status = "cooldown";
        this.mission.cooldownRemaining = GAME_CONFIG.mission.cooldown;
      }
    }

    if (this.mission.status === "cooldown" && this.mission.cooldownRemaining <= 0) {
      this.mission = createMission(this.team.deliveries + this.team.danger);
    }
  }

  private updateEnemySpawning(dt: number): void {
    this.spawnTimer -= dt;
    const livePlayers = Array.from(this.players.values()).filter((player) => !player.destroyed);
    if (livePlayers.length === 0 || this.spawnTimer > 0) {
      return;
    }

    const activeMission = this.mission.status === "active";
    const desiredCount = desiredEnemyCount(livePlayers.length, this.team.danger, activeMission);
    const currentCount = this.enemies.filter((enemy) => !enemy.destroyed).length;
    if (currentCount >= desiredCount) {
      return;
    }

    this.spawnTimer = GAME_CONFIG.enemies.spawnInterval;
    const enemy = spawnEnemy(this.allocateId("enemy"), this.tickCounter + currentCount, livePlayers);
    this.enemies.push(enemy);
    this.enemyBrains.set(enemy.id, { repathTimer: 0, waypoints: [] });
  }

  private cleanupDestroyedEntities(): void {
    for (const enemy of this.enemies) {
      if (!enemy.destroyed && enemy.health <= 0) {
        enemy.destroyed = true;
        this.team.score += 40;
        this.pushEvent("enemy-destroyed", `${enemy.kind} wrecked`, enemy.x, enemy.y, enemy.id);
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.destroyed);
    for (const player of this.players.values()) {
      if (player.health <= 0 && !player.destroyed) {
        this.destroyPlayer(player);
      }
    }
  }

  private destroyPlayer(player: PlayerState): void {
    player.destroyed = true;
    player.respawnTimer = GAME_CONFIG.player.respawnDelay;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
  }

  private respawnPlayer(player: PlayerState): void {
    const spawn = CITY_MAP.playerSpawns[this.tickCounter % CITY_MAP.playerSpawns.length];
    player.destroyed = false;
    player.x = spawn.x;
    player.y = spawn.y;
    player.rotation = 0;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.health = player.maxHealth;
    player.battery = player.maxBattery;
    player.weaponCooldown = 0;
    this.pushEvent("player-respawn", `${player.name} redeployed`, player.x, player.y, player.id);
  }

  private broadcastSnapshot(serverTime: number): void {
    const snapshot: GameSnapshot = {
      tick: this.tickCounter,
      serverTime,
      players: Array.from(this.players.values()),
      enemies: this.enemies,
      projectiles: this.projectiles,
      mission: this.mission,
      team: this.team,
      recentEvents: this.recentEvents.slice(-GAME_CONFIG.ui.feedEventCount)
    };

    this.io.emit("snapshot", snapshot);
  }

  private pushEvent(type: WorldEventType, text: string, x?: number, y?: number, entityId?: string): void {
    this.eventCounter += 1;
    this.recentEvents.push({ id: this.eventCounter, type, text, x, y, entityId });
    if (this.recentEvents.length > 20) {
      this.recentEvents.splice(0, this.recentEvents.length - 20);
    }
  }

  private allocateId(prefix: string): string {
    this.entityCounter += 1;
    return `${prefix}-${this.entityCounter}`;
  }
}
