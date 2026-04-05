import type { AdminSettingsPatch, AdminState, GameSnapshot, PlayerInput } from "../model/types";

export interface ServerHello {
  playerId: string;
}

export interface ClientEvents {
  input: (input: PlayerInput) => void;
  setPlayerName: (name: string) => void;
  setPlayerVehicle: (vehicleId: string) => void;
  adminUpdateSettings: (patch: AdminSettingsPatch) => void;
}

export interface ServerEvents {
  hello: (payload: ServerHello) => void;
  snapshot: (payload: GameSnapshot) => void;
  adminState: (payload: AdminState) => void;
}
