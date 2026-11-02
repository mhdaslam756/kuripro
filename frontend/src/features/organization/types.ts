export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export type InstallmentSettlementMode = "PENDING" | "IMMEDIATE";
export type CommissionOwnershipMode = "ORGANIZATION" | "PREVIOUS_MEMBER" | "REPLACEMENT_MEMBER" | "EQUAL_SPLIT" | "BY_CYCLES" | "FIXED_AMOUNT";
export type ReplacementFeeMode = "NONE" | "FIXED" | "PERCENTAGE";
export type CommissionCalculationBase = "TOTAL_COMMISSION" | "REMAINING_INSTALMENTS" | "PREVIOUS_MEMBER_PAID";

export type DisplacementCommissionMode = "CYCLE_BASED" | "CONTRIBUTION_BASED" | "CUSTOM_PERCENTAGE" | "FIXED_AMOUNT";
export type RemainingCommissionPolicy = "ORGANIZATION" | "PREVIOUS_MEMBER" | "REPLACEMENT_MEMBER";

export interface DisplacementCommissionSettings {
  commissionAllocationEnabled: boolean;
  displacementCommissionMode: DisplacementCommissionMode;
  previousMemberPercentage: number;
  replacementMemberPercentage: number;
  previousMemberFixedAmount: number;
  replacementMemberFixedAmount: number;
  remainingCommissionPolicy: RemainingCommissionPolicy;
  effectiveFrom?: string;
}

/** Stored in paise. Organisations that never saved these settings get none and use the defaults. */
export interface MemberReplacementSettings {
  installmentSettlementMode: InstallmentSettlementMode;
  commissionOwnershipMode: CommissionOwnershipMode;
  fixedCommissionAmount: number;
  replacementFeeMode: ReplacementFeeMode;
  replacementFeeAmount: number;
  replacementFeePercentage: number;
  commissionCalculationBase: CommissionCalculationBase;
  displacementCommission?: DisplacementCommissionSettings;
}

export interface OrganizationSettings {
  defaultForemanCommissionPercent: number;
  defaultMaxBidDiscountPercent: number;
  currency: string;
  financialYearStartMonth: number;
  memberReplacement?: MemberReplacementSettings;
}

export interface OrganizationSubscription {
  plan: "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  currentPeriodEnd: string;
}

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface BusinessHoursEntry {
  day: Weekday;
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: Address;
  settings: OrganizationSettings;
  subscription: OrganizationSubscription;
  businessHours: BusinessHoursEntry[];
  logoUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
}
