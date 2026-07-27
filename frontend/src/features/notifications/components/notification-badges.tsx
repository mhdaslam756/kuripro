import { Mail, MessageCircle, MessageSquare, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { CHANNEL_LABELS, type NotificationChannel, type NotificationStatus } from "../types";

const CHANNEL_ICON: Record<NotificationChannel, typeof Mail> = {
  WHATSAPP: MessageCircle,
  SMS: MessageSquare,
  PUSH: Smartphone,
  EMAIL: Mail,
};

export function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
      <Icon className="size-3.5" aria-hidden />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

const STATUS_VARIANT: Record<NotificationStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  QUEUED: "info",
  SENDING: "warning",
  SENT: "success",
  FAILED: "danger",
};

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{humanize(status)}</Badge>;
}
