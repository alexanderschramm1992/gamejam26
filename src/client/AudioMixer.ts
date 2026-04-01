import type { WorldEvent } from "../shared/model/types";

export class AudioMixer {
  private context: AudioContext | null = null;
  private enabled = false;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineWhine: OscillatorNode | null = null;
  private engineWhineGain: GainNode | null = null;

  private readonly gameMusicTrackNames = [
    "/music/John Bartmann - A Crime In Progress.mp3",
    "/music/John Bartmann - Cybernetic Boss Battle.mp3",
    "/music/John Bartmann - Dorphed Up.mp3",
    "/music/John Bartmann - Intrusion Countermeasure.mp3",
    "/music/John Bartmann - Overdose.mp3",
    "/music/John Bartmann - Surgical Scars.mp3",
    "/music/John Bartmann - Synthetic Euphoria.mp3",
    "/music/John Bartmann - Tokyo Shipment.mp3",
    "/music/John Bartmann - Weird Lights.mp3"
  ];
  private shuffledGameMusic: string[] = [];
  private currentGameMusic: HTMLAudioElement | null = null;
  private currentGameMusicIndex = 0;
  private readonly gameMusicVolume = 0.24;

  private readonly honkSound = new Audio("/sfx/honk.wav");
  private readonly mgShotSound = new Audio("/sfx/mgShot.wav");
  private readonly sampleVolume = 0.42;

  // Sound configuration - easily hand-tune these values
  public static readonly ENGINE_IDLE_FREQ = 20;      // Hz at rest
  public static readonly ENGINE_MAX_FREQ = 100;      // Hz at full speed
  public static readonly ENGINE_WHINE_MULTIPLIER = 2.0;
  public static readonly ENGINE_MAX_GAIN_MAIN = 0.4;
  public static readonly ENGINE_MAX_GAIN_WHINE = 0.20;
  public static readonly ENGINE_RAMP_SMOOTHNESS = 0.12;
  public static readonly ENGINE_VOLUME_SMOOTHNESS = 0.1;

  // Scraping metal collision sound config
  public static readonly SCRAPE_DURATION = 0.15;
  public static readonly SCRAPE_BASE_FREQ = 180;
  public static readonly SCRAPE_PITCH_VARIATION = 140;
  public static readonly SCRAPE_GAIN = 0.25;

  constructor() {
    const enable = () => {
      this.enable();
    };

    window.addEventListener("pointerdown", enable, { passive: true });
    window.addEventListener("keydown", enable);

    this.honkSound.preload = "auto";
    this.honkSound.volume = this.sampleVolume;
    this.mgShotSound.preload = "auto";
    this.mgShotSound.volume = this.sampleVolume;
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

  public startGameMusic(): void {
    this.generateShuffledGameMusic();
    this.playCurrentGameMusic();
  }

  public stopGameMusic(): void {
    this.stopCurrentGameMusicElement();
    this.shuffledGameMusic = [];
    this.currentGameMusicIndex = 0;
  }

  private stopCurrentGameMusicElement(): void {
    if (!this.currentGameMusic) {
      return;
    }

    this.currentGameMusic.pause();
    this.currentGameMusic.currentTime = 0;
    this.currentGameMusic.removeEventListener("ended", this.onGameMusicEnded);
    this.currentGameMusic = null;
  }

  private playCurrentGameMusic(): void {
    if (this.shuffledGameMusic.length === 0) {
      this.generateShuffledGameMusic();
    }

    const track = this.shuffledGameMusic[this.currentGameMusicIndex];
    if (!track) {
      return;
    }

    this.stopCurrentGameMusicElement();
    const audio = new Audio(track);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = this.gameMusicVolume;
    audio.addEventListener("ended", this.onGameMusicEnded);
    this.currentGameMusic = audio;

    void audio.play().catch(() => undefined);
  }

  private onGameMusicEnded = (): void => {
    if (this.shuffledGameMusic.length === 0) {
      this.generateShuffledGameMusic();
    }

    if (this.currentGameMusicIndex + 1 >= this.shuffledGameMusic.length) {
      this.generateShuffledGameMusic();
    } else {
      this.currentGameMusicIndex += 1;
    }

    this.playCurrentGameMusic();
  };

  private generateShuffledGameMusic(): void {
    this.shuffledGameMusic = [...this.gameMusicTrackNames];
    for (let i = this.shuffledGameMusic.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledGameMusic[i], this.shuffledGameMusic[j]] = [this.shuffledGameMusic[j], this.shuffledGameMusic[i]];
    }
    this.currentGameMusicIndex = 0;
  }

  public playEvents(events: WorldEvent[]): void {
    if (!this.enabled || !this.context) {
      return;
    }

    for (const event of events) {
      switch (event.type) {
        case "shot":
          this.playMgShot();
          break;
        case "hit":
          this.playTone(160, 0.08, "sawtooth", 0.04);
          break;
        case "collision-scrape":
          this.playScrapeSound();
          break;
        case "enemy-destroyed":
          this.playTone(90, 0.18, "sawtooth", 0.05);
          break;
        case "player-destroyed":
          this.playTone(72, 0.26, "sawtooth", 0.12);
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

  public playHonk(): void {
    this.playAudioSample(this.honkSound);
  }

  public playMgShot(): void {
    this.playAudioSample(this.mgShotSound);
  }

  public playScrapeSound(): void {
    if (!this.context || !this.enabled) {
      return;
    }

    const now = this.context.currentTime;
    const duration = AudioMixer.SCRAPE_DURATION;

    // Create main scraping oscillator with sawtooth wave for harsh metallic sound
    const osc1 = this.context.createOscillator();
    const gain1 = this.context.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(AudioMixer.SCRAPE_BASE_FREQ, now);
    // Pitch sweep down for scraping effect
    osc1.frequency.linearRampToValueAtTime(AudioMixer.SCRAPE_BASE_FREQ - AudioMixer.SCRAPE_PITCH_VARIATION, now + duration);
    
    gain1.gain.setValueAtTime(AudioMixer.SCRAPE_GAIN, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Create secondary oscillator with slight phase for richness
    const osc2 = this.context.createOscillator();
    const gain2 = this.context.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(AudioMixer.SCRAPE_BASE_FREQ + 45, now);
    osc2.frequency.linearRampToValueAtTime(AudioMixer.SCRAPE_BASE_FREQ - AudioMixer.SCRAPE_PITCH_VARIATION + 45, now + duration);
    
    gain2.gain.setValueAtTime(AudioMixer.SCRAPE_GAIN * 0.6, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect oscillators through gains to destination
    osc1.connect(gain1);
    gain1.connect(this.context.destination);
    osc2.connect(gain2);
    gain2.connect(this.context.destination);

    // Start and stop sounds
    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  private playAudioSample(audio: HTMLAudioElement): void {
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
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