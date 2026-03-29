export interface Vec2 {
  x: number;
  y: number;
}

export interface RectZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CirclePoi {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface BoostLane extends RectZone {
  heading: number;
}

export interface NavigationNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export interface PlayerInput {
  throttle: number;
  steer: number;
  shoot: boolean;
  interact: boolean;
  aimAngle: number;
  seq: number;
}

export interface VehicleState {
  id: string; // Eindeutige Identifikation des Fahrzeugs
  x: number; // X-Position auf der Weltkarte
  y: number; // Y-Position auf der Weltkarte
  rotation: number; // Rotationswinkel in Grad (Blickrichtung des Fahrzeugs)
  vx: number; // Geschwindigkeit in X-Richtung (Pixel pro Frame)
  vy: number; // Geschwindigkeit in Y-Richtung (Pixel pro Frame)
  driveVelocity: number; // Vom Spieler/KI gewünschte Fahrtgeschwindigkeit
  health: number; // Aktuelle Gesundheit des Fahrzeugs
  maxHealth: number; // Maximale Gesundheit (100% Zustand)
  battery: number; // Aktueller Batteriestand (Energie für Spezialbewegungen)
  maxBattery: number; // Maximale Batteriekapazität
  radius: number; // Kollisionsradius für physikalische Berechnungen
  weaponCooldown: number; // Verbleibende Zeit (ms) bis die nächste Waffe abgefeuert werden kann
  boostedUntil: number; // Zeitstempel bis zu dem Fahrzeug-Boost aktiv ist
  charging: boolean; // Ob das Fahrzeug gerade an einer Ladestation lädt
  destroyed: boolean; // Flag ob das Fahrzeug zerstört/vernichtet ist
}

export interface PlayerState extends VehicleState {
  type: "player";
  name: string;
  color: string;
  connected: boolean;
  score: number;
  respawnTimer: number;
  ghostTimer: number;
  lastProcessedInput: number;
}

export type EnemyKind = "rammer" | "gunner" | "drainer";

export interface EnemyState extends VehicleState {
  type: "enemy";
  kind: EnemyKind;
  targetPlayerId: string | null;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  ownerType: "player" | "enemy";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
}

export type MissionStatus = "ready" | "active" | "cooldown";

export interface MissionState {
  id: string;
  status: MissionStatus;
  dispatchId: string;
  destinationId: string;
  acceptedBy: string | null;
  stage: number;
  reward: number;
  timeLimit: number;
  timeRemaining: number;
  cooldownRemaining: number;
}

export interface TeamState {
  deliveries: number;
  score: number;
  danger: number;
}

export interface AdminSettings {
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemyRammerDamageMultiplier: number;
  enemyGunnerDamageMultiplier: number;
  enemyDrainerDamageMultiplier: number;
  enemyCountMultiplier: number;
  enemySpawnRateMultiplier: number;
  enemyFireRateMultiplier: number;
  chargeRateMultiplier: number;
  playerDamageMultiplier: number;
  playerMaxBattery: number;
  playerSteeringMultiplier: number;
  playerSpeedMultiplier: number;
  playerBrakeMultiplier: number;
  playerFrictionMultiplier: number;
  playerAccelerationMultiplier: number;
}

export type AdminSettingsPatch = Partial<AdminSettings>;

export interface AdminState {
  canEdit: boolean;
  adminPlayerId: string | null;
  settings: AdminSettings;
}

export type WorldEventType =
  | "shot"
  | "hit"
  | "enemy-destroyed"
  | "mission-accepted"
  | "mission-completed"
  | "mission-failed"
  | "player-respawn"
  | "charge"
  | "boost"
  | "drain";

export interface WorldEvent {
  id: number;
  type: WorldEventType;
  text: string;
  x?: number;
  y?: number;
  entityId?: string;
  sourceX?: number;
  sourceY?: number;
}

export interface GameSnapshot {
  tick: number;
  serverTime: number;
  players: PlayerState[];
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  mission: MissionState;
  team: TeamState;
  recentEvents: WorldEvent[];
}

export interface WorldMapData {
  width: number;
  height: number;
  roads: RectZone[];
  buildings: RectZone[];
  parks: RectZone[];
  water: RectZone[];
  bridges: RectZone[];
  chargeStations: CirclePoi[];
  boostLanes: BoostLane[];
  dispatchPoints: CirclePoi[];
  deliveryPoints: CirclePoi[];
  enemyHotspots: CirclePoi[];
  navigationNodes: NavigationNode[];
  playerSpawns: Vec2[];
}
