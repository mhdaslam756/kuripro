import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import { corsOrigins } from "../config/env.js";
import { logger } from "../config/logger.js";
import { socketAuthMiddleware } from "./socket-auth.js";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./types.js";

export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export type AppSocketIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function initSocketServer(httpServer: HttpServer): AppSocketIOServer {
  const io: AppSocketIOServer = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const { userId, tenantId } = socket.data.auth;

    if (tenantId) {
      socket.join(tenantRoom(tenantId));
    }

    logger.info({ userId, tenantId, socketId: socket.id }, "Socket connected");

    socket.on("disconnect", (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  return io;
}
