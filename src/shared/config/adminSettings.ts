import { GAME_CONFIG } from "./gameConfig";
import type { AdminSettings } from "../model/types";

export type AdminSettingCategory = "difficulty" | "driving";
export type AdminSettingFormat = "multiplier" | "battery";

export interface AdminSettingDefinition {
  category: AdminSettingCategory;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  format: AdminSettingFormat;
}

export interface AdminCategoryDefinition {
  id: AdminSettingCategory;
  label: string;
  description: string;
}

export const ADMIN_SETTING_CATEGORIES: AdminCategoryDefinition[] = [
  {
    id: "difficulty",
    label: "Schwierigkeit",
    description: "Regelt Gegnerdruck, Schaden, Spawnrate und Ressourcenfluss der Runde."
  },
  {
    id: "driving",
    label: "Fahrphysik",
    description: "Tunt das Fahrverhalten deines Lieferwagens live, ohne die KI umzubauen."
  }
];

export const ADMIN_SETTING_ORDER: Array<keyof AdminSettings> = [
  "enemyHealthMultiplier",
  "enemyDamageMultiplier",
  "enemyCountMultiplier",
  "enemySpawnRateMultiplier",
  "enemyFireRateMultiplier",
  "chargeRateMultiplier",
  "playerDamageMultiplier",
  "playerMaxBattery",
  "playerSteeringMultiplier",
  "playerSpeedMultiplier",
  "playerBrakeMultiplier",
  "playerFrictionMultiplier",
  "playerAccelerationMultiplier"
];

export const ADMIN_SETTING_DEFS: Record<keyof AdminSettings, AdminSettingDefinition> = {
  enemyHealthMultiplier: {
    category: "difficulty",
    label: "Gegnerleben",
    description: "Skaliert die Huelle aller aktiven und neu gespawnten Gegner.",
    min: 0.4,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  enemyDamageMultiplier: {
    category: "difficulty",
    label: "Gegnerschaden",
    description: "Beeinflusst Projektilschaden, Rammschaden und Energieklau der Gegner.",
    min: 0.3,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  enemyCountMultiplier: {
    category: "difficulty",
    label: "Max Gegner",
    description: "Bestimmt, wie viele Gegner der Director gleichzeitig aktiv halten will.",
    min: 0.5,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  enemySpawnRateMultiplier: {
    category: "difficulty",
    label: "Spawnrate",
    description: "Hoeher bedeutet, dass neue Gegner schneller nachruecken.",
    min: 0.4,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  enemyFireRateMultiplier: {
    category: "difficulty",
    label: "Schussrate Gegner",
    description: "Verkuerzt die Feuerpausen der Gunner und Drain-Cooldowns.",
    min: 0.4,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  chargeRateMultiplier: {
    category: "difficulty",
    label: "Ladegeschwindigkeit",
    description: "Skaliert, wie schnell Fahrzeuge an Ladestationen und Boost-Lanes Akku zurueckbekommen.",
    min: 0.4,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  playerDamageMultiplier: {
    category: "difficulty",
    label: "Spielerschaden",
    description: "Skaliert den Schaden deiner Projektile gegen Gegner.",
    min: 0.4,
    max: 3,
    step: 0.1,
    format: "multiplier"
  },
  playerMaxBattery: {
    category: "difficulty",
    label: "Akku-Groesse",
    description: "Legt die maximale Batteriekapazitaet aller Spieler fest.",
    min: 40,
    max: 240,
    step: 5,
    format: "battery"
  },
  playerSteeringMultiplier: {
    category: "driving",
    label: "Lenkeinschlag",
    description: "Erhoeht oder reduziert, wie direkt dein Auto einlenkt.",
    min: 0.5,
    max: 2,
    step: 0.1,
    format: "multiplier"
  },
  playerSpeedMultiplier: {
    category: "driving",
    label: "Max Speed",
    description: "Skaliert Vorwaerts- und Rueckwaertsspitze des Spielerfahrzeugs.",
    min: 0.5,
    max: 2.2,
    step: 0.1,
    format: "multiplier"
  },
  playerBrakeMultiplier: {
    category: "driving",
    label: "Bremsstaerke",
    description: "Steuert, wie hart Shift das Fahrzeug abbremst.",
    min: 0.5,
    max: 2.5,
    step: 0.1,
    format: "multiplier"
  },
  playerFrictionMultiplier: {
    category: "driving",
    label: "Friktion / Grip",
    description: "Mehr Wert bedeutet mehr Haftung, weniger Slide und weniger Nachlaufen.",
    min: 0.6,
    max: 1.8,
    step: 0.1,
    format: "multiplier"
  },
  playerAccelerationMultiplier: {
    category: "driving",
    label: "Beschleunigung",
    description: "Skaliert Anzug und Rueckwaertsbeschleunigung des Spielerautos.",
    min: 0.5,
    max: 2.2,
    step: 0.1,
    format: "multiplier"
  }
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  enemyHealthMultiplier: 1,
  enemyDamageMultiplier: 1,
  enemyCountMultiplier: 1,
  enemySpawnRateMultiplier: 1,
  enemyFireRateMultiplier: 1,
  chargeRateMultiplier: 1,
  playerDamageMultiplier: 1,
  playerMaxBattery: GAME_CONFIG.player.maxBattery,
  playerSteeringMultiplier: 1,
  playerSpeedMultiplier: 1,
  playerBrakeMultiplier: 1,
  playerFrictionMultiplier: 1,
  playerAccelerationMultiplier: 1
};

export const clampAdminSetting = (key: keyof AdminSettings, value: number): number => {
  const definition = ADMIN_SETTING_DEFS[key];
  const clamped = Math.min(definition.max, Math.max(definition.min, value));
  const rounded = Math.round(clamped / definition.step) * definition.step;
  return Number(rounded.toFixed(definition.step < 1 ? 1 : 0));
};
