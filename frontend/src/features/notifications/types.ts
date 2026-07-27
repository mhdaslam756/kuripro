export const NOTIFICATION_CHANNELS = ["WHATSAPP", "SMS", "PUSH", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = ["REMINDER", "BIRTHDAY", "RECEIPT", "AUCTION", "WINNER", "CUSTOM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["QUEUED", "SENDING", "SENT", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_AUDIENCES = ["ALL_MEMBERS", "CHIT_GROUP", "OVERDUE", "BIRTHDAYS_TODAY", "CUSTOM_MEMBERS"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  ALL_MEMBERS: "All active members",
  CHIT_GROUP: "A specific chit group",
  OVERDUE: "Members with overdue payments",
  BIRTHDAYS_TODAY: "Members with a birthday today",
  CUSTOM_MEMBERS: "Hand-picked members",
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  PUSH: "Push",
  EMAIL: "Email",
};

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  memberId?: string;
  recipientName: string;
  recipientContact: string;
  templateId?: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  providerMessageId?: string;
  error?: string;
  sentAt?: string;
  batchId?: string;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: NotificationRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SendResult {
  queued: number;
  skipped: { reason: string; count: number }[];
  batchId?: string;
}

export interface ChannelAvailability {
  channel: NotificationChannel;
  configured: boolean;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  byChannel: { channel: string; count: number }[];
}

export interface NotificationMeta {
  channels: ChannelAvailability[];
  stats: NotificationStats;
}

/** Shape of the content shared by single + bulk send requests. */
export interface SendContentInput {
  templateId?: string;
  channel?: NotificationChannel;
  type?: NotificationType;
  subject?: string;
  body?: string;
  context?: Record<string, string>;
}

export interface SendSingleInput extends SendContentInput {
  memberId?: string;
  toContact?: string;
  toName?: string;
}

export interface SendBulkInput extends SendContentInput {
  audience: NotificationAudience;
  chitGroupId?: string;
  memberIds?: string[];
}
