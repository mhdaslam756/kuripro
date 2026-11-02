import mongoose, { Types } from "mongoose";

import { recordActivity } from "../activity-logs/activity-log.service.js";
import { computeForemanCommission } from "../auctions/settlement.js";
import { Ledger } from "../ledger/ledger.model.js";
import { findTenantById } from "../tenants/tenant.repository.js";
import { toMemberReplacementSettings } from "../tenants/tenant.service.js";
import { ChitCycle, type ChitCycleDocument } from "../chit-cycles/chit-cycle.model.js";
import { findMemberById } from "../members/member.repository.js";
import { Member } from "../members/member.model.js";
import { ChitGroup } from "./chit-group.model.js";
import { Payment, type PaymentDocument } from "../payments/payment.model.js";
import { insertInstallments } from "../payments/payment.repository.js";
import { AppError } from "../../utils/app-error.js";
import { rupeesToPaise } from "../../utils/money.js";
import { findChitGroupById } from "./chit-group.repository.js";
import type { ChitGroupDocument } from "./chit-group.model.js";
import { ChitMembership, type ChitMembershipDocument } from "./chit-membership.model.js";
import {
  MembershipReplacement,
  type MembershipReplacementDocument,
  type NewMemberTerms,
  type PreviousMemberSnapshot,
  type ReplacementSettlement,
} from "./membership-replacement.model.js";
import {
  allocatePrizeRefund,
  assertFinancialsApplicable,
  computeReplacementFinancials,
  refundRemaining,
  resolveReplacementSettings,
  type ReplacementFinancials,
} from "./replacement-policy.js";
import type { DisplacementCommissionSettings, MemberReplacementSettings } from "../tenants/tenant.model.js";
import { CommissionAllocation } from "./commission-allocation.model.js";
import { activeDisplacementPolicy, loadAllocationHolders, shareUnitsOf } from "./displacement-commission.service.js";
import type {
  CompleteReplacementSettlementInput,
  ReplaceMemberInput,
  UpdateReplacementSettlementInput,
  GroupReplacementSettingsInput,
} from "./membership-replacement.validators.js";

// --- Shared helpers ---

interface MemberRef {
  id: string;
  name: string;
  memberCode: string;
  phone: string;
}

function shareOf(membership: Pick<ChitMembershipDocument, "share" | "shareType">): number {
  return membership.share ?? (membership.shareType === "HALF" ? 0.5 : 1);
}

function slotLabel(slot: { ticketNumber: number; subTicket?: string | null }): string {
  return `#${slot.ticketNumber}${slot.subTicket ?? ""}`;
}

async function loadMemberRef(tenantId: string, memberId: string): Promise<MemberRef | null> {
  const member = await findMemberById(memberId, tenantId);
  if (!member) return null;
  return { id: member._id.toString(), name: member.name, memberCode: member.memberCode, phone: member.phone };
}

interface GroupContext {
  chitGroup: ChitGroupDocument;
  cycles: ChitCycleDocument[];
  cycleByNumber: Map<number, ChitCycleDocument>;
  /** Cycle numbers that have had dues raised for at least one membership. */
  raisedCycleNumbers: Set<number>;
}

async function loadGroupContext(tenantId: string, chitGroupId: string): Promise<GroupContext> {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");

  const cycles = await ChitCycle.find({ tenantId, chitGroupId }).sort({ cycleNumber: 1 });
  const cycleByNumber = new Map(cycles.map((cycle) => [cycle.cycleNumber, cycle]));

  const raisedIds = (await Payment.distinct("chitCycleId", { tenantId, chitGroupId })) as Types.ObjectId[];
  const raisedSet = new Set(raisedIds.map((id) => id.toString()));
  const raisedCycleNumbers = new Set(cycles.filter((c) => raisedSet.has(c._id.toString())).map((c) => c.cycleNumber));

  return { chitGroup, cycles, cycleByNumber, raisedCycleNumbers };
}

async function loadActiveMembership(
  tenantId: string,
  chitGroupId: string,
  membershipId: string,
): Promise<ChitMembershipDocument> {
  const membership = await ChitMembership.findOne({ _id: membershipId, tenantId, chitGroupId });
  if (!membership) throw AppError.notFound("Membership not found in this chit group");
  if (membership.status !== "ACTIVE") {
    throw AppError.conflict("This membership is no longer active — it has already been replaced or has exited");
  }
  if (membership.hasWon) {
    throw AppError.conflict("This ticket has already won its prize, so the member can no longer be replaced");
  }
  return membership;
}

/** Smallest and largest cycle the new member may take over from. */
function effectiveCycleBounds(ctx: GroupContext, previous: ChitMembershipDocument): { min: number; max: number } {
  const lastSettled = ctx.cycles.filter((c) => c.status === "SETTLED").reduce((m, c) => Math.max(m, c.cycleNumber), 0);
  const maxRaised = Math.max(0, ...ctx.raisedCycleNumbers);
  return {
    min: Math.max(lastSettled + 1, previous.effectiveFromCycleNumber ?? 1),
    // Dues for every earlier cycle must already exist, otherwise nobody would owe those instalments.
    max: Math.min(ctx.chitGroup.totalMembers, maxRaised + 1),
  };
}

function assertEffectiveCycle(ctx: GroupContext, previous: ChitMembershipDocument, cycleNumber: number): void {
  if (ctx.chitGroup.status !== "ACTIVE") {
    throw AppError.conflict("Members can only be replaced while the chit group is running (ACTIVE)");
  }
  const { min, max } = effectiveCycleBounds(ctx, previous);
  if (min > max) {
    throw AppError.conflict("No cycle is currently available to start a replacement from — raise the next cycle's dues first");
  }
  if (cycleNumber < min) {
    throw AppError.badRequest(`Effective cycle must be cycle ${min} or later — earlier cycles are already settled`);
  }
  if (cycleNumber > max) {
    throw AppError.badRequest(
      max < ctx.chitGroup.totalMembers
        ? `Effective cycle cannot be later than cycle ${max} — raise dues for the earlier cycles first`
        : `Effective cycle cannot be later than cycle ${max}`,
    );
  }
}

// --- Previous member's account ---

interface PaymentRow {
  cycleNumber: number;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  status: string;
}

async function loadPaymentRows(
  tenantId: string,
  membershipId: string,
  ctx: GroupContext,
): Promise<{ rows: PaymentRow[]; payments: PaymentDocument[] }> {
  const payments = await Payment.find({ tenantId, chitMembershipId: membershipId });
  const numberByCycleId = new Map(ctx.cycles.map((c) => [c._id.toString(), c.cycleNumber]));
  const rows = payments
    .map((p) => ({
      cycleNumber: numberByCycleId.get(p.chitCycleId.toString()) ?? 0,
      dueDate: p.dueDate,
      amountDue: p.amountDue,
      amountPaid: p.amountPaid,
      status: p.status,
    }))
    .sort((a, b) => a.cycleNumber - b.cycleNumber);
  return { rows, payments };
}

function summarisePrevious(rows: PaymentRow[], effectiveCycleNumber: number): PreviousMemberSnapshot {
  const responsible = rows.filter((r) => r.cycleNumber < effectiveCycleNumber && r.status !== "WAIVED");
  const handedOver = rows.filter((r) => r.cycleNumber >= effectiveCycleNumber);
  return {
    instalmentsDue: responsible.length,
    instalmentsPaid: responsible.filter((r) => r.status === "PAID").length,
    totalDue: responsible.reduce((s, r) => s + r.amountDue, 0),
    totalPaid: responsible.reduce((s, r) => s + r.amountPaid, 0),
    pendingDues: responsible.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0),
    prepaidAmount: handedOver.reduce((s, r) => s + r.amountPaid, 0),
  };
}

// --- New member's obligation ---

export interface RemainingInstalment {
  cycleNumber: number;
  scheduledDate: Date;
  amount: number;
  /** RAISED = dues already exist; NET_OF_DIVIDEND = prior dividend known; ESTIMATE = may fall with future dividends. */
  basis: "RAISED" | "NET_OF_DIVIDEND" | "ESTIMATE";
}

function computeRemainingInstalments(
  ctx: GroupContext,
  previous: ChitMembershipDocument,
  previousRows: PaymentRow[],
  effectiveCycleNumber: number,
): { schedule: RemainingInstalment[]; terms: NewMemberTerms } {
  const share = shareOf(previous);
  const rowByCycle = new Map(previousRows.map((r) => [r.cycleNumber, r]));
  const schedule: RemainingInstalment[] = [];

  for (let n = effectiveCycleNumber; n <= ctx.chitGroup.totalMembers; n += 1) {
    const cycle = ctx.cycleByNumber.get(n);
    if (!cycle) continue;
    const existing = rowByCycle.get(n);
    if (existing) {
      schedule.push({ cycleNumber: n, scheduledDate: cycle.scheduledDate, amount: existing.amountDue, basis: "RAISED" });
      continue;
    }
    const prior = n > 1 ? ctx.cycleByNumber.get(n - 1) : undefined;
    const dividend = prior?.status === "SETTLED" ? (prior.dividendPerMember ?? 0) : 0;
    const net = Math.max(0, ctx.chitGroup.installmentAmount - dividend);
    schedule.push({
      cycleNumber: n,
      scheduledDate: cycle.scheduledDate,
      amount: Math.round(net * share),
      basis: n === 1 || prior?.status === "SETTLED" ? "NET_OF_DIVIDEND" : "ESTIMATE",
    });
  }

  return {
    schedule,
    terms: {
      remainingInstalments: schedule.length,
      totalPayable: schedule.reduce((s, r) => s + r.amount, 0),
    },
  };
}

/** Splits an amount into two halves that always add back up to it; half A takes the odd paisa. */
function splitAmount(amount: number): [number, number] {
  const b = Math.floor(amount / 2);
  return [amount - b, b];
}

function termsOf(schedule: RemainingInstalment[]): NewMemberTerms {
  return { remainingInstalments: schedule.length, totalPayable: schedule.reduce((s, r) => s + r.amount, 0) };
}

/** Turns a full-ticket schedule into the A and B half schedules. */
function halveSchedule(schedule: RemainingInstalment[]): [RemainingInstalment[], RemainingInstalment[]] {
  const halves = schedule.map((r) => splitAmount(r.amount));
  return [
    schedule.map((r, i) => ({ ...r, amount: halves[i]![0] })),
    schedule.map((r, i) => ({ ...r, amount: halves[i]![1] })),
  ];
}

function assertSplittable(previous: ChitMembershipDocument): void {
  if (previous.shareType !== "FULL" || previous.subTicket) {
    throw AppError.badRequest("Only a full ticket can be split into two half shares");
  }
}

function buildSettlement(
  snapshot: PreviousMemberSnapshot,
  input: { refundAmount?: number; deductionAmount?: number; deductionReason?: string; notes?: string; commissionAmount?: number },
): ReplacementSettlement {
  // Default refund is everything the outgoing member has paid in; the organiser can lower it.
  const refundAmount = input.refundAmount ?? snapshot.totalPaid + snapshot.prepaidAmount;
  const deductionAmount = input.deductionAmount ?? 0;
  const commissionAmount = input.commissionAmount ?? 0;
  return {
    status: "PENDING",
    pendingDues: snapshot.pendingDues,
    refundAmount,
    deductionAmount,
    deductionReason: input.deductionReason,
    commissionAmount,
    netAmount: refundAmount - snapshot.pendingDues - deductionAmount - commissionAmount,
    notes: input.notes,
  };
}

/** The replacement terms that apply to a group: its own if it has any, otherwise the organisation default. */
export async function resolveSettingsForGroup(
  tenantId: string,
  chitGroup: ChitGroupDocument,
): Promise<{ settings: MemberReplacementSettings; source: "GROUP" | "ORGANIZATION" }> {
  const tenant = await findTenantById(tenantId);
  const groupOwn = chitGroup.toObject().memberReplacement;
  const settings = resolveReplacementSettings(groupOwn ? { memberReplacement: groupOwn } : tenant?.toObject().settings);
  return { settings, source: groupOwn ? "GROUP" : "ORGANIZATION" };
}

// --- Previous member's refund taken out of a later prize ---

export interface PrizeRefundDeduction {
  /** Total taken off the winner's prize (paise). */
  amount: number;
  items: { replacementId: Types.ObjectId; amount: number }[];
}

/** What has actually been paid out (or collected) on a replacement's exit settlement, including records from before paidAmount existed. */
export function paidOf(settlement: { status: string; paidAmount?: number; settledAmount?: number; netAmount: number }): number {
  if (settlement.status === "SETTLED") return settlement.settledAmount ?? Math.abs(settlement.netAmount);
  return settlement.paidAmount ?? 0;
}

/**
 * When a ticket that was handed over later wins, the previous holder's refund always comes out of the
 * prize, so the company never pays it on top. A refund already paid is part of that allocation — it
 * reduces the winner's prize but is not paid again. Returns what to take off `grossPayout`.
 */
export async function computePrizeRefundDeduction(
  tenantId: string,
  chitGroup: ChitGroupDocument,
  winner: Pick<ChitMembershipDocument, "_id" | "ticketNumber" | "subTicket" | "share" | "shareType">,
  grossPayout: number,
): Promise<PrizeRefundDeduction> {
  const replacements = await MembershipReplacement.find({ tenantId, chitGroupId: chitGroup._id, ticketNumber: winner.ticketNumber });
  const winnerId = winner._id.toString();
  const claims: { replacementId: string; entitlement: number }[] = [];
  for (const r of replacements) {
    const net = r.settlement.netAmount;
    if (net <= 0) continue; // nothing owed to the previous member
    let entitlement: number;
    if (r.secondNewMembershipId) {
      // A full ticket was split in two halves: half A bears the larger half of an odd paisa.
      if (r.newMembershipId.toString() === winnerId) entitlement = net - Math.floor(net / 2);
      else if (r.secondNewMembershipId.toString() === winnerId) entitlement = Math.floor(net / 2);
      else continue;
    } else if ((r.subTicket ?? "") === (winner.subTicket ?? "")) {
      entitlement = net;
    } else continue;
    claims.push({ replacementId: r._id.toString(), entitlement });
  }
  const allocation = allocatePrizeRefund(claims, grossPayout);
  return {
    amount: allocation.refundTotal,
    items: allocation.items.filter((i) => i.amount > 0).map((i) => ({ replacementId: new Types.ObjectId(i.replacementId), amount: i.amount })),
  };
}

// --- Organisation policy applied to a replacement ---

async function loadFinancials(
  tenantId: string,
  chitGroup: ChitGroupDocument,
  previous: ChitMembershipDocument,
  snapshot: PreviousMemberSnapshot,
  remainingInstalmentsTotal: number,
  incoming: { ctx: GroupContext; effectiveCycleNumber: number; memberIds: (string | undefined)[]; split: boolean },
): Promise<{ settings: MemberReplacementSettings; financials: ReplacementFinancials; source: "GROUP" | "ORGANIZATION"; appliedDisplacement: DisplacementCommissionSettings | null }> {
  const { settings, source } = await resolveSettingsForGroup(tenantId, chitGroup);
  // One cycle's foreman commission is what a full ticket generates (total commission ÷ members).
  const perCycleCommission = computeForemanCommission(chitGroup.chitValue, chitGroup.auctionRules);
  const ticketCommission = Math.round(perCycleCommission * shareOf(previous));
  const policy = activeDisplacementPolicy(settings);
  const displacement = policy
    ? {
        policy,
        holders: await loadAllocationHolders(
          tenantId,
          chitGroup._id.toString(),
          previous,
          {
            memberIds: incoming.memberIds,
            effectiveCycleNumber: incoming.effectiveCycleNumber,
            totalCycles: chitGroup.totalMembers,
            // A full ticket handed to two members becomes two halves; otherwise the slot's own weight carries over.
            shareUnits: incoming.split ? 1 : shareUnitsOf(previous),
          },
          new Map(incoming.ctx.cycles.map((c) => [c._id.toString(), c.cycleNumber])),
        ),
      }
    : undefined;
  const financials = computeReplacementFinancials({
    settings,
    displacement,
    ticketCommission,
    previousMemberTotalPaid: snapshot.totalPaid + snapshot.prepaidAmount,
    remainingInstalmentsTotal,
  });
  return { settings, financials, source, appliedDisplacement: policy };
}

// --- Per-group replacement terms ---

export async function getGroupReplacementSettings(tenantId: string, chitGroupId: string) {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");
  const tenant = await findTenantById(tenantId);
  const organization = resolveReplacementSettings(tenant?.toObject().settings);
  const own = chitGroup.toObject().memberReplacement;
  return {
    source: own ? ("GROUP" as const) : ("ORGANIZATION" as const),
    organization,
    settings: own ? resolveReplacementSettings({ memberReplacement: own }) : organization,
  };
}

export async function updateGroupReplacementSettings(tenantId: string, chitGroupId: string, input: GroupReplacementSettingsInput) {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");
  if (chitGroup.status === "ACTIVE" && !input.confirmActiveChange) {
    throw AppError.conflict("This chit group is running. Confirm to change its replacement terms.");
  }
  if (input.useOrganizationDefault) chitGroup.set("memberReplacement", undefined);
  else chitGroup.memberReplacement = toMemberReplacementSettings(input.memberReplacement!);
  await chitGroup.save();
  return getGroupReplacementSettings(tenantId, chitGroupId);
}

// --- Preview ---

export async function previewReplacement(
  tenantId: string,
  chitGroupId: string,
  membershipId: string,
  query: { effectiveCycleNumber?: number; newMemberId?: string; split?: boolean; secondMemberId?: string },
) {
  const ctx = await loadGroupContext(tenantId, chitGroupId);
  const previous = await loadActiveMembership(tenantId, chitGroupId, membershipId);
  if (ctx.chitGroup.status !== "ACTIVE") {
    throw AppError.conflict("Members can only be replaced while the chit group is running (ACTIVE)");
  }
  const effectiveCycleNumber = query.effectiveCycleNumber ?? effectiveCycleBounds(ctx, previous).min;
  assertEffectiveCycle(ctx, previous, effectiveCycleNumber);

  const { rows } = await loadPaymentRows(tenantId, membershipId, ctx);
  const snapshot = summarisePrevious(rows, effectiveCycleNumber);
  const { schedule, terms } = computeRemainingInstalments(ctx, previous, rows, effectiveCycleNumber);

  const split = query.split === true;
  if (split) assertSplittable(previous);
  const { settings, financials, source } = await loadFinancials(tenantId, ctx.chitGroup, previous, snapshot, terms.totalPayable, {
    ctx,
    effectiveCycleNumber,
    memberIds: split ? [query.newMemberId, query.secondMemberId] : [query.newMemberId],
    split,
  });
  const settlement = buildSettlement(snapshot, { commissionAmount: financials.commission.previousMemberShare });

  const [previousMember, newMember, secondMember] = await Promise.all([
    loadMemberRef(tenantId, previous.memberId.toString()),
    query.newMemberId ? loadMemberRef(tenantId, query.newMemberId) : Promise.resolve(null),
    split && query.secondMemberId ? loadMemberRef(tenantId, query.secondMemberId) : Promise.resolve(null),
  ]);
  if (query.newMemberId && !newMember) throw AppError.badRequest("Replacement member not found in this organization");
  if (split && query.secondMemberId && !secondMember) {
    throw AppError.badRequest("Replacement member not found in this organization");
  }

  const bounds = effectiveCycleBounds(ctx, previous);
  const effectiveCycle = ctx.cycleByNumber.get(effectiveCycleNumber);

  return {
    slot: {
      ticketNumber: previous.ticketNumber,
      subTicket: previous.subTicket ?? null,
      label: slotLabel(previous),
      shareType: previous.shareType,
      share: shareOf(previous),
    },
    previous: {
      membershipId: previous._id.toString(),
      member: previousMember,
      joinedAt: previous.joinedAt,
      effectiveFromCycleNumber: previous.effectiveFromCycleNumber ?? 1,
      hasWon: previous.hasWon,
      snapshot,
      payments: rows.map((r) => ({
        ...r,
        handedOver: r.cycleNumber >= effectiveCycleNumber,
      })),
    },
    effective: {
      cycleNumber: effectiveCycleNumber,
      scheduledDate: effectiveCycle?.scheduledDate ?? null,
      minCycleNumber: bounds.min,
      maxCycleNumber: bounds.max,
    },
    newMember: split
      ? { member: newMember, ...termsOf(halveSchedule(schedule)[0]), schedule: halveSchedule(schedule)[0] }
      : { member: newMember, ...terms, schedule },
    secondNewMember: split
      ? { member: secondMember, ...termsOf(halveSchedule(schedule)[1]), schedule: halveSchedule(schedule)[1] }
      : null,
    split,
    settlement,
    financials: {
      settingsSource: source,
      installmentSettlementMode: settings.installmentSettlementMode,
      previousMemberTotalPaid: snapshot.totalPaid + snapshot.prepaidAmount,
      commission: financials.commission,
      allocation: financials.allocation
        ? { ...financials.allocation, holders: financials.allocation.holders.map((h) => ({ ...h, })) }
        : null,
      allocationMode: financials.allocation?.mode ?? null,
      commissionOwnershipMode: settings.commissionOwnershipMode,
      fee: financials.fee,
      totalPayableByReplacement: terms.totalPayable + financials.fee.amount + financials.commission.replacementMemberShare,
      blockedReason: financials.blockedReason,
    },
  };
}

// --- Replace ---

export interface ReplacementResult {
  replacement: MembershipReplacementDocument;
  newMembershipId: string;
  /** Only when a full ticket was split: the membership holding half B. */
  secondNewMembershipId?: string;
}

export async function replaceMember(
  tenantId: string,
  chitGroupId: string,
  membershipId: string,
  actorUserId: string,
  input: ReplaceMemberInput,
): Promise<ReplacementResult> {
  const ctx = await loadGroupContext(tenantId, chitGroupId);
  const previous = await loadActiveMembership(tenantId, chitGroupId, membershipId);
  assertEffectiveCycle(ctx, previous, input.effectiveCycleNumber);

  if (input.newMemberId === previous.memberId.toString()) {
    throw AppError.badRequest("The replacement must be a different member");
  }
  const newMember = await findMemberById(input.newMemberId, tenantId);
  if (!newMember) throw AppError.badRequest("Replacement member not found in this organization");

  const split = input.splitIntoHalves;
  const secondMemberId = split ? input.secondNewMemberId : undefined;
  let secondMember: Awaited<ReturnType<typeof findMemberById>> = null;
  if (split) {
    assertSplittable(previous);
    if (!secondMemberId || secondMemberId === previous.memberId.toString()) {
      throw AppError.badRequest("Choose two members other than the one leaving");
    }
    secondMember = await findMemberById(secondMemberId, tenantId);
    if (!secondMember) throw AppError.badRequest("Replacement member not found in this organization");
  }

  // Guard against a second ACTIVE holder of the slot (the partial unique index enforces it too, but a
  // clear message beats a duplicate-key error). Co-holders of a half ticket are other sub-tickets.
  const slotFilter = { tenantId, chitGroupId, ticketNumber: previous.ticketNumber, status: "ACTIVE" as const };
  const activeHolders = await ChitMembership.find(slotFilter);
  if (activeHolders.some((m) => [input.newMemberId, secondMemberId].includes(m.memberId.toString()))) {
    throw AppError.conflict("That member already holds an active share of this ticket");
  }

  const { rows, payments } = await loadPaymentRows(tenantId, membershipId, ctx);
  const snapshot = summarisePrevious(rows, input.effectiveCycleNumber);
  const { schedule: fullSchedule, terms: fullTerms } = computeRemainingInstalments(
    ctx,
    previous,
    rows,
    input.effectiveCycleNumber,
  );
  const [halfA, halfB] = halveSchedule(fullSchedule);
  const { settings: policy, financials, source: settingsSource, appliedDisplacement } = await loadFinancials(tenantId, ctx.chitGroup, previous, snapshot, fullTerms.totalPayable, {
    ctx,
    effectiveCycleNumber: input.effectiveCycleNumber,
    memberIds: split ? [input.newMemberId, secondMemberId] : [input.newMemberId],
    split,
  });
  assertFinancialsApplicable(financials);
  const terms = split ? termsOf(halfA) : fullTerms;
  const secondTerms = split ? termsOf(halfB) : undefined;
  const settlement = buildSettlement(snapshot, {
    refundAmount: input.settlement.refundAmountRupees !== undefined ? rupeesToPaise(input.settlement.refundAmountRupees) : undefined,
    deductionAmount: rupeesToPaise(input.settlement.deductionAmountRupees),
    deductionReason: input.settlement.deductionReason,
    notes: input.settlement.notes,
    commissionAmount: financials.commission.previousMemberShare,
  });

  const settleNow = policy.installmentSettlementMode === "IMMEDIATE";
  if (settleNow) {
    settlement.status = "SETTLED";
    settlement.settledAmount = Math.abs(settlement.netAmount);
    settlement.paidAmount = Math.abs(settlement.netAmount);
    settlement.method = input.paymentMethod;
    settlement.settledAt = new Date();
    settlement.settledBy = new Types.ObjectId(actorUserId);
  }
  const feeAmount = financials.fee.amount;
  const collectFeeNow = feeAmount > 0 && input.collectReplacementFee;
  // Commission the replacement owes the company is collected together with the fee when "received now" is ticked.
  const collectCommissionNow = financials.commission.replacementMemberShare > 0 && input.collectReplacementFee;

  const effectiveCycle = ctx.cycleByNumber.get(input.effectiveCycleNumber);
  const effectiveDate = effectiveCycle?.scheduledDate ?? new Date();
  const now = new Date();
  const numberByCycleId = new Map(ctx.cycles.map((c) => [c._id.toString(), c.cycleNumber]));

  const session = await mongoose.startSession();
  let replacement!: MembershipReplacementDocument;
  let newMembershipId = "";
  let secondNewMembershipId: string | undefined;
  try {
    await session.withTransaction(async () => {
      // 1. Close the outgoing membership. Its record and payment history stay exactly as they are.
      previous.status = "EXITED";
      previous.exitedAt = now;
      previous.lastCycleNumber = input.effectiveCycleNumber - 1;
      previous.exitReason = input.reason;
      await previous.save({ session }); // free the slot before the successor claims it

      // 2. Open the successor(s) in the same slot. A like-for-like replacement copies the slot (ticket,
      //    sub-ticket, share) verbatim; a split opens half A and half B of the same ticket instead, which
      //    leaves the group's total share untouched. A slot that already won stays won.
      const slotsToOpen = split
        ? [
            { memberId: input.newMemberId, subTicket: "A", shareType: "HALF" as const, share: 0.5 },
            { memberId: secondMemberId!, subTicket: "B", shareType: "HALF" as const, share: 0.5 },
          ]
        : [
            {
              memberId: input.newMemberId,
              subTicket: previous.subTicket,
              shareType: previous.shareType,
              share: previous.share,
            },
          ];
      const successors = await ChitMembership.create(
        slotsToOpen.map((slot) => ({
          tenantId,
          chitGroupId,
          memberId: slot.memberId,
          ticketNumber: previous.ticketNumber,
          subTicket: slot.subTicket,
          shareType: slot.shareType,
          share: slot.share,
          status: "ACTIVE",
          hasWon: previous.hasWon,
          joinedAt: now,
          effectiveFromCycleNumber: input.effectiveCycleNumber,
          replacesMembershipId: previous._id,
        })),
        { session, ordered: true },
      );
      const successor = successors[0]!;
      const secondSuccessor = successors[1];
      newMembershipId = successor._id.toString();
      secondNewMembershipId = secondSuccessor?._id.toString();
      previous.replacedByMembershipId = successor._id;
      await previous.save({ session });

      // 3. Hand over the unpaid dues for cycles from the effective cycle on. The outgoing member's own
      //    rows are only closed (WAIVED), never deleted or re-pointed; anything they already paid stays
      //    on their account for the settlement to refund. A split divides each due between the halves.
      const closedNote = `Closed: slot handed to a new member from cycle ${input.effectiveCycleNumber}`;
      const raisedForNew: Parameters<typeof insertInstallments>[0] = [];
      for (const payment of payments) {
        const cycleNumber = numberByCycleId.get(payment.chitCycleId.toString()) ?? 0;
        if (cycleNumber < input.effectiveCycleNumber) continue;
        const [amountA, amountB] = splitAmount(payment.amountDue);
        raisedForNew.push({
          tenantId,
          chitGroupId,
          chitCycleId: payment.chitCycleId,
          chitMembershipId: successor._id,
          amountDue: split ? amountA : payment.amountDue,
          dueDate: payment.dueDate,
        });
        if (secondSuccessor) {
          raisedForNew.push({
            tenantId,
            chitGroupId,
            chitCycleId: payment.chitCycleId,
            chitMembershipId: secondSuccessor._id,
            amountDue: amountB,
            dueDate: payment.dueDate,
          });
        }
        if (payment.status !== "PAID" && payment.status !== "WAIVED") {
          payment.status = "WAIVED";
          payment.notes = payment.notes ? `${payment.notes} | ${closedNote}` : closedNote;
          await payment.save({ session });
        }
      }

      await insertInstallments(raisedForNew, session);

      // 4. Permanent record of the handover and the outgoing member's (separate) settlement.
      const [created] = await MembershipReplacement.create(
        [
          {
            tenantId,
            chitGroupId,
            ticketNumber: previous.ticketNumber,
            subTicket: previous.subTicket,
            previousMembershipId: previous._id,
            previousMemberId: previous.memberId,
            newMembershipId: successor._id,
            newMemberId: input.newMemberId,
            ...(secondSuccessor
              ? {
                  secondNewMembershipId: secondSuccessor._id,
                  secondNewMemberId: secondMemberId,
                  secondNewMember: secondTerms,
                }
              : {}),
            effectiveCycleNumber: input.effectiveCycleNumber,
            effectiveDate,
            reason: input.reason,
            previous: snapshot,
            newMember: terms,
            settlement,
            policy: {
              installmentSettlementMode: policy.installmentSettlementMode,
              commissionOwnershipMode: policy.commissionOwnershipMode,
              replacementFeeMode: policy.replacementFeeMode,
              source: settingsSource,
            },
            // Ownership is recorded now; whether it has been paid out is tracked separately.
            // The previous member's share is netted off their settlement, so it is paid as soon as that settles.
            commission: {
              ...financials.commission,
              previousMemberPayment: settleNow || financials.commission.previousMemberShare === 0 ? "PAID" : "PENDING",
              replacementMemberPayment: collectCommissionNow || financials.commission.replacementMemberShare === 0 ? "PAID" : "PENDING",
            },
            fee: {
              mode: financials.fee.mode,
              base: financials.fee.base ?? undefined,
              baseAmount: financials.fee.baseAmount,
              percentage: financials.fee.percentage ?? undefined,
              amount: feeAmount,
              status: feeAmount === 0 ? "NOT_APPLICABLE" : collectFeeNow ? "COLLECTED" : "PENDING",
              method: collectFeeNow ? input.paymentMethod : undefined,
              collectedAt: collectFeeNow ? now : undefined,
            },
            replacedBy: actorUserId,
          },
        ],
        { session },
      );
      replacement = created!;

      // 5. Immutable commission allocation for this event (the unique index makes it idempotent).
      if (financials.allocation) {
        const alloc = financials.allocation;
        const newMembershipIds = successors.map((s) => s._id);
        let replacementIndex = 0;
        const holders = alloc.holders.map((h) => {
          const isNew = h.role === "REPLACEMENT";
          const membershipId = isNew ? newMembershipIds[replacementIndex] : h.membershipId;
          const memberId = isNew ? [input.newMemberId, secondMemberId][replacementIndex] : h.memberId;
          if (isNew) replacementIndex += 1;
          return {
            role: h.role,
            membershipId: new Types.ObjectId(String(membershipId)),
            memberId: new Types.ObjectId(String(memberId)),
            eligibleCycles: h.eligibleCycles,
            eligibleContribution: h.eligibleContribution,
            percentageBps: h.percentageBps,
            amount: h.amount,
          };
        });
        const bps = (amount: number) => (alloc.total > 0 ? Number((BigInt(amount) * 10000n) / BigInt(alloc.total)) : 0);
        await CommissionAllocation.create(
          [
            {
              tenantId,
              chitGroupId,
              ticketNumber: previous.ticketNumber,
              subTicket: previous.subTicket,
              commissionEventId: replacement._id,
              previousMemberId: previous.memberId,
              replacementMemberId: input.newMemberId,
              mode: alloc.mode,
              totalCommission: alloc.total,
              holders,
              previousMemberAmount: alloc.previousMemberShare,
              replacementMemberAmount: alloc.replacementMemberShare,
              organizationAmount: alloc.organizationShare,
              previousMemberPercentageBps: bps(alloc.previousMemberShare),
              replacementMemberPercentageBps: bps(alloc.replacementMemberShare),
              policySnapshot: JSON.parse(JSON.stringify(appliedDisplacement ?? { commissionOwnershipMode: policy.commissionOwnershipMode })),
              createdBy: actorUserId,
            },
          ],
          { session },
        );
      }

      // 6. Append-only ledger entries for money that actually moved at confirmation.
      const ledgerEntries: Record<string, unknown>[] = [];
      if (settleNow && settlement.netAmount !== 0) {
        ledgerEntries.push({
          tenantId,
          chitGroupId,
          type: "REPLACEMENT_SETTLEMENT",
          direction: settlement.netAmount > 0 ? "DEBIT" : "CREDIT",
          amount: Math.abs(settlement.netAmount),
          relatedReplacementId: replacement._id,
          memberId: previous.memberId,
          description: `${ctx.chitGroup.name}: exit settlement for ticket ${slotLabel(previous)} (${settlement.netAmount > 0 ? "paid to" : "collected from"} previous member)`,
          createdBy: actorUserId,
        });
      }
      if (collectFeeNow) {
        ledgerEntries.push({
          tenantId,
          chitGroupId,
          type: "REPLACEMENT_FEE",
          direction: "CREDIT",
          amount: feeAmount,
          relatedReplacementId: replacement._id,
          memberId: input.newMemberId,
          description: `${ctx.chitGroup.name}: replacement fee for ticket ${slotLabel(previous)}`,
          createdBy: actorUserId,
        });
      }
      const commissionLedger = (memberId: unknown, amount: number, who: string) =>
        ledgerEntries.push({
          tenantId,
          chitGroupId,
          type: "COMMISSION_EARNED",
          direction: "CREDIT",
          amount,
          relatedReplacementId: replacement._id,
          memberId,
          description: `${ctx.chitGroup.name}: commission for ticket ${slotLabel(previous)} paid by ${who} to the chit company`,
          createdBy: actorUserId,
        });
      if (settleNow && financials.commission.previousMemberShare > 0) commissionLedger(previous.memberId, financials.commission.previousMemberShare, "previous member");
      if (collectCommissionNow) commissionLedger(input.newMemberId, financials.commission.replacementMemberShare, "replacement member");
      if (ledgerEntries.length > 0) await Ledger.create(ledgerEntries, { session, ordered: true });
    });
  } finally {
    await session.endSession();
  }

  const previousMember = await findMemberById(previous.memberId.toString(), tenantId);
  await recordActivity({
    tenantId,
    userId: actorUserId,
    memberId: input.newMemberId,
    action: "CHIT_MEMBER_REPLACED",
    message: split
      ? `${ctx.chitGroup.name}: ticket ${slotLabel(previous)} split from ${previousMember?.name ?? "previous member"} into halves for ${newMember.name} (A) and ${secondMember?.name ?? "second member"} (B) from cycle ${input.effectiveCycleNumber}`
      : `${ctx.chitGroup.name}: ticket ${slotLabel(previous)} moved from ${previousMember?.name ?? "previous member"} to ${newMember.name} from cycle ${input.effectiveCycleNumber}`,
  });

  return { replacement, newMembershipId, secondNewMembershipId };
}

// --- Settlement of the outgoing member ---

async function loadReplacement(
  tenantId: string,
  chitGroupId: string,
  replacementId: string,
): Promise<MembershipReplacementDocument> {
  const replacement = await MembershipReplacement.findOne({ _id: replacementId, tenantId, chitGroupId });
  if (!replacement) throw AppError.notFound("Replacement record not found");
  return replacement;
}

export async function updateReplacementSettlement(
  tenantId: string,
  chitGroupId: string,
  replacementId: string,
  input: UpdateReplacementSettlementInput,
): Promise<MembershipReplacementDocument> {
  const replacement = await loadReplacement(tenantId, chitGroupId, replacementId);
  if (replacement.settlement.status === "SETTLED") {
    throw AppError.conflict("This settlement is already final and can no longer be changed");
  }
  if (paidOf(replacement.settlement) > 0) {
    throw AppError.conflict("Payments have already been made against this settlement, so its terms can no longer be changed");
  }
  const current = replacement.settlement;
  replacement.settlement = {
    ...buildSettlement(replacement.previous, {
      refundAmount: input.refundAmountRupees !== undefined ? rupeesToPaise(input.refundAmountRupees) : current.refundAmount,
      deductionAmount:
        input.deductionAmountRupees !== undefined ? rupeesToPaise(input.deductionAmountRupees) : current.deductionAmount,
      deductionReason: input.deductionReason ?? current.deductionReason,
      notes: input.notes ?? current.notes,
      commissionAmount: current.commissionAmount ?? 0,
    }),
  };
  return replacement.save();
}

export async function completeReplacementSettlement(
  tenantId: string,
  chitGroupId: string,
  replacementId: string,
  actorUserId: string,
  input: CompleteReplacementSettlementInput,
): Promise<MembershipReplacementDocument> {
  const replacement = await loadReplacement(tenantId, chitGroupId, replacementId);
  const owed = Math.abs(replacement.settlement.netAmount);
  const paid = paidOf(replacement.settlement);
  const outstanding = owed - paid;
  if (outstanding <= 0) throw AppError.conflict("This settlement has already been completed");

  // Pays the whole outstanding balance unless a smaller part is given; never more than what is still owed.
  const amount = input.settledAmountRupees !== undefined ? rupeesToPaise(input.settledAmountRupees) : outstanding;
  if (amount <= 0) throw AppError.badRequest("Enter an amount greater than zero");
  if (amount > outstanding) {
    throw AppError.badRequest(`The amount is more than the remaining balance of ${outstanding / 100} rupees`);
  }
  const paidAfter = paid + amount;
  const fullyPaid = paidAfter >= owed;
  const now = new Date();
  const net = replacement.settlement.netAmount;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // The paidAmount condition makes the update atomic: two clicks or two tabs cannot both pay the same balance.
      const updated = await MembershipReplacement.findOneAndUpdate(
        {
          _id: replacement._id,
          tenantId,
          $or: [{ "settlement.paidAmount": paid }, ...(paid === 0 ? [{ "settlement.paidAmount": { $exists: false } }] : [])],
          "settlement.status": "PENDING",
        },
        {
          $set: {
            "settlement.paidAmount": paidAfter,
            "settlement.method": input.method,
            ...(fullyPaid
              ? {
                  "settlement.status": "SETTLED",
                  "settlement.settledAmount": owed,
                  "settlement.settledAt": now,
                  "settlement.settledBy": new Types.ObjectId(actorUserId),
                  ...(replacement.commission ? { "commission.previousMemberPayment": "PAID" } : {}),
                }
              : {}),
            ...(input.notes
              ? { "settlement.notes": replacement.settlement.notes ? `${replacement.settlement.notes} | ${input.notes}` : input.notes }
              : {}),
          },
        },
        { session, new: true },
      );
      if (!updated) throw AppError.conflict("This settlement was just updated by someone else. Reload and try again.");

      await Ledger.create(
        [
          {
            tenantId,
            chitGroupId,
            type: "REPLACEMENT_SETTLEMENT",
            direction: net > 0 ? "DEBIT" : "CREDIT",
            amount,
            relatedReplacementId: replacement._id,
            memberId: replacement.previousMemberId,
            description: `Exit settlement for ticket ${slotLabel(replacement)} (${net > 0 ? "paid to" : "collected from"} previous member${fullyPaid ? "" : ", part payment"})`,
            createdBy: actorUserId,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await recordActivity({
    tenantId,
    userId: actorUserId,
    memberId: replacement.previousMemberId,
    action: "CHIT_REPLACEMENT_SETTLED",
    message: `Exit settlement for ticket ${slotLabel(replacement)}: ${amount / 100} ${fullyPaid ? "completed" : "part payment"} (net ${net / 100})`,
  });
  return loadReplacement(tenantId, chitGroupId, replacementId);
}

// --- Exit settlements for a ticket (shown on the auction settlement card) ---

export async function listTicketExitSettlements(
  tenantId: string,
  chitGroupId: string,
  ticketNumber: number,
  /** Total set aside for each refund across this ticket's prize payouts, by replacement id. */
  prizeAllocation: Map<string, number> = new Map(),
) {
  const replacements = await MembershipReplacement.find({ tenantId, chitGroupId, ticketNumber }).sort({
    effectiveCycleNumber: 1,
  });
  return Promise.all(
    replacements.map(async (r) => {
      const previousMember = await findMemberById(r.previousMemberId.toString(), tenantId);
      const owed = Math.abs(r.settlement.netAmount);
      const paid = paidOf(r.settlement);
      const entitlement = Math.max(0, r.settlement.netAmount);
      const allocated = prizeAllocation.get(r._id.toString()) ?? 0;
      return {
        replacementId: r._id.toString(),
        previousMemberName: previousMember?.name ?? "Previous member",
        previousMemberCode: previousMember?.memberCode ?? "",
        slotLabel: slotLabel(r),
        effectiveCycleNumber: r.effectiveCycleNumber,
        totalPaid: r.previous.totalPaid + r.previous.prepaidAmount,
        refundAmount: r.settlement.refundAmount,
        pendingDues: r.settlement.pendingDues,
        deductionAmount: r.settlement.deductionAmount,
        netAmount: r.settlement.netAmount,
        /** What the previous member is owed in total. */
        entitlement,
        /** Already paid out (or collected); counted as distributed, never paid again. */
        previouslyPaid: paid,
        /** The part of the prize set aside for this refund (0 when the ticket has not won since). */
        prizeAllocation: allocated,
        /** What still has to be paid at settlement. */
        remainingPayable: allocated > 0 ? refundRemaining(allocated, paid) : Math.max(0, owed - paid),
        /** Entitlement the prize could not cover — stays outstanding and needs a financial review. */
        shortfall: allocated > 0 ? Math.max(0, entitlement - allocated) : 0,
        status: r.settlement.status,
        settledAmount: r.settlement.settledAmount ?? null,
        settledAt: r.settlement.settledAt ?? null,
      };
    }),
  );
}

// --- Refund list (every exit settlement, paid and unpaid) ---

export type RefundListStatus = "UNPAID" | "PARTIAL" | "PAID";

/** All previous-member settlements in the organisation, newest first, with what is paid and what is still due. */
export async function listRefunds(tenantId: string, filter: { status?: RefundListStatus; chitGroupId?: string }) {
  const replacements = await MembershipReplacement.find({ tenantId, ...(filter.chitGroupId ? { chitGroupId: filter.chitGroupId } : {}) })
    .sort({ createdAt: -1 })
    .limit(500);

  const groupIds = [...new Set(replacements.map((r) => r.chitGroupId.toString()))];
  const memberIds = [...new Set(replacements.flatMap((r) => [r.previousMemberId.toString(), r.newMemberId.toString()]))];
  const [groups, members] = await Promise.all([
    ChitGroup.find({ tenantId, _id: { $in: groupIds } }).select("name"),
    Member.find({ tenantId, _id: { $in: memberIds } }).select("name memberCode"),
  ]);
  const groupName = new Map(groups.map((g) => [g._id.toString(), g.name]));
  const memberById = new Map(members.map((m) => [m._id.toString(), m]));

  const items = replacements
    .map((r) => {
      const owed = Math.abs(r.settlement.netAmount);
      const paid = Math.min(owed, paidOf(r.settlement));
      const status: RefundListStatus = owed > 0 && paid >= owed ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
      const prev = memberById.get(r.previousMemberId.toString());
      const next = memberById.get(r.newMemberId.toString());
      return {
        replacementId: r._id.toString(),
        chitGroupId: r.chitGroupId.toString(),
        groupName: groupName.get(r.chitGroupId.toString()) ?? "Chit group",
        ticket: slotLabel(r),
        previousMember: { name: prev?.name ?? "Previous member", memberCode: prev?.memberCode ?? "" },
        replacedBy: next?.name ?? "",
        effectiveCycleNumber: r.effectiveCycleNumber,
        replacedOn: r.effectiveDate,
        /** PAY = the organisation owes the previous member; COLLECT = the previous member owes the organisation. */
        direction: r.settlement.netAmount >= 0 ? ("PAY" as const) : ("COLLECT" as const),
        owed,
        paid,
        outstanding: Math.max(0, owed - paid),
        status,
        method: r.settlement.method ?? null,
        settledAt: r.settlement.settledAt ?? null,
      };
    })
    .filter((i) => i.owed > 0 && (!filter.status || i.status === filter.status));

  const sum = (rows: typeof items, key: "owed" | "paid" | "outstanding") => rows.reduce((t, r) => t + r[key], 0);
  return {
    items,
    totals: {
      owed: sum(items, "owed"),
      paid: sum(items, "paid"),
      outstanding: sum(items, "outstanding"),
    },
  };
}

// --- Membership history ---

export async function getMembershipHistory(tenantId: string, chitGroupId: string) {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");

  const [memberships, replacements, totals] = await Promise.all([
    ChitMembership.find({ tenantId, chitGroupId })
      .sort({ ticketNumber: 1, joinedAt: 1 })
      .populate<{ memberId: { _id: Types.ObjectId; name: string; memberCode: string; phone: string } | null }>({
        path: "memberId",
        select: "name memberCode phone",
      }),
    MembershipReplacement.find({ tenantId, chitGroupId }),
    Payment.aggregate<{ _id: Types.ObjectId; totalDue: number; totalPaid: number; instalments: number; paidInstalments: number }>([
      { $match: { tenantId: new Types.ObjectId(tenantId), chitGroupId: new Types.ObjectId(chitGroupId) } },
      {
        $group: {
          _id: "$chitMembershipId",
          totalDue: { $sum: { $cond: [{ $eq: ["$status", "WAIVED"] }, 0, "$amountDue"] } },
          totalPaid: { $sum: "$amountPaid" },
          instalments: { $sum: { $cond: [{ $eq: ["$status", "WAIVED"] }, 0, 1] } },
          paidInstalments: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const totalsById = new Map(totals.map((t) => [t._id.toString(), t]));
  const replacementByPrevious = new Map(replacements.map((r) => [r.previousMembershipId.toString(), r]));

  const slots = new Map<string, { ticketNumber: number; subTicket: string | null; label: string; entries: unknown[] }>();
  for (const m of memberships) {
    const key = `${m.ticketNumber}:${m.subTicket ?? ""}`;
    const slot = slots.get(key) ?? {
      ticketNumber: m.ticketNumber,
      subTicket: m.subTicket ?? null,
      label: slotLabel(m),
      entries: [],
    };
    const t = totalsById.get(m._id.toString());
    const replacement = replacementByPrevious.get(m._id.toString());
    slot.entries.push({
      membershipId: m._id.toString(),
      status: m.status,
      member: m.memberId
        ? { id: m.memberId._id.toString(), name: m.memberId.name, memberCode: m.memberId.memberCode, phone: m.memberId.phone }
        : null,
      joinedAt: m.joinedAt,
      fromCycleNumber: m.effectiveFromCycleNumber ?? 1,
      toCycleNumber: m.status === "EXITED" ? (m.lastCycleNumber ?? null) : null,
      exitedAt: m.exitedAt ?? null,
      exitReason: m.exitReason ?? null,
      hasWon: m.hasWon,
      account: {
        totalDue: t?.totalDue ?? 0,
        totalPaid: t?.totalPaid ?? 0,
        instalments: t?.instalments ?? 0,
        paidInstalments: t?.paidInstalments ?? 0,
      },
      replacement: replacement
        ? {
            id: replacement._id.toString(),
            effectiveCycleNumber: replacement.effectiveCycleNumber,
            settlement: replacement.settlement,
            commission: replacement.commission ?? null,
            fee: replacement.fee ?? null,
          }
        : null,
    });
    slots.set(key, slot);
  }

  return { slots: [...slots.values()] };
}
