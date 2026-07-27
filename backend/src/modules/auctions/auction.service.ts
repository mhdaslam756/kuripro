import { randomInt } from "node:crypto";

import mongoose from "mongoose";

import {
  createBid,
  findActiveBidForMembership,
  findBidById,
  findWinningBid,
  listBidsByCycle,
  saveBid,
  setBidStatus,
  updateBidStatusesForCycle,
} from "../bids/bid.repository.js";
import type { BidDocument } from "../bids/bid.model.js";
import { findChitGroupById, saveChitGroup } from "../chit-groups/chit-group.repository.js";
import type { ChitGroupDocument } from "../chit-groups/chit-group.model.js";
import {
  findChitMembershipById,
  listActiveMembershipsByGroup,
  saveChitMembership,
} from "../chit-groups/chit-membership.repository.js";
import type { ChitMembershipDocument } from "../chit-groups/chit-membership.model.js";
import {
  countSettledCycles,
  findChitCycleById,
  findChitCycleByNumber,
  hasSettledCycleAfter,
  saveChitCycle,
} from "../chit-cycles/chit-cycle.repository.js";
import type { ChitCycleDocument } from "../chit-cycles/chit-cycle.model.js";
import { findMemberById, listMembersByIds } from "../members/member.repository.js";
import {
  applyDividendToCycleInstallments,
  findInstallmentByCycleAndMembership,
  restoreDividendOnCycleInstallments,
} from "../payments/payment.repository.js";
import { Payment } from "../payments/payment.model.js";
import { createPayout, deletePayoutByCycle, findPayoutByCycle } from "../payouts/payout.repository.js";
import { findTenantById } from "../tenants/tenant.repository.js";
import { AppError } from "../../utils/app-error.js";
import { formatPaiseAsINR, percentageOfPaise, rupeesToPaise } from "../../utils/money.js";
import { listAuctionEvents, recordAuctionEvent } from "./auction-event.repository.js";
import type { AuctionEventDocument } from "./auction-event.model.js";
import { generateMinutesPdf, generateWinnerVoucherPdf } from "./auction.pdf.js";
import { computeSettlement } from "./settlement.js";
import type { RecordBidInput, SettleInput } from "./auction.validators.js";

interface CycleContext {
  cycle: ChitCycleDocument;
  chitGroup: ChitGroupDocument;
}

async function loadCycleContext(tenantId: string, cycleId: string): Promise<CycleContext> {
  const cycle = await findChitCycleById(cycleId, tenantId);
  if (!cycle) throw AppError.notFound("Cycle not found");
  const chitGroup = await findChitGroupById(cycle.chitGroupId.toString(), tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");
  return { cycle, chitGroup };
}

// --- Bidding lifecycle ---

export async function openBidding(tenantId: string, cycleId: string, actorUserId: string): Promise<ChitCycleDocument> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "SCHEDULED") {
    throw AppError.conflict(`Bidding can only be opened for a scheduled cycle (this cycle is ${cycle.status})`);
  }
  cycle.status = "BIDDING_OPEN";
  await saveChitCycle(cycle);
  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "BIDDING_OPENED",
    message: `Bidding opened for cycle #${cycle.cycleNumber}`,
  });
  return cycle;
}

export async function closeBidding(tenantId: string, cycleId: string, actorUserId: string): Promise<ChitCycleDocument> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "BIDDING_OPEN") {
    throw AppError.conflict("Only a cycle with open bidding can be closed");
  }
  cycle.status = "BIDDING_CLOSED";
  await saveChitCycle(cycle);
  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "BIDDING_CLOSED",
    message: `Bidding closed for cycle #${cycle.cycleNumber}`,
  });
  return cycle;
}

export async function recordBid(
  tenantId: string,
  cycleId: string,
  actorUserId: string,
  input: RecordBidInput,
): Promise<BidDocument> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "BIDDING_OPEN") {
    throw AppError.conflict("Bids can only be recorded while bidding is open");
  }

  const membership = await findChitMembershipById(input.chitMembershipId, tenantId);
  if (!membership || membership.chitGroupId.toString() !== chitGroup._id.toString()) {
    throw AppError.badRequest("Membership not found in this chit group");
  }
  if (membership.status !== "ACTIVE") {
    throw AppError.conflict("This member is not active in the chit group");
  }
  if (membership.hasWon) {
    throw AppError.conflict("This member has already won a cycle and cannot bid again");
  }

  // Only members who have paid the current cycle's installment are eligible to bid in this cycle's auction
  const currentPayment = await findInstallmentByCycleAndMembership(tenantId, cycleId, input.chitMembershipId);
  if (currentPayment && currentPayment.status !== "PAID") {
    throw AppError.conflict(
      `Ticket #${membership.ticketNumber} must pay this cycle's installment before participating in the auction.`,
    );
  }

  const discountAmount = rupeesToPaise(input.discountRupees);
  if (discountAmount < 1) throw AppError.badRequest("Bid discount must be at least ₹1");

  const discountPercent = (discountAmount / cycle.totalPotAmount) * 100;
  const { minBidDiscountPercent, maxBidDiscountPercent } = chitGroup.auctionRules;
  if (discountPercent < minBidDiscountPercent || discountPercent > maxBidDiscountPercent) {
    throw AppError.badRequest(
      `Bid discount must be between ${minBidDiscountPercent}% and ${maxBidDiscountPercent}% of the pot`,
    );
  }

  // Latest bid wins: if the member already has an active bid, supersede it.
  const existing = await findActiveBidForMembership(tenantId, cycleId, input.chitMembershipId);
  if (existing) {
    existing.status = "WITHDRAWN";
    await saveBid(existing);
  }

  const bid = await createBid({
    tenantId,
    chitCycleId: cycleId,
    chitMembershipId: input.chitMembershipId,
    discountAmount,
    discountPercent: Math.round(discountPercent * 100) / 100,
  });

  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "BID_RECORDED",
    message: `Ticket #${membership.ticketNumber} bid a discount of ${formatPaiseAsINR(discountAmount)}`,
    metadata: { chitMembershipId: input.chitMembershipId, discountAmount },
  });

  return bid;
}

export async function withdrawBid(
  tenantId: string,
  cycleId: string,
  bidId: string,
  actorUserId: string,
): Promise<void> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "BIDDING_OPEN") {
    throw AppError.conflict("Bids can only be withdrawn while bidding is open");
  }
  const bid = await findBidById(bidId, tenantId);
  if (!bid || bid.chitCycleId.toString() !== cycleId) throw AppError.notFound("Bid not found");
  if (bid.status !== "ACTIVE") throw AppError.conflict("Only an active bid can be withdrawn");

  bid.status = "WITHDRAWN";
  await saveBid(bid);
  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "BID_WITHDRAWN",
    message: `A bid was withdrawn from cycle #${cycle.cycleNumber}`,
    metadata: { bidId },
  });
}

// --- Winner selection & settlement ---

interface WinnerResolution {
  membership: ChitMembershipDocument;
  winningBid?: BidDocument;
  winningDiscount: number;
}

async function resolveWinner(
  tenantId: string,
  ctx: CycleContext,
  input: SettleInput,
  fullCommission: number,
): Promise<WinnerResolution> {
  const { cycle, chitGroup } = ctx;

  if (input.method === "LOWEST_BID") {
    const winningBid = await findWinningBid(tenantId, cycle._id.toString());
    if (!winningBid) throw AppError.badRequest("No active bids to settle — record a bid or pick a winner manually");
    const membership = await findChitMembershipById(winningBid.chitMembershipId.toString(), tenantId);
    if (!membership) throw AppError.notFound("Winning bid's membership not found");
    return { membership, winningBid, winningDiscount: winningBid.discountAmount };
  }

  if (input.method === "MANUAL") {
    const membership = await findChitMembershipById(input.winnerMembershipId!, tenantId);
    if (!membership || membership.chitGroupId.toString() !== chitGroup._id.toString()) {
      throw AppError.badRequest("Winner membership not found in this chit group");
    }
    if (membership.hasWon) throw AppError.conflict("That member has already won a cycle");

    let winningBid: BidDocument | undefined;
    let winningDiscount = fullCommission; // commission-only prize when no bid is honoured
    if (input.winningBidId) {
      const bid = await findBidById(input.winningBidId, tenantId);
      if (!bid || bid.chitCycleId.toString() !== cycle._id.toString()) throw AppError.badRequest("Bid not found in this cycle");
      if (bid.chitMembershipId.toString() !== membership._id.toString()) {
        throw AppError.badRequest("That bid does not belong to the selected winner");
      }
      winningBid = bid;
      winningDiscount = bid.discountAmount;
    }
    return { membership, winningBid, winningDiscount };
  }

  // LOTTERY — random draw among members who haven't won yet AND have paid this cycle's installment.
  const currentPayments = await Payment.find({ tenantId, chitCycleId: cycle._id.toString() });
  const paidMembershipIds = new Set(
    currentPayments.filter((p) => p.status === "PAID").map((p) => p.chitMembershipId.toString()),
  );

  const eligible = (await listActiveMembershipsByGroup(tenantId, chitGroup._id.toString())).filter(
    (m) => !m.hasWon && (currentPayments.length === 0 || paidMembershipIds.has(m._id.toString())),
  );
  if (eligible.length === 0) throw AppError.conflict("No eligible members (who have paid this cycle) remain for the lottery");
  const winner = eligible[randomInt(eligible.length)]!;
  return { membership: winner, winningDiscount: fullCommission };
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

export async function settleCycle(
  tenantId: string,
  cycleId: string,
  actorUserId: string,
  input: SettleInput,
): Promise<SettlementSummary> {
  const ctx = await loadCycleContext(tenantId, cycleId);
  const { cycle, chitGroup } = ctx;

  if (cycle.status === "SETTLED") throw AppError.conflict("This cycle is already settled");
  if (chitGroup.status !== "ACTIVE") throw AppError.conflict("The chit group is not active");

  const fullCommission = percentageOfPaise(cycle.totalPotAmount, chitGroup.auctionRules.foremanCommissionPercent);
  const { membership, winningBid, winningDiscount } = await resolveWinner(tenantId, ctx, input, fullCommission);

  const result = computeSettlement({
    potAmount: cycle.totalPotAmount,
    totalMembers: chitGroup.totalMembers,
    foremanCommissionPercent: chitGroup.auctionRules.foremanCommissionPercent,
    winningDiscount,
  });
  if (result.prizeAmount < 1) throw AppError.badRequest("Computed prize amount is not positive — check the discount");

  const member = await findMemberById(membership.memberId.toString(), tenantId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      cycle.status = "SETTLED";
      cycle.winnerMembershipId = membership._id;
      cycle.winningBidId = winningBid?._id;
      cycle.commissionAmount = result.commissionAmount;
      cycle.discountAmount = result.discountAmount;
      cycle.dividendPerMember = result.dividendPerMember;
      cycle.prizeAmount = result.prizeAmount;
      cycle.settledAt = new Date();
      await saveChitCycle(cycle, session);

      // Bid statuses: everything active → LOST, then the winner → WINNING.
      await updateBidStatusesForCycle(tenantId, cycleId, ["ACTIVE"], "LOST", session);
      if (winningBid) await setBidStatus(tenantId, winningBid._id.toString(), "WINNING", session);

      membership.hasWon = true;
      membership.wonInCycleId = cycle._id;
      await saveChitMembership(membership, session);

      await createPayout(
        {
          tenantId,
          chitGroupId: chitGroup._id.toString(),
          chitCycleId: cycle._id.toString(),
          chitMembershipId: membership._id.toString(),
          memberId: membership.memberId.toString(),
          amount: result.prizeAmount,
        },
        session,
      );

      // Auto Dividend: reduce the next cycle's already-raised installments by the dividend.
      const nextCycle = await findChitCycleByNumber(tenantId, chitGroup._id.toString(), cycle.cycleNumber + 1);
      if (nextCycle && result.dividendPerMember > 0) {
        await applyDividendToCycleInstallments(
          tenantId,
          nextCycle._id.toString(),
          chitGroup.installmentAmount,
          result.dividendPerMember,
        );
      }

      chitGroup.currentCycleNumber = Math.max(chitGroup.currentCycleNumber, cycle.cycleNumber);
      const settledCount = await countSettledCycles(tenantId, chitGroup._id.toString());
      if (settledCount >= chitGroup.totalMembers) chitGroup.status = "COMPLETED";
      await saveChitGroup(chitGroup, session);
    });
  } finally {
    await session.endSession();
  }

  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "SETTLED",
    message: `Cycle #${cycle.cycleNumber} settled — ticket #${membership.ticketNumber} won ${formatPaiseAsINR(result.prizeAmount)} (${input.method})`,
    metadata: {
      method: input.method,
      winnerMembershipId: membership._id.toString(),
      ...result,
    },
  });

  return {
    cycleNumber: cycle.cycleNumber,
    method: input.method,
    winner: {
      membershipId: membership._id.toString(),
      ticketNumber: membership.ticketNumber,
      name: member?.name ?? "Unknown",
      memberCode: member?.memberCode ?? "",
    },
    potAmount: cycle.totalPotAmount,
    discountAmount: result.discountAmount,
    commissionAmount: result.commissionAmount,
    dividendPerMember: result.dividendPerMember,
    prizeAmount: result.prizeAmount,
  };
}

export async function repickWinner(
  tenantId: string,
  cycleId: string,
  actorUserId: string,
  reason: string | undefined,
): Promise<ChitCycleDocument> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "SETTLED") throw AppError.conflict("Only a settled cycle can be re-picked");

  const payout = await findPayoutByCycle(tenantId, cycleId);
  if (payout && payout.amountPaid > 0) {
    throw AppError.conflict("Prize money has already been disbursed — this cycle can no longer be re-picked");
  }
  if (await hasSettledCycleAfter(tenantId, chitGroup._id.toString(), cycle.cycleNumber)) {
    throw AppError.conflict("A later cycle is already settled — reverse it before re-picking this one");
  }

  const winnerMembership = cycle.winnerMembershipId
    ? await findChitMembershipById(cycle.winnerMembershipId.toString(), tenantId)
    : null;
  const dividendPerMember = cycle.dividendPerMember ?? 0;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Undo the Auto Dividend on the next cycle's installments.
      const nextCycle = await findChitCycleByNumber(tenantId, chitGroup._id.toString(), cycle.cycleNumber + 1);
      if (nextCycle && dividendPerMember > 0) {
        await restoreDividendOnCycleInstallments(
          tenantId,
          nextCycle._id.toString(),
          chitGroup.installmentAmount,
          dividendPerMember,
        );
      }

      await deletePayoutByCycle(tenantId, cycleId, session);

      if (winnerMembership) {
        winnerMembership.hasWon = false;
        winnerMembership.wonInCycleId = undefined;
        await saveChitMembership(winnerMembership, session);
      }

      // Bids go back to ACTIVE so a fresh winner can be chosen.
      await updateBidStatusesForCycle(tenantId, cycleId, ["WINNING", "LOST"], "ACTIVE", session);

      cycle.status = "BIDDING_CLOSED";
      cycle.winnerMembershipId = undefined;
      cycle.winningBidId = undefined;
      cycle.commissionAmount = undefined;
      cycle.discountAmount = undefined;
      cycle.dividendPerMember = undefined;
      cycle.prizeAmount = undefined;
      cycle.settledAt = undefined;
      await saveChitCycle(cycle, session);

      if (chitGroup.currentCycleNumber === cycle.cycleNumber) {
        chitGroup.currentCycleNumber = cycle.cycleNumber - 1;
      }
      if (chitGroup.status === "COMPLETED") chitGroup.status = "ACTIVE";
      await saveChitGroup(chitGroup, session);
    });
  } finally {
    await session.endSession();
  }

  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "REPICK_REVERSED",
    message: `Cycle #${cycle.cycleNumber} settlement reversed for re-pick${reason ? ` — ${reason}` : ""}`,
    metadata: { reason },
  });

  return cycle;
}

// --- Reads ---

export async function getAuditTrail(tenantId: string, cycleId: string): Promise<AuctionEventDocument[]> {
  await loadCycleContext(tenantId, cycleId);
  return listAuctionEvents(tenantId, cycleId);
}

export async function listCycleBids(tenantId: string, cycleId: string) {
  await loadCycleContext(tenantId, cycleId);
  return listBidsByCycle(tenantId, cycleId);
}

export interface EligibleMember {
  membershipId: string;
  ticketNumber: number;
  memberId: string;
  name: string;
  memberCode: string;
  hasActiveBid: boolean;
  hasPaidCurrentCycle: boolean;
  isEligibleForAuction: boolean;
}

export interface AuctionState {
  cycle: {
    id: string;
    cycleNumber: number;
    status: string;
    scheduledDate: Date;
    potAmount: number;
    settledAt?: Date;
  };
  chitGroup: {
    id: string;
    name: string;
    allotmentMethod: string;
    foremanCommissionPercent: number;
    minBidDiscountPercent: number;
    maxBidDiscountPercent: number;
    installmentAmount: number;
    totalMembers: number;
  };
  settlement?: {
    winner: { membershipId: string; ticketNumber: number; name: string; memberCode: string };
    discountAmount: number;
    commissionAmount: number;
    dividendPerMember: number;
    prizeAmount: number;
    payoutStatus: string;
  };
  eligibleMembers: EligibleMember[];
  canRepick: boolean;
}

export async function getAuctionState(tenantId: string, cycleId: string): Promise<AuctionState> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);

  const memberships = await listActiveMembershipsByGroup(tenantId, chitGroup._id.toString());
  const members = await listMembersByIds(
    memberships.map((m) => m.memberId.toString()),
    tenantId,
  );
  const memberById = new Map(members.map((m) => [m._id.toString(), m]));

  const bids = await listBidsByCycle(tenantId, cycleId);
  const membershipsWithActiveBid = new Set(
    bids.filter((b) => b.status === "ACTIVE").map((b) => b.chitMembershipId._id.toString()),
  );

  const currentPayments = await Payment.find({ tenantId, chitCycleId: cycleId });
  const paidMembershipIds = new Set(
    currentPayments.filter((p) => p.status === "PAID").map((p) => p.chitMembershipId.toString()),
  );

  const eligibleMembers: EligibleMember[] = memberships
    .filter((m) => !m.hasWon)
    .map((m) => {
      const member = memberById.get(m.memberId.toString());
      const hasPaidCurrentCycle = currentPayments.length === 0 || paidMembershipIds.has(m._id.toString());
      return {
        membershipId: m._id.toString(),
        ticketNumber: m.ticketNumber,
        memberId: m.memberId.toString(),
        name: member?.name ?? "Unknown",
        memberCode: member?.memberCode ?? "",
        hasActiveBid: membershipsWithActiveBid.has(m._id.toString()),
        hasPaidCurrentCycle,
        isEligibleForAuction: hasPaidCurrentCycle,
      };
    });

  let settlement: AuctionState["settlement"];
  let canRepick = false;
  if (cycle.status === "SETTLED" && cycle.winnerMembershipId) {
    const winnerMembership = await findChitMembershipById(cycle.winnerMembershipId.toString(), tenantId);
    const winnerMember = winnerMembership ? await findMemberById(winnerMembership.memberId.toString(), tenantId) : null;
    const payout = await findPayoutByCycle(tenantId, cycleId);
    const laterSettled = await hasSettledCycleAfter(tenantId, chitGroup._id.toString(), cycle.cycleNumber);
    canRepick = !(payout && payout.amountPaid > 0) && !laterSettled;
    settlement = {
      winner: {
        membershipId: winnerMembership?._id.toString() ?? "",
        ticketNumber: winnerMembership?.ticketNumber ?? 0,
        name: winnerMember?.name ?? "Unknown",
        memberCode: winnerMember?.memberCode ?? "",
      },
      discountAmount: cycle.discountAmount ?? 0,
      commissionAmount: cycle.commissionAmount ?? 0,
      dividendPerMember: cycle.dividendPerMember ?? 0,
      prizeAmount: cycle.prizeAmount ?? 0,
      payoutStatus: payout?.status ?? "PENDING",
    };
  }

  return {
    cycle: {
      id: cycle._id.toString(),
      cycleNumber: cycle.cycleNumber,
      status: cycle.status,
      scheduledDate: cycle.scheduledDate,
      potAmount: cycle.totalPotAmount,
      settledAt: cycle.settledAt,
    },
    chitGroup: {
      id: chitGroup._id.toString(),
      name: chitGroup.name,
      allotmentMethod: chitGroup.auctionRules.allotmentMethod,
      foremanCommissionPercent: chitGroup.auctionRules.foremanCommissionPercent,
      minBidDiscountPercent: chitGroup.auctionRules.minBidDiscountPercent,
      maxBidDiscountPercent: chitGroup.auctionRules.maxBidDiscountPercent,
      installmentAmount: chitGroup.installmentAmount,
      totalMembers: chitGroup.totalMembers,
    },
    settlement,
    eligibleMembers,
    canRepick,
  };
}

// --- PDFs ---

export async function buildMinutesPdf(tenantId: string, cycleId: string, actorUserId: string): Promise<Buffer> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "SETTLED" || !cycle.winnerMembershipId) {
    throw AppError.conflict("Minutes are available only after the cycle is settled");
  }
  const [tenant, winnerMembership, bids] = await Promise.all([
    findTenantById(tenantId),
    findChitMembershipById(cycle.winnerMembershipId.toString(), tenantId),
    listBidsByCycle(tenantId, cycleId),
  ]);
  const winnerMember = winnerMembership ? await findMemberById(winnerMembership.memberId.toString(), tenantId) : null;

  const pdf = await generateMinutesPdf({
    organizationName: tenant?.name ?? "Organization",
    chitGroupName: chitGroup.name,
    registrationNumber: chitGroup.registrationNumber,
    cycleNumber: cycle.cycleNumber,
    auctionDate: cycle.settledAt ?? cycle.scheduledDate,
    allotmentMethod: chitGroup.auctionRules.allotmentMethod,
    totalMembers: chitGroup.totalMembers,
    potAmount: cycle.totalPotAmount,
    discountAmount: cycle.discountAmount ?? 0,
    commissionAmount: cycle.commissionAmount ?? 0,
    dividendPerMember: cycle.dividendPerMember ?? 0,
    prizeAmount: cycle.prizeAmount ?? 0,
    winner: {
      name: winnerMember?.name ?? "Unknown",
      memberCode: winnerMember?.memberCode ?? "",
      ticketNumber: winnerMembership?.ticketNumber ?? 0,
    },
    bids: bids.map((b) => ({
      ticketNumber: b.chitMembershipId.ticketNumber,
      memberName: b.chitMembershipId.memberId.name,
      discountAmount: b.discountAmount,
    })),
  });

  await recordAuctionEvent({
    tenantId,
    chitGroupId: chitGroup._id.toString(),
    chitCycleId: cycle._id.toString(),
    actorUserId,
    type: "MINUTES_GENERATED",
    message: `Auction minutes generated for cycle #${cycle.cycleNumber}`,
  });

  return pdf;
}

export async function buildWinnerVoucherPdf(tenantId: string, cycleId: string): Promise<Buffer> {
  const { cycle, chitGroup } = await loadCycleContext(tenantId, cycleId);
  if (cycle.status !== "SETTLED" || !cycle.winnerMembershipId) {
    throw AppError.conflict("The winner voucher is available only after the cycle is settled");
  }
  const [tenant, winnerMembership] = await Promise.all([
    findTenantById(tenantId),
    findChitMembershipById(cycle.winnerMembershipId.toString(), tenantId),
  ]);
  const winnerMember = winnerMembership ? await findMemberById(winnerMembership.memberId.toString(), tenantId) : null;

  return generateWinnerVoucherPdf({
    organizationName: tenant?.name ?? "Organization",
    chitGroupName: chitGroup.name,
    registrationNumber: chitGroup.registrationNumber,
    cycleNumber: cycle.cycleNumber,
    auctionDate: cycle.settledAt ?? cycle.scheduledDate,
    prizeAmount: cycle.prizeAmount ?? 0,
    winner: {
      name: winnerMember?.name ?? "Unknown",
      memberCode: winnerMember?.memberCode ?? "",
      ticketNumber: winnerMembership?.ticketNumber ?? 0,
      phone: winnerMember?.phone ?? "",
    },
  });
}
