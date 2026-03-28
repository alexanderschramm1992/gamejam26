export type RecentEventType =
  | 'join'
  | 'leave'
  | 'shot'
  | 'delivery'
  | 'pickup-pizza'
  | 'powerup'
  | 'down'
  | 'respawn'
  | 'enemy-destroyed'

export interface PlayerSnapshot {
  id: string
  name: string
  color: string
  x: number
  y: number
  angle: number
  speed: number
  radius: number
  battery: number
  health: number
  deliveries: number
  score: number
  hasPizza: boolean
  shieldTicks: number
  damageBoostTicks: number
  respawnTicks: number
}

export interface EnemySnapshot {
  id: string
  type: string
  x: number
  y: number
  angle: number
  radius: number
  health: number
}

export interface BulletSnapshot {
  id: string
  ownerType: 'player' | 'enemy'
  x: number
  y: number
  radius: number
  color: string
}

export interface PowerupSnapshot {
  id: string
  type: string
  x: number
  y: number
  radius: number
  active: boolean
}

export interface EffectSnapshot {
  id: number
  type: string
  x: number
  y: number
  color: string
  radius: number
  ttl: number
}

export interface RecentEvent {
  id: number
  type: RecentEventType
  x: number
  y: number
  message: string
}

export interface MapSnapshot {
  worldWidth: number
  worldHeight: number
  spawnPoint: { x: number; y: number; radius: number }
  deliveryZone: { x: number; y: number; radius: number }
  chargers: Array<{ id: string; x: number; y: number; radius: number }>
  boostZones: Array<{ id: string; x: number; y: number; width: number; height: number }>
  buildings: Array<{ x: number; y: number; width: number; height: number; color: string }>
}

export interface GameSnapshot {
  tick: number
  round: number
  deliveries: number
  players: PlayerSnapshot[]
  enemies: EnemySnapshot[]
  bullets: BulletSnapshot[]
  powerups: PowerupSnapshot[]
  effects: EffectSnapshot[]
  recentEvents: RecentEvent[]
  map: MapSnapshot
}
