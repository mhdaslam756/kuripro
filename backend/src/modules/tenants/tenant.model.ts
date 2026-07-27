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

export interface TenantSettings {
  defaultForemanCommissionPercent: number;
  defaultMaxBidDiscountPercent: number;
  currency: string;
  /** 1–12 — the calendar month the organization's financial year starts in (4 = April, the Indian FY convention). */
  financialYearStartMonth: number;
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

const tenantSettingsSchema = new Schema<TenantSettings>(
  {
    defaultForemanCommissionPercent: { type: Number, required: true, default: 5, min: 0, max: 100 },
    defaultMaxBidDiscountPercent: { type: Number, required: true, default: 40, min: 0, max: 100 },
    currency: { type: String, required: true, default: "INR" },
    financialYearStartMonth: { type: Number, required: true, default: 4, min: 1, max: 12 },
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
