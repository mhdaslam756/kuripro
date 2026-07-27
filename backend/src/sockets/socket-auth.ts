import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../types/auth.js";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./types.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function socketAuthMiddleware(socket: AppSocket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth["token"];
  if (typeof token !== "string" || !token) {
    next(new Error("Missing authentication token"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    socket.data.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      roleSlug: payload.roleSlug,
      permissions: payload.permissions,
    };
    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
}
