import type { PlayerInput } from "../shared/model/types";

const pressedKeys = new Set<string>();

const positive = (condition: boolean): number => (condition ? 1 : 0);

export class InputController {
  private enabled = true;
  private pointerX = 0;
  private pointerY = 0;
  private pointerDown = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.pointerX = canvas.clientWidth / 2;
    this.pointerY = canvas.clientHeight / 2;

    window.addEventListener("keydown", (event) => {
      if (!this.enabled) {
        return;
      }
      pressedKeys.add(event.code);
    });
    window.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      pressedKeys.clear();
      this.pointerDown = false;
    });

    canvas.addEventListener("pointermove", (event) => {
      this.pointerX = event.offsetX;
      this.pointerY = event.offsetY;
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (!this.enabled || event.button !== 0) {
        return;
      }
      this.pointerDown = true;
      event.preventDefault();
    });
    canvas.addEventListener("pointerup", (event) => {
      if (event.button !== 0) {
        return;
      }
      this.pointerDown = false;
    });
    canvas.addEventListener("pointercancel", () => {
      this.pointerDown = false;
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      pressedKeys.clear();
      this.pointerDown = false;
    }
  }

  public getAimAngle(localPlayer: { x: number; y: number } | null, cameraX: number, cameraY: number): number {
    if (!localPlayer) {
      return 0;
    }

    const canvasWidth = this.canvas.clientWidth || this.canvas.width;
    const canvasHeight = this.canvas.clientHeight || this.canvas.height;
    const worldX = this.pointerX - canvasWidth / 2 + cameraX;
    const worldY = this.pointerY - canvasHeight / 2 + cameraY;
    return Math.atan2(worldY - localPlayer.y, worldX - localPlayer.x);
  }

  public snapshot(seq: number, aimAngle = 0): PlayerInput {
    if (!this.enabled) {
      return {
        throttle: 0,
        steer: 0,
        shoot: false,
        interact: false,
        handbrake: false,
        aimAngle,
        seq
      };
    }

    const throttle =
      positive(pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) -
      positive(pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown"));
    const steer =
      positive(pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) -
      positive(pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft"));

    return {
      throttle,
      steer,
      shoot: pressedKeys.has("Space") || this.pointerDown,
      interact: pressedKeys.has("KeyE"),
      handbrake: pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight"),
      aimAngle,
      seq
    };
  }
}
