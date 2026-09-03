import { EventEmitter } from "node:events";
import { logger } from "../../config/logger.js";

export interface LiveNotificationPayload {
  id: string;
  title: string;
  body: string;
  type: string;
  channel?: string;
  url?: string;
  createdAt?: string;
}

const notificationEmitter = new EventEmitter();
// Allow many simultaneous active client connections
notificationEmitter.setMaxListeners(200);

export function addNotificationListener(
  userId: string,
  listener: (payload: LiveNotificationPayload) => void,
): () => void {
  const eventName = `user:${userId}`;
  notificationEmitter.on(eventName, listener);
  return () => {
    notificationEmitter.off(eventName, listener);
  };
}

export function addMemberNotificationListener(
  memberId: string,
  listener: (payload: LiveNotificationPayload) => void,
): () => void {
  const eventName = `member:${memberId}`;
  notificationEmitter.on(eventName, listener);
  return () => {
    notificationEmitter.off(eventName, listener);
  };
}

export function emitNotificationToUser(userId: string, payload: LiveNotificationPayload): void {
  const eventName = `user:${userId}`;
  logger.info({ userId, eventName, title: payload.title }, "Emitting real-time notification to user");
  notificationEmitter.emit(eventName, payload);
}

export function emitNotificationToMember(memberId: string, payload: LiveNotificationPayload): void {
  const eventName = `member:${memberId}`;
  logger.info({ memberId, eventName, title: payload.title }, "Emitting real-time notification to member");
  notificationEmitter.emit(eventName, payload);
}

