export const CYCLE_STATUSES = ["SCHEDULED", "BIDDING_OPEN", "BIDDING_CLOSED", "SETTLED"] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const WINNER_SELECTION_METHODS = ["LOWEST_BID", "MANUAL", "LOTTERY"] as const;
export type WinnerSelectionMethod = (typeof WINNER_SELECTION_METHODS)[number];

export const BID_STATUSES = ["ACTIVE", "WITHDRAWN", "WINNING", "LOST"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export interface BidMember {
  _id: string;
  name: string;
  memberCode: string;
}
export interface BidMembership {
  _id: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: "FULL" | "HALF";
  share?: number;
  memberId: BidMember;
}
export interface Bid {
  id: string;
  chitCycleId: string;
  chitMembershipId: BidMembership;
  discountAmount: number;
  discountPercent: number;
  status: BidStatus;
  submittedAt: string;
}

export interface EligibleMember {
  membershipId: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: "FULL" | "HALF";
  share?: number;
  memberId: string;
  name: string;
  memberCode: string;
  hasActiveBid: boolean;
  hasPaidCurrentCycle?: boolean;
  isEligibleForAuction?: boolean;
}

export interface AuctionWinnerSummary {
  membershipId: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: string;
  share?: number;
  name: string;
  memberCode: string;
  payoutAmount?: number;
  /** Prize before the previous member's refund was taken out of it. */
  grossPayoutAmount?: number;
  /** Refund to the previous member taken out of this prize (paise); 0 when paid separately. */
  refundDeducted?: number;
  joinedFromCycle?: number;
}

export interface ExitSettlement {
  replacementId: string;
  previousMemberName: string;
  previousMemberCode: string;
  slotLabel: string;
  effectiveCycleNumber: number;
  totalPaid: number;
  refundAmount: number;
  pendingDues: number;
  deductionAmount: number;
  netAmount: number;
  /** What the previous member is owed in total. */
  entitlement?: number;
  /** Already paid out; counted as distributed and never paid again. */
  previouslyPaid?: number;
  /** The part of the prize set aside for this refund (0 if the ticket has not won since). */
  prizeAllocation?: number;
  /** What still has to be paid at settlement. */
  remainingPayable?: number;
  /** Entitlement the prize could not cover; stays outstanding and needs a financial review. */
  shortfall?: number;
  status: "PENDING" | "SETTLED";
  settledAmount: number | null;
  settledAt: string | null;
}

export interface AuctionSettlement {
  winner: AuctionWinnerSummary;
  coWinner?: AuctionWinnerSummary;
  discountAmount: number;
  commissionAmount: number;
  dividendPerMember: number;
  prizeAmount: number;
  payoutStatus: string;
  /** Refunds for members who held the winning ticket before the current holder. */
  exitSettlements?: ExitSettlement[];
  payouts: {
    id: string;
    chitMembershipId: string;
    amount: number;
    amountPaid: number;
    remaining: number;
    status: string;
  }[];
}

export interface AuctionState {
  cycle: {
    id: string;
    cycleNumber: number;
    status: CycleStatus;
    scheduledDate: string;
    potAmount: number;
    settledAt?: string;
  };
  chitGroup: {
    id: string;
    name: string;
    allotmentMethod: "AUCTION" | "LOTTERY";
    foremanCommissionPercent: number;
    foremanCommissionMode?: "PERCENT" | "AMOUNT";
    foremanCommissionAmount?: number;
    minBidDiscountPercent: number;
    maxBidDiscountPercent: number;
    installmentAmount: number;
    totalMembers: number;
  };
  settlement?: AuctionSettlement;
  eligibleMembers: EligibleMember[];
  canRepick: boolean;
}

export interface AuctionEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SettlementSummary {
  cycleNumber: number;
  method: string;
  winner: { membershipId: string; ticketNumber: number; name: string; memberCode: string };
  potAmount: number;
  discountAmount: number;
  commissionAmount: number;
  dividendPerMember: number;
  prizeAmount: number;
}
