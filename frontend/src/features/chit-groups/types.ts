import { formatPaise } from "@/lib/format";

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

export const COMMISSION_MODES = ["PERCENT", "AMOUNT"] as const;
export type CommissionMode = (typeof COMMISSION_MODES)[number];

export interface AuctionRules {
  allotmentMethod: AllotmentMethod;
  /** PERCENT = % of the pot each cycle; AMOUNT = fixed amount (paise) each cycle. */
  foremanCommissionMode: CommissionMode;
  foremanCommissionPercent: number;
  /** Paise. Used when the mode is AMOUNT. */
  foremanCommissionAmount: number;
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
    foremanCommissionMode: CommissionMode;
    foremanCommissionAmount: number;
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

/** Human label for a group's commission — "5%" or a fixed "₹2,000 / cycle". */
export function formatCommission(rules: {
  foremanCommissionMode?: CommissionMode;
  foremanCommissionPercent: number;
  foremanCommissionAmount?: number;
}): string {
  return rules.foremanCommissionMode === "AMOUNT"
    ? `${formatPaise(rules.foremanCommissionAmount ?? 0)} / cycle`
    : `${rules.foremanCommissionPercent}%`;
}

// --- Member replacement & exit settlement ---

export interface MemberRef {
  id: string;
  name: string;
  memberCode: string;
  phone: string;
}

export interface ReplacementPaymentRow {
  cycleNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  /** True for cycles the new member takes over (from the effective cycle on). */
  handedOver: boolean;
}

export interface PreviousMemberSnapshot {
  instalmentsDue: number;
  instalmentsPaid: number;
  totalDue: number;
  totalPaid: number;
  pendingDues: number;
  prepaidAmount: number;
}

export interface ReplacementSettlement {
  status: "PENDING" | "SETTLED";
  pendingDues: number;
  refundAmount: number;
  deductionAmount: number;
  deductionReason?: string;
  netAmount: number;
  notes?: string;
  settledAmount?: number;
  method?: string;
  settledAt?: string;
}

export interface RemainingInstalment {
  cycleNumber: number;
  scheduledDate: string;
  amount: number;
  basis: "RAISED" | "NET_OF_DIVIDEND" | "ESTIMATE";
}

export interface ReplacementPreview {
  slot: { ticketNumber: number; subTicket: string | null; label: string; shareType: "FULL" | "HALF"; share: number };
  previous: {
    membershipId: string;
    member: MemberRef | null;
    joinedAt: string;
    effectiveFromCycleNumber: number;
    hasWon: boolean;
    snapshot: PreviousMemberSnapshot;
    payments: ReplacementPaymentRow[];
  };
  effective: { cycleNumber: number; scheduledDate: string | null; minCycleNumber: number; maxCycleNumber: number };
  newMember: { member: MemberRef | null; remainingInstalments: number; totalPayable: number; schedule: RemainingInstalment[] };
  settlement: ReplacementSettlement;
}

export interface ReplaceMemberInput {
  newMemberId: string;
  effectiveCycleNumber: number;
  reason?: string;
  settlement: {
    refundAmountRupees?: number;
    deductionAmountRupees: number;
    deductionReason?: string;
    notes?: string;
  };
}

export interface MembershipHistoryEntry {
  membershipId: string;
  status: "ACTIVE" | "DEFAULTED" | "EXITED";
  member: MemberRef | null;
  joinedAt: string;
  fromCycleNumber: number;
  toCycleNumber: number | null;
  exitedAt: string | null;
  exitReason: string | null;
  hasWon: boolean;
  account: { totalDue: number; totalPaid: number; instalments: number; paidInstalments: number };
  replacement: { id: string; effectiveCycleNumber: number; settlement: ReplacementSettlement } | null;
}

export interface MembershipHistorySlot {
  ticketNumber: number;
  subTicket: string | null;
  label: string;
  entries: MembershipHistoryEntry[];
}
