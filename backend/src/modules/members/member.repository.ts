import type { ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import {
  Member,
  type MemberDoc,
  type MemberDocument,
  type MemberKyc,
  type MemberRiskScore,
  type MemberStatus,
} from "./member.model.js";

export type CreateMemberInput = Omit<
  MemberDoc,
  | "createdAt"
  | "updatedAt"
  | "tenantId"
  | "userId"
  | "branchId"
  | "documents"
  | "kyc"
  | "riskScore"
  | "status"
  | "createdBy"
> & {
  tenantId: ObjectIdLike;
  createdBy: ObjectIdLike;
  userId?: ObjectIdLike | null;
  branchId?: ObjectIdLike;
  status?: MemberStatus;
};

export interface SearchMembersFilter {
  tenantId: string;
  search?: string;
  status?: MemberStatus;
  branchId?: string;
  kycStatus?: MemberKyc["status"];
  riskBand?: MemberRiskScore["band"];
}

function buildSearchFilter(filter: SearchMembersFilter): Record<string, unknown> {
  const mongoFilter: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.status) mongoFilter["status"] = filter.status;
  if (filter.branchId) mongoFilter["branchId"] = filter.branchId;
  if (filter.kycStatus) mongoFilter["kyc.status"] = filter.kycStatus;
  if (filter.riskBand) mongoFilter["riskScore.band"] = filter.riskBand;
  if (filter.search) {
    const pattern = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    mongoFilter["$or"] = [{ name: pattern }, { phone: pattern }, { email: pattern }, { memberCode: pattern }];
  }
  return mongoFilter;
}

export async function createMember(data: CreateMemberInput, session?: ClientSession): Promise<MemberDocument> {
  const [member] = await Member.create([data], { session });
  if (!member) throw new Error("Failed to create member");
  return member;
}

export async function findMemberById(id: string, tenantId: string): Promise<MemberDocument | null> {
  return Member.findOne({ _id: id, tenantId });
}

export async function findMemberByIdWithAadhaarHash(id: string, tenantId: string): Promise<MemberDocument | null> {
  return Member.findOne({ _id: id, tenantId }).select("+kyc.aadhaarHash");
}

export async function findMemberByUserId(userId: string, tenantId: string): Promise<MemberDocument | null> {
  return Member.findOne({ userId, tenantId });
}

export async function findMemberByQrToken(qrToken: string, tenantId: string): Promise<MemberDocument | null> {
  return Member.findOne({ qrToken, tenantId });
}

export async function findMemberByAadhaarHash(tenantId: string, aadhaarHash: string): Promise<MemberDocument | null> {
  return Member.findOne({ tenantId, "kyc.aadhaarHash": aadhaarHash }).select("+kyc.aadhaarHash");
}

export async function findMemberByPhone(tenantId: string, phone: string): Promise<MemberDocument | null> {
  return Member.findOne({ tenantId, phone });
}

export async function saveMember(member: MemberDocument, session?: ClientSession): Promise<MemberDocument> {
  return member.save({ session });
}

export async function searchMembers(
  filter: SearchMembersFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<MemberDocument>> {
  const mongoFilter = buildSearchFilter(filter);
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Member.find(mongoFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Member.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}

/** Unbounded (capped) fetch for CSV export — respects the same filters as search, no pagination. */
export async function listMembersForExport(filter: SearchMembersFilter, cap = 10_000): Promise<MemberDocument[]> {
  const mongoFilter = buildSearchFilter(filter);
  return Member.find(mongoFilter).sort({ createdAt: -1 }).limit(cap);
}

export async function listMembersByIds(ids: string[], tenantId: string): Promise<MemberDocument[]> {
  return Member.find({ _id: { $in: ids }, tenantId });
}

/** Active members whose date of birth falls on the given month/day — powers birthday notifications. */
export async function listMembersWithBirthday(tenantId: string, month: number, day: number): Promise<MemberDocument[]> {
  return Member.find({
    tenantId,
    status: "ACTIVE",
    dateOfBirth: { $ne: null },
    $expr: {
      $and: [
        { $eq: [{ $month: "$dateOfBirth" }, month] },
        { $eq: [{ $dayOfMonth: "$dateOfBirth" }, day] },
      ],
    },
  });
}
