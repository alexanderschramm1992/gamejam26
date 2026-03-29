import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "../shared/network/protocol";
import type { GameSnapshot, PlayerState, WorldEvent } from "../shared/model/types";
import { lerp, wrapAngle, clamp } from "../shared/utils/math";
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
const drainBeams: DrainBeamVisual[] = [];
const tireTrackManager = new TireTrackManager();

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

const resize = (): void => {
  const viewport = getViewportSize();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const syncVisualMap = <T extends { id: string; x: number; y: number; rotation?: number }>(
  target: Map<string, VisualEntity>,
  entities: T[]
): void => {
  const validIds = new Set(entities.map((entity) => entity.id));
  for (const [id] of target) {
    if (!validIds.has(id)) {
      target.delete(id);
    }
  }

  for (const entity of entities) {
    const existing = target.get(entity.id);
    if (!existing) {
      target.set(entity.id, { x: entity.x, y: entity.y, rotation: entity.rotation ?? 0 });
      continue;
    }

    existing.x = lerp(existing.x, entity.x, 0.26);
    existing.y = lerp(existing.y, entity.y, 0.26);
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
    snapshot.mission.status === "ready"
      ? "Order waiting at dispatch"
      : snapshot.mission.status === "active"
        ? `Live order ${snapshot.mission.id}`
        : "Dispatch cooling down";
  const playerText = player
    ? `${formatPlayerName(player.name, player.id)} | hull ${player.health.toFixed(0)} | battery ${player.battery.toFixed(0)}`
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
  snapshot = nextSnapshot;
  updateOverlay();
  syncGameOverState(performance.now());
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

window.addEventListener("blur", () => {
  setAdminMenuOpen(false);
});

const loop = (): void => {
  const nowMs = performance.now();
  const localPlayer = findLocalPlayer(snapshot);
  const viewport = getViewportSize();
  const cameraX = clamp(localPlayer?.x ?? CITY_MAP.width / 2, viewport.width / 2, CITY_MAP.width - viewport.width / 2);
  const cameraY = clamp(localPlayer?.y ?? CITY_MAP.height / 2, viewport.height / 2, CITY_MAP.height - viewport.height / 2);
  const aimAngle = input.getAimAngle(localPlayer, cameraX, cameraY);
  inputSequence += 1;
  socket.emit("input", input.snapshot(inputSequence, aimAngle));
  pruneExpiredDrainBeams(nowMs);
  syncGameOverState(nowMs);

  if (snapshot) {
    syncVisualMap(visuals.players, snapshot.players);
    syncVisualMap(visuals.enemies, snapshot.enemies);
    syncVisualMap(visuals.projectiles, snapshot.projectiles);
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
