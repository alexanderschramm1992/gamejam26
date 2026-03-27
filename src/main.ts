import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!
const fpsCounter = document.querySelector<HTMLDivElement>('#fps-counter')!

// Größe des Canvas setzen
canvas.width = 400
canvas.height = 400

let frameCount = 0
let fps = 0
let lastFpsUpdate = 0

function draw(timestamp: number) {
    frameCount++

  // Update FPS every second
  if (timestamp - lastFpsUpdate > 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate))
    fpsCounter.textContent = `FPS: ${fps}`
    lastFpsUpdate = timestamp
    frameCount = 0
  }

  // Canvas leeren
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Einen Strich zeichnen
  ctx.beginPath()
  ctx.moveTo(50, 50)
  ctx.lineTo(350, 50)
  ctx.strokeStyle = 'black'
  ctx.lineWidth = 5
  ctx.stroke()

  // Erster Kreis zeichnen
  ctx.beginPath()
  ctx.arc(100, 200, 40, 0, Math.PI * 2)
  ctx.fillStyle = 'blue'
  ctx.fill()
  ctx.strokeStyle = 'black'
  ctx.lineWidth = 1
  ctx.stroke()

  // Zweiter Kreis zeichnen
  ctx.beginPath()
  ctx.arc(300, 200, 60, 0, Math.PI * 2)
  ctx.fillStyle = 'red'
  ctx.fill()
  ctx.stroke()

  requestAnimationFrame(draw)
}

requestAnimationFrame(draw)


