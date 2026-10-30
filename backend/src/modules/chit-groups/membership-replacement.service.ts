import mongoose, { Types } from "mongoose";

import { recordActivity } from "../activity-logs/activity-log.service.js";
import { ChitCycle, type ChitCycleDocument } from "../chit-cycles/chit-cycle.model.js";
import { findMemberById } from "../members/member.repository.js";
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
import type {
  CompleteReplacementSettlementInput,
  ReplaceMemberInput,
  UpdateReplacementSettlementInput,
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

function buildSettlement(
  snapshot: PreviousMemberSnapshot,
  input: { refundAmount?: number; deductionAmount?: number; deductionReason?: string; notes?: string },
): ReplacementSettlement {
  const refundAmount = input.refundAmount ?? snapshot.prepaidAmount;
  const deductionAmount = input.deductionAmount ?? 0;
  return {
    status: "PENDING",
    pendingDues: snapshot.pendingDues,
    refundAmount,
    deductionAmount,
    deductionReason: input.deductionReason,
    netAmount: refundAmount - snapshot.pendingDues - deductionAmount,
    notes: input.notes,
  };
}

// --- Preview ---

export async function previewReplacement(
  tenantId: string,
  chitGroupId: string,
  membershipId: string,
  query: { effectiveCycleNumber?: number; newMemberId?: string },
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
  const settlement = buildSettlement(snapshot, {});

  const [previousMember, newMember] = await Promise.all([
    loadMemberRef(tenantId, previous.memberId.toString()),
    query.newMemberId ? loadMemberRef(tenantId, query.newMemberId) : Promise.resolve(null),
  ]);
  if (query.newMemberId && !newMember) throw AppError.badRequest("Replacement member not found in this organization");

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
    newMember: { member: newMember, ...terms, schedule },
    settlement,
  };
}

// --- Replace ---

export interface ReplacementResult {
  replacement: MembershipReplacementDocument;
  newMembershipId: string;
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

  // Guard against a second ACTIVE holder of the slot (the partial unique index enforces it too, but a
  // clear message beats a duplicate-key error). Co-holders of a half ticket are other sub-tickets.
  const slotFilter = { tenantId, chitGroupId, ticketNumber: previous.ticketNumber, status: "ACTIVE" as const };
  const activeHolders = await ChitMembership.find(slotFilter);
  if (activeHolders.some((m) => m.memberId.toString() === input.newMemberId)) {
    throw AppError.conflict("That member already holds an active share of this ticket");
  }

  const { rows, payments } = await loadPaymentRows(tenantId, membershipId, ctx);
  const snapshot = summarisePrevious(rows, input.effectiveCycleNumber);
  const { terms } = computeRemainingInstalments(ctx, previous, rows, input.effectiveCycleNumber);
  const settlement = buildSettlement(snapshot, {
    refundAmount: input.settlement.refundAmountRupees !== undefined ? rupeesToPaise(input.settlement.refundAmountRupees) : undefined,
    deductionAmount: rupeesToPaise(input.settlement.deductionAmountRupees),
    deductionReason: input.settlement.deductionReason,
    notes: input.settlement.notes,
  });

  const effectiveCycle = ctx.cycleByNumber.get(input.effectiveCycleNumber);
  const effectiveDate = effectiveCycle?.scheduledDate ?? new Date();
  const now = new Date();
  const numberByCycleId = new Map(ctx.cycles.map((c) => [c._id.toString(), c.cycleNumber]));

  const session = await mongoose.startSession();
  let replacement!: MembershipReplacementDocument;
  let newMembershipId = "";
  try {
    await session.withTransaction(async () => {
      // 1. Close the outgoing membership. Its record and payment history stay exactly as they are.
      previous.status = "EXITED";
      previous.exitedAt = now;
      previous.lastCycleNumber = input.effectiveCycleNumber - 1;
      previous.exitReason = input.reason;
      await previous.save({ session }); // free the slot before the successor claims it

      // 2. Open the successor in the same slot. The slot (ticket, sub-ticket, share) is copied verbatim,
      //    so the group's configuration is untouched. A slot that already won stays won.
      const [successor] = await ChitMembership.create(
        [
          {
            tenantId,
            chitGroupId,
            memberId: input.newMemberId,
            ticketNumber: previous.ticketNumber,
            subTicket: previous.subTicket,
            shareType: previous.shareType,
            share: previous.share,
            status: "ACTIVE",
            hasWon: previous.hasWon,
            joinedAt: now,
            effectiveFromCycleNumber: input.effectiveCycleNumber,
            replacesMembershipId: previous._id,
          },
        ],
        { session },
      );
      newMembershipId = successor!._id.toString();
      previous.replacedByMembershipId = successor!._id;
      await previous.save({ session });

      // 3. Hand over the unpaid dues for cycles from the effective cycle on. The outgoing member's own
      //    rows are only closed (WAIVED), never deleted or re-pointed; anything they already paid stays
      //    on their account for the settlement to refund.
      const closedNote = `Closed: slot handed to a new member from cycle ${input.effectiveCycleNumber}`;
      const raisedForNew: Parameters<typeof insertInstallments>[0] = [];
      for (const payment of payments) {
        const cycleNumber = numberByCycleId.get(payment.chitCycleId.toString()) ?? 0;
        if (cycleNumber < input.effectiveCycleNumber) continue;
        raisedForNew.push({
          tenantId,
          chitGroupId,
          chitCycleId: payment.chitCycleId,
          chitMembershipId: successor!._id,
          amountDue: payment.amountDue,
          dueDate: payment.dueDate,
        });
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
            newMembershipId: successor!._id,
            newMemberId: input.newMemberId,
            effectiveCycleNumber: input.effectiveCycleNumber,
            effectiveDate,
            reason: input.reason,
            previous: snapshot,
            newMember: terms,
            settlement,
            replacedBy: actorUserId,
          },
        ],
        { session },
      );
      replacement = created!;
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
    message: `${ctx.chitGroup.name}: ticket ${slotLabel(previous)} moved from ${previousMember?.name ?? "previous member"} to ${newMember.name} from cycle ${input.effectiveCycleNumber}`,
  });

  return { replacement, newMembershipId };
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
  const current = replacement.settlement;
  replacement.settlement = {
    ...buildSettlement(replacement.previous, {
      refundAmount: input.refundAmountRupees !== undefined ? rupeesToPaise(input.refundAmountRupees) : current.refundAmount,
      deductionAmount:
        input.deductionAmountRupees !== undefined ? rupeesToPaise(input.deductionAmountRupees) : current.deductionAmount,
      deductionReason: input.deductionReason ?? current.deductionReason,
      notes: input.notes ?? current.notes,
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
  if (replacement.settlement.status === "SETTLED") {
    throw AppError.conflict("This settlement has already been completed");
  }
  const settlement = replacement.settlement;
  settlement.status = "SETTLED";
  settlement.settledAmount =
    input.settledAmountRupees !== undefined ? rupeesToPaise(input.settledAmountRupees) : Math.abs(settlement.netAmount);
  settlement.method = input.method;
  settlement.settledAt = new Date();
  settlement.settledBy = new Types.ObjectId(actorUserId);
  if (input.notes) settlement.notes = settlement.notes ? `${settlement.notes} | ${input.notes}` : input.notes;
  replacement.markModified("settlement");
  await replacement.save();

  await recordActivity({
    tenantId,
    userId: actorUserId,
    memberId: replacement.previousMemberId,
    action: "CHIT_REPLACEMENT_SETTLED",
    message: `Exit settlement for ticket ${slotLabel(replacement)} completed (net ${settlement.netAmount / 100})`,
  });
  return replacement;
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
        ? { id: replacement._id.toString(), effectiveCycleNumber: replacement.effectiveCycleNumber, settlement: replacement.settlement }
        : null,
    });
    slots.set(key, slot);
  }

  return { slots: [...slots.values()] };
}
