import type { RectZone, Vec2 } from "../model/types";

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (value: Vec2, factor: number): Vec2 => ({
  x: value.x * factor,
  y: value.y * factor
});

export const length = (value: Vec2): number => Math.hypot(value.x, value.y);

export const distance = (a: Vec2, b: Vec2): number => length(sub(a, b));

export const normalize = (value: Vec2): Vec2 => {
  const size = length(value) || 1;
  return { x: value.x / size, y: value.y / size };
};

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const fromAngle = (angle: number): Vec2 => ({ x: Math.cos(angle), y: Math.sin(angle) });

export const perp = (value: Vec2): Vec2 => ({ x: -value.y, y: value.x });

export const angleOf = (value: Vec2): number => Math.atan2(value.y, value.x);

export const wrapAngle = (angle: number): number => {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
};

export const pointInRect = (point: Vec2, rect: RectZone): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

export const nearestPointOnRect = (point: Vec2, rect: RectZone): Vec2 => ({
  x: clamp(point.x, rect.x, rect.x + rect.width),
  y: clamp(point.y, rect.y, rect.y + rect.height)
});

export const circleIntersectsRect = (point: Vec2, radius: number, rect: RectZone): boolean => {
  const nearest = nearestPointOnRect(point, rect);
  return distance(point, nearest) <= radius;
};

export const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/**
 * Berechnet die Winkelabweichung zwischen der Fahrzeugausrichtung (rotation) 
 * und der tatsächlichen Fahrtrichtung (basierend auf Geschwindigkeitsvektor).
 * Gibt den kleinsten Winkel in Grad zurück (0-180).
 */
export const calculateSlipAngle = (rotation: number, vx: number, vy: number): number => {
  // Wenn das Fahrzeug nicht bewegt (vx und vy nahe 0), gibt es keinen Slip
  const speed = Math.hypot(vx, vy);
  if (speed < 0.1) return 0;

  // Berechne Winkel der Fahrtrichtung
  const velocityAngle = Math.atan2(vy, vx);
  
  // Normalisiere beide Winkel auf -π bis π
  let angleDiff = wrapAngle(rotation - velocityAngle);
  
  // Konvertiere zu Grad und nimm den absoluten Wert (0-180)
  const slipAngleDegrees = Math.abs(angleDiff * (180 / Math.PI));
  
  // Gib den kleinsten Winkel zurück (maximal 180 Grad)
  return Math.min(slipAngleDegrees, 360 - slipAngleDegrees);
};
