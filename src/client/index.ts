import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "../shared/network/protocol";
import type { GameSnapshot } from "../shared/model/types";
import { lerp, wrapAngle } from "../shared/utils/math";
import { AdminMenu } from "./AdminMenu";
import { AudioMixer } from "./AudioMixer";
import { InputController } from "./InputController";
import {
  VehicleSelectionMenu,
  type VehicleSelectionConfirmation
} from "./vehicle_selection/VehicleSelectionMenu";
import {
  renderGame,
  type VisualCache,
  type VisualEntity,
  loadCarAsset,
  setLocalPlayerCarAsset
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
const input = new InputController();
const audio = new AudioMixer();
const adminMenu = new AdminMenu();
const vehicleMenu = new VehicleSelectionMenu();
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

const getViewportSize = (): { width: number; height: number } => ({
  width: Math.max(640, Math.floor(canvas.clientWidth || window.innerWidth)),
  height: Math.max(520, Math.floor(canvas.clientHeight || window.innerHeight * 0.7))
});

const formatPlayerName = (name: string, playerId: string): string => (
  playerId === adminPlayerId ? `*${name}` : name
);

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
  if (!vehicleSelectionConfirmed) {
    return;
  }

  adminMenu.setOpen(open);
  input.setEnabled(!open);
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
  statusEl.textContent = `${missionText}
${playerText}
score ${snapshot.team.score} | deliveries ${snapshot.team.deliveries} | danger ${snapshot.team.danger}`;

  const freshEvents = snapshot.recentEvents.filter((event) => event.id > lastRenderedEvent);
  if (freshEvents.length > 0) {
    audio.playEvents(freshEvents);
    lastRenderedEvent = freshEvents[freshEvents.length - 1].id;
  }

  feedEl.innerHTML = "";
  snapshot.recentEvents
    .slice()
    .reverse()
    .forEach((event) => {
      const item = document.createElement("li");
      item.textContent = event.text;
      feedEl.appendChild(item);
    });
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
  syncVisualMap(visuals.players, snapshot.players);
  syncVisualMap(visuals.enemies, snapshot.enemies);
  syncVisualMap(visuals.projectiles, snapshot.projectiles);
  updateOverlay();
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
  input.setEnabled(true);
  socket.emit("setPlayerName", playerName);
  void setLocalPlayerCarAsset(vehicle.assetPath);
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "Escape" || event.repeat || !vehicleSelectionConfirmed) {
    return;
  }

  setAdminMenuOpen(!adminMenu.isOpen());
  event.preventDefault();
});

window.addEventListener("blur", () => {
  setAdminMenuOpen(false);
});

const loop = (): void => {
  inputSequence += 1;
  socket.emit("input", input.snapshot(inputSequence));

  if (snapshot) {
    syncVisualMap(visuals.players, snapshot.players);
    syncVisualMap(visuals.enemies, snapshot.enemies);
    syncVisualMap(visuals.projectiles, snapshot.projectiles);
    renderGame(context, canvas, snapshot, localPlayerId, adminPlayerId, visuals, audio);
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
input.setEnabled(false);
vehicleMenu.setOpen(true);
loadCarAsset().catch((error) => console.warn("Car asset loading failed, using fallback:", error));
void setLocalPlayerCarAsset(vehicleMenu.getSelectedVehicle().assetPath).catch((error) =>
  console.warn("Vehicle selection asset loading failed, using fallback:", error)
);
requestAnimationFrame(loop);
