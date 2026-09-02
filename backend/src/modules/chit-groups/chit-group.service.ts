import mongoose, { Types } from "mongoose";

import { insertChitCycles, listChitCycles as repoListChitCycles } from "../chit-cycles/chit-cycle.repository.js";
import { findMemberById, listMembersByIds } from "../members/member.repository.js";
import { findTenantById } from "../tenants/tenant.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { AttachmentEntry } from "../../utils/attachment.js";
import { percentageOfPaise, rupeesToPaise } from "../../utils/money.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";
import type { ChitGroupDocument } from "./chit-group.model.js";
import {
  createChitGroup as repoCreateChitGroup,
  findChitGroupById,
  listChitGroups as repoListChitGroups,
  saveChitGroup,
} from "./chit-group.repository.js";
import { ChitMembership, type ChitMembershipDocument } from "./chit-membership.model.js";
import {
  countChitMemberships,
  createChitMembership,
  deleteChitMembership,
  findChitMembershipByIdOrMemberId,
  listChitMemberships as repoListChitMemberships,
  listTicketSlotInfos,
  sumChitMembershipShares,
  type TicketSlotInfo,
} from "./chit-membership.repository.js";
import { computeEndDate, computeScheduleDates, FREQUENCY_LABELS } from "./chit-schedule.js";
import type {
  AddChitDocumentInput,
  AssignMembersInput,
  CreateChitGroupInput,
  EnrollMemberInput,
  ListChitGroupsQuery,
  UpdateChitGroupInput,
} from "./chit-group.validators.js";

export async function createChitGroup(
  tenantId: string,
  createdBy: string,
  input: CreateChitGroupInput,
): Promise<ChitGroupDocument> {
  const chitValue = rupeesToPaise(input.chitValueRupees);

  if (chitValue % input.totalMembers !== 0) {
    throw AppError.badRequest(
      `chitValueRupees must be exactly divisible by totalMembers (${input.totalMembers}) so monthly ` +
        "installments sum precisely to the chit value",
    );
  }

  if (input.frequency === "CUSTOM" && !input.customIntervalDays) {
    throw AppError.badRequest("customIntervalDays is required when frequency is CUSTOM");
  }

  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw AppError.notFound("Tenant not found");
  }

  const maxBidDiscountPercent =
    input.auctionRules.maxBidDiscountPercent ?? tenant.settings.defaultMaxBidDiscountPercent;
  if (input.auctionRules.minBidDiscountPercent > maxBidDiscountPercent) {
    throw AppError.badRequest("minBidDiscountPercent cannot exceed maxBidDiscountPercent");
  }

  const endDate = computeEndDate({
    startDate: input.startDate,
    frequency: input.frequency,
    count: input.totalMembers,
    customIntervalDays: input.customIntervalDays,
  });

  return repoCreateChitGroup({
    tenantId,
    name: input.name,
    registrationNumber: input.registrationNumber,
    chitValue,
    totalMembers: input.totalMembers,
    installmentAmount: chitValue / input.totalMembers,
    frequency: input.frequency,
    customIntervalDays: input.customIntervalDays,
    startDate: input.startDate,
    endDate,
    auctionRules: {
      allotmentMethod: input.auctionRules.allotmentMethod,
      foremanCommissionPercent:
        input.auctionRules.foremanCommissionPercent ?? tenant.settings.defaultForemanCommissionPercent,
      minBidDiscountPercent: input.auctionRules.minBidDiscountPercent,
      maxBidDiscountPercent,
      bidIncrementPercent: input.auctionRules.bidIncrementPercent,
    },
    termsAndConditions: input.termsAndConditions,
    status: "DRAFT",
    currentCycleNumber: 0,
    createdBy,
  });
}

export async function getChitGroupById(tenantId: string, chitGroupId: string): Promise<ChitGroupDocument> {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) {
    throw AppError.notFound("Chit group not found");
  }
  return chitGroup;
}

export async function updateChitGroup(
  tenantId: string,
  chitGroupId: string,
  input: UpdateChitGroupInput,
): Promise<ChitGroupDocument> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  const isDraft = chitGroup.status === "DRAFT";

  // Always editable, at any status.
  if (input.name !== undefined) chitGroup.name = input.name;
  if (input.termsAndConditions !== undefined) chitGroup.termsAndConditions = input.termsAndConditions;

  // Auction rules are safe to tune until the first cycle settles; we gate on DRAFT for simplicity.
  if (input.auctionRules !== undefined) {
    if (!isDraft) {
      throw AppError.conflict("Auction rules can only be changed while the chit group is in DRAFT status");
    }
    if (input.auctionRules.minBidDiscountPercent > input.auctionRules.maxBidDiscountPercent) {
      throw AppError.badRequest("minBidDiscountPercent cannot exceed maxBidDiscountPercent");
    }
    chitGroup.auctionRules = input.auctionRules;
  }

  // Structural fields reshape the schedule/pot and are locked once the scheme leaves DRAFT.
  const structuralChange =
    input.startDate !== undefined || input.frequency !== undefined || input.customIntervalDays !== undefined;
  if (structuralChange) {
    if (!isDraft) {
      throw AppError.conflict("Schedule can only be changed while the chit group is in DRAFT status");
    }
    if (input.startDate !== undefined) chitGroup.startDate = input.startDate;
    if (input.frequency !== undefined) chitGroup.frequency = input.frequency;
    if (input.customIntervalDays !== undefined) chitGroup.customIntervalDays = input.customIntervalDays;

    if (chitGroup.frequency === "CUSTOM" && !chitGroup.customIntervalDays) {
      throw AppError.badRequest("customIntervalDays is required when frequency is CUSTOM");
    }
    chitGroup.endDate = computeEndDate({
      startDate: chitGroup.startDate,
      frequency: chitGroup.frequency,
      count: chitGroup.totalMembers,
      customIntervalDays: chitGroup.customIntervalDays,
    });
  }

  return saveChitGroup(chitGroup);
}

export async function listChitGroups(
  tenantId: string,
  query: ListChitGroupsQuery & { groupIds?: string[] },
): Promise<PaginatedResult<ChitGroupDocument>> {
  return repoListChitGroups({ tenantId, status: query.status, groupIds: query.groupIds }, query);
}

// --- Member assignment ---

async function assertAssignableMember(tenantId: string, memberId: string): Promise<void> {
  const member = await findMemberById(memberId, tenantId);
  if (!member) {
    throw AppError.badRequest("Member not found in this organization");
  }
  if (member.status !== "ACTIVE") {
    member.status = "ACTIVE";
    await member.save();
  }
}

function findNextAvailableSlot(
  totalMembers: number,
  slotMap: Map<number, TicketSlotInfo>,
  shareType: "FULL" | "HALF",
): { ticketNumber: number; subTicket?: string } {
  if (shareType === "HALF") {
    // 1. Look for an existing ticket that already has 1 half share (subTicket A or B)
    for (let t = 1; t <= totalMembers; t += 1) {
      const slot = slotMap.get(t);
      if (slot && !slot.isFull) {
        if (!slot.hasSubTicketA) return { ticketNumber: t, subTicket: "A" };
        if (!slot.hasSubTicketB) return { ticketNumber: t, subTicket: "B" };
      }
    }
    // 2. Otherwise look for the first completely empty ticket
    for (let t = 1; t <= totalMembers; t += 1) {
      if (!slotMap.has(t)) {
        return { ticketNumber: t, subTicket: "A" };
      }
    }
  } else {
    // FULL share: look for the first completely empty ticket
    for (let t = 1; t <= totalMembers; t += 1) {
      if (!slotMap.has(t)) {
        return { ticketNumber: t, subTicket: undefined };
      }
    }
  }
  throw AppError.conflict("This chit group's roster is already full");
}

export async function assignMember(
  tenantId: string,
  chitGroupId: string,
  input: EnrollMemberInput,
): Promise<ChitMembershipDocument> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  if (chitGroup.status !== "DRAFT") {
    throw AppError.conflict("Members can only be added while the chit group is NOT STARTED (DRAFT status)");
  }

  await assertAssignableMember(tenantId, input.memberId);

  const scope = { tenantId, chitGroupId };
  const shareType = input.shareType ?? "FULL";
  const share = shareType === "HALF" ? 0.5 : 1;

  const currentTotalShares = await sumChitMembershipShares(scope);
  if (currentTotalShares + share > chitGroup.totalMembers + 0.001) {
    throw AppError.conflict("This chit group's roster is already full");
  }

  const slotInfos = await listTicketSlotInfos(scope);
  const slotMap = new Map(slotInfos.map((s) => [s.ticketNumber, s]));

  let ticketNumber = input.ticketNumber;
  let subTicket = input.subTicket;

  if (ticketNumber !== undefined) {
    if (ticketNumber < 1 || ticketNumber > chitGroup.totalMembers) {
      throw AppError.badRequest(`ticketNumber must be between 1 and ${chitGroup.totalMembers}`);
    }
    const existingSlot = slotMap.get(ticketNumber);
    if (shareType === "FULL") {
      if (existingSlot && existingSlot.totalShare > 0) {
        throw AppError.conflict(`Ticket number ${ticketNumber} is already occupied`);
      }
      subTicket = undefined;
    } else {
      // HALF
      if (existingSlot) {
        if (existingSlot.isFull || existingSlot.totalShare >= 1) {
          throw AppError.conflict(`Ticket number ${ticketNumber} is already fully occupied`);
        }
        if (!subTicket) {
          subTicket = !existingSlot.hasSubTicketA ? "A" : "B";
        } else {
          if (subTicket === "A" && existingSlot.hasSubTicketA) {
            throw AppError.conflict(`Ticket number ${ticketNumber}A is already assigned`);
          }
          if (subTicket === "B" && existingSlot.hasSubTicketB) {
            throw AppError.conflict(`Ticket number ${ticketNumber}B is already assigned`);
          }
        }
      } else {
        if (!subTicket) subTicket = "A";
      }
    }
  } else {
    const allocated = findNextAvailableSlot(chitGroup.totalMembers, slotMap, shareType);
    ticketNumber = allocated.ticketNumber;
    subTicket = allocated.subTicket;
  }

  return createChitMembership({
    tenantId,
    chitGroupId,
    memberId: input.memberId,
    ticketNumber,
    shareType,
    share,
    subTicket,
    status: "ACTIVE",
  });
}

export interface BulkAssignResult {
  assigned: number;
  skipped: { memberId: string; reason: string }[];
}

export async function assignMembers(
  tenantId: string,
  chitGroupId: string,
  input: AssignMembersInput,
): Promise<BulkAssignResult> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  if (chitGroup.status !== "DRAFT") {
    throw AppError.conflict("Members can only be assigned while the chit group is NOT STARTED (DRAFT status)");
  }

  const scope = { tenantId, chitGroupId };
  let currentTotalShares = await sumChitMembershipShares(scope);

  const slotInfos = await listTicketSlotInfos(scope);
  const slotMap = new Map(slotInfos.map((s) => [s.ticketNumber, { ...s }]));

  const rawAssignments =
    input.assignments && input.assignments.length > 0
      ? input.assignments
      : (input.memberIds || []).map((memberId) => ({
          memberId,
          shareType: input.shareType ?? ("FULL" as const),
          ticketNumber: undefined,
          subTicket: undefined,
        }));

  const allMemberIds = rawAssignments.map((a) => a.memberId);
  const members = await listMembersByIds(allMemberIds, tenantId);
  const memberById = new Map(members.map((member) => [member._id.toString(), member]));

  const skipped: { memberId: string; reason: string }[] = [];
  let assigned = 0;

  for (const item of rawAssignments) {
    const shareType = item.shareType ?? "FULL";
    const share = shareType === "HALF" ? 0.5 : 1;

    if (currentTotalShares + share > chitGroup.totalMembers + 0.001) {
      skipped.push({ memberId: item.memberId, reason: "Roster is full" });
      continue;
    }

    const member = memberById.get(item.memberId);
    if (!member) {
      skipped.push({ memberId: item.memberId, reason: "Member not found in this organization" });
      continue;
    }

    if (member.status !== "ACTIVE") {
      member.status = "ACTIVE";
      await member.save();
    }

    let ticketNumber = item.ticketNumber;
    let subTicket = item.subTicket;

    try {
      if (ticketNumber !== undefined) {
        if (ticketNumber < 1 || ticketNumber > chitGroup.totalMembers) {
          skipped.push({ memberId: item.memberId, reason: `Ticket must be between 1 and ${chitGroup.totalMembers}` });
          continue;
        }
        const existing = slotMap.get(ticketNumber);
        if (shareType === "FULL") {
          if (existing && existing.totalShare > 0) {
            skipped.push({ memberId: item.memberId, reason: `Ticket #${ticketNumber} is occupied` });
            continue;
          }
          subTicket = undefined;
        } else {
          if (existing && (existing.isFull || existing.totalShare >= 1)) {
            skipped.push({ memberId: item.memberId, reason: `Ticket #${ticketNumber} is full` });
            continue;
          }
          if (!subTicket) {
            subTicket = existing?.hasSubTicketA ? "B" : "A";
          }
        }
      } else {
        const allocated = findNextAvailableSlot(chitGroup.totalMembers, slotMap, shareType);
        ticketNumber = allocated.ticketNumber;
        subTicket = allocated.subTicket;
      }

      await createChitMembership({
        tenantId,
        chitGroupId,
        memberId: item.memberId,
        ticketNumber,
        shareType,
        share,
        subTicket,
        status: "ACTIVE",
      });

      // Update in-memory slotMap
      const currentSlot = slotMap.get(ticketNumber) || {
        ticketNumber,
        totalShare: 0,
        hasSubTicketA: false,
        hasSubTicketB: false,
        isFull: false,
      };
      currentSlot.totalShare += share;
      if (subTicket === "A") currentSlot.hasSubTicketA = true;
      if (subTicket === "B") currentSlot.hasSubTicketB = true;
      if (currentSlot.totalShare >= 1 || shareType === "FULL") currentSlot.isFull = true;
      slotMap.set(ticketNumber, currentSlot);

      currentTotalShares += share;
      assigned += 1;
    } catch (err: any) {
      skipped.push({ memberId: item.memberId, reason: err?.message || "Failed to assign slot" });
    }
  }

  return { assigned, skipped };
}

export async function removeMember(tenantId: string, chitGroupId: string, membershipId: string): Promise<void> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  if (chitGroup.status !== "DRAFT") {
    throw AppError.conflict("Members can only be removed while the chit group is NOT STARTED (DRAFT status)");
  }

  const membership = await findChitMembershipByIdOrMemberId(tenantId, chitGroupId, membershipId);
  if (!membership) {
    throw AppError.notFound("Membership not found");
  }

  if (membership.hasWon) {
    throw AppError.conflict("Cannot remove a member who has already won an auction in this group");
  }

  const removed = await deleteChitMembership(tenantId, chitGroupId, membership._id.toString());
  if (!removed) {
    throw AppError.notFound("Membership not found");
  }
}

// --- Activation (schedule-aware cycle generation) ---

export async function activateChitGroup(tenantId: string, chitGroupId: string): Promise<ChitGroupDocument> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  if (chitGroup.status !== "DRAFT") {
    throw AppError.conflict("Only a DRAFT chit group can be activated");
  }

  const scope = { tenantId, chitGroupId };
  const enrolledCount = await countChitMemberships(scope, { status: "ACTIVE" });
  if (enrolledCount === 0) {
    throw AppError.conflict("At least 1 member must be enrolled before activating the chit group");
  }

  const scheduleDates = computeScheduleDates({
    startDate: chitGroup.startDate,
    frequency: chitGroup.frequency,
    count: chitGroup.totalMembers,
    customIntervalDays: chitGroup.customIntervalDays,
  });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const cycles = scheduleDates.map((scheduledDate, index) => ({
        tenantId,
        chitGroupId,
        cycleNumber: index + 1,
        scheduledDate,
        status: "SCHEDULED" as const,
        totalPotAmount: chitGroup.chitValue,
      }));

      await insertChitCycles(cycles, session);

      chitGroup.status = "ACTIVE";
      await saveChitGroup(chitGroup, session);
    });
  } finally {
    await session.endSession();
  }

  return chitGroup;
}

// --- Roster / schedule / installments ---

export async function listMembers(
  tenantId: string,
  chitGroupId: string,
  query: PaginationQuery,
  requestingMemberId?: string,
): Promise<PaginatedResult<any>> {
  await getChitGroupById(tenantId, chitGroupId);
  const result = await repoListChitMemberships({ tenantId, chitGroupId }, query);

  if (!requestingMemberId) {
    return result;
  }

  // Mask other members' personal information for privacy
  const items = result.items.map((membership) => {
    const raw: any = membership.toObject ? membership.toObject() : { ...membership };
    const memberObj: any = raw.memberId || {};
    const memberIdStr = memberObj._id ? memberObj._id.toString() : (memberObj.id || memberObj.toString?.() || "");

    if (memberIdStr === requestingMemberId) {
      // Current member's own slot — keep unmasked
      return raw;
    }

    // Other member's slot — mask personal info
    return {
      ...raw,
      memberId: {
        _id: memberIdStr,
        name: `Member (Slot #${raw.ticketNumber}${raw.subTicket || ""})`,
        memberCode: "—",
        phone: "",
      },
    };
  });

  return {
    ...result,
    items,
  };
}

export async function listCycles(
  tenantId: string,
  chitGroupId: string,
  query: PaginationQuery,
): Promise<PaginatedResult<any>> {
  await getChitGroupById(tenantId, chitGroupId);
  const result = await repoListChitCycles({ tenantId, chitGroupId }, query);

  const winnerMembershipIds = result.items
    .map((c) => c.winnerMembershipId?.toString())
    .filter((id): id is string => Boolean(id));

  if (winnerMembershipIds.length === 0) {
    return result;
  }

  const memberships = await ChitMembership.find({
    tenantId,
    _id: { $in: winnerMembershipIds },
  })
    .populate("memberId", "name memberCode phone")
    .lean();

  const memMap = new Map(memberships.map((m: any) => [m._id.toString(), m]));

  const halfTickets = memberships.filter((m: any) => m.shareType === "HALF" || (m.share && m.share < 1));
  const coMembersMap = new Map<string, any>();
  if (halfTickets.length > 0) {
    const coMembers = await ChitMembership.find({
      tenantId,
      chitGroupId,
      ticketNumber: { $in: halfTickets.map((m: any) => m.ticketNumber) },
      _id: { $nin: halfTickets.map((m: any) => m._id) },
    })
      .populate("memberId", "name memberCode phone")
      .lean();

    for (const cm of coMembers as any[]) {
      coMembersMap.set(`${cm.ticketNumber}`, cm);
    }
  }

  const items = result.items.map((cycle) => {
    const cycleObj: any = cycle.toObject ? cycle.toObject() : { ...cycle };
    if (cycle.winnerMembershipId) {
      const wm: any = memMap.get(cycle.winnerMembershipId.toString());
      if (wm) {
        const memRef = wm.memberId || {};
        const isHalf = wm.shareType === "HALF" || (wm.share !== undefined && wm.share < 1);
        const payoutAmount = isHalf ? Math.round((cycle.prizeAmount || 0) / 2) : (cycle.prizeAmount || 0);

        cycleObj.winner = {
          membershipId: wm._id.toString(),
          name: memRef.name || "Member",
          memberCode: memRef.memberCode || "",
          ticketNumber: wm.ticketNumber,
          subTicket: wm.subTicket,
          shareType: wm.shareType || "FULL",
          share: wm.share ?? (isHalf ? 0.5 : 1),
          payoutAmount,
        };

        if (isHalf) {
          const coWm = coMembersMap.get(`${wm.ticketNumber}`);
          if (coWm) {
            const coMemRef = coWm.memberId || {};
            cycleObj.coWinner = {
              membershipId: coWm._id.toString(),
              name: coMemRef.name || "Co-member",
              memberCode: coMemRef.memberCode || "",
              ticketNumber: coWm.ticketNumber,
              subTicket: coWm.subTicket,
              shareType: coWm.shareType || "HALF",
              share: coWm.share ?? 0.5,
              payoutAmount,
            };
          }
        }
      }
    }
    return cycleObj;
  });

  return {
    ...result,
    items,
  };
}

export interface ScheduleEntry {
  cycleNumber: number;
  scheduledDate: Date;
  baseInstallment: number;
}

/** The computed installment plan — available even before activation, straight from the scheme's cadence. */
export async function getSchedule(tenantId: string, chitGroupId: string): Promise<ScheduleEntry[]> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  const dates = computeScheduleDates({
    startDate: chitGroup.startDate,
    frequency: chitGroup.frequency,
    count: chitGroup.totalMembers,
    customIntervalDays: chitGroup.customIntervalDays,
  });
  return dates.map((scheduledDate, index) => ({
    cycleNumber: index + 1,
    scheduledDate,
    baseInstallment: chitGroup.installmentAmount,
  }));
}

// --- Documents ---

export async function addChitDocument(
  tenantId: string,
  chitGroupId: string,
  input: AddChitDocumentInput,
  uploadedBy: string,
): Promise<ChitGroupDocument> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  const attachment: AttachmentEntry = {
    label: input.label,
    url: input.url,
    publicId: input.publicId,
    uploadedAt: new Date(),
    uploadedBy: new Types.ObjectId(uploadedBy),
  };
  chitGroup.documents.push(attachment);
  return saveChitGroup(chitGroup);
}

export async function removeChitDocument(
  tenantId: string,
  chitGroupId: string,
  documentId: string,
): Promise<ChitGroupDocument> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  const next = chitGroup.documents.filter((doc) => doc._id?.toString() !== documentId);
  if (next.length === chitGroup.documents.length) {
    throw AppError.notFound("Document not found");
  }
  chitGroup.documents = next;
  return saveChitGroup(chitGroup);
}

// --- Reports ---

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
    startDate: Date;
    endDate: Date;
    status: string;
    allotmentMethod: string;
    foremanCommissionPercent: number;
  };
  roster: { enrolled: number; enrolledShares: number; seatsRemaining: number };
  cycles: { total: number; scheduled: number; settled: number; currentCycleNumber: number };
  financials: {
    maxCommissionPerCycle: number;
    commissionCollectedToDate: number;
    prizesDisbursedToDate: number;
    dividendDistributedToDate: number;
  };
}

export async function getChitSummaryReport(tenantId: string, chitGroupId: string): Promise<ChitSummaryReport> {
  const chitGroup = await getChitGroupById(tenantId, chitGroupId);
  const scope = { tenantId, chitGroupId };

  const [enrolled, enrolledShares, allCycles] = await Promise.all([
    countChitMemberships(scope),
    sumChitMembershipShares(scope),
    repoListChitCycles(scope, { page: 1, limit: chitGroup.totalMembers }),
  ]);

  const settledCycles = allCycles.items.filter((cycle) => cycle.status === "SETTLED");
  const commissionCollected = settledCycles.reduce((sum, cycle) => sum + (cycle.commissionAmount ?? 0), 0);
  const prizesDisbursed = settledCycles.reduce((sum, cycle) => sum + (cycle.prizeAmount ?? 0), 0);
  const dividendDistributed = settledCycles.reduce(
    (sum, cycle) => sum + (cycle.dividendPerMember ?? 0) * chitGroup.totalMembers,
    0,
  );

  return {
    chitGroup: {
      id: chitGroup._id.toString(),
      name: chitGroup.name,
      registrationNumber: chitGroup.registrationNumber,
      chitValue: chitGroup.chitValue,
      totalMembers: chitGroup.totalMembers,
      installmentAmount: chitGroup.installmentAmount,
      frequency: chitGroup.frequency,
      frequencyLabel: FREQUENCY_LABELS[chitGroup.frequency],
      startDate: chitGroup.startDate,
      endDate: chitGroup.endDate,
      status: chitGroup.status,
      allotmentMethod: chitGroup.auctionRules.allotmentMethod,
      foremanCommissionPercent: chitGroup.auctionRules.foremanCommissionPercent,
    },
    roster: {
      enrolled,
      enrolledShares,
      seatsRemaining: Math.max(0, chitGroup.totalMembers - enrolledShares),
    },
    cycles: {
      total: chitGroup.totalMembers,
      scheduled: allCycles.total,
      settled: settledCycles.length,
      currentCycleNumber: chitGroup.currentCycleNumber,
    },
    financials: {
      maxCommissionPerCycle: percentageOfPaise(chitGroup.chitValue, chitGroup.auctionRules.foremanCommissionPercent),
      commissionCollectedToDate: commissionCollected,
      prizesDisbursedToDate: prizesDisbursed,
      dividendDistributedToDate: dividendDistributed,
    },
  };
}
