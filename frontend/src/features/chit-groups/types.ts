export const CHIT_GROUP_FREQUENCIES = ["WEEKLY", "MONTHLY", "TWICE_MONTHLY", "THREE_TIMES_MONTHLY", "CUSTOM"] as const;
export type ChitGroupFrequency = (typeof CHIT_GROUP_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<ChitGroupFrequency, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  TWICE_MONTHLY: "Twice monthly",
  THREE_TIMES_MONTHLY: "Three times monthly",
  CUSTOM: "Custom",
};

export const CHIT_GROUP_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type ChitGroupStatus = (typeof CHIT_GROUP_STATUSES)[number];

export const ALLOTMENT_METHODS = ["AUCTION", "LOTTERY"] as const;
export type AllotmentMethod = (typeof ALLOTMENT_METHODS)[number];

export const CYCLE_STATUSES = ["SCHEDULED", "BIDDING_OPEN", "BIDDING_CLOSED", "SETTLED"] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export interface AuctionRules {
  allotmentMethod: AllotmentMethod;
  foremanCommissionPercent: number;
  minBidDiscountPercent: number;
  maxBidDiscountPercent: number;
  bidIncrementPercent: number;
}

export interface ChitDocument {
  id: string;
  label: string;
  url: string;
  publicId: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ChitGroup {
  id: string;
  name: string;
  registrationNumber: string;
  chitValue: number;
  totalMembers: number;
  installmentAmount: number;
  frequency: ChitGroupFrequency;
  customIntervalDays?: number;
  startDate: string;
  endDate: string;
  auctionRules: AuctionRules;
  documents: ChitDocument[];
  termsAndConditions?: string;
  status: ChitGroupStatus;
  currentCycleNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedChitGroups {
  items: ChitGroup[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChitMembershipMember {
  /** Backend toJSON transforms _id → id; accept both for safety. */
  id?: string;
  _id?: string;
  name: string;
  memberCode: string;
  phone: string;
}

export interface ChitMembership {
  id: string;
  _id?: string;
  chitGroupId: string;
  memberId: ChitMembershipMember | string;
  ticketNumber: number;
  shareType?: "FULL" | "HALF";
  share?: number;
  subTicket?: string;
  status: "ACTIVE" | "DEFAULTED" | "EXITED";
  hasWon: boolean;
  joinedAt: string;
}

export interface PaginatedMemberships {
  items: ChitMembership[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CycleWinner {
  membershipId: string;
  name: string;
  memberCode: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: "FULL" | "HALF";
  share?: number;
  payoutAmount?: number;
}

export interface ChitCycle {
  id: string;
  cycleNumber: number;
  scheduledDate: string;
  status: CycleStatus;
  totalPotAmount: number;
  prizeAmount?: number;
  commissionAmount?: number;
  discountAmount?: number;
  dividendPerMember?: number;
  settledAt?: string;
  winner?: CycleWinner;
  coWinner?: CycleWinner;
}

export interface PaginatedCycles {
  items: ChitCycle[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ScheduleEntry {
  cycleNumber: number;
  scheduledDate: string;
  baseInstallment: number;
}

export interface ChitSummaryReport {
  chitGroup: {
    id: string;
    name: string;
    registrationNumber: string;
    chitValue: number;
    totalMembers: number;
    installmentAmount: number;
    frequency: string;
    frequencyLabel: string;
    startDate: string;
    endDate: string;
    status: string;
    allotmentMethod: string;
    foremanCommissionPercent: number;
  };
  roster: { enrolled: number; enrolledShares?: number; seatsRemaining: number };
  cycles: { total: number; scheduled: number; settled: number; currentCycleNumber: number };
  financials: {
    maxCommissionPerCycle: number;
    commissionCollectedToDate: number;
    prizesDisbursedToDate: number;
    dividendDistributedToDate: number;
  };
}

export interface BulkAssignResult {
  assigned: number;
  skipped: { memberId: string; reason: string }[];
}
