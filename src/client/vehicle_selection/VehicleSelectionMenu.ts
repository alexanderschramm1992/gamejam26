import { VEHICLE_OPTIONS, type VehicleOption } from "../../shared/config/gameConfig";
import { VehicleSelectionController } from "./VehicleSelectionController";

interface VehicleCardElements {
  root: HTMLButtonElement;
}

export interface VehicleSelectionConfirmation {
  vehicle: VehicleOption;
  playerName: string;
}

type ConfirmHandler = (selection: VehicleSelectionConfirmation) => void;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export class VehicleSelectionMenu {
  private readonly controller = new VehicleSelectionController(VEHICLE_OPTIONS.length);
  private readonly root: HTMLDivElement;
  private readonly cards = new Map<string, VehicleCardElements>();
  private readonly nameEl: HTMLHeadingElement;
  private readonly descriptionEl: HTMLParagraphElement;
  private readonly nameInput: HTMLInputElement;
  private readonly statRows = new Map<keyof VehicleOption["stats"], HTMLDivElement>();
  private readonly confirmButton: HTMLButtonElement;
  private readonly switchSound = new Audio("/sfx/motor.mp3");
  private readonly music = new Audio("/music/menue.mp3");
  private confirmHandler: ConfirmHandler | null = null;
  private open = false;
  private frameHandle = 0;
  private lastFrameTime = 0;

  constructor() {
    this.switchSound.preload = "auto";
    this.switchSound.volume = 0.45;

    this.music.preload = "auto";
    this.music.loop = true;
    this.music.volume = 0.32;

    this.root = document.createElement("div");
    this.root.className = "vehicle-menu";

    const panel = document.createElement("section");
    panel.className = "vehicle-menu__panel";

    const eyebrow = document.createElement("p");
    eyebrow.className = "vehicle-menu__eyebrow";
    eyebrow.textContent = "Main Menu";

    const title = document.createElement("h2");
    title.className = "vehicle-menu__title";
    title.textContent = "Waehle deinen Car";

    const intro = document.createElement("p");
    intro.className = "vehicle-menu__intro";
    intro.textContent = "Mit den Pfeiltasten wechselst du das Fahrzeug. Enter oder Klick bestaetigt die aktuelle Auswahl.";

    const form = document.createElement("div");
    form.className = "vehicle-menu__form";

    const nameLabel = document.createElement("label");
    nameLabel.className = "vehicle-menu__field";

    const nameCaption = document.createElement("span");
    nameCaption.className = "vehicle-menu__field-label";
    nameCaption.textContent = "Spielername";

    this.nameInput = document.createElement("input");
    this.nameInput.className = "vehicle-menu__input";
    this.nameInput.type = "text";
    this.nameInput.maxLength = 18;
    this.nameInput.setAttribute("autocomplete", "nickname");
    this.nameInput.placeholder = "Fahrer";
    this.nameInput.value = "Fahrer";
    this.nameInput.addEventListener("pointerdown", () => this.tryStartMenuMusic());
    this.nameInput.addEventListener("focus", () => this.tryStartMenuMusic());

    nameLabel.append(nameCaption, this.nameInput);

    const nameHint = document.createElement("p");
    nameHint.className = "vehicle-menu__hint";
    nameHint.textContent = "Der Admin wird im Spiel automatisch als *Name markiert.";

    form.append(nameLabel, nameHint);

    const stage = document.createElement("div");
    stage.className = "vehicle-menu__stage";

    const carousel = document.createElement("div");
    carousel.className = "vehicle-menu__carousel";

    for (const vehicle of VEHICLE_OPTIONS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "vehicle-card";
      card.addEventListener("click", () => {
        this.tryStartMenuMusic();
        if (vehicle.id === this.getSelectedVehicle().id) {
          this.confirmSelection();
          return;
        }
        this.selectVehicle(vehicle.id);
      });

      const glow = document.createElement("div");
      glow.className = "vehicle-card__glow";
      glow.style.setProperty("--vehicle-accent", vehicle.accent);

      const image = document.createElement("img");
      image.className = "vehicle-card__image";
      image.src = vehicle.assetPath;
      image.alt = vehicle.name;
      image.draggable = false;

      card.append(glow, image);
      carousel.appendChild(card);
      this.cards.set(vehicle.id, { root: card });
    }

    stage.appendChild(carousel);

    const details = document.createElement("div");
    details.className = "vehicle-menu__details";

    const summary = document.createElement("div");
    summary.className = "vehicle-menu__summary";

    this.nameEl = document.createElement("h3");
    this.nameEl.className = "vehicle-menu__name";

    this.descriptionEl = document.createElement("p");
    this.descriptionEl.className = "vehicle-menu__description";

    const stats = document.createElement("div");
    stats.className = "vehicle-menu__stats";

    const statLabels: Array<[keyof VehicleOption["stats"], string]> = [
      ["speed", "Speed"],
      ["battery", "Battery"],
      ["hull", "Hull"]
    ];

    for (const [key, label] of statLabels) {
      const row = document.createElement("div");
      row.className = "vehicle-stat";

      const name = document.createElement("span");
      name.className = "vehicle-stat__label";
      name.textContent = label;

      const meter = document.createElement("div");
      meter.className = "vehicle-stat__meter";

      const fill = document.createElement("div");
      fill.className = "vehicle-stat__fill";
      meter.appendChild(fill);

      row.append(name, meter);
      stats.appendChild(row);
      this.statRows.set(key, fill);
    }

    this.confirmButton = document.createElement("button");
    this.confirmButton.type = "button";
    this.confirmButton.className = "vehicle-menu__confirm";
    this.confirmButton.textContent = "Fahrzeug bestaetigen";
    this.confirmButton.addEventListener("click", () => this.confirmSelection());

    summary.append(this.nameEl, this.descriptionEl, stats);
    details.append(summary, this.confirmButton);
    panel.append(eyebrow, title, intro, form, stage, details);
    this.root.appendChild(panel);
    (document.querySelector(".shell") ?? document.body).appendChild(this.root);

    window.addEventListener("keydown", (event) => {
      if (!this.open || event.repeat) {
        return;
      }

      this.tryStartMenuMusic();

      if (event.code === "ArrowLeft") {
        this.controller.previous();
        this.playSwitchSound();
        this.render();
        event.preventDefault();
        return;
      }

      if (event.code === "ArrowRight") {
        this.controller.next();
        this.playSwitchSound();
        this.render();
        event.preventDefault();
        return;
      }

      if (event.code === "Enter" || event.code === "NumpadEnter") {
        this.confirmSelection();
        event.preventDefault();
      }
    });

    this.render();
  }

  public setOpen(open: boolean): void {
    this.open = open;
    this.root.classList.toggle("is-visible", open);
    this.root.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      this.lastFrameTime = 0;
      this.startAnimationLoop();
      this.tryStartMenuMusic();
    } else {
      this.stopAnimationLoop();
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  public isOpen(): boolean {
    return this.open;
  }

  public onConfirm(handler: ConfirmHandler): void {
    this.confirmHandler = handler;
  }

  public getSelectedVehicle(): VehicleOption {
    return VEHICLE_OPTIONS[this.controller.getCurrentIndex()] ?? VEHICLE_OPTIONS[0];
  }

  private getPlayerName(): string {
    const nextName = this.nameInput.value.replace(/\s+/g, " ").trim();
    return nextName.length > 0 ? nextName.slice(0, 18) : "Fahrer";
  }

  private selectVehicle(vehicleId: string): void {
    const index = VEHICLE_OPTIONS.findIndex((vehicle) => vehicle.id === vehicleId);
    if (index < 0) {
      return;
    }

    while (this.controller.getCurrentIndex() !== index) {
      const current = this.controller.getCurrentIndex();
      const clockwise = (index - current + VEHICLE_OPTIONS.length) % VEHICLE_OPTIONS.length;
      const counterClockwise = (current - index + VEHICLE_OPTIONS.length) % VEHICLE_OPTIONS.length;
      if (clockwise <= counterClockwise) {
        this.controller.next();
      } else {
        this.controller.previous();
      }
    }

    this.playSwitchSound();
    this.render();
  }

  private confirmSelection(): void {
    this.music.pause();
    this.music.currentTime = 0;
    this.confirmHandler?.({
      vehicle: this.getSelectedVehicle(),
      playerName: this.getPlayerName()
    });
  }

  private tryStartMenuMusic(): void {
    if (!this.open) {
      return;
    }

    void this.music.play().catch(() => undefined);
  }

  private playSwitchSound(): void {
    this.switchSound.currentTime = 0;
    void this.switchSound.play().catch(() => undefined);
  }

  private startAnimationLoop(): void {
    if (this.frameHandle !== 0) {
      return;
    }

    const tick = (timestamp: number): void => {
      if (!this.open) {
        this.frameHandle = 0;
        return;
      }

      const dt = this.lastFrameTime === 0 ? 1 / 60 : Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;
      this.controller.update(dt);
      this.render();
      this.frameHandle = window.requestAnimationFrame(tick);
    };

    this.frameHandle = window.requestAnimationFrame(tick);
  }

  private stopAnimationLoop(): void {
    if (this.frameHandle !== 0) {
      window.cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }
  }

  private render(): void {
    const activeVehicle = this.getSelectedVehicle();
    this.nameEl.textContent = activeVehicle.name;
    this.descriptionEl.textContent = activeVehicle.descriptions;
    this.confirmButton.style.setProperty("--vehicle-accent", activeVehicle.accent);

    for (const [statKey, fill] of this.statRows) {
      const statValue = activeVehicle.stats[statKey];
      fill.style.width = `${clamp(statValue, 0, 200) / 2}%`;
      fill.style.setProperty("--vehicle-accent", activeVehicle.accent);
    }

    for (const [index, vehicle] of VEHICLE_OPTIONS.entries()) {
      const card = this.cards.get(vehicle.id);
      if (!card) {
        continue;
      }

      const offset = this.controller.getRelativeOffset(index);
      const absoluteOffset = Math.abs(offset);
      const distanceFactor = clamp(absoluteOffset / 2.2, 0, 1);
      const scale = 1 - distanceFactor * 0.28;
      const opacity = 1 - distanceFactor * 0.68;
      const brightness = 1 - distanceFactor * 0.42;
      const blur = distanceFactor * 1.2;
      const translateX = offset * 220;
      const translateY = distanceFactor * 28;
      const rotateY = offset * -24;
      const active = vehicle.id === activeVehicle.id;

      card.root.classList.toggle("is-active", active);
      card.root.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotateY(${rotateY}deg)`;
      card.root.style.opacity = `${opacity}`;
      card.root.style.zIndex = `${100 - Math.round(absoluteOffset * 10)}`;
      card.root.style.filter = `brightness(${brightness}) saturate(${1 - distanceFactor * 0.18}) blur(${blur}px)`;
      card.root.style.setProperty("--vehicle-accent", vehicle.accent);
    }
  }
}
