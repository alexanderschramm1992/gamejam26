import type { WorldEvent } from "../shared/model/types";

export class AudioMixer {
  private context: AudioContext | null = null;
  private enabled = false;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineWhine: OscillatorNode | null = null;
  private engineWhineGain: GainNode | null = null;
  private engineCurrentFrequency = 60;

  constructor() {
    const enable = () => {
      this.enable();
    };

    window.addEventListener("pointerdown", enable, { passive: true });
    window.addEventListener("keydown", enable);
  }

  public enable(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }
    void this.context.resume();
    this.enabled = true;
    this.initializeEngineSound();
  }

  private initializeEngineSound(): void {
    if (!this.context || this.engineOscillator) {
      return;
    }

    // Main electric motor sound - smooth sine wave with a higher pitch
    this.engineOscillator = this.context.createOscillator();
    this.engineGain = this.context.createGain();

    this.engineOscillator.type = "sine";
    this.engineOscillator.frequency.value = this.engineCurrentFrequency;
    this.engineGain.gain.value = 0;

    this.engineOscillator.connect(this.engineGain);
    this.engineGain.connect(this.context.destination);
    this.engineOscillator.start();

    // Electric motor whine - higher frequency sine wave that adds characteristic EV sound
    this.engineWhine = this.context.createOscillator();
    this.engineWhineGain = this.context.createGain();

    this.engineWhine.type = "sine";
    this.engineWhine.frequency.value = this.engineCurrentFrequency * 2.0; // Double frequency for whine
    this.engineWhineGain.gain.value = 0;

    this.engineWhine.connect(this.engineWhineGain);
    this.engineWhineGain.connect(this.context.destination);
    this.engineWhine.start();
  }

  public updateEngineSound(speed: number, maxSpeed: number): void {
    if (!this.enabled || !this.context || !this.engineOscillator || !this.engineGain || !this.engineWhine || !this.engineWhineGain) {
      return;
    }

    // Map speed to frequency: idle at ~80Hz, max at ~350Hz (electric motor pitch range)
    const speedRatio = Math.abs(speed) / Math.max(1, maxSpeed);
    const targetFrequency = 80 + speedRatio * 270; // 80-350Hz range (typical EV motor range)

    // Smooth frequency transition
    const now = this.context.currentTime;
    this.engineOscillator.frequency.setTargetAtTime(targetFrequency, now, 0.06);
    this.engineWhine.frequency.setTargetAtTime(targetFrequency * 2.0, now, 0.06);

    // Volume: main motor 0-12%, whine 0-5% (electric cars have that characteristic high-pitched whine)
    const targetGainMain = speedRatio * 0.12;
    const targetGainWhine = speedRatio * 0.05;
    this.engineGain.gain.setTargetAtTime(targetGainMain, now, 0.1);
    this.engineWhineGain.gain.setTargetAtTime(targetGainWhine, now, 0.1);

    this.engineCurrentFrequency = targetFrequency;
  }

  public stopEngineSound(): void {
    if (!this.engineOscillator || !this.engineGain || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, 0.1);
    if (this.engineWhineGain) {
      this.engineWhineGain.gain.setTargetAtTime(0, now, 0.1);
    }
    setTimeout(() => {
      if (this.engineOscillator) {
        this.engineOscillator.stop();
        this.engineOscillator = null;
        this.engineGain = null;
      }
      if (this.engineWhine) {
        this.engineWhine.stop();
        this.engineWhine = null;
        this.engineWhineGain = null;
      }
    }, 200);
  }

  public playEvents(events: WorldEvent[]): void {
    if (!this.enabled || !this.context) {
      return;
    }

    for (const event of events) {
      switch (event.type) {
        case "shot":
          this.playTone(540, 0.06, "square", 0.03);
          break;
        case "hit":
          this.playTone(160, 0.08, "sawtooth", 0.04);
          break;
        case "enemy-destroyed":
          this.playTone(90, 0.18, "sawtooth", 0.05);
          break;
        case "mission-accepted":
          this.playTone(420, 0.1, "triangle", 0.04);
          break;
        case "mission-completed":
          this.playTone(660, 0.16, "triangle", 0.05);
          break;
        case "mission-failed":
          this.playTone(120, 0.2, "triangle", 0.04);
          break;
        case "player-respawn":
          this.playTone(510, 0.12, "sine", 0.035);
          break;
        case "charge":
          this.playTone(300, 0.06, "sine", 0.02);
          break;
        case "boost":
          this.playTone(760, 0.08, "triangle", 0.03);
          break;
        case "drain":
          this.playTone(210, 0.14, "sawtooth", 0.045);
          break;
      }
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
