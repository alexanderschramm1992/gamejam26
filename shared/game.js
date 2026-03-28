export const SERVER_TICK_MS = 1000 / 30
export const WORLD_WIDTH = 2400
export const WORLD_HEIGHT = 1600
export const MAX_PLAYERS = 4

export const PLAYER_COLORS = ['#76f7ff', '#9cff7d', '#ffd166', '#ff8fab']

export const SPAWN_POINT = { x: 260, y: 1320, radius: 85 }
export const DELIVERY_ZONE = { x: 2100, y: 260, radius: 95 }

export const ROAD_SEGMENTS = [
  { x: 0, y: 1160, width: 2400, height: 180 },
  { x: 150, y: 700, width: 1940, height: 170 },
  { x: 350, y: 180, width: 1860, height: 150 },
  { x: 140, y: 180, width: 170, height: 1160 },
  { x: 850, y: 180, width: 170, height: 1160 },
  { x: 1680, y: 180, width: 170, height: 980 },
  { x: 1180, y: 700, width: 620, height: 170 },
]

export const BUILDINGS = [
  { x: 340, y: 380, width: 370, height: 210, color: '#483f3b' },
  { x: 1080, y: 360, width: 500, height: 240, color: '#574842' },
  { x: 1940, y: 380, width: 260, height: 290, color: '#4a403d' },
  { x: 360, y: 930, width: 360, height: 180, color: '#584c46' },
  { x: 1090, y: 930, width: 500, height: 180, color: '#4b4742' },
  { x: 1940, y: 930, width: 260, height: 260, color: '#5b4c45' },
  { x: 1320, y: 1240, width: 660, height: 180, color: '#514640' },
]

export const CHARGERS = [
  { id: 'charger-west', x: 620, y: 1248, radius: 60 },
  { id: 'charger-mid', x: 1430, y: 782, radius: 60 },
  { id: 'charger-north', x: 1860, y: 252, radius: 60 },
]

export const BOOST_ZONES = [
  { id: 'boost-south', x: 950, y: 1192, width: 360, height: 116 },
  { id: 'boost-center', x: 1192, y: 720, width: 480, height: 126 },
  { id: 'boost-east', x: 1706, y: 540, width: 116, height: 420 },
]

export const POWERUP_PADS = [
  { id: 'pad-battery', type: 'battery', x: 1110, y: 1260, radius: 24 },
  { id: 'pad-shield', type: 'shield', x: 1990, y: 1210, radius: 24 },
  { id: 'pad-damage', type: 'damage', x: 450, y: 760, radius: 24 },
  { id: 'pad-repair', type: 'repair', x: 2010, y: 760, radius: 24 },
]

export const ENEMY_SPAWN_POINTS = [
  { x: 2140, y: 1180 },
  { x: 2220, y: 320 },
  { x: 980, y: 260 },
  { x: 1550, y: 1320 },
  { x: 420, y: 240 },
]

export const ENEMY_DEFS = {
  chaser: {
    label: 'Jaeger',
    radius: 20,
    maxSpeed: 5.8,
    acceleration: 0.17,
    turnSpeed: 0.045,
    health: 45,
    contactDamage: 10,
    color: '#c44d3f',
  },
  bruiser: {
    label: 'Diesel-Rammbock',
    radius: 26,
    maxSpeed: 4.7,
    acceleration: 0.13,
    turnSpeed: 0.032,
    health: 90,
    contactDamage: 18,
    color: '#835c3b',
  },
  gunner: {
    label: 'Schuetze',
    radius: 22,
    maxSpeed: 4.4,
    acceleration: 0.12,
    turnSpeed: 0.038,
    health: 60,
    contactDamage: 8,
    projectileSpeed: 10,
    fireCooldown: 54,
    color: '#6a7c4d',
  },
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

export function normalizeAngle(angle) {
  let next = angle
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

export function pointInCircle(point, circle) {
  return distance(point, circle) <= circle.radius
}

export function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

export function circleIntersectsRect(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.width)
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.height)
  const dx = circle.x - nearestX
  const dy = circle.y - nearestY
  return dx * dx + dy * dy < circle.radius * circle.radius
}

export function resolveCircleRectCollision(entity, rect) {
  if (!circleIntersectsRect(entity, rect)) return false

  const nearestX = clamp(entity.x, rect.x, rect.x + rect.width)
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.height)
  let dx = entity.x - nearestX
  let dy = entity.y - nearestY
  let length = Math.hypot(dx, dy)

  if (length === 0) {
    const distances = [
      { axis: 'left', value: Math.abs(entity.x - rect.x) },
      { axis: 'right', value: Math.abs(entity.x - (rect.x + rect.width)) },
      { axis: 'top', value: Math.abs(entity.y - rect.y) },
      { axis: 'bottom', value: Math.abs(entity.y - (rect.y + rect.height)) },
    ]
    distances.sort((a, b) => a.value - b.value)
    const nearest = distances[0]

    if (nearest.axis === 'left') {
      entity.x = rect.x - entity.radius
    } else if (nearest.axis === 'right') {
      entity.x = rect.x + rect.width + entity.radius
    } else if (nearest.axis === 'top') {
      entity.y = rect.y - entity.radius
    } else {
      entity.y = rect.y + rect.height + entity.radius
    }

    return true
  }

  const overlap = entity.radius - length
  dx /= length
  dy /= length
  entity.x += dx * overlap
  entity.y += dy * overlap
  return true
}

export function isInsideBoostZone(point) {
  return BOOST_ZONES.some((zone) => pointInRect(point, zone))
}

export function findCharger(point) {
  return CHARGERS.find((charger) => pointInCircle(point, charger)) ?? null
}

export function createInitialPowerups() {
  return POWERUP_PADS.map((pad) => ({
    ...pad,
    active: true,
    cooldown: 0,
  }))
}

export function createSpawnPosition(index) {
  const offsets = [
    { x: 0, y: 0 },
    { x: 52, y: -42 },
    { x: -46, y: 38 },
    { x: 60, y: 50 },
  ]
  const offset = offsets[index % offsets.length]
  return {
    x: SPAWN_POINT.x + offset.x,
    y: SPAWN_POINT.y + offset.y,
  }
}

export function worldClampPosition(entity) {
  entity.x = clamp(entity.x, entity.radius, WORLD_WIDTH - entity.radius)
  entity.y = clamp(entity.y, entity.radius, WORLD_HEIGHT - entity.radius)
}
