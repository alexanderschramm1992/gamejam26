import { GAME_CONFIG } from "../shared/config/gameConfig";
import type { PlayerState } from "../shared/model/types";
import { calculateSlipAngle } from "../shared/utils/math";

/**
 * Represents a single tire track mark in the visual rendering
 */
export interface TireTrackMark {
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Manages tire track generation and lifecycle for vehicles
 */
export class TireTrackManager {
  private marks: TireTrackMark[] = [];
  private lastTrackPositions: Map<string, { x: number; y: number }> = new Map();

  /**
   * Updates tire tracks based on current vehicle states
   * Nur für Spieler-Fahrzeuge, nicht für Gegner
   */
  public updateTracks(
    players: PlayerState[],
    nowMs: number
  ): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.marks.length; readIndex += 1) {
      const mark = this.marks[readIndex];
      if (mark && mark.expiresAt > nowMs) {
        this.marks[writeIndex] = mark;
        writeIndex += 1;
      }
    }
    this.marks.length = writeIndex;

    for (const vehicle of players) {
      this.updateVehicleTrack(vehicle, nowMs);
    }
  }

  /**
   * Generates new tire tracks for a single player vehicle if it's slipping
   */
  private updateVehicleTrack(
    vehicle: PlayerState,
    nowMs: number
  ): void {
    // Calculate slip angle
    const slipAngle = calculateSlipAngle(vehicle.rotation, vehicle.vx, vehicle.vy);

    // Check if vehicle is slipping beyond threshold
    if (slipAngle < GAME_CONFIG.tireSlip.thresholdDegrees) {
      this.lastTrackPositions.delete(vehicle.id);
      return;
    }

    // Get last track position for this vehicle
    const lastPos = this.lastTrackPositions.get(vehicle.id);

    // Calculate distance from last track
    const currentDistance = lastPos
      ? Math.hypot(vehicle.x - lastPos.x, vehicle.y - lastPos.y)
      : GAME_CONFIG.tireSlip.trailSpacing; // Always create first mark

    // Create new track mark if spacing threshold is met
    if (currentDistance >= GAME_CONFIG.tireSlip.trailSpacing) {
      const mark: TireTrackMark = {
        x: vehicle.x,
        y: vehicle.y,
        rotation: vehicle.rotation,
        createdAt: nowMs,
        expiresAt: nowMs + GAME_CONFIG.tireSlip.durationMs
      };

      this.marks.push(mark);
      this.lastTrackPositions.set(vehicle.id, { x: vehicle.x, y: vehicle.y });
    }
  }

  /**
   * Gets all active tire track marks
   */
  public getMarks(): TireTrackMark[] {
    return this.marks;
  }

  /**
   * Clears all tire track marks
   */
  public clear(): void {
    this.marks = [];
    this.lastTrackPositions.clear();
  }
}

/**
 * Draws a single tire track mark on the canvas
 */
export const drawTireTrack = (
  ctx: CanvasRenderingContext2D,
  mark: TireTrackMark,
  nowMs: number
): void => {
  // Calculate alpha based on remaining lifetime
  const remaining = Math.max(0, mark.expiresAt - nowMs);
  const alpha = (remaining / GAME_CONFIG.tireSlip.durationMs) * 0.6;

  if (alpha <= 0) {
    return;
  }

  ctx.save();
  ctx.translate(mark.x, mark.y);
  ctx.rotate(mark.rotation);

  // Draw tire track marks as dark semi-transparent lines
  ctx.strokeStyle = `rgba(60, 60, 60, ${alpha})`;
  ctx.lineWidth = 4; // Schmale Linien für realistische Reifenspuren
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw two tire marks (left and right) - aus den Reifen kommend
  // Streifen verlaufen QUER zur Fahrtrichtung (nicht entlang)
  const trackSpacing = 14; // Abstand zwischen den beiden Reifen

  // Left tire - quer zur Fahrtrichtung (X-Richtung statt Y)
  ctx.beginPath();
  ctx.moveTo(-20, -trackSpacing);
  ctx.lineTo(20, -trackSpacing);
  ctx.stroke();

  // Right tire - quer zur Fahrtrichtung (X-Richtung statt Y)
  ctx.beginPath();
  ctx.moveTo(-20, trackSpacing);
  ctx.lineTo(20, trackSpacing);
  ctx.stroke();

  ctx.restore();
};
