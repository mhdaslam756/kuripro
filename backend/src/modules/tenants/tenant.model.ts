import { Schema, model, type HydratedDocument } from "mongoose";

import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const SUBSCRIPTION_PLANS = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"] as const;
export const SUBSCRIPTION_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;
export const TENANT_STATUSES = ["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED"] as const;
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type TenantStatus = (typeof TENANT_STATUSES)[number];
export type Weekday = (typeof WEEKDAYS)[number];

export interface TenantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export const INSTALLMENT_SETTLEMENT_MODES = ["PENDING", "IMMEDIATE"] as const;
export const COMMISSION_OWNERSHIP_MODES = ["ORGANIZATION", "PREVIOUS_MEMBER", "REPLACEMENT_MEMBER", "EQUAL_SPLIT", "BY_CYCLES", "FIXED_AMOUNT"] as const;
export const REPLACEMENT_FEE_MODES = ["NONE", "FIXED", "PERCENTAGE"] as const;
export const COMMISSION_CALCULATION_BASES = ["TOTAL_COMMISSION", "REMAINING_INSTALMENTS", "PREVIOUS_MEMBER_PAID"] as const;

export const DISPLACEMENT_COMMISSION_MODES = ["CYCLE_BASED", "CONTRIBUTION_BASED", "CUSTOM_PERCENTAGE", "FIXED_AMOUNT"] as const;
export const REMAINING_COMMISSION_POLICIES = ["ORGANIZATION", "PREVIOUS_MEMBER", "REPLACEMENT_MEMBER"] as const;

/** How a ticket's commission is divided between its successive holders. Amounts are paise; percentages have 2 decimals. */
export interface DisplacementCommissionSettings {
  commissionAllocationEnabled: boolean;
  displacementCommissionMode: (typeof DISPLACEMENT_COMMISSION_MODES)[number];
  previousMemberPercentage: number;
  replacementMemberPercentage: number;
  previousMemberFixedAmount: number;
  replacementMemberFixedAmount: number;
  remainingCommissionPolicy: (typeof REMAINING_COMMISSION_POLICIES)[number];
  /** The policy only applies to replacements made at or after this moment; earlier ones use the simple ownership mode. */
  effectiveFrom?: Date;
}

/** How a member replacement is settled, who owns the ticket's commission, and any fee the new member pays. Amounts are paise. */
export interface MemberReplacementSettings {
  installmentSettlementMode: (typeof INSTALLMENT_SETTLEMENT_MODES)[number];
  commissionOwnershipMode: (typeof COMMISSION_OWNERSHIP_MODES)[number];
  fixedCommissionAmount: number;
  replacementFeeMode: (typeof REPLACEMENT_FEE_MODES)[number];
  replacementFeeAmount: number;
  replacementFeePercentage: number;
  commissionCalculationBase: (typeof COMMISSION_CALCULATION_BASES)[number];
  /** When enabled (and effective) this replaces `commissionOwnershipMode` for the commission split. */
  displacementCommission?: DisplacementCommissionSettings;
}

export interface TenantSettings {
  defaultForemanCommissionPercent: number;
  defaultMaxBidDiscountPercent: number;
  currency: string;
  /** 1–12 — the calendar month the organization's financial year starts in (4 = April, the Indian FY convention). */
  financialYearStartMonth: number;
  /** Absent on organisations created before replacement settings existed — resolve with the defaults. */
  memberReplacement?: MemberReplacementSettings;
}

export interface TenantSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
}

export interface BusinessHoursEntry {
  day: Weekday;
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
}

export interface TenantDoc extends Timestamps {
  name: string;
  slug: string;
  customDomain?: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: TenantAddress;
  settings: TenantSettings;
  subscription: TenantSubscription;
  businessHours: BusinessHoursEntry[];
  logoUrl?: string;
  logoPublicId?: string;
  status: TenantStatus;
}

export type TenantDocument = HydratedDocument<TenantDoc>;

const addressSchema = new Schema<TenantAddress>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
  },
  { _id: false },
);

const displacementCommissionSchema = new Schema<DisplacementCommissionSettings>(
  {
    commissionAllocationEnabled: { type: Boolean, required: true, default: false },
    displacementCommissionMode: { type: String, enum: DISPLACEMENT_COMMISSION_MODES, required: true, default: "CYCLE_BASED" },
    previousMemberPercentage: { type: Number, required: true, default: 50, min: 0, max: 100 },
    replacementMemberPercentage: { type: Number, required: true, default: 50, min: 0, max: 100 },
    previousMemberFixedAmount: { type: Number, required: true, default: 0, min: 0 },
    replacementMemberFixedAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingCommissionPolicy: { type: String, enum: REMAINING_COMMISSION_POLICIES, required: true, default: "ORGANIZATION" },
    effectiveFrom: { type: Date },
  },
  { _id: false },
);

export const memberReplacementSchema = new Schema<MemberReplacementSettings>(
  {
    installmentSettlementMode: { type: String, enum: INSTALLMENT_SETTLEMENT_MODES, required: true, default: "PENDING" },
    commissionOwnershipMode: { type: String, enum: COMMISSION_OWNERSHIP_MODES, required: true, default: "ORGANIZATION" },
    fixedCommissionAmount: { type: Number, required: true, default: 0, min: 0 },
    replacementFeeMode: { type: String, enum: REPLACEMENT_FEE_MODES, required: true, default: "NONE" },
    replacementFeeAmount: { type: Number, required: true, default: 0, min: 0 },
    replacementFeePercentage: { type: Number, required: true, default: 0, min: 0, max: 100 },
    commissionCalculationBase: { type: String, enum: COMMISSION_CALCULATION_BASES, required: true, default: "TOTAL_COMMISSION" },
    displacementCommission: { type: displacementCommissionSchema },
  },
  { _id: false },
);

const tenantSettingsSchema = new Schema<TenantSettings>(
  {
    defaultForemanCommissionPercent: { type: Number, required: true, default: 5, min: 0, max: 100 },
    defaultMaxBidDiscountPercent: { type: Number, required: true, default: 40, min: 0, max: 100 },
    currency: { type: String, required: true, default: "INR" },
    financialYearStartMonth: { type: Number, required: true, default: 4, min: 1, max: 12 },
    memberReplacement: { type: memberReplacementSchema },
  },
  { _id: false },
);

const subscriptionSchema = new Schema<TenantSubscription>(
  {
    plan: { type: String, enum: SUBSCRIPTION_PLANS, required: true, default: "TRIAL" },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true, default: "TRIALING" },
    currentPeriodEnd: { type: Date, required: true },
  },
  { _id: false },
);

const businessHoursEntrySchema = new Schema<BusinessHoursEntry>(
  {
    day: { type: String, enum: WEEKDAYS, required: true },
    isOpen: { type: Boolean, required: true },
    opensAt: { type: String },
    closesAt: { type: String },
  },
  { _id: false },
);

/** Mon–Sat 09:00–18:00, closed Sunday — a reasonable default, editable per organization afterward. */
function defaultBusinessHours(): BusinessHoursEntry[] {
  return WEEKDAYS.map((day) =>
    day === "SUN"
      ? { day, isOpen: false }
      : { day, isOpen: true, opensAt: "09:00", closesAt: "18:00" },
  );
}

const tenantSchema = new Schema<TenantDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    customDomain: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    registrationNumber: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, required: true, trim: true },
    address: { type: addressSchema, required: true },
    settings: { type: tenantSettingsSchema, required: true, default: () => ({}) },
    subscription: { type: subscriptionSchema, required: true },
    businessHours: { type: [businessHoursEntrySchema], required: true, default: defaultBusinessHours },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    status: { type: String, enum: TENANT_STATUSES, required: true, default: "PENDING_APPROVAL" },
  },
  baseSchemaOptions,
);

tenantSchema.index({ registrationNumber: 1 }, { unique: true });

export const Tenant = model<TenantDoc>("Tenant", tenantSchema);
