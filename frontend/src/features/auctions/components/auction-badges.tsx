import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import type { BidStatus, CycleStatus } from "../types";

const CYCLE_VARIANT: Record<CycleStatus, BadgeProps["variant"]> = {
  SCHEDULED: "neutral",
  BIDDING_OPEN: "warning",
  BIDDING_CLOSED: "info",
  SETTLED: "success",
};

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  return <Badge variant={CYCLE_VARIANT[status]}>{humanize(status)}</Badge>;
}

const BID_VARIANT: Record<BidStatus, BadgeProps["variant"]> = {
  ACTIVE: "neutral",
  WITHDRAWN: "neutral",
  WINNING: "success",
  LOST: "danger",
};

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return <Badge variant={BID_VARIANT[status]}>{humanize(status)}</Badge>;
}
