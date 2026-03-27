import { beforeEach } from 'vitest'

export function setupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div id="fps-counter">FPS: 0</div>
      <canvas id="canvas"></canvas>
    </div>
  `
}

beforeEach(() => {
  setupDOM()
})

