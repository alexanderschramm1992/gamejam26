import './style.css'
import {
  carImage,
  carLoaded,
  carWidth,
  carHeight,
  carX,
  carY,
  angle,
  initializeCar,
  handleKeyDown,
  handleKeyUp,
  updatePhysics,
  renderTireTracks,
} from './navigation'

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!
const fpsCounter = document.querySelector<HTMLDivElement>('#fps-counter')!

// Größe des Canvas setzen
canvas.width = 1000
canvas.height = 600

let frameCount = 0
let fps = 0
let lastFpsUpdate = 0

carImage.src = new URL('../assets/car.png', import.meta.url).href
carImage.onload = () => {
  initializeCar(canvas)
  requestAnimationFrame(draw)
}

document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)

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

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  renderTireTracks(ctx)
  if (!carLoaded) return

  ctx.save()
  ctx.translate(carX + carWidth / 2, carY + carHeight / 2)
  ctx.rotate(angle)
  ctx.drawImage(carImage, -carWidth / 2, -carHeight / 2, carWidth, carHeight)
  ctx.restore()
}


