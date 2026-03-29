import type { WorldEvent } from "../shared/model/types";

export class AudioMixer {
  private context: AudioContext | null = null;
  private enabled = false;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineWhine: OscillatorNode | null = null;
  private engineWhineGain: GainNode | null = null;

  // Sound configuration - easily hand-tune these values
  public static readonly ENGINE_IDLE_FREQ = 20;      // Hz at rest
  public static readonly ENGINE_MAX_FREQ = 100;      // Hz at full speed
  public static readonly ENGINE_WHINE_MULTIPLIER = 2.0;
  public static readonly ENGINE_MAX_GAIN_MAIN = 0.4;
  public static readonly ENGINE_MAX_GAIN_WHINE = 0.20;
  public static readonly ENGINE_RAMP_SMOOTHNESS = 0.12;
  public static readonly ENGINE_VOLUME_SMOOTHNESS = 0.1;

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

    // Main electric motor sound - smooth sine wave
    this.engineOscillator = this.context.createOscillator();
    this.engineGain = this.context.createGain();

    this.engineOscillator.type = "sine";
    this.engineOscillator.frequency.value = AudioMixer.ENGINE_IDLE_FREQ;
    this.engineGain.gain.value = 0;

    this.engineOscillator.connect(this.engineGain);
    this.engineGain.connect(this.context.destination);
    this.engineOscillator.start();

    // Electric motor whine - higher frequency sine wave
    this.engineWhine = this.context.createOscillator();
    this.engineWhineGain = this.context.createGain();

    this.engineWhine.type = "sine";
    this.engineWhine.frequency.value = AudioMixer.ENGINE_IDLE_FREQ * AudioMixer.ENGINE_WHINE_MULTIPLIER;
    this.engineWhineGain.gain.value = 0;

    this.engineWhine.connect(this.engineWhineGain);
    this.engineWhineGain.connect(this.context.destination);
    this.engineWhine.start();
  }

  public updateEngineSound(speed: number, maxSpeed: number): void {
    if (!this.enabled || !this.context || !this.engineOscillator || !this.engineGain || !this.engineWhine || !this.engineWhineGain) {
      return;
    }

    const speedRatio = Math.abs(speed) / Math.max(1, maxSpeed);
    const targetFrequency = AudioMixer.ENGINE_IDLE_FREQ + speedRatio * (AudioMixer.ENGINE_MAX_FREQ - AudioMixer.ENGINE_IDLE_FREQ);
    const whineFrequency = targetFrequency * AudioMixer.ENGINE_WHINE_MULTIPLIER;

    const now = this.context.currentTime;
    this.engineOscillator.frequency.setTargetAtTime(targetFrequency, now, AudioMixer.ENGINE_RAMP_SMOOTHNESS);
    this.engineWhine.frequency.setTargetAtTime(whineFrequency, now, AudioMixer.ENGINE_RAMP_SMOOTHNESS);

    const targetGainMain = speedRatio * AudioMixer.ENGINE_MAX_GAIN_MAIN;
    const targetGainWhine = speedRatio * AudioMixer.ENGINE_MAX_GAIN_WHINE;
    this.engineGain.gain.setTargetAtTime(targetGainMain, now, AudioMixer.ENGINE_VOLUME_SMOOTHNESS);
    this.engineWhineGain.gain.setTargetAtTime(targetGainWhine, now, AudioMixer.ENGINE_VOLUME_SMOOTHNESS);
  }

  public stopEngineSound(): void {
    if (!this.engineOscillator || !this.engineGain || !this.engineWhineGain || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, AudioMixer.ENGINE_VOLUME_SMOOTHNESS);
    this.engineWhineGain.gain.setTargetAtTime(0, now, AudioMixer.ENGINE_VOLUME_SMOOTHNESS);
    
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