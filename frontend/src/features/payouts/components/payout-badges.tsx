import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { METHOD_LABELS, type PaymentMethod, type PayoutStatus } from "../types";

const STATUS_VARIANT: Record<PayoutStatus, BadgeProps["variant"]> = {
  PENDING: "warning",
  PARTIALLY_PAID: "info",
  PAID: "success",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{humanize(status)}</Badge>;
}

export function MethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge variant="neutral">{METHOD_LABELS[method]}</Badge>;
}
