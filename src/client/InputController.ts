import type { PlayerInput } from "../shared/model/types";

const pressedKeys = new Set<string>();

const positive = (condition: boolean): number => (condition ? 1 : 0);

export class InputController {
  constructor() {
    window.addEventListener("keydown", (event) => {
      pressedKeys.add(event.code);
    });
    window.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      pressedKeys.clear();
    });
  }

  public snapshot(seq: number): PlayerInput {
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
