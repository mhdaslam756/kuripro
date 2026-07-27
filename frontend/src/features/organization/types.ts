export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OrganizationSettings {
  defaultForemanCommissionPercent: number;
  defaultMaxBidDiscountPercent: number;
  currency: string;
  financialYearStartMonth: number;
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
