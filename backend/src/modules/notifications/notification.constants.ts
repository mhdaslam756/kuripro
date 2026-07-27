export const NOTIFICATION_CHANNELS = ["WHATSAPP", "SMS", "PUSH", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = ["REMINDER", "BIRTHDAY", "RECEIPT", "AUCTION", "WINNER", "CUSTOM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["QUEUED", "SENDING", "SENT", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** Bulk-send audiences the service can resolve to a set of member recipients. */
export const NOTIFICATION_AUDIENCES = [
  "ALL_MEMBERS",
  "CHIT_GROUP",
  "OVERDUE",
  "BIRTHDAYS_TODAY",
  "CUSTOM_MEMBERS",
] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];
