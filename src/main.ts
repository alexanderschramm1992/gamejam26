import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!
const fpsCounter = document.querySelector<HTMLDivElement>('#fps-counter')!

// Größe des Canvas setzen
canvas.width = 1000
canvas.height = 600

let frameCount = 0
let fps = 0
let lastFpsUpdate = 0
let carLoaded = false
let carWidth = 0
let carHeight = 0
let carX = 0
let carY = 0
let angle = 0
let velocity = 0
let drift = 0
const keysPressed = new Set<string>()
let tireTracks: Array<{x: number; y: number; alpha: number}> = []

const maxSpeed = 6
const acceleration = 0.18
const brakeAcceleration = 0.25
const friction = 0.95
const handbrakeMultiplier = 0.7
const turnSpeed = 0.04
const driftGain = 0.25
const driftDecay = 0.92
const maxDrift = 2
const trackFade = 0.02
const trackSize = 2.5

const carImage = new Image()
carImage.src = new URL('../assets/car.png', import.meta.url).href
carImage.onload = initializeCar

document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)

function initializeCar() {
  carLoaded = true
  const maxCarWidth = 50
  const maxCarHeight = 50
  const scale = Math.min(maxCarWidth / carImage.width, maxCarHeight / carImage.height, 1)
  carWidth = carImage.width * scale
  carHeight = carImage.height * scale
  carX = (canvas.width - carWidth) / 2
  carY = (canvas.height - carHeight) / 2
  requestAnimationFrame(draw)
}

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()

  if (['w', 'a', 's', 'd'].includes(key) || code === 'space') {
    keysPressed.add(code === 'space' ? 'space' : key)
    event.preventDefault()
  }
}

function handleKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()

  if (code === 'space') {
    keysPressed.delete('space')
  } else {
    keysPressed.delete(key)
  }
}

function draw(timestamp: number) {
  frameCount++
  updateFrameCount(timestamp)
  updatePhysics()
  renderScene()
  requestAnimationFrame(draw)
}

function updateFrameCount(timestamp: number) {
  if (timestamp - lastFpsUpdate > 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate))
    fpsCounter.textContent = `FPS: ${fps}`
    lastFpsUpdate = timestamp
    frameCount = 0
  }
}

function updatePhysics() {
  if (!carLoaded) return

  const forwardInput = (keysPressed.has('s') ? 1 : 0) - (keysPressed.has('w') ? 1 : 0)
  const turnInput = (keysPressed.has('a') ? 1 : 0) - (keysPressed.has('d') ? 1 : 0)
  const handbrake = keysPressed.has('space')

  applyTurning(turnInput, handbrake)
  applyAcceleration(forwardInput)
  applyHandbrake(handbrake, turnInput)
  applyMovement()
  enforceBounds()
}

function applyAcceleration(forwardInput: number) {
  if (forwardInput !== 0) {
    const applied = forwardInput > 0 ? acceleration : -brakeAcceleration
    velocity += applied
  } else {
    velocity *= friction
  }

  velocity = Math.max(-maxSpeed / 2, Math.min(maxSpeed, velocity))
}

function applyHandbrake(active: boolean, turnInput: number) {
  if (!active) {
    drift *= driftDecay
    if (Math.abs(drift) < 0.05) drift = 0
    return
  }

  velocity *= handbrakeMultiplier
  drift += turnInput * driftGain * Math.sign(velocity || 1)
  drift *= driftDecay
  drift = Math.max(-maxDrift, Math.min(maxDrift, drift))
  addTireTracks()

  if (Math.abs(velocity) < 0.15) {
    velocity = 0
  }
}

function applyTurning(turnInput: number, handbrake: boolean) {
  if (turnInput === 0 || Math.abs(velocity) < 0.1) return

  const effectiveTurnSpeed = handbrake ? turnSpeed * 1.5 : turnSpeed
  angle += turnInput * effectiveTurnSpeed * Math.sign(velocity)
}

function applyMovement() {
  const forwardX = Math.cos(angle) * velocity
  const forwardY = Math.sin(angle) * velocity
  const driftX = Math.cos(angle + Math.PI / 2) * drift
  const driftY = Math.sin(angle + Math.PI / 2) * drift

  carX += forwardX + driftX
  carY += forwardY + driftY
}

function enforceBounds() {
  carX = Math.max(0, Math.min(canvas.width - carWidth, carX))
  carY = Math.max(0, Math.min(canvas.height - carHeight, carY))
}

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  renderTireTracks()
  if (!carLoaded) return

  ctx.save()
  ctx.translate(carX + carWidth / 2, carY + carHeight / 2)
  ctx.rotate(angle)
  ctx.drawImage(carImage, -carWidth / 2, -carHeight / 2, carWidth, carHeight)
  ctx.restore()
}

function addTireTracks() {
  if (Math.abs(velocity) < 0.1) return

  const centerX = carX + carWidth / 2
  const centerY = carY + carHeight / 2
  const forwardX = Math.cos(angle)
  const forwardY = Math.sin(angle)
  const sideX = -forwardY
  const sideY = forwardX
  const rearDistance = carHeight * -0.45
  const wheelSpacing = carWidth * 0.2

  const leftX = centerX - forwardX * rearDistance + sideX * wheelSpacing
  const leftY = centerY - forwardY * rearDistance + sideY * wheelSpacing
  const rightX = centerX - forwardX * rearDistance - sideX * wheelSpacing
  const rightY = centerY - forwardY * rearDistance - sideY * wheelSpacing

  tireTracks.push({ x: leftX, y: leftY, alpha: 1 })
  tireTracks.push({ x: rightX, y: rightY, alpha: 1 })
}

function renderTireTracks() {
  if (tireTracks.length === 0) return

  ctx.save()
  for (const track of tireTracks) {
    ctx.fillStyle = `rgba(20, 20, 20, ${track.alpha})`
    ctx.beginPath()
    ctx.ellipse(track.x, track.y, trackSize, trackSize / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    track.alpha -= trackFade
  }
  ctx.restore()

  tireTracks = tireTracks.filter((track) => track.alpha > 0)
}


