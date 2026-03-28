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
    id: "car-blue",
    name: "Car Azure",
    assetPath: "/assets/cars/CarBlue.png",
    accent: "#58f0ff",
    stats: { speed: 82, handling: 74, boost: 61 }
  },
  {
    id: "car-green",
    name: "Car Verge",
    assetPath: "/assets/cars/CarGreen.png",
    accent: "#9ef07f",
    stats: { speed: 70, handling: 88, boost: 64 }
  },
  {
    id: "car-orange",
    name: "Car Ember",
    assetPath: "/assets/cars/CarOrange.png",
    accent: "#ffb347",
    stats: { speed: 91, handling: 68, boost: 73 }
  },
  {
    id: "car-purple",
    name: "Car Pulse",
    assetPath: "/assets/cars/CarPurple.png",
    accent: "#d38cff",
    stats: { speed: 78, handling: 80, boost: 86 }
  },
  {
    id: "car-yellow",
    name: "Car Solar",
    assetPath: "/assets/cars/CarYellow.png",
    accent: "#ffe36a",
    stats: { speed: 84, handling: 72, boost: 92 }
  }
];
