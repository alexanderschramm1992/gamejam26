import type { PlayerInput } from "../shared/model/types";

const pressedKeys = new Set<string>();

const positive = (condition: boolean): number => (condition ? 1 : 0);

export class InputController {
  private enabled = true;

  constructor() {
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
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      pressedKeys.clear();
    }
  }

  public snapshot(seq: number): PlayerInput {
    if (!this.enabled) {
      return {
        throttle: 0,
        steer: 0,
        brake: false,
        shoot: false,
        interact: false,
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
      brake: pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight"),
      shoot: pressedKeys.has("Space"),
      interact: pressedKeys.has("KeyE"),
      seq
    };
  }
}
