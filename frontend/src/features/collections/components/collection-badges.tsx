import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { METHOD_LABELS, type CollectionStatus, type DueStatus, type PaymentMethod } from "../types";

const DUE_VARIANT: Record<DueStatus, BadgeProps["variant"]> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAIVED: "info",
};

export function DueStatusBadge({ status }: { status: DueStatus }) {
  return <Badge variant={DUE_VARIANT[status]}>{humanize(status)}</Badge>;
}

const COLLECTION_VARIANT: Record<CollectionStatus, BadgeProps["variant"]> = {
  COMPLETED: "success",
  PENDING_CLEARANCE: "warning",
  BOUNCED: "danger",
  CANCELLED: "neutral",
};

export function CollectionStatusBadge({ status }: { status: CollectionStatus }) {
  return <Badge variant={COLLECTION_VARIANT[status]}>{humanize(status)}</Badge>;
}

export function MethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge variant="neutral">{METHOD_LABELS[method]}</Badge>;
}
