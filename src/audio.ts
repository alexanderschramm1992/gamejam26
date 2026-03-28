export function createAudioController() {
  let context: AudioContext | null = null
  let musicStarted = false

  function ensureContext() {
    if (!context) {
      context = new AudioContext()
    }
    if (context.state === 'suspended') {
      void context.resume()
    }
    if (!musicStarted && context.state === 'running') {
      startMusic()
      musicStarted = true
    }
  }

  function playTone(frequency: number, durationMs: number, type: OscillatorType, gainValue: number) {
    if (!context) return

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = gainValue
    oscillator.connect(gain)
    gain.connect(context.destination)

    const now = context.currentTime
    gain.gain.setValueAtTime(gainValue, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
    oscillator.start(now)
    oscillator.stop(now + durationMs / 1000)
  }

  function startMusic() {
    if (!context) return

    const drone = context.createOscillator()
    const droneGain = context.createGain()
    const pulse = context.createOscillator()
    const pulseGain = context.createGain()

    drone.type = 'triangle'
    pulse.type = 'sine'
    drone.frequency.value = 55
    pulse.frequency.value = 110
    droneGain.gain.value = 0.018
    pulseGain.gain.value = 0.01

    drone.connect(droneGain)
    pulse.connect(pulseGain)
    droneGain.connect(context.destination)
    pulseGain.connect(context.destination)

    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 0.12
    lfoGain.gain.value = 0.006
    lfo.connect(lfoGain)
    lfoGain.connect(droneGain.gain)

    drone.start()
    pulse.start()
    lfo.start()
  }

  return {
    unlock() {
      ensureContext()
    },
    playShot() {
      ensureContext()
      playTone(480, 90, 'square', 0.04)
    },
    playHit() {
      ensureContext()
      playTone(180, 120, 'sawtooth', 0.035)
    },
    playCharge() {
      ensureContext()
      playTone(660, 140, 'triangle', 0.03)
    },
    playDelivery() {
      ensureContext()
      playTone(520, 180, 'triangle', 0.05)
      playTone(780, 220, 'sine', 0.03)
    },
    playPickup() {
      ensureContext()
      playTone(720, 120, 'triangle', 0.03)
    },
  }
}
