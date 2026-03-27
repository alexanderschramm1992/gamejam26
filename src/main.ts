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
const keysPressed = new Set<string>()

const maxSpeed = 6
const acceleration = 0.18
const brakeAcceleration = 0.25
const friction = 0.95
const turnSpeed = 0.04

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

  if (['w', 'a', 's', 'd'].includes(key)) {
    keysPressed.add(key)
    event.preventDefault()
  }
}

function handleKeyUp(event: KeyboardEvent) {
  keysPressed.delete(event.key.toLowerCase())
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

  applyTurning(turnInput)
  applyAcceleration(forwardInput)
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

function applyTurning(turnInput: number) {
  if (turnInput === 0 || Math.abs(velocity) < 0.1) return

  angle += turnInput * turnSpeed * Math.sign(velocity)
}

function applyMovement() {
  const dx = Math.cos(angle) * velocity
  const dy = Math.sin(angle) * velocity
  carX += dx
  carY += dy
}

function enforceBounds() {
  carX = Math.max(0, Math.min(canvas.width - carWidth, carX))
  carY = Math.max(0, Math.min(canvas.height - carHeight, carY))
}

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!carLoaded) return

  ctx.save()
  ctx.translate(carX + carWidth / 2, carY + carHeight / 2)
  ctx.rotate(angle)
  ctx.drawImage(carImage, -carWidth / 2, -carHeight / 2, carWidth, carHeight)
  ctx.restore()
}


