import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "../shared/network/protocol";
import type { GameSnapshot, PlayerInput, PlayerState, WorldEvent } from "../shared/model/types";
import { lerp, wrapAngle, clamp } from "../shared/utils/math";
import { GAME_CONFIG } from "../shared/config/gameConfig";
import { CITY_MAP } from "../shared/map/cityMap";
import { AdminMenu } from "./AdminMenu";
import { AudioMixer } from "./AudioMixer";
import { InputController } from "./InputController";
import { GameOverOverlay } from "./GameOverOverlay";
import { loadStreetTiles } from "./StreetTileRenderer";
import { TireTrackManager } from "./TireTrackRenderer";
import {
  VehicleSelectionMenu,
  type VehicleSelectionConfirmation
} from "./vehicle_selection/VehicleSelectionMenu";
import {
  renderGame,
  type DrainBeamVisual,
  type VisualCache,
  type VisualEntity,
  loadCarAsset,
  setLocalPlayerCarAsset,
  loadBuildingAssets,
  loadHudAssets
} from "./render";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const statusEl = document.getElementById("status");
const feedEl = document.getElementById("feed");

if (!canvas || !statusEl || !feedEl) {
  throw new Error("Missing client DOM nodes.");
}

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("Canvas 2D context unavailable.");
}

const socket: Socket<ServerEvents, ClientEvents> = io();
const input = new InputController(canvas);
const audio = new AudioMixer();
const adminMenu = new AdminMenu();
const vehicleMenu = new VehicleSelectionMenu();
const gameOverOverlay = new GameOverOverlay();
const visuals: VisualCache = {
  players: new Map<string, VisualEntity>(),
  enemies: new Map<string, VisualEntity>(),
  projectiles: new Map<string, VisualEntity>()
};

let localPlayerId: string | null = null;
let adminPlayerId: string | null = null;
let snapshot: GameSnapshot | null = null;
let inputSequence = 0;
let lastRenderedEvent = 0;
let vehicleSelectionConfirmed = false;
let wasLocalPlayerDestroyed = false;
let lastStatusText = "";
let lastFeedSignature = "";
let lastSnapshotReceivedAtMs = performance.now();
const drainBeams: DrainBeamVisual[] = [];
const tireTrackManager = new TireTrackManager();

// Debug overlay variables
let lastFrameTime = 0;
let fps = 0;
let serverTickRate = 0;
let lastTick = 0;
let lastTickTime = 0;
let lastInputSentAtMs = 0;
let lastSentInput: PlayerInput | null = null;

const getViewportSize = (): { width: number; height: number } => ({
  width: Math.max(640, Math.floor(canvas.clientWidth || window.innerWidth)),
  height: Math.max(520, Math.floor(canvas.clientHeight || window.innerHeight * 0.7))
});

const formatPlayerName = (name: string, playerId: string): string => (
  playerId === adminPlayerId ? `*${name}` : name
);

const findLocalPlayer = (currentSnapshot: GameSnapshot | null): PlayerState | null =>
  currentSnapshot?.players.find((candidate) => candidate.id === localPlayerId) ?? null;

const updateInputEnabled = (): void => {
  input.setEnabled(vehicleSelectionConfirmed && !adminMenu.isOpen() && !gameOverOverlay.isOpen());
};

const shouldSendInput = (nextInput: PlayerInput, nowMs: number): boolean => {
  const sendIntervalMs = 1000 / GAME_CONFIG.tickRate;
  if (nowMs - lastInputSentAtMs >= sendIntervalMs) {
    return true;
  }

  if (!lastSentInput) {
    return true;
  }

  return (
    nextInput.shoot !== lastSentInput.shoot ||
    nextInput.interact !== lastSentInput.interact ||
    nextInput.handbrake !== lastSentInput.handbrake ||
    nextInput.throttle !== lastSentInput.throttle ||
    nextInput.steer !== lastSentInput.steer
  );
};

const resize = (): void => {
  const viewport = getViewportSize();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const syncVisualMap = <T extends { id: string; x: number; y: number; vx?: number; vy?: number; rotation?: number }>(
  target: Map<string, VisualEntity>,
  entities: T[],
  nowMs: number
): void => {
  const validIds = new Set(entities.map((entity) => entity.id));
  for (const [id] of target) {
    if (!validIds.has(id)) {
      target.delete(id);
    }
  }

  const snapshotAgeSeconds = clamp(
    (nowMs - lastSnapshotReceivedAtMs) / 1000,
    0,
    2 / GAME_CONFIG.snapshotRate
  );

  for (const entity of entities) {
    const targetX = entity.x + (entity.vx ?? 0) * snapshotAgeSeconds;
    const targetY = entity.y + (entity.vy ?? 0) * snapshotAgeSeconds;
    const existing = target.get(entity.id);
    if (!existing) {
      target.set(entity.id, { x: targetX, y: targetY, rotation: entity.rotation ?? 0 });
      continue;
    }

    existing.x = lerp(existing.x, targetX, 0.26);
    existing.y = lerp(existing.y, targetY, 0.26);
    const rotation = entity.rotation ?? 0;
    existing.rotation += wrapAngle(rotation - existing.rotation) * 0.24;
  }
};

const setAdminMenuOpen = (open: boolean): void => {
  if (!vehicleSelectionConfirmed || gameOverOverlay.isOpen()) {
    return;
  }

  adminMenu.setOpen(open);
  updateInputEnabled();
};

const createDrainBeamFromEvent = (event: WorldEvent): void => {
  if (event.type !== "drain" || event.x === undefined || event.y === undefined || event.sourceX === undefined || event.sourceY === undefined) {
    return;
  }

  drainBeams.push({
    sourceX: event.sourceX,
    sourceY: event.sourceY,
    targetX: event.x,
    targetY: event.y,
    expiresAt: performance.now() + 180
  });
};

const pruneExpiredDrainBeams = (nowMs: number): void => {
  for (let index = drainBeams.length - 1; index >= 0; index -= 1) {
    if (drainBeams[index] && drainBeams[index].expiresAt <= nowMs) {
      drainBeams.splice(index, 1);
    }
  }
};

const syncGameOverState = (nowMs: number): void => {
  const localPlayer = findLocalPlayer(snapshot);

  if (!vehicleSelectionConfirmed || !localPlayer) {
    wasLocalPlayerDestroyed = false;
    if (gameOverOverlay.isOpen()) {
      gameOverOverlay.hide();
    }
    updateInputEnabled();
    return;
  }

  if (localPlayer.destroyed && !wasLocalPlayerDestroyed) {
    adminMenu.setOpen(false);
    gameOverOverlay.show({
      respawnTimer: localPlayer.respawnTimer
    });
  }

  gameOverOverlay.update(nowMs);
  if (gameOverOverlay.isOpen()) {
    gameOverOverlay.setRespawnState(!localPlayer.destroyed, localPlayer.respawnTimer);
  }

  wasLocalPlayerDestroyed = localPlayer.destroyed;
  updateInputEnabled();
};

const updateOverlay = (): void => {
  if (!snapshot) {
    statusEl.textContent = "Verbinde mit Server...";
    return;
  }

  const player = snapshot.players.find((candidate) => candidate.id === localPlayerId);
  const missionText =
    snapshot.team.winnerName
      ? `Winner ${snapshot.team.winnerName}`
      : snapshot.mission.status === "ready"
        ? "Order waiting at sushi shop"
        : snapshot.mission.status === "loading"
          ? "Order is loading"
          : snapshot.mission.status === "active"
            ? `Live order ${snapshot.mission.id}`
            : snapshot.mission.status === "unloading"
              ? "Order is unloading"
              : "Dispatch cooling down";
  const playerText = player
    ? `${formatPlayerName(player.name, player.id)} | hull ${player.health.toFixed(0)} | battery ${player.battery.toFixed(0)} | points ${player.score} | deliveries ${player.deliveriesCompleted}/${snapshot.team.deliveriesToWin}`
    : "Spectating sync";
  const nextStatusText = `${missionText}
${playerText}
score ${snapshot.team.score} | deliveries ${snapshot.team.deliveries} | danger ${snapshot.team.danger}`;
  if (nextStatusText !== lastStatusText) {
    statusEl.textContent = nextStatusText;
    lastStatusText = nextStatusText;
  }

  const freshEvents = snapshot.recentEvents.filter((event) => event.id > lastRenderedEvent);
  if (freshEvents.length > 0) {
    freshEvents.forEach(createDrainBeamFromEvent);
    audio.playEvents(freshEvents);
    lastRenderedEvent = freshEvents[freshEvents.length - 1].id;
  }

  const feedSignature = snapshot.recentEvents.map((event) => event.id).join(",");
  if (feedSignature !== lastFeedSignature) {
    feedEl.innerHTML = "";
    snapshot.recentEvents
      .slice()
      .reverse()
      .forEach((event) => {
        const item = document.createElement("li");
        item.textContent = event.text;
        feedEl.appendChild(item);
      });
    lastFeedSignature = feedSignature;
  }
};

socket.on("hello", ({ playerId }) => {
  localPlayerId = playerId;
});

socket.on("adminState", (state) => {
  adminPlayerId = state.adminPlayerId;
  adminMenu.applyState(state);
  updateOverlay();
});

socket.on("snapshot", (nextSnapshot) => {
  const nowMs = performance.now();

  // Calculate server tick rate
  if (lastTick > 0 && lastTickTime > 0) {
    const tickDelta = nextSnapshot.tick - lastTick;
    const timeDelta = nowMs - lastTickTime;
    if (timeDelta > 0) {
      serverTickRate = (tickDelta / timeDelta) * 1000; // ticks per second
    }
  }
  lastTick = nextSnapshot.tick;
  lastTickTime = nowMs;
  lastSnapshotReceivedAtMs = nowMs;

  snapshot = nextSnapshot;
  updateOverlay();
  syncGameOverState(nowMs);
});

adminMenu.onUpdate((patch) => {
  socket.emit("adminUpdateSettings", patch);
});
adminMenu.onCloseRequest(() => {
  setAdminMenuOpen(false);
});

vehicleMenu.onConfirm(({ vehicle, playerName }: VehicleSelectionConfirmation) => {
  vehicleSelectionConfirmed = true;
  vehicleMenu.setOpen(false);
  audio.startGameMusic();
  updateInputEnabled();
  socket.emit("setPlayerName", playerName);
  void setLocalPlayerCarAsset(vehicle.assetPath);
});

gameOverOverlay.onRestart(() => {
  gameOverOverlay.hide();
  updateInputEnabled();
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "Escape" || event.repeat || !vehicleSelectionConfirmed || gameOverOverlay.isOpen()) {
    return;
  }

  setAdminMenuOpen(!adminMenu.isOpen());
  event.preventDefault();
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "KeyH" || event.repeat || !vehicleSelectionConfirmed || gameOverOverlay.isOpen()) {
    return;
  }

  audio.playHonk();
  event.preventDefault();
});

window.addEventListener("blur", () => {
  setAdminMenuOpen(false);
});

const loop = (): void => {
  const nowMs = performance.now();
  
  // Calculate FPS
  if (lastFrameTime > 0) {
    const deltaTime = nowMs - lastFrameTime;
    fps = 1000 / deltaTime;
  }
  lastFrameTime = nowMs;
  
  const localPlayer = findLocalPlayer(snapshot);
  const viewport = getViewportSize();
  const cameraX = clamp(localPlayer?.x ?? CITY_MAP.width / 2, viewport.width / 2, CITY_MAP.width - viewport.width / 2);
  const cameraY = clamp(localPlayer?.y ?? CITY_MAP.height / 2, viewport.height / 2, CITY_MAP.height - viewport.height / 2);
  const aimAngle = input.getAimAngle(localPlayer, cameraX, cameraY);
  inputSequence += 1;
  const nextInput = input.snapshot(inputSequence, aimAngle);
  if (shouldSendInput(nextInput, nowMs)) {
    socket.emit("input", nextInput);
    lastInputSentAtMs = nowMs;
    lastSentInput = nextInput;
  }
  pruneExpiredDrainBeams(nowMs);
  syncGameOverState(nowMs);

  if (snapshot) {
    syncVisualMap(visuals.players, snapshot.players, nowMs);
    syncVisualMap(visuals.enemies, snapshot.enemies, nowMs);
    syncVisualMap(visuals.projectiles, snapshot.projectiles, nowMs);
    tireTrackManager.updateTracks(snapshot.players, nowMs);
    const tireTracks = tireTrackManager.getMarks();
    
    renderGame(context, canvas, snapshot, localPlayerId, adminPlayerId, visuals, audio, drainBeams, tireTracks, nowMs, aimAngle);
  } else {
    const viewport = getViewportSize();
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#e8f2ff";
    context.font = "700 28px Trebuchet MS";
    context.fillText("Connecting to dispatch...", 48, 80);
  }

  requestAnimationFrame(loop);
};

window.addEventListener("resize", resize);
resize();
updateOverlay();
updateInputEnabled();
vehicleMenu.setOpen(true);
loadCarAsset().catch((error: unknown) => console.warn("Car asset loading failed, using fallback:", error));
loadStreetTiles().catch((error: unknown) => console.warn("Street tiles loading failed, using fallback:", error));
loadBuildingAssets().catch((error: unknown) => console.warn("Building asset loading failed, using fallback:", error));
loadHudAssets().catch((error: unknown) => console.warn("HUD asset loading failed, using fallback:", error));
void setLocalPlayerCarAsset(vehicleMenu.getSelectedVehicle().assetPath).catch((error: unknown) =>
  console.warn("Vehicle selection asset loading failed, using fallback:", error)
);
requestAnimationFrame(loop);
