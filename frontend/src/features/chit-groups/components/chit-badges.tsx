import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import type { ChitGroupStatus, CycleStatus } from "../types";

const STATUS_VARIANT: Record<ChitGroupStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  COMPLETED: "info",
  CANCELLED: "danger",
};

export function ChitStatusBadge({ status }: { status: ChitGroupStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{humanize(status)}</Badge>;
}

const CYCLE_VARIANT: Record<CycleStatus, BadgeProps["variant"]> = {
  SCHEDULED: "neutral",
  BIDDING_OPEN: "warning",
  BIDDING_CLOSED: "info",
  SETTLED: "success",
};

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  return <Badge variant={CYCLE_VARIANT[status]}>{humanize(status)}</Badge>;
}
