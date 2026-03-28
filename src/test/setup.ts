import { beforeEach } from 'vitest'

export function setupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <canvas id="canvas"></canvas>
      <div id="hud">
        <div id="mission-arrow">
          <div id="arrow-needle"></div>
          <div id="mission-label"></div>
        </div>
        <div id="hud-primary"></div>
        <div id="hud-secondary"></div>
        <div id="players-list"></div>
        <div id="connection-status"></div>
        <div id="toast-layer"></div>
      </div>
      <div id="overlay">
        <form id="join-form">
          <input id="name-input" />
        </form>
      </div>
    </div>
  `
}

beforeEach(() => {
  setupDOM()
})
