export class VehicleSelectionController {
  private readonly length: number;
  private currentIndex: number;
  private displayIndex: number;

  constructor(length: number, initialIndex = 0) {
    this.length = Math.max(1, length);
    this.currentIndex = this.normalize(initialIndex);
    this.displayIndex = this.currentIndex;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public next(): number {
    this.currentIndex = this.normalize(this.currentIndex + 1);
    return this.currentIndex;
  }

  public previous(): number {
    this.currentIndex = this.normalize(this.currentIndex - 1);
    return this.currentIndex;
  }

  public update(dt: number): void {
    const difference = this.shortestDistance(this.currentIndex, this.displayIndex);
    if (Math.abs(difference) < 0.0005) {
      this.displayIndex = this.currentIndex;
      return;
    }

    const easing = Math.min(1, dt * 9.5);
    this.displayIndex = this.normalizeFloat(this.displayIndex + difference * easing);
  }

  public getRelativeOffset(index: number): number {
    return this.shortestDistance(index, this.displayIndex);
  }

  private shortestDistance(target: number, from: number): number {
    let difference = target - from;
    const half = this.length / 2;
    if (difference > half) {
      difference -= this.length;
    } else if (difference < -half) {
      difference += this.length;
    }
    return difference;
  }

  private normalize(index: number): number {
    return ((index % this.length) + this.length) % this.length;
  }

  private normalizeFloat(index: number): number {
    return ((index % this.length) + this.length) % this.length;
  }
}
