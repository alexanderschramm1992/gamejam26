import { CITY_MAP, findPoiById } from "../shared/map/cityMap";
import type { EnemyState, GameSnapshot, PlayerState, ProjectileState, RectZone } from "../shared/model/types";
import { clamp } from "../shared/utils/math";
import type { AudioMixer } from "./AudioMixer";
import { drawTiledRoads } from "./StreetTileRenderer";

export interface VisualEntity {
  x: number;
  y: number;
  rotation: number;
}

let carImage: HTMLImageElement | null = null;
let localPlayerCarImage: HTMLImageElement | null = null;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

const loadImage = (src: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }

  const next = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image ${src}`));
    img.src = src;
  });

  imageCache.set(src, next);
  return next;
};

const ENEMY_CAR_ASSET_PATHS: Record<EnemyState["kind"], string> = {
  rammer: "/assets/cars/truckRusted.png",
  gunner: "/assets/cars/Mini_truckRusted.png",
  drainer: "/assets/cars/DrainerVanRusted.png"
};

const enemyCarImages: Record<EnemyState["kind"], HTMLImageElement | null> = {
  rammer: null,
  gunner: null,
  drainer: null
};

const formatPlayerLabel = (player: PlayerState, adminPlayerId: string | null): string => {
  const name = player.id === adminPlayerId ? `*${player.name}` : player.name;
  return name.toUpperCase();
};

export const loadCarAsset = async (): Promise<void> => {
  const [defaultCar, rammerCar, gunnerCar, drainerCar] = await Promise.all([
    loadImage("/assets/cars/car.png"),
    loadImage(ENEMY_CAR_ASSET_PATHS.rammer),
    loadImage(ENEMY_CAR_ASSET_PATHS.gunner),
    loadImage(ENEMY_CAR_ASSET_PATHS.drainer)
  ]);

  carImage = defaultCar;
  enemyCarImages.rammer = rammerCar;
  enemyCarImages.gunner = gunnerCar;
  enemyCarImages.drainer = drainerCar;
};

export const setLocalPlayerCarAsset = async (src: string): Promise<void> => {
  localPlayerCarImage = await loadImage(src);
};

const BUILDING_ASSET_PATHS = [
  "/assets/buildings/DQ-SF_city_building_medium_02.png",
  "/assets/buildings/DQ-SF_city_building_medium_06.png",
  "/assets/buildings/DQ-SF_city_building_medium_08.png",
  "/assets/buildings/DQ-SF_city_building_small_02.png",
  "/assets/buildings/DQ-SF_city_building_small_05.png",
  "/assets/buildings/DQ-SF_city_building_small_06.png",
  "/assets/buildings/DQ-SF_city_building_small_07.png",
  "/assets/buildings/DQ-SF_city_building_small_12.png"
];

let buildingImages: HTMLImageElement[] = [];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const loadBuildingAssets = async (): Promise<void> => {
  buildingImages = await Promise.all(BUILDING_ASSET_PATHS.map(loadImage));
};

const getBuildingImage = (building: RectZone): HTMLImageElement | null => {
  if (buildingImages.length === 0) {
    return null;
  }

  const index = hashString(building.id || `${building.x}-${building.y}`) % buildingImages.length;
  return buildingImages[index];
};

const drawBuildingImage = (
  ctx: CanvasRenderingContext2D,
  building: RectZone,
  buildingImage: HTMLImageElement
): void => {
  const imageAspectRatio = buildingImage.width / buildingImage.height;
  const targetAspectRatio = building.width / building.height;

  let drawWidth = building.width;
  let drawHeight = building.height;

  if (imageAspectRatio > targetAspectRatio) {
    drawHeight = building.width / imageAspectRatio;
  } else {
    drawWidth = building.height * imageAspectRatio;
  }

  const drawX = building.x + (building.width - drawWidth) / 2;
  const drawY = building.y + building.height - drawHeight;

  ctx.drawImage(buildingImage, drawX, drawY, drawWidth, drawHeight);
};

export interface VisualCache {
  players: Map<string, VisualEntity>;
  enemies: Map<string, VisualEntity>;
  projectiles: Map<string, VisualEntity>;
}

export interface DrainBeamVisual {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  expiresAt: number;
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
  label: string,
  customImage?: HTMLImageElement | null
): void => {
  const sprite = customImage ?? carImage;
  const isGhostPlayer = entity.type === "player" && entity.ghostTimer > 0;

  if (sprite) {
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.rotate(visual.rotation);
    ctx.shadowBlur = 18;
    ctx.shadowColor = isGhostPlayer ? "rgba(255, 255, 255, 0.85)" : color;
    // Draw image centered at origin, rotated 90 degrees
    const imgHeight = entity.radius * 3.6;
    const imgWidth = imgHeight * (sprite.width / sprite.height);
    ctx.globalAlpha = isGhostPlayer ? 0.45 : 0.95;
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(sprite, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.rotate(visual.rotation);
    ctx.shadowBlur = 18;
    ctx.shadowColor = isGhostPlayer ? "rgba(255, 255, 255, 0.85)" : color;
    ctx.fillStyle = color;
    ctx.globalAlpha = isGhostPlayer ? 0.45 : 1;
    ctx.beginPath();
    ctx.roundRect(-entity.radius, -entity.radius * 0.7, entity.radius * 2, entity.radius * 1.4, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(7, 17, 26, 0.9)";
    ctx.beginPath();
    ctx.roundRect(-entity.radius * 0.5, -entity.radius * 0.35, entity.radius, entity.radius * 0.7, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(entity.radius * 0.2, -3, entity.radius * 0.7, 6);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.fillStyle = isGhostPlayer ? "rgba(244, 248, 255, 0.72)" : "rgba(244, 248, 255, 0.95)";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(label, visual.x, visual.y - entity.radius - 18);

  const barWidth = 44;
  const healthRatio = clamp(entity.health / entity.maxHealth, 0, 1);
  const batteryRatio = clamp(entity.battery / entity.maxBattery, 0, 1);
  ctx.fillStyle = "rgba(5, 16, 24, 0.7)";
  ctx.fillRect(visual.x - barWidth / 2, visual.y - entity.radius - 12, barWidth, 4);
  ctx.fillStyle = entity.type === "player" ? (isGhostPlayer ? "rgba(88, 240, 255, 0.55)" : "#58f0ff") : "#ff6767";
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

const drawDrainBeam = (
  ctx: CanvasRenderingContext2D,
  beam: DrainBeamVisual,
  nowMs: number
): void => {
  const remaining = clamp((beam.expiresAt - nowMs) / 180, 0, 1);
  if (remaining <= 0) {
    return;
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowBlur = 22;
  ctx.shadowColor = "rgba(116, 255, 161, 0.95)";

  ctx.strokeStyle = `rgba(72, 255, 124, ${0.28 + remaining * 0.34})`;
  ctx.lineWidth = 8 * remaining + 2;
  ctx.beginPath();
  ctx.moveTo(beam.sourceX, beam.sourceY);
  ctx.lineTo(beam.targetX, beam.targetY);
  ctx.stroke();

  ctx.strokeStyle = `rgba(201, 255, 214, ${0.45 + remaining * 0.4})`;
  ctx.lineWidth = 3 * remaining + 1.5;
  ctx.beginPath();
  ctx.moveTo(beam.sourceX, beam.sourceY);
  ctx.lineTo(beam.targetX, beam.targetY);
  ctx.stroke();

  ctx.fillStyle = `rgba(120, 255, 160, ${0.3 + remaining * 0.4})`;
  ctx.beginPath();
  ctx.arc(beam.sourceX, beam.sourceY, 5 + remaining * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(beam.targetX, beam.targetY, 4 + remaining * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawWorldGeometry = (ctx: CanvasRenderingContext2D): void => {
  ctx.fillStyle = "#132229";
  ctx.fillRect(0, 0, CITY_MAP.width, CITY_MAP.height);

  for (const park of CITY_MAP.parks) {
    ctx.save();
    ctx.fillStyle = "#2a4a2d";
    ctx.fillRect(park.x, park.y, park.width, park.height);
    ctx.strokeStyle = "rgba(198, 255, 158, 0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(park.x + 6, park.y + 6, park.width - 12, park.height - 12);

    const spacing = 88;
    for (let x = park.x + 36; x < park.x + park.width - 24; x += spacing) {
      for (let y = park.y + 36; y < park.y + park.height - 24; y += spacing) {
        ctx.fillStyle = "rgba(79, 127, 65, 0.85)";
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(24, 48, 24, 0.5)";
        ctx.fillRect(x - 2, y + 10, 4, 12);
      }
    }
    ctx.restore();
  }

  for (const waterZone of CITY_MAP.water) {
    ctx.save();
    ctx.fillStyle = "#184f67";
    ctx.fillRect(waterZone.x, waterZone.y, waterZone.width, waterZone.height);
    ctx.strokeStyle = "rgba(124, 214, 255, 0.22)";
    ctx.lineWidth = 3;
    for (let y = waterZone.y + 24; y < waterZone.y + waterZone.height; y += 72) {
      ctx.beginPath();
      ctx.moveTo(waterZone.x + 20, y);
      ctx.lineTo(waterZone.x + waterZone.width - 20, y + 10);
      ctx.stroke();
    }
     ctx.restore();
   }

  drawTiledRoads(ctx);

  for (const bridge of CITY_MAP.bridges) {
    ctx.save();
    ctx.strokeStyle = "rgba(232, 238, 244, 0.32)";
    ctx.lineWidth = 5;
    if (bridge.width >= bridge.height) {
      ctx.beginPath();
      ctx.moveTo(bridge.x, bridge.y + 18);
      ctx.lineTo(bridge.x + bridge.width, bridge.y + 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bridge.x, bridge.y + bridge.height - 18);
      ctx.lineTo(bridge.x + bridge.width, bridge.y + bridge.height - 18);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bridge.x + 18, bridge.y);
      ctx.lineTo(bridge.x + 18, bridge.y + bridge.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bridge.x + bridge.width - 18, bridge.y);
      ctx.lineTo(bridge.x + bridge.width - 18, bridge.y + bridge.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const building of CITY_MAP.buildings) {
    const buildingImage = getBuildingImage(building);
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    if (buildingImage) {
      drawBuildingImage(ctx, building, buildingImage);
    } else {
      ctx.fillStyle = "#0a131b";
      ctx.fillRect(building.x, building.y, building.width, building.height);
    }
    ctx.strokeStyle = "rgba(88, 240, 255, 0.08)";
    ctx.strokeRect(building.x, building.y, building.width, building.height);
  }
};

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  snapshot: GameSnapshot,
  localPlayerId: string | null,
  adminPlayerId: string | null,
  visuals: VisualCache,
  audio: AudioMixer | undefined = undefined,
  drainBeams: DrainBeamVisual[] = [],
  nowMs = performance.now()
): void => {
  const width = canvas.width / window.devicePixelRatio;
  const height = canvas.height / window.devicePixelRatio;
  ctx.clearRect(0, 0, width, height);

  const localPlayer = snapshot.players.find((player) => player.id === localPlayerId);

  if (audio && localPlayer) {
    const speed = Math.abs(Math.hypot(localPlayer.vx, localPlayer.vy));
    const maxSpeed = 280;
    audio.updateEngineSound(speed, maxSpeed);
  }

  const cameraX = clamp(localPlayer?.x ?? CITY_MAP.width / 2, width / 2, CITY_MAP.width - width / 2);
  const cameraY = clamp(localPlayer?.y ?? CITY_MAP.height / 2, height / 2, CITY_MAP.height - height / 2);

  ctx.save();
  ctx.translate(width / 2 - cameraX, height / 2 - cameraY);
  drawWorldGeometry(ctx);

  // Draw boost lanes
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

  // Draw POIs (points of interest)
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
      drawVehicle(
        ctx,
        visual,
        enemy,
        enemy.kind === "rammer" ? "#ff8b5c" : enemy.kind === "gunner" ? "#ff6767" : "#74f5b1",
        enemy.kind === "rammer" ? "RAMMER" : enemy.kind === "gunner" ? "GUNNER" : "DRAINER",
        enemyCarImages[enemy.kind]
      );
    }
  }

  for (const player of snapshot.players) {
    const visual = visuals.players.get(player.id);
    if (visual) {
      drawVehicle(
        ctx,
        visual,
        player,
        player.color,
        formatPlayerLabel(player, adminPlayerId),
        player.id === localPlayerId ? localPlayerCarImage : null
      );
    }
  }

  for (const beam of drainBeams) {
    drawDrainBeam(ctx, beam, nowMs);
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
    } else if (localPlayer.ghostTimer > 0) {
      ctx.fillStyle = "rgba(244, 248, 255, 0.9)";
      ctx.fillText(`Ghost mode ${localPlayer.ghostTimer.toFixed(1)}s`, 42, height - 20);
    } else if (localPlayer.charging) {
      ctx.fillStyle = "#ffcf69";
      ctx.fillText("Charging on station", 42, height - 20);
    }
  }
};
