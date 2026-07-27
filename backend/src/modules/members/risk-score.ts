import type { KycStatus, MemberRiskScoreFactor, RiskBand } from "./member.model.js";

export interface RiskScoreInputs {
  kycStatus: KycStatus;
  /** Installments that have reached their due date across all of the member's chit memberships. */
  duePastInstallments: number;
  /** Of those, how many were paid on or before their due date. */
  onTimePaidInstallments: number;
  /** Installments currently sitting in OVERDUE status. */
  overdueInstallments: number;
  hasDefaultedMembership: boolean;
  activeGuarantorCount: number;
  tenureDays: number;
}

export interface RiskScoreResult {
  value: number;
  band: RiskBand;
  factors: MemberRiskScoreFactor[];
}

const KYC_STATUS_POINTS: Record<KycStatus, number> = {
  VERIFIED: 0,
  PENDING: 15,
  NOT_SUBMITTED: 25,
  REJECTED: 30,
};

/**
 * Deterministic, explainable risk score — 0 (safest) to 100 (riskiest) — built from payment
 * punctuality, KYC completeness, default history, guarantor coverage, and tenure. Every point
 * contribution is returned as a labelled factor so a staff member can see exactly why a member
 * landed at a given score, rather than trusting an opaque model.
 */
export function computeRiskScore(inputs: RiskScoreInputs): RiskScoreResult {
  const factors: MemberRiskScoreFactor[] = [];

  const kycPoints = KYC_STATUS_POINTS[inputs.kycStatus];
  factors.push({ label: `KYC status: ${inputs.kycStatus}`, points: kycPoints });

  if (inputs.duePastInstallments > 0) {
    const latePct = 1 - inputs.onTimePaidInstallments / inputs.duePastInstallments;
    const punctualityPoints = Math.round(Math.max(0, latePct) * 30);
    factors.push({
      label: `Payment punctuality: ${inputs.onTimePaidInstallments}/${inputs.duePastInstallments} on time`,
      points: punctualityPoints,
    });
  } else {
    factors.push({ label: "No payment history yet", points: 10 });
  }

  if (inputs.overdueInstallments > 0) {
    const overduePoints = Math.min(inputs.overdueInstallments * 8, 25);
    factors.push({ label: `${inputs.overdueInstallments} installment(s) currently overdue`, points: overduePoints });
  }

  if (inputs.hasDefaultedMembership) {
    factors.push({ label: "Has defaulted on a chit group before", points: 25 });
  }

  if (inputs.activeGuarantorCount === 0) {
    factors.push({ label: "No active guarantor on file", points: 10 });
  }

  if (inputs.tenureDays > 365) {
    factors.push({ label: "Member for over a year", points: -5 });
  }

  const rawTotal = factors.reduce((sum, factor) => sum + factor.points, 0);
  const value = Math.min(100, Math.max(0, rawTotal));

  const band: RiskBand = value <= 30 ? "LOW" : value <= 60 ? "MEDIUM" : "HIGH";

  return { value, band, factors };
}
