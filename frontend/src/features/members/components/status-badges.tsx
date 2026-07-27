import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import type { KycStatus, MemberStatus, RiskBand } from "../types";

const MEMBER_STATUS_VARIANT: Record<MemberStatus, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLACKLISTED: "danger",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return <Badge variant={MEMBER_STATUS_VARIANT[status]}>{humanize(status)}</Badge>;
}

const KYC_STATUS_VARIANT: Record<KycStatus, BadgeProps["variant"]> = {
  NOT_SUBMITTED: "neutral",
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

export function KycStatusBadge({ status }: { status: KycStatus }) {
  return <Badge variant={KYC_STATUS_VARIANT[status]}>{humanize(status)}</Badge>;
}

const RISK_BAND_VARIANT: Record<RiskBand, BadgeProps["variant"]> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export function RiskBandBadge({ band, value }: { band: RiskBand; value?: number }) {
  return (
    <Badge variant={RISK_BAND_VARIANT[band]}>
      {humanize(band)} risk{value !== undefined ? ` · ${value}` : ""}
    </Badge>
  );
}
