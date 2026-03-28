import type { Server as SocketServer, Socket } from "socket.io";
import { DEFAULT_ADMIN_SETTINGS, clampAdminSetting } from "../../shared/config/adminSettings";
import { ENEMY_ARCHETYPES, GAME_CONFIG, PLAYER_COLORS, type VehicleTuning } from "../../shared/config/gameConfig";
import { CITY_MAP } from "../../shared/map/cityMap";
import type {
  AdminSettings,
  AdminSettingsPatch,
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
import { clamp, distance } from "../../shared/utils/math";
import { updateProjectiles, firePlayerProjectile } from "../features/combat/combatSystem";
import {
  desiredEnemyCount,
  spawnEnemy,
  type EnemyBrain,
  updateEnemies,
  createEnemyBrain
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

const DRAIN_BEAM_RANGE_MULTIPLIER = 3.6;

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
  private enemySpawnCounter = 0;
  private adminPlayerId: string | null = null;
  private adminSettings: AdminSettings = { ...DEFAULT_ADMIN_SETTINGS };

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

    if (!this.adminPlayerId) {
      this.adminPlayerId = player.id;
    }

    socket.emit("hello", { playerId: player.id });
    this.emitAdminState(socket);

    socket.on("input", (input: PlayerInput) => {
      this.inputs.set(player.id, input);
    });
    socket.on("setPlayerName", (name: string) => {
      player.name = this.sanitizePlayerName(name, player.name);
    });
    socket.on("adminUpdateSettings", (patch: AdminSettingsPatch) => {
      if (player.id !== this.adminPlayerId) {
        return;
      }
      this.applyAdminSettingsPatch(patch);
    });
    socket.on("disconnect", () => {
      this.players.delete(player.id);
      this.inputs.delete(player.id);

      if (this.adminPlayerId === player.id) {
        this.assignNextAdmin();
      }

      this.broadcastAdminState();
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
      driveVelocity: 0,
      drift: 0,
      health: GAME_CONFIG.player.maxHealth,
      maxHealth: GAME_CONFIG.player.maxHealth,
      battery: this.adminSettings.playerMaxBattery,
      maxBattery: this.adminSettings.playerMaxBattery,
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

  private sanitizePlayerName(rawName: string, fallback: string): string {
    const sanitized = rawName
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);

    return sanitized.length > 0 ? sanitized : fallback;
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
      this.adminSettings,
      () => this.allocateId("projectile")
    );
    this.projectiles.push(...enemyShots);
    this.handleEnemyDrains();

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
    const playerTuning = this.getPlayerTuning();

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
        tuning: playerTuning,
        lowBattery: player.battery <= GAME_CONFIG.battery.lowBatteryThreshold,
        crippledBattery: player.battery <= GAME_CONFIG.battery.crippledThreshold,
        offRoad: !surface.onRoad,
        boosted: now < player.boostedUntil
      });
      const resourceResult = updateVehicleResources(player, input, surface, dt, now, {
        chargeMultiplier: this.adminSettings.chargeRateMultiplier
      });
      const hitWall = resolveWorldCollision(player);
      if (hitWall) {
        player.health -= Math.max(2, player.speed * playerTuning.collisionDamage * 0.5);
      }

      if (input.shoot && player.weaponCooldown <= 0 && player.battery > GAME_CONFIG.battery.shootDrain) {
        this.projectiles.push(
          firePlayerProjectile(player, this.allocateId("projectile"), this.adminSettings.playerDamageMultiplier)
        );
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
    const damageMultiplier = this.getEnemyDamageMultiplier(enemy.kind);
    enemy.health -= impactDamage * 0.45;

    if (enemy.kind === "drainer") {
      return;
    }

    player.health -= impactDamage + archetype.contactDamage * 0.35 * damageMultiplier;

    if (enemy.kind === "rammer") {
      player.health -= archetype.contactDamage * 0.45 * damageMultiplier;
      enemy.health -= impactDamage * 0.1;
      this.pushEvent("hit", `${enemy.kind} slammed ${player.name}`, player.x, player.y, player.id);
      return;
    }

    this.pushEvent("hit", `${enemy.kind} clipped ${player.name}`, player.x, player.y, player.id);
  }

  private handleEnemyDrains(): void {
    const livePlayers = Array.from(this.players.values());
    const drainCooldownScale = Math.max(0.25, this.adminSettings.enemyFireRateMultiplier);

    for (const enemy of this.enemies) {
      if (enemy.destroyed || enemy.kind !== "drainer" || enemy.weaponCooldown > 0) {
        continue;
      }

      const player = livePlayers.find((candidate) => candidate.id === enemy.targetPlayerId && !candidate.destroyed);
      if (!player) {
        continue;
      }

      const maxDrainDistance = player.radius * DRAIN_BEAM_RANGE_MULTIPLIER + enemy.radius;
      if (distance(enemy, player) > maxDrainDistance) {
        continue;
      }

      const drainAmount = Math.min(player.battery, ENEMY_ARCHETYPES.drainer.batteryDrain * this.getEnemyDamageMultiplier("drainer"));
      if (drainAmount <= 0) {
        continue;
      }

      player.battery = Math.max(0, player.battery - drainAmount);
      enemy.health = Math.min(enemy.maxHealth, enemy.health + drainAmount * 0.18);
      enemy.weaponCooldown = ENEMY_ARCHETYPES.drainer.fireCooldown / drainCooldownScale;
      this.pushEvent(
        "drain",
        `${enemy.kind} drained ${drainAmount.toFixed(0)} battery`,
        player.x,
        player.y,
        player.id,
        enemy.x,
        enemy.y
      );
    }
  }

  private getEnemyDamageMultiplier(kind: EnemyState["kind"]): number {
    const base = this.adminSettings.enemyDamageMultiplier;
    if (kind === "rammer") {
      return base * this.adminSettings.enemyRammerDamageMultiplier;
    }
    if (kind === "gunner") {
      return base * this.adminSettings.enemyGunnerDamageMultiplier;
    }
    return base * this.adminSettings.enemyDrainerDamageMultiplier;
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
    const desiredCount = this.getDesiredEnemyCount(livePlayers.length, activeMission);
    const currentCount = this.enemies.filter((enemy) => !enemy.destroyed).length;
    if (currentCount >= desiredCount) {
      return;
    }

    this.spawnTimer = this.getEnemySpawnInterval();
    this.enemySpawnCounter += 1;
    const enemy = spawnEnemy(
      this.allocateId("enemy"),
      this.enemySpawnCounter,
      livePlayers,
      this.adminSettings.enemyHealthMultiplier
    );
    this.enemies.push(enemy);
    this.enemyBrains.set(enemy.id, createEnemyBrain(enemy));
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
    player.driveVelocity = 0;
    player.drift = 0;
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
    player.driveVelocity = 0;
    player.drift = 0;
    player.health = player.maxHealth;
    player.maxBattery = this.adminSettings.playerMaxBattery;
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

  private emitAdminState(socket: Socket): void {
    socket.emit("adminState", {
      canEdit: socket.id === this.adminPlayerId,
      adminPlayerId: this.adminPlayerId,
      settings: { ...this.adminSettings }
    });
  }

  private broadcastAdminState(): void {
    for (const socket of this.io.sockets.sockets.values()) {
      this.emitAdminState(socket);
    }
  }

  private assignNextAdmin(): void {
    const nextAdmin = this.players.keys().next();
    this.adminPlayerId = nextAdmin.done ? null : nextAdmin.value;
  }

  private applyAdminSettingsPatch(patch: AdminSettingsPatch): void {
    let changed = false;
    let batteryChanged = false;
    let healthChanged = false;
    let spawnRulesChanged = false;

    for (const [rawKey, rawValue] of Object.entries(patch)) {
      if (!(rawKey in this.adminSettings) || typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        continue;
      }

      const key = rawKey as keyof AdminSettings;
      const nextValue = clampAdminSetting(key, rawValue);
      if (this.adminSettings[key] === nextValue) {
        continue;
      }

      this.adminSettings[key] = nextValue;
      changed = true;
      batteryChanged = batteryChanged || key === "playerMaxBattery";
      healthChanged = healthChanged || key === "enemyHealthMultiplier";
      spawnRulesChanged =
        spawnRulesChanged || key === "enemyCountMultiplier" || key === "enemySpawnRateMultiplier";
    }

    if (!changed) {
      return;
    }

    if (batteryChanged) {
      this.syncPlayerBatteryCapacity();
    }
    if (healthChanged) {
      this.syncEnemyHealth();
    }
    if (spawnRulesChanged) {
      this.spawnTimer = Math.min(this.spawnTimer, this.getEnemySpawnInterval());
    }

    this.broadcastAdminState();
  }

  private syncPlayerBatteryCapacity(): void {
    for (const player of this.players.values()) {
      const fillRatio = player.maxBattery > 0 ? player.battery / player.maxBattery : 1;
      player.maxBattery = this.adminSettings.playerMaxBattery;
      player.battery = Math.min(player.maxBattery, Math.max(0, fillRatio) * player.maxBattery);
    }
  }

  private syncEnemyHealth(): void {
    for (const enemy of this.enemies) {
      if (enemy.destroyed) {
        continue;
      }

      const archetype = ENEMY_ARCHETYPES[enemy.kind];
      const fillRatio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
      enemy.maxHealth = archetype.maxHealth * this.adminSettings.enemyHealthMultiplier;
      enemy.health = Math.min(enemy.maxHealth, Math.max(0, fillRatio) * enemy.maxHealth);
    }
  }

  private getEnemySpawnInterval(): number {
    return Math.max(0.35, GAME_CONFIG.enemies.spawnInterval / Math.max(0.2, this.adminSettings.enemySpawnRateMultiplier));
  }

  private getDesiredEnemyCount(playerCount: number, activeMission: boolean): number {
    const baseCount = desiredEnemyCount(playerCount, this.team.danger, activeMission);
    const scaledCount = baseCount * this.adminSettings.enemyCountMultiplier;
    return Math.min(24, Math.max(1, Math.ceil(scaledCount)));
  }

  private getPlayerTuning(): VehicleTuning {
    const base = GAME_CONFIG.player;
    const accelerationMultiplier = this.adminSettings.playerAccelerationMultiplier;
    const speedMultiplier = this.adminSettings.playerSpeedMultiplier;
    const steeringMultiplier = this.adminSettings.playerSteeringMultiplier;
    const brakeMultiplier = this.adminSettings.playerBrakeMultiplier;
    const frictionMultiplier = this.adminSettings.playerFrictionMultiplier;

    return {
      acceleration: base.acceleration * accelerationMultiplier,
      reverseAcceleration: base.reverseAcceleration * (0.8 + accelerationMultiplier * 0.2),
      brakeStrength: base.brakeStrength * brakeMultiplier,
      turnSpeed: base.turnSpeed * steeringMultiplier,
      maxForwardSpeed: base.maxForwardSpeed * speedMultiplier,
      maxReverseSpeed: base.maxReverseSpeed * (0.72 + speedMultiplier * 0.28),
      drag: clamp(base.drag / Math.max(0.7, speedMultiplier * 0.92), 0.75, 1.8),
      grip: base.grip * frictionMultiplier,
      friction: clamp(base.friction - (frictionMultiplier - 1) * 0.035, 0.82, 0.985),
      handbrakeMultiplier: clamp(base.handbrakeMultiplier - (brakeMultiplier - 1) * 0.08, 0.48, 0.9),
      driftGain: base.driftGain / Math.sqrt(Math.max(0.55, frictionMultiplier)),
      driftDecay: clamp(base.driftDecay + (1 - frictionMultiplier) * 0.02, 0.88, 0.96),
      maxDrift: base.maxDrift / Math.sqrt(Math.max(0.55, frictionMultiplier)),
      radius: base.radius,
      collisionDamage: base.collisionDamage
    };
  }

  private pushEvent(
    type: WorldEventType,
    text: string,
    x?: number,
    y?: number,
    entityId?: string,
    sourceX?: number,
    sourceY?: number
  ): void {
    this.eventCounter += 1;
    this.recentEvents.push({ id: this.eventCounter, type, text, x, y, entityId, sourceX, sourceY });
    if (this.recentEvents.length > 20) {
      this.recentEvents.splice(0, this.recentEvents.length - 20);
    }
  }

  private allocateId(prefix: string): string {
    this.entityCounter += 1;
    return `${prefix}-${this.entityCounter}`;
  }
}
