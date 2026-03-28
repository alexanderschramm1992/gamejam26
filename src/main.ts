import './style.css'
import { createAudioController } from './audio'
import type { GameSnapshot, PlayerSnapshot, RecentEvent } from './types'
import {
  BUILDINGS,
  BOOST_ZONES,
  CHARGERS,
  DELIVERY_ZONE,
  ENEMY_DEFS,
  ROAD_SEGMENTS,
  SPAWN_POINT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  angleTo,
  clamp,
  lerp,
} from '../shared/game.js'

function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`UI Element fehlt: ${selector}`)
  }
  return element
}

const canvas = getRequiredElement<HTMLCanvasElement>('#canvas')
const overlay = getRequiredElement<HTMLDivElement>('#overlay')
const joinForm = getRequiredElement<HTMLFormElement>('#join-form')
const nameInput = getRequiredElement<HTMLInputElement>('#name-input')
const connectionStatus = getRequiredElement<HTMLSpanElement>('#connection-status')
const hudPrimary = getRequiredElement<HTMLDivElement>('#hud-primary')
const hudSecondary = getRequiredElement<HTMLDivElement>('#hud-secondary')
const playersList = getRequiredElement<HTMLDivElement>('#players-list')
const toastLayer = getRequiredElement<HTMLDivElement>('#toast-layer')
const arrowNeedle = getRequiredElement<HTMLDivElement>('#arrow-needle')
const missionLabel = getRequiredElement<HTMLDivElement>('#mission-label')

const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('Canvas Context fehlt')
}
const renderCtx: CanvasRenderingContext2D = ctx

const audio = createAudioController()
const seenEventIds = new Set<number>()
const keysPressed = new Set<string>()
const toasts: Array<{ id: number; message: string; ttl: number }> = []
const pointer = { x: SPAWN_POINT.x, y: SPAWN_POINT.y, shooting: false }
const camera = { x: 0, y: 0 }

let socket: WebSocket | null = null
let snapshot: GameSnapshot | null = null
let selfId = ''
let lastFrame = performance.now()
let lastSend = 0
let fps = 0
let fpsFrames = 0
let fpsTimer = 0

resizeCanvas()
window.addEventListener('resize', resizeCanvas)
window.addEventListener('keydown', (event) => {
  keysPressed.add(event.code)
  if (event.code === 'Space') event.preventDefault()
  audio.unlock()
})
window.addEventListener('keyup', (event) => {
  keysPressed.delete(event.code)
})
window.addEventListener('pointerdown', () => {
  pointer.shooting = true
  audio.unlock()
})
window.addEventListener('pointerup', () => {
  pointer.shooting = false
})
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect()
  const worldX = event.clientX - rect.left + camera.x
  const worldY = event.clientY - rect.top + camera.y
  pointer.x = worldX
  pointer.y = worldY
})

joinForm.addEventListener('submit', (event) => {
  event.preventDefault()
  connect(nameInput.value.trim() || 'Pizza Driver')
})

requestAnimationFrame(frame)
renderDisconnectedState()

function connect(name: string) {
  socket?.close()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  socket = new WebSocket(protocol + '//' + window.location.host + '/ws')
  connectionStatus.textContent = 'Verbinde...'

  socket.addEventListener('open', () => {
    connectionStatus.textContent = 'Online'
    socket?.send(JSON.stringify({ type: 'join', name }))
    overlay.classList.add('hidden')
  })

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string)

    if (message.type === 'welcome') {
      selfId = message.playerId
      return
    }

    if (message.type === 'error') {
      connectionStatus.textContent = message.message
      overlay.classList.remove('hidden')
      return
    }

    if (message.type === 'state') {
      selfId = message.selfId
      snapshot = message.snapshot as GameSnapshot
      handleRecentEvents(snapshot.recentEvents)
      const selfPlayer = snapshot.players.find((player) => player.id === selfId)
      if (selfPlayer) {
        updateHud(snapshot, selfPlayer)
      }
    }
  })

  socket.addEventListener('close', () => {
    renderDisconnectedState()
  })
}

function renderDisconnectedState() {
  connectionStatus.textContent = 'Offline'
  overlay.classList.remove('hidden')
  missionLabel.textContent = 'Mission nicht verbunden'
  arrowNeedle.style.transform = 'rotate(0rad)'
}

function frame(timestamp: number) {
  const delta = timestamp - lastFrame
  lastFrame = timestamp
  fpsFrames += 1
  fpsTimer += delta
  if (fpsTimer >= 1000) {
    fps = Math.round((fpsFrames * 1000) / fpsTimer)
    fpsFrames = 0
    fpsTimer = 0
  }

  sendInput(timestamp)
  updateToasts(delta)
  render()
  requestAnimationFrame(frame)
}

function sendInput(timestamp: number) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !selfId) return
  if (timestamp - lastSend < 33) return

  socket.send(
    JSON.stringify({
      type: 'input',
      input: {
        up: keysPressed.has('KeyW') || keysPressed.has('ArrowUp'),
        down: keysPressed.has('KeyS') || keysPressed.has('ArrowDown'),
        left: keysPressed.has('KeyA') || keysPressed.has('ArrowLeft'),
        right: keysPressed.has('KeyD') || keysPressed.has('ArrowRight'),
        boost: keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight'),
        shoot: pointer.shooting || keysPressed.has('KeyJ') || keysPressed.has('Space'),
        aimX: pointer.x,
        aimY: pointer.y,
      },
    }),
  )

  lastSend = timestamp
}

function handleRecentEvents(events: RecentEvent[]) {
  for (const event of events) {
    if (seenEventIds.has(event.id)) continue
    seenEventIds.add(event.id)
    toasts.push({ id: event.id, message: event.message, ttl: 2800 })

    if (event.type === 'shot') audio.playShot()
    if (event.type === 'delivery') audio.playDelivery()
    if (event.type === 'powerup' || event.type === 'pickup-pizza') audio.playPickup()
    if (event.type === 'down' || event.type === 'enemy-destroyed') audio.playHit()
    if (event.type === 'respawn') audio.playCharge()
  }

  while (seenEventIds.size > 200) {
    const oldest = seenEventIds.values().next().value
    if (oldest === undefined) break
    seenEventIds.delete(oldest)
  }
}

function updateToasts(delta: number) {
  for (const toast of toasts) {
    toast.ttl -= delta
  }
  while (toasts.length > 0 && toasts[0].ttl <= 0) {
    toasts.shift()
  }

  toastLayer.innerHTML = toasts
    .map((toast) => `<div class="toast">${toast.message}</div>`)
    .join('')
}

function updateHud(game: GameSnapshot, selfPlayer: PlayerSnapshot) {
  const objective = selfPlayer.hasPizza ? 'Lieferziel' : 'Zur Pizzeria'
  const objectivePoint = selfPlayer.hasPizza ? DELIVERY_ZONE : SPAWN_POINT
  const arrowAngle = angleTo(selfPlayer, objectivePoint) + Math.PI / 2
  arrowNeedle.style.transform = 'rotate(' + arrowAngle + 'rad)'
  missionLabel.textContent = objective

  hudPrimary.innerHTML = [
    `Akku ${Math.round(selfPlayer.battery)}%`,
    `Karosserie ${Math.round(selfPlayer.health)}%`,
    `Lieferungen ${selfPlayer.deliveries}`,
    `Runde ${game.round}`,
    `FPS ${fps}`,
  ]
    .map((item) => `<span>${item}</span>`)
    .join('')

  const statusFlags = [
    selfPlayer.hasPizza ? 'Pizza geladen' : 'Zurueck zur Pizzeria',
    selfPlayer.shieldTicks > 0 ? 'Schild aktiv' : 'Schild aus',
    selfPlayer.damageBoostTicks > 0 ? 'Damage Boost aktiv' : 'Standardwaffe',
    selfPlayer.respawnTicks > 0 ? 'Respawn in ' + Math.ceil(selfPlayer.respawnTicks / 30) + 's' : 'Fahrbereit',
  ]

  hudSecondary.innerHTML = statusFlags.map((item) => `<span>${item}</span>`).join('')

  playersList.innerHTML = game.players
    .map((player) => {
      const objectiveText = player.hasPizza ? 'liefert' : 'laedt nach'
      return `<div class="player-card"><strong style="color:${player.color}">${player.name}</strong><span>HP ${Math.round(
        player.health,
      )}</span><span>Akku ${Math.round(player.battery)}</span><span>${objectiveText}</span><span>Score ${player.score}</span></div>`
    })
    .join('')
}

function render() {
  renderCtx.clearRect(0, 0, canvas.width, canvas.height)
  if (!snapshot) {
    renderPlaceholder()
    return
  }

  const selfPlayer = snapshot.players.find((player) => player.id === selfId) ?? snapshot.players[0]
  if (!selfPlayer) {
    renderPlaceholder()
    return
  }

  camera.x = clamp(lerp(camera.x, selfPlayer.x - canvas.width / 2, 0.12), 0, WORLD_WIDTH - canvas.width)
  camera.y = clamp(lerp(camera.y, selfPlayer.y - canvas.height / 2, 0.12), 0, WORLD_HEIGHT - canvas.height)

  renderCtx.save()
  renderCtx.translate(-camera.x, -camera.y)
  renderWorldBackground()
  renderRoads()
  renderPoiDecorators(selfPlayer)
  renderBuildings()
  renderPowerups(snapshot)
  renderEffects(snapshot)
  renderBullets(snapshot)
  renderEnemies(snapshot)
  renderPlayers(snapshot, selfPlayer)
  renderCtx.restore()
}

function renderPlaceholder() {
  renderCtx.fillStyle = '#0f1419'
  renderCtx.fillRect(0, 0, canvas.width, canvas.height)
  renderCtx.fillStyle = '#f8f1de'
  renderCtx.font = '600 24px monospace'
  renderCtx.fillText('Server verbinden und Spiel starten', 40, 70)
}

function renderWorldBackground() {
  const gradient = renderCtx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  gradient.addColorStop(0, '#203125')
  gradient.addColorStop(1, '#101812')
  renderCtx.fillStyle = gradient
  renderCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  renderCtx.strokeStyle = 'rgba(255,255,255,0.03)'
  for (let x = 0; x < WORLD_WIDTH; x += 120) {
    renderCtx.beginPath()
    renderCtx.moveTo(x, 0)
    renderCtx.lineTo(x, WORLD_HEIGHT)
    renderCtx.stroke()
  }
  for (let y = 0; y < WORLD_HEIGHT; y += 120) {
    renderCtx.beginPath()
    renderCtx.moveTo(0, y)
    renderCtx.lineTo(WORLD_WIDTH, y)
    renderCtx.stroke()
  }
}

function renderRoads() {
  for (const road of ROAD_SEGMENTS) {
    renderCtx.fillStyle = '#37424a'
    renderCtx.fillRect(road.x, road.y, road.width, road.height)

    renderCtx.strokeStyle = 'rgba(255, 244, 164, 0.45)'
    renderCtx.lineWidth = 4
    renderCtx.setLineDash([24, 18])
    if (road.width > road.height) {
      const lineY = road.y + road.height / 2
      renderCtx.beginPath()
      renderCtx.moveTo(road.x + 20, lineY)
      renderCtx.lineTo(road.x + road.width - 20, lineY)
      renderCtx.stroke()
    } else {
      const lineX = road.x + road.width / 2
      renderCtx.beginPath()
      renderCtx.moveTo(lineX, road.y + 20)
      renderCtx.lineTo(lineX, road.y + road.height - 20)
      renderCtx.stroke()
    }
    renderCtx.setLineDash([])
  }

  for (const zone of BOOST_ZONES) {
    renderCtx.fillStyle = 'rgba(88, 240, 190, 0.26)'
    renderCtx.fillRect(zone.x, zone.y, zone.width, zone.height)
    renderCtx.strokeStyle = 'rgba(88, 240, 190, 0.8)'
    renderCtx.lineWidth = 3
    renderCtx.strokeRect(zone.x, zone.y, zone.width, zone.height)
  }
}

function renderPoiDecorators(selfPlayer: PlayerSnapshot) {
  drawZone(SPAWN_POINT.x, SPAWN_POINT.y, SPAWN_POINT.radius, '#f5b971', 'PIZZERIA')
  drawZone(DELIVERY_ZONE.x, DELIVERY_ZONE.y, DELIVERY_ZONE.radius, '#ffd75e', 'LIEFERZIEL')

  for (const charger of CHARGERS) {
    const active = Math.hypot(selfPlayer.x - charger.x, selfPlayer.y - charger.y) < charger.radius + 120
    drawZone(charger.x, charger.y, charger.radius, active ? '#7df3ff' : '#5db3bd', 'CHARGE')
  }
}

function drawZone(x: number, y: number, radius: number, color: string, label: string) {
  renderCtx.beginPath()
  renderCtx.fillStyle = color + '22'
  renderCtx.strokeStyle = color
  renderCtx.lineWidth = 4
  renderCtx.arc(x, y, radius, 0, Math.PI * 2)
  renderCtx.fill()
  renderCtx.stroke()
  renderCtx.fillStyle = '#f8f1de'
  renderCtx.font = '700 14px monospace'
  renderCtx.textAlign = 'center'
  renderCtx.fillText(label, x, y + 5)
}

function renderBuildings() {
  for (const building of BUILDINGS) {
    renderCtx.fillStyle = building.color
    renderCtx.fillRect(building.x, building.y, building.width, building.height)
    renderCtx.strokeStyle = 'rgba(255,255,255,0.08)'
    renderCtx.lineWidth = 3
    renderCtx.strokeRect(building.x, building.y, building.width, building.height)
  }
}

function renderPowerups(game: GameSnapshot) {
  for (const powerup of game.powerups) {
    if (!powerup.active) continue
    const colors: Record<string, string> = {
      battery: '#86f7ff',
      shield: '#d9b3ff',
      damage: '#ff9970',
      repair: '#9df29f',
    }
    renderCtx.beginPath()
    renderCtx.fillStyle = colors[powerup.type] ?? '#ffffff'
    renderCtx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2)
    renderCtx.fill()
    renderCtx.fillStyle = '#0e1013'
    renderCtx.font = '700 12px monospace'
    renderCtx.textAlign = 'center'
    renderCtx.fillText(powerup.type.slice(0, 1).toUpperCase(), powerup.x, powerup.y + 4)
  }
}

function renderEffects(game: GameSnapshot) {
  for (const effect of game.effects) {
    const progress = effect.ttl / 20
    renderCtx.beginPath()
    renderCtx.strokeStyle = effect.color
    renderCtx.lineWidth = 3
    renderCtx.globalAlpha = progress
    renderCtx.arc(effect.x, effect.y, effect.radius * (1.4 - progress * 0.6), 0, Math.PI * 2)
    renderCtx.stroke()
    renderCtx.globalAlpha = 1
  }
}

function renderBullets(game: GameSnapshot) {
  for (const bullet of game.bullets) {
    renderCtx.beginPath()
    renderCtx.fillStyle = bullet.color
    renderCtx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2)
    renderCtx.fill()
  }
}

function renderEnemies(game: GameSnapshot) {
  for (const enemy of game.enemies) {
    const definition = ENEMY_DEFS[enemy.type as keyof typeof ENEMY_DEFS]
    drawVehicle(enemy.x, enemy.y, enemy.angle, enemy.radius + 12, enemy.radius + 4, definition?.color ?? '#d96d5d', false)
    renderCtx.fillStyle = '#ffffff'
    renderCtx.font = '600 12px monospace'
    renderCtx.textAlign = 'center'
    renderCtx.fillText(definition?.label ?? enemy.type, enemy.x, enemy.y - enemy.radius - 18)
  }
}

function renderPlayers(game: GameSnapshot, selfPlayer: PlayerSnapshot) {
  for (const player of game.players) {
    const isSelf = player.id === selfPlayer.id
    const glow = player.shieldTicks > 0 ? '#ffffff' : player.color
    drawVehicle(player.x, player.y, player.angle, 42, 24, player.color, isSelf, glow)

    if (player.hasPizza) {
      renderCtx.fillStyle = '#ffd35f'
      renderCtx.fillRect(player.x - 10, player.y - player.radius - 26, 20, 10)
    }

    renderCtx.fillStyle = '#ffffff'
    renderCtx.font = '700 13px monospace'
    renderCtx.textAlign = 'center'
    renderCtx.fillText(player.name, player.x, player.y - player.radius - 34)
  }
}

function drawVehicle(
  x: number,
  y: number,
  angle: number,
  width: number,
  height: number,
  color: string,
  highlight: boolean,
  glow = color,
) {
  renderCtx.save()
  renderCtx.translate(x, y)
  renderCtx.rotate(angle)
  renderCtx.shadowColor = glow
  renderCtx.shadowBlur = highlight ? 18 : 8
  renderCtx.fillStyle = color
  roundRect(-width / 2, -height / 2, width, height, 8)
  renderCtx.fill()
  renderCtx.fillStyle = '#13202a'
  roundRect(-width * 0.18, -height * 0.45, width * 0.36, height * 0.9, 6)
  renderCtx.fill()
  renderCtx.fillStyle = '#f8f1de'
  renderCtx.fillRect(width * 0.18, -height * 0.15, 10, height * 0.3)
  renderCtx.restore()
}

function roundRect(x: number, y: number, width: number, height: number, radius: number) {
  renderCtx.beginPath()
  renderCtx.moveTo(x + radius, y)
  renderCtx.lineTo(x + width - radius, y)
  renderCtx.quadraticCurveTo(x + width, y, x + width, y + radius)
  renderCtx.lineTo(x + width, y + height - radius)
  renderCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  renderCtx.lineTo(x + radius, y + height)
  renderCtx.quadraticCurveTo(x, y + height, x, y + height - radius)
  renderCtx.lineTo(x, y + radius)
  renderCtx.quadraticCurveTo(x, y, x + radius, y)
  renderCtx.closePath()
}

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
