export const keysPressed = new Set<string>()
export let carLoaded = false
export let carWidth = 0
export let carHeight = 0
export let carX = 0
export let carY = 0
export let angle = 0
export let velocity = 0
export let drift = 0
export let tireTracks: Array<{ x: number; y: number; alpha: number }> = []
export let canvasWidth = 0
export let canvasHeight = 0

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

export const carImage = new Image()

export function initializeCar(canvas: HTMLCanvasElement) {
  canvasWidth = canvas.width
  canvasHeight = canvas.height
  carLoaded = true
  const maxCarWidth = 50
  const maxCarHeight = 50
  const scale = Math.min(maxCarWidth / carImage.width, maxCarHeight / carImage.height, 1)
  carWidth = carImage.width * scale
  carHeight = carImage.height * scale
  carX = (canvasWidth - carWidth) / 2
  carY = (canvasHeight - carHeight) / 2
}

export function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()

  if (['w', 'a', 's', 'd'].includes(key) || code === 'space') {
    keysPressed.add(code === 'space' ? 'space' : key)
    event.preventDefault()
  }
}

export function handleKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()

  if (code === 'space') {
    keysPressed.delete('space')
  } else {
    keysPressed.delete(key)
  }
}

export function updatePhysics() {
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

  if (Math.abs(velocity) < 0.15) {
    velocity = 0
    drift = 0
    return
  }

  drift += turnInput * driftGain * Math.sign(velocity)
  drift *= driftDecay
  drift = Math.max(-maxDrift, Math.min(maxDrift, drift))
  addTireTracks()
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
  carX = Math.max(0, Math.min(canvasWidth - carWidth, carX))
  carY = Math.max(0, Math.min(canvasHeight - carHeight, carY))
}

export function addTireTracks() {
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

export function renderTireTracks(ctx: CanvasRenderingContext2D) {
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
