import { CITY_MAP, findPoiById } from "../shared/map/cityMap";
import type { EnemyState, GameSnapshot, PlayerState, ProjectileState } from "../shared/model/types";
import { clamp } from "../shared/utils/math";

export interface VisualEntity {
  x: number;
  y: number;
  rotation: number;
}

let carImage: HTMLImageElement | null = null;
let assetLoadingPromise: Promise<void> | null = null;

export const loadCarAsset = (): Promise<void> => {
  // Reuse the same loading promise if already in progress
  if (assetLoadingPromise) {
    return assetLoadingPromise;
  }

  assetLoadingPromise = new Promise((resolve, reject) => {
    if (carImage) {
      console.log("[Asset] Car image already loaded");
      resolve();
      return;
    }
    console.log("[Asset] Starting to load car.png from /assets/car.png");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.log("[Asset] Car image loaded successfully", img.width, "x", img.height);
      carImage = img;
      resolve();
    };
    img.onerror = (error) => {
      console.error("[Asset] Failed to load car asset:", error);
      reject(new Error("Failed to load car asset"));
    };
    img.src = "/assets/car.png";
    console.log("[Asset] Image src set, loading...");
  });

  return assetLoadingPromise;
};

export interface VisualCache {
  players: Map<string, VisualEntity>;
  enemies: Map<string, VisualEntity>;
  projectiles: Map<string, VisualEntity>;
}

const panel = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void => {
  ctx.fillStyle = "rgba(5, 16, 24, 0.72)";
  ctx.strokeStyle = "rgba(88, 240, 255, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();
};

const drawVehicle = (
  ctx: CanvasRenderingContext2D,
  visual: VisualEntity,
  entity: PlayerState | EnemyState,
  color: string,
  label: string
): void => {
  // Draw car image if loaded
  if (carImage) {
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.rotate(visual.rotation);
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    // Draw image centered at origin, rotated 180 degrees
    // Original car.png ratio: 444x208 = 2.135:1 (width:height)
    const imgHeight = entity.radius * 1.8;
    const imgWidth = imgHeight * 2.135;
    ctx.globalAlpha = 0.95;
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.drawImage(carImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    // Fallback to geometric shapes if image not loaded
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.rotate(visual.rotation);
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-entity.radius, -entity.radius * 0.7, entity.radius * 2, entity.radius * 1.4, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(7, 17, 26, 0.9)";
    ctx.beginPath();
    ctx.roundRect(-entity.radius * 0.5, -entity.radius * 0.35, entity.radius, entity.radius * 0.7, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(entity.radius * 0.2, -3, entity.radius * 0.7, 6);
    ctx.restore();
  }

  ctx.fillStyle = "rgba(244, 248, 255, 0.95)";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(label, visual.x, visual.y - entity.radius - 18);

  const barWidth = 44;
  const healthRatio = clamp(entity.health / entity.maxHealth, 0, 1);
  const batteryRatio = clamp(entity.battery / entity.maxBattery, 0, 1);
  ctx.fillStyle = "rgba(5, 16, 24, 0.7)";
  ctx.fillRect(visual.x - barWidth / 2, visual.y - entity.radius - 12, barWidth, 4);
  ctx.fillStyle = entity.type === "player" ? "#58f0ff" : "#ff6767";
  ctx.fillRect(visual.x - barWidth / 2, visual.y - entity.radius - 12, barWidth * healthRatio, 4);
  ctx.fillStyle = "rgba(5, 16, 24, 0.7)";
  ctx.fillRect(visual.x - barWidth / 2, visual.y - entity.radius - 6, barWidth, 3);
  ctx.fillStyle = "#c1ff72";
  ctx.fillRect(visual.x - barWidth / 2, visual.y - entity.radius - 6, barWidth * batteryRatio, 3);
};

const drawProjectile = (
  ctx: CanvasRenderingContext2D,
  visual: VisualEntity,
  projectile: ProjectileState
): void => {
  ctx.save();
  ctx.fillStyle = projectile.ownerType === "player" ? "#ffcf69" : "#ff6767";
  ctx.shadowBlur = 12;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(visual.x, visual.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawWorldGeometry = (ctx: CanvasRenderingContext2D): void => {
  ctx.fillStyle = "#102231";
  ctx.fillRect(0, 0, CITY_MAP.width, CITY_MAP.height);

  ctx.fillStyle = "#18384b";
  for (const road of CITY_MAP.roads) {
    ctx.fillRect(road.x, road.y, road.width, road.height);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 4;
  for (const road of CITY_MAP.roads) {
    if (road.width > road.height) {
      const y = road.y + road.height / 2;
      for (let x = road.x + 20; x < road.x + road.width - 20; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y);
        ctx.stroke();
      }
    } else {
      const x = road.x + road.width / 2;
      for (let y = road.y + 20; y < road.y + road.height - 20; y += 42) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 20);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = "#0a131b";
  for (const building of CITY_MAP.buildings) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(building.x, building.y, building.width, building.height);
    ctx.strokeStyle = "rgba(88, 240, 255, 0.08)";
    ctx.strokeRect(building.x, building.y, building.width, building.height);
  }

  for (const lane of CITY_MAP.boostLanes) {
    ctx.save();
    ctx.strokeStyle = "rgba(193, 255, 114, 0.7)";
    ctx.fillStyle = "rgba(193, 255, 114, 0.08)";
    ctx.fillRect(lane.x, lane.y, lane.width, lane.height);
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.strokeRect(lane.x + 4, lane.y + 4, lane.width - 8, lane.height - 8);
    ctx.restore();
  }

  const glowPoi = (x: number, y: number, radius: number, fill: string, stroke: string): void => {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = stroke;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  CITY_MAP.chargeStations.forEach((station) => glowPoi(station.x, station.y, station.radius * 0.45, "rgba(88, 240, 255, 0.15)", "#58f0ff"));
  CITY_MAP.dispatchPoints.forEach((dispatch) => glowPoi(dispatch.x, dispatch.y, dispatch.radius * 0.48, "rgba(255, 179, 71, 0.18)", "#ffb347"));
  CITY_MAP.deliveryPoints.forEach((point) => glowPoi(point.x, point.y, point.radius * 0.38, "rgba(255, 122, 209, 0.14)", "#ff7ad1"));
};

const drawMinimap = (
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  localPlayer: PlayerState | undefined,
  visuals: VisualCache,
  width: number,
  height: number
): void => {
  const mapWidth = 210;
  const mapHeight = 146;
  const x = width - mapWidth - 24;
  const y = 24;
  panel(ctx, x, y, mapWidth, mapHeight);
  const scaleX = (mapWidth - 28) / CITY_MAP.width;
  const scaleY = (mapHeight - 28) / CITY_MAP.height;

  ctx.save();
  ctx.translate(x + 14, y + 14);
  ctx.fillStyle = "rgba(11, 26, 36, 0.95)";
  ctx.fillRect(0, 0, mapWidth - 28, mapHeight - 28);
  ctx.fillStyle = "rgba(24, 56, 75, 0.8)";
  for (const road of CITY_MAP.roads) {
    ctx.fillRect(road.x * scaleX, road.y * scaleY, road.width * scaleX, road.height * scaleY);
  }
  ctx.fillStyle = "rgba(4, 10, 15, 0.9)";
  for (const building of CITY_MAP.buildings) {
    ctx.fillRect(building.x * scaleX, building.y * scaleY, building.width * scaleX, building.height * scaleY);
  }

  const missionTarget = findPoiById(snapshot.mission.destinationId);
  if (missionTarget) {
    ctx.strokeStyle = snapshot.mission.status === "active" ? "#ffcf69" : "#ff7ad1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(missionTarget.x * scaleX, missionTarget.y * scaleY, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const enemy of snapshot.enemies) {
    const visual = visuals.enemies.get(enemy.id);
    if (!visual) continue;
    ctx.fillStyle = "#ff6767";
    ctx.fillRect(visual.x * scaleX - 2, visual.y * scaleY - 2, 4, 4);
  }
  for (const player of snapshot.players) {
    const visual = visuals.players.get(player.id);
    if (!visual) continue;
    ctx.fillStyle = player.id === localPlayer?.id ? "#58f0ff" : player.color;
    ctx.beginPath();
    ctx.arc(visual.x * scaleX, visual.y * scaleY, player.id === localPlayer?.id ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  snapshot: GameSnapshot,
  localPlayerId: string | null,
  visuals: VisualCache
): void => {
  const width = canvas.width / window.devicePixelRatio;
  const height = canvas.height / window.devicePixelRatio;
  ctx.clearRect(0, 0, width, height);

  const localPlayer = snapshot.players.find((player) => player.id === localPlayerId);
  const cameraX = clamp(localPlayer?.x ?? CITY_MAP.width / 2, width / 2, CITY_MAP.width - width / 2);
  const cameraY = clamp(localPlayer?.y ?? CITY_MAP.height / 2, height / 2, CITY_MAP.height - height / 2);

  ctx.save();
  ctx.translate(width / 2 - cameraX, height / 2 - cameraY);
  drawWorldGeometry(ctx);

  const destination = findPoiById(snapshot.mission.destinationId);
  if (destination) {
    ctx.save();
    ctx.strokeStyle = snapshot.mission.status === "active" ? "#ffcf69" : "#ff7ad1";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -snapshot.serverTime * 60;
    ctx.beginPath();
    ctx.arc(destination.x, destination.y, destination.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const projectile of snapshot.projectiles) {
    const visual = visuals.projectiles.get(projectile.id);
    if (visual) {
      drawProjectile(ctx, visual, projectile);
    }
  }
  for (const enemy of snapshot.enemies) {
    const visual = visuals.enemies.get(enemy.id);
    if (visual) {
      drawVehicle(ctx, visual, enemy, enemy.kind === "brute" ? "#ff8b5c" : enemy.kind === "gunner" ? "#ff6767" : "#ff9d5d", enemy.kind.toUpperCase());
    }
  }
  for (const player of snapshot.players) {
    const visual = visuals.players.get(player.id);
    if (visual) {
      drawVehicle(ctx, visual, player, player.color, player.id === localPlayerId ? "YOU" : player.name.toUpperCase());
    }
  }
  ctx.restore();

  panel(ctx, 22, 22, 260, 112);
  ctx.fillStyle = "#f4f8ff";
  ctx.textAlign = "left";
  ctx.font = "700 17px Trebuchet MS";
  ctx.fillText("Mission", 42, 48);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = "#9bb3c5";
  const missionTitle = destination ? destination.label : "Dispatch";
  const statusText = snapshot.mission.status === "ready"
    ? "Return to dispatch and press E"
    : snapshot.mission.status === "active"
      ? `Deliver to ${missionTitle}`
      : "Next order loading";
  ctx.fillText(statusText, 42, 72);
  ctx.fillText(`Time ${snapshot.mission.timeRemaining.toFixed(0)}s`, 42, 94);
  ctx.fillText(`Score ${snapshot.team.score}  Deliveries ${snapshot.team.deliveries}  Danger ${snapshot.team.danger}`, 42, 116);

  if (localPlayer) {
    panel(ctx, 22, height - 112, 270, 90);
    const batteryRatio = clamp(localPlayer.battery / localPlayer.maxBattery, 0, 1);
    const healthRatio = clamp(localPlayer.health / localPlayer.maxHealth, 0, 1);
    ctx.fillStyle = "#f4f8ff";
    ctx.font = "700 16px Trebuchet MS";
    ctx.fillText("Vehicle", 42, height - 84);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(42, height - 70, 220, 10);
    ctx.fillRect(42, height - 42, 220, 10);
    ctx.fillStyle = "#58f0ff";
    ctx.fillRect(42, height - 70, 220 * healthRatio, 10);
    ctx.fillStyle = "#c1ff72";
    ctx.fillRect(42, height - 42, 220 * batteryRatio, 10);
    ctx.fillStyle = "#9bb3c5";
    ctx.font = "12px Trebuchet MS";
    ctx.fillText(`Hull ${localPlayer.health.toFixed(0)} / ${localPlayer.maxHealth}`, 42, height - 76);
    ctx.fillText(`Battery ${localPlayer.battery.toFixed(0)} / ${localPlayer.maxBattery}`, 42, height - 48);
    if (localPlayer.destroyed) {
      ctx.fillStyle = "#ff6767";
      ctx.fillText(`Respawn in ${localPlayer.respawnTimer.toFixed(1)}s`, 42, height - 20);
    } else if (localPlayer.charging) {
      ctx.fillStyle = "#ffcf69";
      ctx.fillText("Charging on station", 42, height - 20);
    }
  }

  drawMinimap(ctx, snapshot, localPlayer, visuals, width, height);
};
