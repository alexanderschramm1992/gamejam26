import type { WorldEvent } from "../shared/model/types";

export class AudioMixer {
  private context: AudioContext | null = null;
  private enabled = false;

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
