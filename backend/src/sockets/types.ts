import type { AuthContext } from "../types/auth.js";

export interface ClientToServerEvents {
  // Populated as real-time features (live bidding, etc.) are added.
}

export interface ServerToClientEvents {
  // Populated as real-time features (live bidding, etc.) are added.
}

export interface InterServerEvents {
  // Populated if the server is ever scaled across multiple Socket.io instances.
}

export interface SocketData {
  auth: AuthContext;
}
