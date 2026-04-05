export interface VehicleSelectionStats {
  speed: number;
  battery: number;
  hull: number;
}

export interface VehicleOption {
  id: string;
  name: string;
  assetPath: string;
  accent: string;
  descriptions: string;
  stats: VehicleSelectionStats;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: "car-blue",
    name: "Azure",
    assetPath: "/assets/cars/CarBlue.png",
    accent: "#58f0ff",
    descriptions: "Ein ausgewogener Allrounder.",
    stats: { speed: 100, battery: 100, hull: 100 }
  },
  {
    id: "car-green",
    name: "Verge",
    assetPath: "/assets/cars/CarGreen.png",
    accent: "#9ef07f",
    descriptions: "Der Wagen setzt auf Top Speed zu Lasten von Batterie und Stabilität.",
    stats: { speed: 120, battery: 90, hull: 90 }
  },
  {
    id: "car-orange",
    name: "Ember",
    assetPath: "/assets/cars/CarOrange.png",
    accent: "#ffb347",
    descriptions: "Gebaut für hohe Batterielaufzeit zu Lasten von Höchstgeschwindigkeit und Stabilität.",
    stats: { speed: 90, battery: 120, hull: 90 }
  },
  {
    id: "car-purple",
    name: "Pulse",
    assetPath: "/assets/cars/CarPurple.png",
    accent: "#d38cff",
    descriptions: "Ein schweres stabiles Chassis, zu Lasten der Höchstgeschwindigkeit und Batterie Größe.",
    stats: { speed: 90, battery: 90, hull: 120 }
  },
  {
    id: "car-yellow",
    name: "Solar",
    assetPath: "/assets/cars/CarYellow.png",
    accent: "#ffe36a",
    descriptions: "Du willst einen Speedrun Rekord aufstellen, dass ist das dein Wagen!",
    stats: { speed: 110, battery: 110, hull: 80 }
  }
];
