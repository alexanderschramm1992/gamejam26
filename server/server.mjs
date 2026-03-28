import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BOOST_ZONES,
  BUILDINGS,
  CHARGERS,
  DELIVERY_ZONE,
  ENEMY_DEFS,
  ENEMY_SPAWN_POINTS,
  MAX_PLAYERS,
  PLAYER_COLORS,
  SERVER_TICK_MS,
  SPAWN_POINT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  angleTo,
  clamp,
  createInitialPowerups,
  createSpawnPosition,
  distance,
  findCharger,
  isInsideBoostZone,
  pointInCircle,
  resolveCircleRectCollision,
  worldClampPosition,
} from '../shared/game.js'
import { attachWebSocketServer } from './websocket.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distRoot = path.join(projectRoot, 'dist')
const port = Number(process.env.PORT || 3000)

const clients = new Map()
const world = createWorld()

const server = http.createServer(async (request, response) => {
  const requestUrl = request.url === '/' ? '/index.html' : request.url ?? '/index.html'
  const filePath = path.join(distRoot, requestUrl)
  const normalizedPath = path.normalize(filePath)

  if (!normalizedPath.startsWith(distRoot)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const file = await fs.readFile(normalizedPath)
    response.writeHead(200, { 'Content-Type': getContentType(normalizedPath) })
    response.end(file)
  } catch {
    if (requestUrl === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(`<!doctype html><html><body style="font-family: monospace; background: #111; color: #eee; padding: 32px;"><h1>Build fehlt</h1><p>Bitte zuerst <code>npm run build</code> ausfuehren und danach <code>npm run start</code>.</p></body></html>`)
      return
    }

    response.writeHead(404)
    response.end('Not found')
  }
})

attachWebSocketServer(server, {
  path: '/ws',
  onClient(client) {
    if (world.players.size >= MAX_PLAYERS) {
      client.sendJSON({ type: 'error', message: 'Lobby voll' })
      client.close()
      return
    }

    const playerId = createId('player')
    const player = createPlayer(playerId, world.players.size)
    world.players.set(playerId, player)
    clients.set(playerId, client)

    pushEvent('join', player.x, player.y, `${player.name} ist online`) 
    client.sendJSON({
      type: 'welcome',
      playerId,
      world: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
      },
    })

    client.onMessage((raw) => {
      let message
      try {
        message = JSON.parse(raw)
      } catch {
        return
      }

      if (message.type === 'join' && typeof message.name === 'string') {
        const trimmed = message.name.trim().slice(0, 18)
        if (trimmed) player.name = trimmed
      }

      if (message.type === 'input' && message.input) {
        player.input = sanitizeInput(message.input)
      }
    })

    client.onClose(() => {
      clients.delete(playerId)
      world.players.delete(playerId)
      pushEvent('leave', player.x, player.y, `${player.name} hat getrennt`)
    })
  },
})

server.listen(port, () => {
  console.log(`gamejam26 server listening on http://localhost:${port}`)
})

setInterval(tick, SERVER_TICK_MS)

function createWorld() {
  return {
    tick: 0,
    round: 1,
    deliveries: 0,
    nextEventId: 1,
    nextEffectId: 1,
    nextEntityId: 1,
    players: new Map(),
    enemies: [],
    bullets: [],
    powerups: createInitialPowerups(),
    effects: [],
    recentEvents: [],
  }
}

function createPlayer(id, index) {
  const spawn = createSpawnPosition(index)
  return {
    id,
    name: `Fahrer ${index + 1}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    x: spawn.x,
    y: spawn.y,
    angle: -0.55,
    speed: 0,
    drift: 0,
    radius: 20,
    health: 100,
    battery: 100,
    deliveries: 0,
    score: 0,
    hasPizza: true,
    shieldTicks: 0,
    damageBoostTicks: 0,
    respawnTicks: 0,
    shootCooldown: 0,
    input: sanitizeInput({}),
  }
}

function sanitizeInput(input) {
  return {
    up: Boolean(input.up),
    down: Boolean(input.down),
    left: Boolean(input.left),
    right: Boolean(input.right),
    boost: Boolean(input.boost),
    shoot: Boolean(input.shoot),
    aimX: Number.isFinite(input.aimX) ? Number(input.aimX) : 0,
    aimY: Number.isFinite(input.aimY) ? Number(input.aimY) : 0,
  }
}

function createId(prefix) {
  world.nextEntityId += 1
  return `${prefix}-${world.nextEntityId}`
}

function tick() {
  world.tick += 1
  updatePlayers()
  updateEnemies()
  updateBullets()
  updatePowerups()
  updateEffects()
  maintainEnemyPressure()
  broadcastState()
}

function updatePlayers() {
  let playerIndex = 0

  for (const player of world.players.values()) {
    if (player.respawnTicks > 0) {
      player.respawnTicks -= 1
      if (player.respawnTicks === 0) {
        const spawn = createSpawnPosition(playerIndex)
        player.x = spawn.x
        player.y = spawn.y
        player.speed = 0
        player.drift = 0
        player.health = 100
        player.battery = 90
        player.hasPizza = true
        player.angle = -0.55
        pushEvent('respawn', player.x, player.y, `${player.name} ist zurueck`) 
      }
      playerIndex += 1
      continue
    }

    player.shootCooldown = Math.max(0, player.shootCooldown - 1)
    player.shieldTicks = Math.max(0, player.shieldTicks - 1)
    player.damageBoostTicks = Math.max(0, player.damageBoostTicks - 1)

    const forwardInput = (player.input.up ? 1 : 0) - (player.input.down ? 1 : 0)
    const turnInput = (player.input.right ? 1 : 0) - (player.input.left ? 1 : 0)
    const onBoost = isInsideBoostZone(player)
    const charger = findCharger(player)

    applyVehicleTurning(player, turnInput, player.input.boost)
    applyVehicleAcceleration(player, forwardInput, onBoost)
    applyVehicleMovement(player)
    resolveWorldCollision(player)

    if (charger && Math.abs(player.speed) < 3.2) {
      player.battery = clamp(player.battery + 0.75, 0, 100)
      if (world.tick % 10 === 0) {
        spawnEffect('charge', player.x, player.y, '#67f2ff', 16)
      }
    }

    if (!player.hasPizza && pointInCircle(player, SPAWN_POINT)) {
      player.hasPizza = true
      pushEvent('pickup-pizza', player.x, player.y, `${player.name} laedt Pizza`) 
    }

    if (player.hasPizza && pointInCircle(player, DELIVERY_ZONE)) {
      player.hasPizza = false
      player.deliveries += 1
      player.score += 250
      world.deliveries += 1
      world.round = 1 + Math.floor(world.deliveries / 2)
      pushEvent('delivery', player.x, player.y, `${player.name} hat geliefert`) 
      spawnEffect('delivery', DELIVERY_ZONE.x, DELIVERY_ZONE.y, '#ffe066', 48)
      for (const teammate of world.players.values()) {
        teammate.battery = clamp(teammate.battery + 12, 0, 100)
      }
    }

    if (player.input.shoot && player.shootCooldown === 0 && player.battery >= 1.5) {
      spawnPlayerBullet(player)
      player.battery = clamp(player.battery - 1.6, 0, 100)
      player.shootCooldown = 10
    }

    if (player.health <= 0) {
      player.respawnTicks = 90
      player.speed = 0
      player.drift = 0
      player.hasPizza = false
      spawnEffect('explosion', player.x, player.y, '#ff8c42', 36)
      pushEvent('down', player.x, player.y, `${player.name} wurde ausgeschaltet`) 
    }

    playerIndex += 1
  }
}

function applyVehicleTurning(vehicle, turnInput, boostPressed) {
  if (turnInput === 0 || Math.abs(vehicle.speed) < 0.08) return
  const baseTurn = boostPressed ? 0.047 : 0.038
  vehicle.angle += turnInput * baseTurn * Math.sign(vehicle.speed)
}

function applyVehicleAcceleration(player, forwardInput, onBoost) {
  const lowBattery = player.battery <= 0
  const maxForward = lowBattery ? 2.2 : 6.4
  const maxReverse = lowBattery ? -1.6 : -2.8
  const acceleration = lowBattery ? 0.06 : 0.17
  const reverseAcceleration = lowBattery ? 0.05 : 0.12
  const friction = player.input.boost ? 0.985 : 0.96

  if (forwardInput > 0) {
    player.speed += acceleration
    player.battery = clamp(player.battery - 0.08, 0, 100)
  } else if (forwardInput < 0) {
    player.speed -= reverseAcceleration
    player.battery = clamp(player.battery - 0.04, 0, 100)
  } else {
    player.speed *= friction
    if (Math.abs(player.speed) < 0.02) player.speed = 0
  }

  if (player.input.boost && player.battery > 0) {
    player.speed += onBoost ? 0.12 : 0.06
    player.battery = clamp(player.battery - (onBoost ? 0.22 : 0.12), 0, 100)
  }

  if (onBoost) {
    player.speed += 0.08
    player.battery = clamp(player.battery + 0.1, 0, 100)
    spawnEffect('boost', player.x, player.y, '#56f7b6', 14)
  }

  const turnStress = Math.abs((player.input.right ? 1 : 0) - (player.input.left ? 1 : 0))
  if (turnStress > 0 && Math.abs(player.speed) > 3.5) {
    player.drift += turnStress * 0.08 * Math.sign(player.speed)
  }

  player.drift *= 0.9
  player.speed = clamp(player.speed, maxReverse, maxForward + (onBoost ? 2.1 : 0))
}

function applyVehicleMovement(vehicle) {
  const forwardX = Math.cos(vehicle.angle) * vehicle.speed
  const forwardY = Math.sin(vehicle.angle) * vehicle.speed
  const driftX = Math.cos(vehicle.angle + Math.PI / 2) * vehicle.drift
  const driftY = Math.sin(vehicle.angle + Math.PI / 2) * vehicle.drift
  vehicle.x += forwardX + driftX
  vehicle.y += forwardY + driftY
}

function resolveWorldCollision(entity) {
  worldClampPosition(entity)
  let collided = false

  for (const building of BUILDINGS) {
    collided = resolveCircleRectCollision(entity, building) || collided
  }

  if (collided) {
    entity.speed *= -0.25
    entity.drift *= 0.45
  }
}

function spawnPlayerBullet(player) {
  const target = {
    x: Number.isFinite(player.input.aimX) ? player.input.aimX : player.x + Math.cos(player.angle) * 100,
    y: Number.isFinite(player.input.aimY) ? player.input.aimY : player.y + Math.sin(player.angle) * 100,
  }
  const angle = angleTo(player, target)
  const speed = 13
  const damage = player.damageBoostTicks > 0 ? 22 : 14

  world.bullets.push({
    id: createId('bullet'),
    ownerType: 'player',
    ownerId: player.id,
    x: player.x + Math.cos(angle) * 28,
    y: player.y + Math.sin(angle) * 28,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 5,
    life: 40,
    damage,
    color: '#86f7ff',
  })

  pushEvent('shot', player.x, player.y, `${player.name} feuert`) 
}

function updateEnemies() {
  const activePlayers = [...world.players.values()].filter((player) => player.respawnTicks === 0)
  if (activePlayers.length === 0) return

  for (const enemy of world.enemies) {
    const definition = ENEMY_DEFS[enemy.type]
    const target = getNearestPlayer(enemy, activePlayers)
    if (!target) continue

    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - 1)
    const desiredAngle = angleTo(enemy, target)
    const delta = normalizeDelta(desiredAngle - enemy.angle)
    enemy.angle += clamp(delta, -definition.turnSpeed, definition.turnSpeed)
    enemy.speed += definition.acceleration

    const targetDistance = distance(enemy, target)
    if (targetDistance < 120 && enemy.type !== 'gunner') {
      enemy.speed += 0.14
    }

    if (enemy.type === 'gunner' && targetDistance < 520) {
      enemy.speed *= 0.94
      if (enemy.fireCooldown === 0) {
        spawnEnemyBullet(enemy, target, definition)
        enemy.fireCooldown = definition.fireCooldown
      }
    }

    enemy.speed = clamp(enemy.speed, 0, definition.maxSpeed)
    enemy.x += Math.cos(enemy.angle) * enemy.speed
    enemy.y += Math.sin(enemy.angle) * enemy.speed
    resolveWorldCollision(enemy)
    enemy.speed *= 0.95

    if (distance(enemy, target) < enemy.radius + target.radius + 10) {
      const damage = definition.contactDamage
      dealDamageToPlayer(target, damage)
      const pushAngle = angleTo(enemy, target)
      target.x += Math.cos(pushAngle) * 18
      target.y += Math.sin(pushAngle) * 18
      resolveWorldCollision(target)
    }
  }

  world.enemies = world.enemies.filter((enemy) => {
    if (enemy.health > 0) return true
    spawnEffect('explosion', enemy.x, enemy.y, '#ff7a59', 28)
    pushEvent('enemy-destroyed', enemy.x, enemy.y, `${ENEMY_DEFS[enemy.type].label} ausgeschaltet`) 
    if (Math.random() < 0.28) {
      const inactivePowerup = world.powerups.find((powerup) => !powerup.active)
      if (inactivePowerup) {
        inactivePowerup.x = enemy.x
        inactivePowerup.y = enemy.y
        inactivePowerup.active = true
        inactivePowerup.cooldown = 0
      }
    }
    return false
  })
}

function updateBullets() {
  for (const bullet of world.bullets) {
    bullet.x += bullet.vx
    bullet.y += bullet.vy
    bullet.life -= 1

    if (bullet.x < 0 || bullet.x > WORLD_WIDTH || bullet.y < 0 || bullet.y > WORLD_HEIGHT) {
      bullet.life = 0
      continue
    }

    for (const building of BUILDINGS) {
      if (
        bullet.x >= building.x &&
        bullet.x <= building.x + building.width &&
        bullet.y >= building.y &&
        bullet.y <= building.y + building.height
      ) {
        bullet.life = 0
        break
      }
    }

    if (bullet.life <= 0) continue

    if (bullet.ownerType === 'player') {
      for (const enemy of world.enemies) {
        if (distance(bullet, enemy) <= bullet.radius + enemy.radius) {
          enemy.health -= bullet.damage
          bullet.life = 0
          spawnEffect('hit', bullet.x, bullet.y, '#7fe7ff', 12)
          break
        }
      }
    } else {
      for (const player of world.players.values()) {
        if (player.respawnTicks > 0) continue
        if (distance(bullet, player) <= bullet.radius + player.radius) {
          dealDamageToPlayer(player, bullet.damage)
          bullet.life = 0
          spawnEffect('hit', bullet.x, bullet.y, '#ff6d6d', 12)
          break
        }
      }
    }
  }

  world.bullets = world.bullets.filter((bullet) => bullet.life > 0)
}

function updatePowerups() {
  for (const powerup of world.powerups) {
    if (!powerup.active) {
      powerup.cooldown -= 1
      if (powerup.cooldown <= 0) {
        powerup.active = true
      }
      continue
    }

    for (const player of world.players.values()) {
      if (player.respawnTicks > 0) continue
      if (distance(player, powerup) <= player.radius + powerup.radius) {
        applyPowerup(player, powerup)
        powerup.active = false
        powerup.cooldown = 240
        break
      }
    }
  }
}

function updateEffects() {
  for (const effect of world.effects) {
    effect.ttl -= 1
  }
  world.effects = world.effects.filter((effect) => effect.ttl > 0)
  world.recentEvents = world.recentEvents.slice(-24)
}

function maintainEnemyPressure() {
  const targetCount = clamp(3 + world.players.size + world.round * 2, 4, 14)
  while (world.enemies.length < targetCount) {
    spawnEnemy()
  }
}

function spawnEnemy() {
  const types = ['chaser', 'chaser', 'bruiser', 'gunner']
  const type = types[Math.floor(Math.random() * types.length)]
  const definition = ENEMY_DEFS[type]
  const spawnPoint = ENEMY_SPAWN_POINTS[Math.floor(Math.random() * ENEMY_SPAWN_POINTS.length)]
  const spawn = {
    x: spawnPoint.x + Math.random() * 60 - 30,
    y: spawnPoint.y + Math.random() * 60 - 30,
  }

  world.enemies.push({
    id: createId('enemy'),
    type,
    x: clamp(spawn.x, 100, WORLD_WIDTH - 100),
    y: clamp(spawn.y, 100, WORLD_HEIGHT - 100),
    angle: Math.random() * Math.PI * 2,
    speed: 0,
    radius: definition.radius,
    health: definition.health + world.round * 10,
    fireCooldown: definition.fireCooldown ?? 0,
  })
}

function spawnEnemyBullet(enemy, target, definition) {
  const angle = angleTo(enemy, target)
  world.bullets.push({
    id: createId('bullet'),
    ownerType: 'enemy',
    ownerId: enemy.id,
    x: enemy.x + Math.cos(angle) * (enemy.radius + 8),
    y: enemy.y + Math.sin(angle) * (enemy.radius + 8),
    vx: Math.cos(angle) * definition.projectileSpeed,
    vy: Math.sin(angle) * definition.projectileSpeed,
    radius: 5,
    life: 48,
    damage: 12 + world.round,
    color: '#ffad66',
  })
}

function applyPowerup(player, powerup) {
  if (powerup.type === 'battery') {
    player.battery = clamp(player.battery + 35, 0, 100)
  }

  if (powerup.type === 'shield') {
    player.shieldTicks = 240
  }

  if (powerup.type === 'damage') {
    player.damageBoostTicks = 240
  }

  if (powerup.type === 'repair') {
    player.health = clamp(player.health + 35, 0, 100)
  }

  player.score += 40
  pushEvent('powerup', player.x, player.y, `${player.name} sammelt ${powerup.type}`) 
  spawnEffect('powerup', player.x, player.y, '#fff3a3', 18)
}

function dealDamageToPlayer(player, amount) {
  const actualDamage = player.shieldTicks > 0 ? amount * 0.45 : amount
  player.health = clamp(player.health - actualDamage, 0, 100)
}

function getNearestPlayer(enemy, players) {
  let bestPlayer = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const player of players) {
    const currentDistance = distance(enemy, player)
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance
      bestPlayer = player
    }
  }

  return bestPlayer
}

function normalizeDelta(delta) {
  let next = delta
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

function pushEvent(type, x, y, message) {
  world.recentEvents.push({
    id: world.nextEventId,
    type,
    x,
    y,
    message,
  })
  world.nextEventId += 1
}

function spawnEffect(type, x, y, color, radius) {
  world.effects.push({
    id: world.nextEffectId,
    type,
    x,
    y,
    color,
    radius,
    ttl: 20,
  })
  world.nextEffectId += 1
}

function broadcastState() {
  const snapshot = {
    tick: world.tick,
    round: world.round,
    deliveries: world.deliveries,
    players: [...world.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.x,
      y: player.y,
      angle: player.angle,
      speed: player.speed,
      radius: player.radius,
      battery: player.battery,
      health: player.health,
      deliveries: player.deliveries,
      score: player.score,
      hasPizza: player.hasPizza,
      shieldTicks: player.shieldTicks,
      damageBoostTicks: player.damageBoostTicks,
      respawnTicks: player.respawnTicks,
    })),
    enemies: world.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
      angle: enemy.angle,
      radius: enemy.radius,
      health: enemy.health,
    })),
    bullets: world.bullets.map((bullet) => ({
      id: bullet.id,
      ownerType: bullet.ownerType,
      x: bullet.x,
      y: bullet.y,
      radius: bullet.radius,
      color: bullet.color,
    })),
    powerups: world.powerups.map((powerup) => ({
      id: powerup.id,
      type: powerup.type,
      x: powerup.x,
      y: powerup.y,
      radius: powerup.radius,
      active: powerup.active,
    })),
    effects: world.effects,
    recentEvents: world.recentEvents,
    map: {
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      spawnPoint: SPAWN_POINT,
      deliveryZone: DELIVERY_ZONE,
      chargers: CHARGERS,
      boostZones: BOOST_ZONES,
      buildings: BUILDINGS,
    },
  }

  for (const [playerId, client] of clients.entries()) {
    client.sendJSON({
      type: 'state',
      selfId: playerId,
      snapshot,
    })
  }
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}
