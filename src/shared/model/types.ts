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
  brake: boolean;
  shoot: boolean;
  interact: boolean;
  seq: number;
}

export interface VehicleState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  speed: number;
  health: number;
  maxHealth: number;
  battery: number;
  maxBattery: number;
  radius: number;
  weaponCooldown: number;
  boostedUntil: number;
  charging: boolean;
  destroyed: boolean;
}

export interface PlayerState extends VehicleState {
  type: "player";
  name: string;
  color: string;
  connected: boolean;
  score: number;
  respawnTimer: number;
  lastProcessedInput: number;
}

export type EnemyKind = "scout" | "brute" | "gunner";

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

export type WorldEventType =
  | "shot"
  | "hit"
  | "enemy-destroyed"
  | "mission-accepted"
  | "mission-completed"
  | "mission-failed"
  | "player-respawn"
  | "charge"
  | "boost";

export interface WorldEvent {
  id: number;
  type: WorldEventType;
  text: string;
  x?: number;
  y?: number;
  entityId?: string;
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
  chargeStations: CirclePoi[];
  boostLanes: BoostLane[];
  dispatchPoints: CirclePoi[];
  deliveryPoints: CirclePoi[];
  enemyHotspots: CirclePoi[];
  navigationNodes: NavigationNode[];
  playerSpawns: Vec2[];
}
