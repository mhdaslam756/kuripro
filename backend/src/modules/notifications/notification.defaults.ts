import type { NotificationChannel, NotificationType } from "./notification.constants.js";

export interface DefaultTemplate {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
}

/**
 * Starter templates seeded per organization on first use. They demonstrate the `{{variable}}` syntax
 * for each notification type and channel; organizers edit them or add their own in the Template Builder.
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Payment reminder (SMS)",
    type: "REMINDER",
    channel: "SMS",
    body: "Dear {{memberName}}, your installment of {{amount}} for {{chitGroupName}} is due on {{dueDate}}. Kindly pay on time. — {{orgName}}",
  },
  {
    name: "Payment reminder (Push)",
    type: "REMINDER",
    channel: "PUSH",
    subject: "Payment Reminder: {{chitGroupName}}",
    body: "Dear {{memberName}}, your installment of {{amount}} for {{chitGroupName}} is due on {{dueDate}}. Tap to pay on time. — {{orgName}}",
  },
  {
    name: "Payment reminder (WhatsApp)",
    type: "REMINDER",
    channel: "WHATSAPP",
    body: "Hi {{memberName}} 👋\nYour chit installment of *{{amount}}* for {{chitGroupName}} is due on {{dueDate}}.\nPlease pay to avoid a late fee.\n— {{orgName}}",
  },
  {
    name: "Birthday wishes (SMS)",
    type: "BIRTHDAY",
    channel: "SMS",
    body: "Happy Birthday {{memberName}}! 🎉 Wishing you health and prosperity in the year ahead. — {{orgName}}",
  },
  {
    name: "Birthday wishes (WhatsApp)",
    type: "BIRTHDAY",
    channel: "WHATSAPP",
    body: "🎂 Happy Birthday, {{memberName}}! 🎉\nWarmest wishes from all of us at {{orgName}}. May this year bring you great fortune!",
  },
  {
    name: "Collection receipt (SMS)",
    type: "RECEIPT",
    channel: "SMS",
    body: "Received {{amount}} towards {{chitGroupName}}. Receipt no: {{receiptNumber}}. Thank you, {{memberName}}. — {{orgName}}",
  },
  {
    name: "Auction announcement (WhatsApp)",
    type: "AUCTION",
    channel: "WHATSAPP",
    body: "📣 The auction for *{{chitGroupName}}* — cycle {{cycleNumber}} — is now open.\nJoin and place your bid before it closes.\n— {{orgName}}",
  },
  {
    name: "Prize winner (SMS)",
    type: "WINNER",
    channel: "SMS",
    body: "Congratulations {{memberName}}! 🏆 You won cycle {{cycleNumber}} of {{chitGroupName}} with a prize of {{prizeAmount}}. — {{orgName}}",
  },
  {
    name: "Monthly statement (Email)",
    type: "CUSTOM",
    channel: "EMAIL",
    subject: "Your {{chitGroupName}} statement",
    body: "Dear {{memberName}},\n\nThank you for being a valued member of {{chitGroupName}}. This is a note from {{orgName}}.\n\nWarm regards,\n{{orgName}}",
  },
];
