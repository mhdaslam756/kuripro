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
  memberId: string;
  name: string;
  memberCode: string;
  hasActiveBid: boolean;
  hasPaidCurrentCycle?: boolean;
  isEligibleForAuction?: boolean;
}

export interface AuctionSettlement {
  winner: { membershipId: string; ticketNumber: number; name: string; memberCode: string };
  discountAmount: number;
  commissionAmount: number;
  dividendPerMember: number;
  prizeAmount: number;
  payoutStatus: string;
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
