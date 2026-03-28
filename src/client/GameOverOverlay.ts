export interface GameOverShowOptions {
  deathCount: number;
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
  private deathCount = 0;
  private respawnReady = false;
  private evasionActive = false;
  private evasionUntil = 0;

  constructor() {
    this.zonk.preload = "auto";
    this.zonk.volume = 0.92;

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

    this.root.addEventListener("mousemove", (event) => this.handleMouseMove(event));
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
    this.deathCount = options.deathCount;
    this.respawnReady = false;
    this.root.classList.add("is-visible");
    document.body.classList.add("is-gameover-active");
    this.playZonk();

    if (options.deathCount >= 3) {
      this.evasionActive = true;
      this.evasionUntil = performance.now() + 5000;
    } else {
      this.evasionActive = false;
      this.evasionUntil = 0;
    }

    this.renderContent(options.respawnTimer);
    this.updateButtonState();
    requestAnimationFrame(() => this.centerButton());
  }

  public hide(): void {
    this.open = false;
    this.root.classList.remove("is-visible");
    document.body.classList.remove("is-gameover-active");
    this.evasionActive = false;
    this.evasionUntil = 0;
    this.respawnReady = false;
    this.centerButton();
    this.updateButtonState();
  }

  public setRespawnState(respawnReady: boolean, respawnTimer: number): void {
    this.respawnReady = respawnReady;
    this.renderContent(respawnTimer);
    this.updateButtonState();
  }

  public update(nowMs: number): void {
    if (!this.open || !this.evasionActive || nowMs < this.evasionUntil) {
      return;
    }

    this.evasionActive = false;
    this.evasionUntil = 0;
    this.renderContent(0);
    this.centerButton();
    this.updateButtonState();
  }

  private playZonk(): void {
    this.zonk.currentTime = 0;
    void this.zonk.play().catch(() => undefined);
  }

  private renderContent(respawnTimer: number): void {
    this.titleEl.textContent = "Game Over";
    this.messageEl.textContent =
      this.deathCount >= 3
        ? `Crash Nummer ${this.deathCount}. Die Stadt lacht schon.`
        : "Dein Lieferwagen ist schrottreif.";

    if (this.evasionActive) {
      this.statusEl.textContent = this.respawnReady
        ? "Respawn bereit. Fang erst den Button ein, dann geht es weiter."
        : `Respawn in ${respawnTimer.toFixed(1)}s. Danach weicht der Button noch kurz aus.`;
      return;
    }

    this.statusEl.textContent = this.respawnReady
      ? "Fahrzeug steht wieder bereit. Druecke Neu starten."
      : `Respawn in ${respawnTimer.toFixed(1)}s`;
  }

  private updateButtonState(): void {
    const enabled = this.open && this.respawnReady && !this.evasionActive;
    this.restartButton.disabled = !enabled;
    this.restartButton.classList.toggle("is-evading", this.evasionActive);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.open || !this.evasionActive) {
      return;
    }

    const buttonRect = this.restartButton.getBoundingClientRect();
    const distanceX = event.clientX - (buttonRect.left + buttonRect.width / 2);
    const distanceY = event.clientY - (buttonRect.top + buttonRect.height / 2);
    const cursorDistance = Math.hypot(distanceX, distanceY);

    if (cursorDistance < 150) {
      this.randomizeButtonPosition(event.clientX, event.clientY);
    }
  }

  private centerButton(): void {
    const areaRect = this.actionArea.getBoundingClientRect();
    const buttonRect = this.restartButton.getBoundingClientRect();
    const left = Math.max(0, (areaRect.width - buttonRect.width) / 2);
    const top = Math.max(0, (areaRect.height - buttonRect.height) / 2);
    this.setButtonPosition(left, top);
  }

  private randomizeButtonPosition(cursorX: number, cursorY: number): void {
    const areaRect = this.actionArea.getBoundingClientRect();
    const buttonRect = this.restartButton.getBoundingClientRect();
    const maxLeft = Math.max(0, areaRect.width - buttonRect.width);
    const maxTop = Math.max(0, areaRect.height - buttonRect.height);

    let bestLeft = maxLeft / 2;
    let bestTop = maxTop / 2;
    let bestScore = -1;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const nextLeft = Math.random() * maxLeft;
      const nextTop = Math.random() * maxTop;
      const centerX = areaRect.left + nextLeft + buttonRect.width / 2;
      const centerY = areaRect.top + nextTop + buttonRect.height / 2;
      const score = Math.hypot(cursorX - centerX, cursorY - centerY);
      if (score > bestScore) {
        bestScore = score;
        bestLeft = nextLeft;
        bestTop = nextTop;
      }
    }

    this.setButtonPosition(bestLeft, bestTop);
  }

  private setButtonPosition(left: number, top: number): void {
    this.restartButton.style.left = `${left}px`;
    this.restartButton.style.top = `${top}px`;
  }
}
