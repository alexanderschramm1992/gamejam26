import type { GameSnapshot, PlayerInput } from "../model/types";

export interface ServerHello {
  playerId: string;
}

export interface ClientEvents {
  input: (input: PlayerInput) => void;
}

export interface ServerEvents {
  hello: (payload: ServerHello) => void;
  snapshot: (payload: GameSnapshot) => void;
}
