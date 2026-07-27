import type { NotificationChannel } from "../notification.constants.js";

export interface ChannelMessage {
  /** Destination — phone number, email address, or FCM device token depending on the channel. */
  to: string;
  subject?: string;
  body: string;
}

export interface ChannelSendResult {
  providerMessageId?: string;
}

/**
 * A delivery adapter for one channel. `isConfigured` reflects whether the provider's credentials are
 * present; `send` performs the real provider call and is only invoked when configured (the dispatch
 * layer handles the dormant/dev-console case uniformly, so adapters stay focused on the real API).
 */
export interface Channel {
  channel: NotificationChannel;
  isConfigured: boolean;
  send(message: ChannelMessage): Promise<ChannelSendResult>;
}
