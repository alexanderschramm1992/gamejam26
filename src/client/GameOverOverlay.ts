export interface GameOverShowOptions {
  respawnTimer: number;
}

type RestartHandler = () => void;

export class GameOverOverlay {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly messageEl: HTMLParagraphElement;
  private readonly statusEl: HTMLParagraphElement;
  private readonly actionArea: HTMLDivElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly zonk = new Audio("/music/zonk.mp3");
  private restartHandler: RestartHandler | null = null;
  private open = false;
  private respawnReady = false;

  constructor() {
    this.zonk.preload = "auto";
    this.zonk.volume = 0.2; // adjusted to match overall game volume

    this.root = document.createElement("div");
    this.root.className = "gameover-backdrop";

    const panel = document.createElement("section");
    panel.className = "gameover-panel";

    const eyebrow = document.createElement("p");
    eyebrow.className = "gameover-eyebrow";
    eyebrow.textContent = "Session Interrupted";

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "gameover-title";

    this.messageEl = document.createElement("p");
    this.messageEl.className = "gameover-message";

    this.statusEl = document.createElement("p");
    this.statusEl.className = "gameover-status";

    this.actionArea = document.createElement("div");
    this.actionArea.className = "gameover-action";

    this.restartButton = document.createElement("button");
    this.restartButton.type = "button";
    this.restartButton.className = "gameover-restart";
    this.restartButton.textContent = "Neu starten";
    this.restartButton.addEventListener("click", () => {
      if (this.restartButton.disabled) {
        return;
      }
      this.restartHandler?.();
    });

    this.actionArea.appendChild(this.restartButton);
    panel.append(eyebrow, this.titleEl, this.messageEl, this.statusEl, this.actionArea);
    this.root.appendChild(panel);
    document.body.appendChild(this.root);

    this.renderContent(0);
    this.updateButtonState();
  }

  public onRestart(handler: RestartHandler): void {
    this.restartHandler = handler;
  }

  public isOpen(): boolean {
    return this.open;
  }

  public show(options: GameOverShowOptions): void {
    this.open = true;
    this.respawnReady = false;
    this.root.classList.add("is-visible");
    document.body.classList.add("is-gameover-active");
    this.playZonk();
    this.renderContent(options.respawnTimer);
    this.updateButtonState();
    requestAnimationFrame(() => this.centerButton());
  }

  public hide(): void {
    this.open = false;
    this.root.classList.remove("is-visible");
    document.body.classList.remove("is-gameover-active");
    this.respawnReady = false;
    this.centerButton();
    this.updateButtonState();
  }

  public setRespawnState(respawnReady: boolean, respawnTimer: number): void {
    this.respawnReady = respawnReady;
    this.renderContent(respawnTimer);
    this.updateButtonState();
  }

  public update(_nowMs: number): void {}

  private playZonk(): void {
    this.zonk.currentTime = 0;
    void this.zonk.play().catch(() => undefined);
  }

  private renderContent(respawnTimer: number): void {
    this.titleEl.textContent = "Game Over";
    this.messageEl.textContent = "Dein Lieferwagen ist schrottreif. 500 Punkte wurden abgezogen.";
    this.statusEl.textContent = this.respawnReady
      ? "Fahrzeug steht wieder bereit. Druecke Neu starten."
      : `Respawn in ${respawnTimer.toFixed(1)}s`;
  }

  private updateButtonState(): void {
    const enabled = this.open && this.respawnReady;
    this.restartButton.disabled = !enabled;
    this.restartButton.classList.remove("is-evading");
  }

  private centerButton(): void {
    const areaRect = this.actionArea.getBoundingClientRect();
    const buttonRect = this.restartButton.getBoundingClientRect();
    const left = Math.max(0, (areaRect.width - buttonRect.width) / 2);
    const top = Math.max(0, (areaRect.height - buttonRect.height) / 2);
    this.setButtonPosition(left, top);
  }

  private setButtonPosition(left: number, top: number): void {
    this.restartButton.style.left = `${left}px`;
    this.restartButton.style.top = `${top}px`;
  }
}
