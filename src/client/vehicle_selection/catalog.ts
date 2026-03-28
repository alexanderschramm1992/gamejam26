export interface VehicleSelectionStats {
  speed: number;
  handling: number;
  boost: number;
}

export interface VehicleOption {
  id: string;
  name: string;
  assetPath: string;
  accent: string;
  stats: VehicleSelectionStats;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: "audi-blue",
    name: "Audi Azure",
    assetPath: "/assets/cars/AudiBlue.png",
    accent: "#58f0ff",
    stats: { speed: 82, handling: 74, boost: 61 }
  },
  {
    id: "audi-green",
    name: "Audi Verge",
    assetPath: "/assets/cars/AudiGreen.png",
    accent: "#9ef07f",
    stats: { speed: 70, handling: 88, boost: 64 }
  },
  {
    id: "audi-orange",
    name: "Audi Ember",
    assetPath: "/assets/cars/AudiOrange.png",
    accent: "#ffb347",
    stats: { speed: 91, handling: 68, boost: 73 }
  },
  {
    id: "audi-purple",
    name: "Audi Pulse",
    assetPath: "/assets/cars/AudiPurple.png",
    accent: "#d38cff",
    stats: { speed: 78, handling: 80, boost: 86 }
  },
  {
    id: "audi-yellow",
    name: "Audi Solar",
    assetPath: "/assets/cars/AudiYellow.png",
    accent: "#ffe36a",
    stats: { speed: 84, handling: 72, boost: 92 }
  }
];
