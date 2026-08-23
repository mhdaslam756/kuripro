import type { ClientSession, Types } from "mongoose";

import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { ChitMembership, type ChitMembershipDoc, type ChitMembershipDocument, type ChitMembershipStatus } from "./chit-membership.model.js";

export interface PopulatedChitGroupRef {
  _id: Types.ObjectId;
  name: string;
}

export interface PopulatedMemberRef {
  _id: Types.ObjectId;
  name: string;
  memberCode: string;
  phone: string;
}

export type CreateChitMembershipData = Omit<
  ChitMembershipDoc,
  "createdAt" | "updatedAt" | "hasWon" | "joinedAt" | "tenantId" | "chitGroupId" | "memberId"
> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  memberId: ObjectIdLike;
  hasWon?: boolean;
  joinedAt?: Date;
};

export interface ChitMembershipScope {
  tenantId: string;
  chitGroupId: string;
}

export async function createChitMembership(data: CreateChitMembershipData): Promise<ChitMembershipDocument> {
  return ChitMembership.create(data);
}

export async function findChitMembershipByTicket(
  scope: ChitMembershipScope,
  ticketNumber: number,
): Promise<ChitMembershipDocument | null> {
  return ChitMembership.findOne({ ...scope, ticketNumber });
}

export async function findChitMembershipByMember(
  scope: ChitMembershipScope,
  memberId: string,
): Promise<ChitMembershipDocument | null> {
  return ChitMembership.findOne({ ...scope, memberId });
}

export async function findChitMembershipById(id: string, tenantId: string): Promise<ChitMembershipDocument | null> {
  return ChitMembership.findOne({ _id: id, tenantId });
}

export async function saveChitMembership(
  membership: ChitMembershipDocument,
  session?: ClientSession,
): Promise<ChitMembershipDocument> {
  return membership.save({ session });
}

export async function countChitMemberships(
  scope: ChitMembershipScope,
  extraFilter: Record<string, unknown> = {},
): Promise<number> {
  return ChitMembership.countDocuments({ ...scope, status: "ACTIVE" as ChitMembershipStatus, ...extraFilter });
}

export async function sumChitMembershipShares(
  scope: ChitMembershipScope,
  extraFilter: Record<string, unknown> = {},
): Promise<number> {
  const result = await ChitMembership.aggregate<{ _id: null; totalShares: number }>([
    { $match: { ...scope, status: "ACTIVE" as ChitMembershipStatus, ...extraFilter } },
    { $group: { _id: null, totalShares: { $sum: { $ifNull: ["$share", 1] } } } },
  ]);
  return result[0]?.totalShares ?? 0;
}

export async function findChitMembershipsByTicket(
  scope: ChitMembershipScope,
  ticketNumber: number,
): Promise<ChitMembershipDocument[]> {
  return ChitMembership.find({ ...scope, ticketNumber, status: "ACTIVE" as ChitMembershipStatus });
}

export async function findChitMembershipByTicketAndSubTicket(
  scope: ChitMembershipScope,
  ticketNumber: number,
  subTicket?: string,
): Promise<ChitMembershipDocument | null> {
  const filter: Record<string, unknown> = { ...scope, ticketNumber };
  if (subTicket) {
    filter.subTicket = subTicket;
  }
  return ChitMembership.findOne(filter);
}

export interface TicketSlotInfo {
  ticketNumber: number;
  totalShare: number;
  hasSubTicketA: boolean;
  hasSubTicketB: boolean;
  isFull: boolean;
}

export async function listTicketSlotInfos(scope: ChitMembershipScope): Promise<TicketSlotInfo[]> {
  const rows = await ChitMembership.find({ ...scope, status: "ACTIVE" as ChitMembershipStatus })
    .populate({ path: "memberId", select: "_id" });

  const validRows = rows.filter((r) => Boolean(r.memberId));
  const slotMap = new Map<number, TicketSlotInfo>();

  for (const row of validRows) {
    const existing = slotMap.get(row.ticketNumber) || {
      ticketNumber: row.ticketNumber,
      totalShare: 0,
      hasSubTicketA: false,
      hasSubTicketB: false,
      isFull: false,
    };
    const rowShare = row.share ?? (row.shareType === "HALF" ? 0.5 : 1);
    existing.totalShare += rowShare;
    if (row.subTicket === "A") existing.hasSubTicketA = true;
    if (row.subTicket === "B") existing.hasSubTicketB = true;
    if (existing.totalShare >= 1 || row.shareType === "FULL") existing.isFull = true;
    slotMap.set(row.ticketNumber, existing);
  }

  return Array.from(slotMap.values());
}

export async function listTicketNumbers(scope: ChitMembershipScope): Promise<number[]> {
  const slotInfos = await listTicketSlotInfos(scope);
  return slotInfos.filter((s) => s.isFull).map((s) => s.ticketNumber);
}

export async function listChitMemberships(
  scope: ChitMembershipScope,
  query: PaginationQuery,
): Promise<PaginatedResult<Omit<ChitMembershipDocument, "memberId"> & { memberId: PopulatedMemberRef }>> {
  const { skip, limit } = toSkipLimit(query);
  const filter = { ...scope, status: "ACTIVE" as ChitMembershipStatus };

  const rawItems = await ChitMembership.find(filter)
    .sort({ ticketNumber: 1 })
    .populate<{ memberId: PopulatedMemberRef | null }>({
      path: "memberId",
     
      select: "name memberCode phone",
    });

  const validItems = rawItems.filter((item) => item.memberId !== null && item.memberId !== undefined);
  const total = validItems.length;
  const paginatedItems = validItems.slice(skip, skip + limit);

  return buildPaginatedResult(paginatedItems as any, total, query);
}

export async function findChitMembershipByIdOrMemberId(
  tenantId: string,
  chitGroupId: string,
  idOrMemberId: string,
): Promise<ChitMembershipDocument | null> {
  return ChitMembership.findOne({
    tenantId,
    chitGroupId,
    $or: [{ _id: idOrMemberId }, { memberId: idOrMemberId }],
  });
}

/** Model-level delete (keeps the tenant filter so the tenant-scope guard is satisfied). */
export async function deleteChitMembership(
  tenantId: string,
  chitGroupId: string,
  membershipIdOrMemberId: string,
): Promise<boolean> {
  const result = await ChitMembership.deleteOne({
    tenantId,
    chitGroupId,
    $or: [{ _id: membershipIdOrMemberId }, { memberId: membershipIdOrMemberId }],
  });
  return result.deletedCount > 0;
}

export async function countDefaultedMemberships(tenantId: string, chitMembershipIds: string[]): Promise<number> {
  if (chitMembershipIds.length === 0) return 0;
  return ChitMembership.countDocuments({ tenantId, _id: { $in: chitMembershipIds }, status: "DEFAULTED" });
}

/** Distinct memberIds for the given membership ids — used to resolve overdue members for reminders. */
export async function listMemberIdsByMembershipIds(tenantId: string, membershipIds: string[]): Promise<string[]> {
  if (membershipIds.length === 0) return [];
  const rows = await ChitMembership.find({ tenantId, _id: { $in: membershipIds } }, { memberId: 1 }).lean();
  return [...new Set(rows.map((row) => row.memberId.toString()))];
}

/** All ACTIVE memberships in a group — used by Collections to raise a cycle's dues for everyone. */
export async function listActiveMembershipsByGroup(
  tenantId: string,
  chitGroupId: string,
): Promise<ChitMembershipDocument[]> {
  return ChitMembership.find({ tenantId, chitGroupId, status: "ACTIVE" }).sort({ ticketNumber: 1 });
}

/** All of a member's memberships across every chit group they've joined, in this tenant. */
export async function listChitMembershipsByMemberId(
  tenantId: string,
  memberId: string,
): Promise<(Omit<ChitMembershipDocument, "chitGroupId"> & { chitGroupId: PopulatedChitGroupRef })[]> {
  return ChitMembership.find({ tenantId, memberId }).populate<{ chitGroupId: PopulatedChitGroupRef }>({
    path: "chitGroupId",
   
    select: "name",
  });
}
