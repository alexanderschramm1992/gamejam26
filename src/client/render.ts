import { BUILDING_ASSETS, getBuildingAsset, getBuildingCollisionRect, getBuildingDrawRect } from "../shared/map/buildingAssets";
import { CITY_MAP, TILE_SIZE, findPoiById } from "../shared/map/cityMap";
import type { EnemyState, GameSnapshot, PlayerState, ProjectileState, RectZone } from "../shared/model/types";
import { clamp } from "../shared/utils/math";
import type { AudioMixer } from "./AudioMixer";
import { drawTiledRoads, type ViewportBounds } from "./StreetTileRenderer";
import { drawTireTrack, type TireTrackMark } from "./TireTrackRenderer";

export interface VisualEntity {
  x: number;
  y: number;
  rotation: number;
}

export interface SparkEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
}

export interface ExplosionEffect {
  x: number;
  y: number;
  startAt: number;
  duration: number;
  maxRadius: number;
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

let buildingImages = new Map<string, HTMLImageElement>();
let pavementTileImage: HTMLImageElement | null = null;
let targetPointerImage: HTMLImageElement | null = null;
let sushiImage: HTMLImageElement | null = null;
let weaponImage: HTMLImageElement | null = null;
let bulletImage: HTMLImageElement | null = null;
let pavementPatterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();

export const loadHudAssets = async (): Promise<void> => {
  [targetPointerImage, weaponImage, bulletImage] = await Promise.all([
    loadImage("/assets/hud/sushi.png"),
    loadImage("/assets/weapon_systems/MG.png"),
    loadImage("/assets/weapon_systems/Bullet_MG.png")
  ]);
  sushiImage = targetPointerImage;
};

export const loadBuildingAssets = async (): Promise<void> => {
  const [images, pavementTile] = await Promise.all([
    Promise.all(BUILDING_ASSETS.map(async (asset) => [asset.id, await loadImage(asset.src)] as const)),
    loadImage("/assets/street_tiles/none.png")
  ]);
  buildingImages = new Map(images);
  pavementTileImage = pavementTile;
  pavementPatterns = new WeakMap();
};

const getBuildingImage = (building: RectZone): HTMLImageElement | null => {
  if (buildingImages.size === 0) {
    return null;
  }

  return buildingImages.get(getBuildingAsset(building).id) ?? null;
};

const snapToPixelGrid = (value: number): number =>
  Math.round(value * currentPixelSnapScale) / currentPixelSnapScale;

const drawBuildingImage = (
  ctx: CanvasRenderingContext2D,
  drawRect: RectZone,
  buildingImage: HTMLImageElement
): void => {
  const snappedX = snapToPixelGrid(drawRect.x);
  const snappedY = snapToPixelGrid(drawRect.y);
  const snappedWidth = Math.max(1, snapToPixelGrid(drawRect.width));
  const snappedHeight = Math.max(1, snapToPixelGrid(drawRect.height));
  ctx.drawImage(buildingImage, snappedX, snappedY, snappedWidth, snappedHeight);
};

const getBuildingLotRect = (buildingId: string): RectZone | null => {
  const match = /^b-(\d+)-(\d+)-/.exec(buildingId);
  if (!match) {
    return null;
  }

  const col = Number(match[1]);
  const row = Number(match[2]);
  return {
    id: `lot-${col}-${row}`,
    x: col * TILE_SIZE + 12,
    y: row * TILE_SIZE + 12,
    width: TILE_SIZE - 24,
    height: TILE_SIZE - 24
  };
};

const getBuildingLots = (): RectZone[] => {
  const lots = new Map<string, RectZone>();

  for (const building of CITY_MAP.buildings) {
    const lot = getBuildingLotRect(building.id);
    if (!lot || lots.has(lot.id)) {
      continue;
    }
    lots.set(lot.id, lot);
  }

  return Array.from(lots.values());
};

const buildingLots = getBuildingLots();

const drawPavedLot = (
  ctx: CanvasRenderingContext2D,
  lot: RectZone,
  pavementPattern: CanvasPattern | null
): void => {
  ctx.save();
  ctx.fillStyle = pavementPattern ?? '#8c8f93';
  ctx.fillRect(lot.x, lot.y, lot.width, lot.height);
  ctx.strokeStyle = 'rgba(23, 29, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(lot.x + 1, lot.y + 1, lot.width - 2, lot.height - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeRect(lot.x + 8, lot.y + 8, lot.width - 16, lot.height - 16);
  ctx.restore();
};

const getPavementPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const cachedPattern = pavementPatterns.get(ctx);
  if (cachedPattern !== undefined) {
    return cachedPattern;
  }

  const nextPattern = pavementTileImage ? ctx.createPattern(pavementTileImage, "repeat") : null;
  pavementPatterns.set(ctx, nextPattern);
  return nextPattern;
};

const rectIntersectsBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  bounds: ViewportBounds
): boolean => x < bounds.right && x + width > bounds.left && y < bounds.bottom && y + height > bounds.top;

const zoneIntersectsBounds = (zone: RectZone, bounds: ViewportBounds): boolean =>
  rectIntersectsBounds(zone.x, zone.y, zone.width, zone.height, bounds);

const pointIntersectsBounds = (
  x: number,
  y: number,
  radius: number,
  bounds: ViewportBounds
): boolean => rectIntersectsBounds(x - radius, y - radius, radius * 2, radius * 2, bounds);

const CAMERA_ZOOM_IDLE = 1.08;
const CAMERA_ZOOM_FAST = 0.96;
const CAMERA_ZOOM_RESPONSE = 0.08;
let currentCameraZoom = CAMERA_ZOOM_IDLE;
let currentPixelSnapScale = window.devicePixelRatio || 1;

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

const easeInOutQuad = (value: number): number =>
  value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;

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
  customImage?: HTMLImageElement | null,
  weaponAngle?: number
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

  if (weaponImage && weaponAngle !== undefined && entity.type === "player") {
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.rotate(weaponAngle + Math.PI / 2);
    const weaponHeight = entity.radius * 2.5;
    const weaponWidth = weaponHeight * (weaponImage.width / weaponImage.height);
    ctx.drawImage(weaponImage, -weaponWidth / 2, -weaponHeight / 2, weaponWidth, weaponHeight);
    ctx.restore();
  }

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
  if (bulletImage) {
    ctx.save();
    ctx.translate(visual.x, visual.y);
    const rotation = Math.atan2(projectile.vy, projectile.vx);
    ctx.rotate(rotation + Math.PI / 2);
    const imgHeight = projectile.radius * 4.2;
    const imgWidth = imgHeight * (bulletImage.width / bulletImage.height);
    ctx.drawImage(bulletImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = projectile.ownerType === "player" ? "#ffcf69" : "#ff6767";
  ctx.shadowBlur = 12;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(visual.x, visual.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawSparkEffect = (
  ctx: CanvasRenderingContext2D,
  spark: SparkEffect,
  nowMs: number
): void => {
  const remaining = clamp((spark.expiresAt - nowMs) / 240, 0, 1);
  if (remaining <= 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = `rgba(255, 245, 200, ${0.7 * remaining})`;
  ctx.lineWidth = 2 * Math.max(0.5, remaining);
  ctx.beginPath();
  ctx.moveTo(spark.x, spark.y);
  ctx.lineTo(spark.x + spark.vx * remaining * 0.6, spark.y + spark.vy * remaining * 0.6);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 220, ${0.8 * remaining})`;
  ctx.beginPath();
  ctx.arc(spark.x, spark.y, 1.8 + remaining * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawExplosionEffect = (
  ctx: CanvasRenderingContext2D,
  explosion: ExplosionEffect,
  nowMs: number
): void => {
  const elapsed = nowMs - explosion.startAt;
  const progress = clamp(elapsed / explosion.duration, 0, 1);
  if (progress <= 0 || progress >= 1) {
    return;
  }

  const radius = explosion.maxRadius * progress;
  const alpha = 0.9 * (1 - progress);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255, 180, 90, 0.22)";
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const length = radius * (0.9 + 0.2 * Math.sin(progress * Math.PI));
    ctx.beginPath();
    ctx.moveTo(
      explosion.x + Math.cos(angle) * radius * 0.35,
      explosion.y + Math.sin(angle) * radius * 0.35
    );
    ctx.lineTo(
      explosion.x + Math.cos(angle) * length,
      explosion.y + Math.sin(angle) * length
    );
    ctx.stroke();
  }
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

const drawSushiTransfer = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  progress: number,
  cargoCount: number,
  nowMs: number
): void => {
  if (!sushiImage || cargoCount <= 0) {
    return;
  }

  const count = Math.min(cargoCount, 10);
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const normalX = -deltaY / distance;
  const normalY = deltaX / distance;
  const rotation = Math.atan2(deltaY, deltaX) + Math.PI / 2;

  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(255, 214, 120, 0.85)";

  for (let index = 0; index < count; index += 1) {
    const trailOffset = index * 0.065;
    const travel = clamp((progress - trailOffset) / Math.max(0.35, 1 - trailOffset), 0, 1);
    if (travel <= 0) {
      continue;
    }

    const eased = easeInOutQuad(travel);
    const sway = Math.sin(nowMs / 140 + index * 1.7 + eased * Math.PI * 2) * (1 - eased) * 16;
    const arc = Math.sin(eased * Math.PI) * (index % 2 === 0 ? 9 : -9);
    const x = startX + deltaX * eased + normalX * (sway + arc);
    const y = startY + deltaY * eased + normalY * (sway + arc);
    const alpha = 0.38 + eased * 0.62;
    const size = 18;
    const drawWidth = size * (sushiImage.width / sushiImage.height);
    const wobble = Math.sin(nowMs / 200 + index) * 0.14;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation + wobble);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sushiImage, -drawWidth / 2, -size / 2, drawWidth, size);
    ctx.restore();
  }

  ctx.restore();
};

const drawWorldGeometry = (ctx: CanvasRenderingContext2D, bounds: ViewportBounds): void => {
  const pavementPattern = getPavementPattern(ctx);
  ctx.fillStyle = pavementPattern ?? "#132229";
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

  for (const park of CITY_MAP.parks) {
    if (!zoneIntersectsBounds(park, bounds)) {
      continue;
    }

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
    if (!zoneIntersectsBounds(waterZone, bounds)) {
      continue;
    }

    ctx.save();
    ctx.fillStyle = "#0f2e3d";
    ctx.fillRect(waterZone.x, waterZone.y, waterZone.width, waterZone.height);
    ctx.fillStyle = "#1f6481";
    ctx.fillRect(waterZone.x + 10, waterZone.y + 10, waterZone.width - 20, waterZone.height - 20);
    ctx.strokeStyle = "rgba(171, 230, 255, 0.2)";
    ctx.lineWidth = 4;
    ctx.strokeRect(waterZone.x + 16, waterZone.y + 16, waterZone.width - 32, waterZone.height - 32);

    for (let y = waterZone.y + 48; y < waterZone.y + waterZone.height - 32; y += 96) {
      ctx.beginPath();
      ctx.moveTo(waterZone.x + 40, y);
      ctx.lineTo(waterZone.x + waterZone.width - 40, y + 8);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(4, 20, 28, 0.18)";
    ctx.fillRect(waterZone.x, waterZone.y, 24, waterZone.height);
    ctx.fillRect(waterZone.x + waterZone.width - 24, waterZone.y, 24, waterZone.height);
    ctx.restore();
  }

  drawTiledRoads(ctx, bounds);

  for (const lot of buildingLots) {
    if (!zoneIntersectsBounds(lot, bounds)) {
      continue;
    }

    drawPavedLot(ctx, lot, pavementPattern);
  }

  for (const bridge of CITY_MAP.bridges) {
    if (!zoneIntersectsBounds(bridge, bounds)) {
      continue;
    }

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
    const drawRect = getBuildingDrawRect(building);
    if (!zoneIntersectsBounds(drawRect, bounds)) {
      continue;
    }

    const buildingImage = getBuildingImage(building);
    const collisionRect = getBuildingCollisionRect(building);
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    if (buildingImage) {
      drawBuildingImage(ctx, drawRect, buildingImage);
    } else {
      ctx.fillStyle = "#0a131b";
      ctx.fillRect(building.x, building.y, building.width, building.height);
    }
    ctx.strokeStyle = "rgba(88, 240, 255, 0.08)";
    ctx.strokeRect(collisionRect.x, collisionRect.y, collisionRect.width, collisionRect.height);
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
  sparkEffects: SparkEffect[] = [],
  explosionEffects: ExplosionEffect[] = [],
  tireTracks: TireTrackMark[] = [],
  nowMs = performance.now(),
  localPlayerAimAngle = 0,
  fps = 0,
  serverTickRate = 0
): void => {
  const width = canvas.width / window.devicePixelRatio;
  const height = canvas.height / window.devicePixelRatio;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const localPlayer = snapshot.players.find((player) => player.id === localPlayerId);
  const localPlayerVisual = localPlayerId ? visuals.players.get(localPlayerId) ?? null : null;
  const localPlayerSpeed = localPlayer ? Math.abs(Math.hypot(localPlayer.vx, localPlayer.vy)) : 0;

  if (audio && localPlayer) {
    const maxSpeed = 280;
    audio.updateEngineSound(localPlayerSpeed, maxSpeed);
  }

  const zoomT = clamp(localPlayerSpeed / 420, 0, 1);
  const targetCameraZoom = CAMERA_ZOOM_IDLE + (CAMERA_ZOOM_FAST - CAMERA_ZOOM_IDLE) * zoomT;
  currentCameraZoom += (targetCameraZoom - currentCameraZoom) * CAMERA_ZOOM_RESPONSE;

  const visibleWorldWidth = width / currentCameraZoom;
  const visibleWorldHeight = height / currentCameraZoom;
  currentPixelSnapScale = (window.devicePixelRatio || 1) * currentCameraZoom;
  const cameraTargetX = localPlayerVisual?.x ?? localPlayer?.x ?? CITY_MAP.width / 2;
  const cameraTargetY = localPlayerVisual?.y ?? localPlayer?.y ?? CITY_MAP.height / 2;
  const cameraX = snapToPixelGrid(
    clamp(cameraTargetX, visibleWorldWidth / 2, CITY_MAP.width - visibleWorldWidth / 2)
  );
  const cameraY = snapToPixelGrid(
    clamp(cameraTargetY, visibleWorldHeight / 2, CITY_MAP.height - visibleWorldHeight / 2)
  );
  const viewBounds: ViewportBounds = {
    left: cameraX - visibleWorldWidth / 2,
    top: cameraY - visibleWorldHeight / 2,
    right: cameraX + visibleWorldWidth / 2,
    bottom: cameraY + visibleWorldHeight / 2
  };

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(currentCameraZoom, currentCameraZoom);
  ctx.translate(-cameraX, -cameraY);
  drawWorldGeometry(ctx, viewBounds);

  // Draw boost lanes
  for (const lane of CITY_MAP.boostLanes) {
    if (!zoneIntersectsBounds(lane, viewBounds)) {
      continue;
    }

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

  CITY_MAP.chargeStations.forEach((station) => {
    if (pointIntersectsBounds(station.x, station.y, station.radius, viewBounds)) {
      glowPoi(station.x, station.y, station.radius * 0.45, "rgba(88, 240, 255, 0.15)", "#58f0ff");
    }
  });
  CITY_MAP.dispatchPoints.forEach((dispatch) => {
    if (pointIntersectsBounds(dispatch.x, dispatch.y, dispatch.radius, viewBounds)) {
      glowPoi(dispatch.x, dispatch.y, dispatch.radius * 0.48, "rgba(255, 179, 71, 0.18)", "#ffb347");
    }
  });
  CITY_MAP.deliveryPoints.forEach((point) => {
    if (pointIntersectsBounds(point.x, point.y, point.radius, viewBounds)) {
      glowPoi(point.x, point.y, point.radius * 0.38, "rgba(255, 122, 209, 0.14)", "#ff7ad1");
    }
  });

  const destination = findPoiById(snapshot.mission.destinationId);
  const carrier = snapshot.mission.acceptedBy
    ? snapshot.players.find((player) => player.id === snapshot.mission.acceptedBy) ?? null
    : null;
  if (destination && pointIntersectsBounds(destination.x, destination.y, destination.radius, viewBounds)) {
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
    if (visual && pointIntersectsBounds(visual.x, visual.y, projectile.radius + 12, viewBounds)) {
      drawProjectile(ctx, visual, projectile);
    }
  }

  // Draw tire tracks before vehicles
  for (const track of tireTracks) {
    if (pointIntersectsBounds(track.x, track.y, 28, viewBounds)) {
      drawTireTrack(ctx, track, nowMs);
    }
  }

  for (const enemy of snapshot.enemies) {
    const visual = visuals.enemies.get(enemy.id);
    if (visual && pointIntersectsBounds(visual.x, visual.y, enemy.radius + 56, viewBounds)) {
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
    if (visual && pointIntersectsBounds(visual.x, visual.y, player.radius + 56, viewBounds)) {
      drawVehicle(
        ctx,
        visual,
        player,
        player.color,
        formatPlayerLabel(player, adminPlayerId),
        player.id === localPlayerId ? localPlayerCarImage : null,
        player.id === localPlayerId ? localPlayerAimAngle : undefined
      );
    }
  }

  if (carrier && (snapshot.mission.status === "loading" || snapshot.mission.status === "unloading")) {
    const carrierVisual = visuals.players.get(carrier.id);
    const dispatch = findPoiById(snapshot.mission.dispatchId);
    const delivery = findPoiById(snapshot.mission.destinationId);
    const progress = snapshot.mission.transferDuration <= 0
      ? 1
      : clamp(1 - snapshot.mission.transferRemaining / snapshot.mission.transferDuration, 0, 1);

    if (carrierVisual && snapshot.mission.status === "loading" && dispatch) {
      drawSushiTransfer(
        ctx,
        dispatch.x,
        dispatch.y,
        carrierVisual.x,
        carrierVisual.y,
        progress,
        snapshot.mission.cargoCount,
        nowMs
      );
    }

    if (carrierVisual && snapshot.mission.status === "unloading" && delivery) {
      drawSushiTransfer(
        ctx,
        carrierVisual.x,
        carrierVisual.y,
        delivery.x,
        delivery.y,
        progress,
        snapshot.mission.cargoCount,
        nowMs
      );
    }
  }

  for (const spark of sparkEffects) {
    drawSparkEffect(ctx, spark, nowMs);
  }

  for (const explosion of explosionEffects) {
    drawExplosionEffect(ctx, explosion, nowMs);
  }

  for (const spark of sparkEffects) {
    drawSparkEffect(ctx, spark, nowMs);
  }

  for (const explosion of explosionEffects) {
    drawExplosionEffect(ctx, explosion, nowMs);
  }

  for (const beam of drainBeams) {
    drawDrainBeam(ctx, beam, nowMs);
  }
  ctx.restore();

  const drawTargetIndicator = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    localPlayer: PlayerState | undefined,
    mission: GameSnapshot["mission"]
  ): void => {
    if (!localPlayer || !targetPointerImage) {
      return;
    }

    const targetPoi = mission.status === "active" || mission.status === "unloading"
      ? findPoiById(mission.destinationId)
      : mission.status === "ready" || mission.status === "loading"
        ? findPoiById(mission.dispatchId)
        : null;

    if (!targetPoi) {
      return;
    }

    const deltaX = targetPoi.x - localPlayer.x;
    const deltaY = targetPoi.y - localPlayer.y;
    const iconRotation = Math.atan2(deltaY, deltaX) + Math.PI / 2;
    const iconHeight = 48;
    const iconWidth = iconHeight * (targetPointerImage.width / targetPointerImage.height);
    const centerX = width / 2;
    const centerY = 34;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(iconRotation);
    ctx.globalAlpha = 0.94;
    ctx.drawImage(targetPointerImage, -iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight);
    ctx.restore();
  };

  drawTargetIndicator(ctx, width, height, localPlayer, snapshot.mission);

  panel(ctx, 22, 22, 292, 132);
  ctx.fillStyle = "#f4f8ff";
  ctx.textAlign = "left";
  ctx.font = "700 17px Trebuchet MS";
  ctx.fillText("Mission", 42, 48);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = "#9bb3c5";
  const missionTitle = destination ? destination.label : "Dispatch";
  const winnerText = snapshot.team.winnerName ? `${snapshot.team.winnerName} wins the round` : null;
  const statusText = winnerText
    ?? (snapshot.mission.status === "ready"
      ? "Drive close to the sushi shop"
      : snapshot.mission.status === "loading"
        ? "Beladen laeuft"
        : snapshot.mission.status === "active"
          ? `Deliver to ${missionTitle}`
          : snapshot.mission.status === "unloading"
            ? `Entlade bei ${missionTitle}`
            : "Next order loading");
  ctx.fillText(statusText, 42, 72);
  const timingText = snapshot.mission.status === "loading" || snapshot.mission.status === "unloading"
    ? `Transfer ${snapshot.mission.transferRemaining.toFixed(1)}s`
    : snapshot.mission.status === "active"
      ? `Time ${snapshot.mission.timeRemaining.toFixed(0)}s`
      : `Goal ${snapshot.team.deliveriesToWin} deliveries`;
  ctx.fillText(timingText, 42, 94);
  ctx.fillText(`Total ${snapshot.team.score}  Orders ${snapshot.team.deliveries}  Danger ${snapshot.team.danger}`, 42, 116);
  if (snapshot.team.winnerName) {
    ctx.fillStyle = "#ffcf69";
    ctx.fillText(`Winner target reached: ${snapshot.team.deliveriesToWin}/${snapshot.team.deliveriesToWin}`, 42, 138);
  } else {
    ctx.fillStyle = "#9bb3c5";
    ctx.fillText(`Cargo ${snapshot.mission.cargoCount} sushi  Win at ${snapshot.team.deliveriesToWin}`, 42, 138);
  }

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

  const scoreboardPlayers = [...snapshot.players].sort((a, b) =>
    b.deliveriesCompleted - a.deliveriesCompleted || b.score - a.score || a.name.localeCompare(b.name)
  );
  const scoreboardHeight = 56 + scoreboardPlayers.length * 24 + (snapshot.team.winnerName ? 24 : 0);
  panel(ctx, width - 292, 92, 270, scoreboardHeight);
  ctx.fillStyle = "#f4f8ff";
  ctx.textAlign = "left";
  ctx.font = "700 15px Trebuchet MS";
  ctx.fillText("Multiplayer Scores", width - 272, 116);
  ctx.font = "12px Trebuchet MS";
  scoreboardPlayers.forEach((player, index) => {
    const y = 140 + index * 24;
    const isWinner = player.id === snapshot.team.winnerPlayerId;
    ctx.fillStyle = isWinner ? "#ffcf69" : player.id === localPlayerId ? "#58f0ff" : "#d7e7f5";
    ctx.fillText(`${index + 1}. ${player.name}`, width - 272, y);
    ctx.textAlign = "right";
    ctx.fillText(
      `${player.score} pts | ${player.deliveriesCompleted}/${snapshot.team.deliveriesToWin}`,
      width - 40,
      y
    );
    ctx.textAlign = "left";
  });
  if (snapshot.team.winnerName) {
    ctx.fillStyle = "#ffcf69";
    ctx.fillText(`Winner: ${snapshot.team.winnerName}`, width - 272, 140 + scoreboardPlayers.length * 24);
  }

  // Debug overlay
  panel(ctx, width - 222, 22, 200, 60);
  ctx.fillStyle = "#f4f8ff";
  ctx.textAlign = "left";
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillText("Debug", width - 202, 44);
  ctx.font = "12px Trebuchet MS";
  ctx.fillStyle = "#9bb3c5";
  ctx.fillText(`FPS: ${fps.toFixed(1)}`, width - 202, 62);
  ctx.fillText(`Server TPS: ${serverTickRate.toFixed(1)}`, width - 202, 78);
};
