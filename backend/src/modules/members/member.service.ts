import { createHash } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { logger } from "../../config/logger.js";
import { listMemberActivity, recordActivity } from "../activity-logs/activity-log.service.js";
import { findBranchByCodeOrName, findBranchById } from "../branches/branch.repository.js";
import {
  countDefaultedMemberships,
  listChitMembershipsByMemberId,
} from "../chit-groups/chit-membership.repository.js";
import { getNextSequence } from "../counters/counter.repository.js";
import { listWonCyclesByMembershipIds } from "../chit-cycles/chit-cycle.repository.js";
import { getPaymentPunctualityStats, listPaymentsByMembershipIds } from "../payments/payment.repository.js";
import { listPayoutsByCycleIds } from "../payouts/payout.repository.js";
import { getOrganizationRoleBySlug } from "../roles/role.service.js";
import { createUser, findUserByEmail } from "../users/user.repository.js";
import type { UserDocument } from "../users/user.model.js";
import { AppError } from "../../utils/app-error.js";
import { generateTemporaryPassword, hashPassword } from "../../utils/password.js";
import { rupeesToPaise } from "../../utils/money.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { parseMembersCsv, serializeMembersToCsv, type MemberCsvRow } from "./csv.util.js";
import {
  createFamilyMember,
  deleteFamilyMember,
  findFamilyMemberById,
  listFamilyMembersByMember,
  saveFamilyMember,
} from "./family-member.repository.js";
import type { FamilyMemberDocument } from "./family-member.model.js";
import {
  countActiveGuarantorsForMember,
  createGuarantor,
  findGuarantorById,
  listGuarantorsByMember,
  saveGuarantor,
} from "./guarantor.repository.js";
import type { GuarantorDocument } from "./guarantor.model.js";
import {
  createMember,
  findMemberByAadhaarHash,
  findMemberById,
  findMemberByQrToken,
  findMemberByUserId,
  saveMember,
  searchMembers,
  listMembersForExport,
  type SearchMembersFilter,
} from "./member.repository.js";
import type { MemberDocument } from "./member.model.js";
import {
  createNominee,
  deleteNominee,
  findNomineeById,
  listNomineesByMember,
  saveNominee,
  sumActiveShareForMember,
} from "./nominee.repository.js";
import type { NomineeDocument } from "./nominee.model.js";
import { generateQrDataUrl, generateQrToken } from "./qr-code.util.js";
import { computeRiskScore } from "./risk-score.js";
import {
  memberCsvRowSchema,
  type AddMemberDocumentInput,
  type CreateFamilyMemberInput,
  type CreateGuarantorInput,
  type CreateMemberInput,
  type CreateNomineeInput,
  type ListMembersQuery,
  type RejectKycInput,
  type SubmitKycIdentityInput,
  type UpdateFamilyMemberInput,
  type UpdateMemberInput,
  type UpdateNomineeInput,
} from "./member.validators.js";

function toMemberOccupation(occupation: CreateMemberInput["occupation"]) {
  return {
    type: occupation.type,
    employerOrBusinessName: occupation.employerOrBusinessName,
    monthlyIncome:
      occupation.monthlyIncomeRupees !== undefined ? rupeesToPaise(occupation.monthlyIncomeRupees) : undefined,
    workAddress: occupation.workAddress,
  };
}

function hashAadhaar(aadhaarNumber: string): string {
  return createHash("sha256").update(aadhaarNumber).digest("hex");
}

async function assertBranchInTenant(tenantId: string, branchId: string | undefined): Promise<void> {
  if (!branchId) return;
  const branch = await findBranchById(branchId, tenantId);
  if (!branch) {
    throw AppError.badRequest("branchId must reference a branch in this organization");
  }
}

export async function registerMember(
  tenantId: string,
  createdBy: string,
  input: CreateMemberInput,
): Promise<MemberDocument> {
  await assertBranchInTenant(tenantId, input.branchId);

  const sequence = await getNextSequence(tenantId, "memberCode");
  const memberCode = `MBR-${String(sequence).padStart(6, "0")}`;

  const member = await createMember({
    tenantId,
    createdBy,
    memberCode,
    qrToken: generateQrToken(),
    name: input.name,
    phone: input.phone,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    branchId: input.branchId,
    occupation: toMemberOccupation(input.occupation),
    address: input.address,
    notes: input.notes,
  });

  await recordActivity({
    tenantId,
    userId: createdBy,
    memberId: member._id,
    action: "MEMBER_REGISTERED",
    message: `Registered member ${member.name} (${member.memberCode})`,
  });

  return member;
}

export async function getMemberById(tenantId: string, memberId: string): Promise<MemberDocument> {
  const member = await findMemberById(memberId, tenantId);
  if (!member) {
    throw AppError.notFound("Member not found");
  }
  return member;
}

export async function updateMemberProfile(
  tenantId: string,
  memberId: string,
  input: UpdateMemberInput,
  updatedBy: string,
): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);

  if (input.branchId !== undefined) {
    await assertBranchInTenant(tenantId, input.branchId);
    member.branchId = new Types.ObjectId(input.branchId);
  }
  if (input.name !== undefined) member.name = input.name;
  if (input.phone !== undefined) member.phone = input.phone;
  if (input.email !== undefined) member.email = input.email;
  if (input.dateOfBirth !== undefined) member.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) member.gender = input.gender;
  if (input.address !== undefined) member.address = input.address;
  if (input.occupation !== undefined) member.occupation = toMemberOccupation(input.occupation);
  if (input.notes !== undefined) member.notes = input.notes;
  if (input.status !== undefined) member.status = input.status;

  await saveMember(member);
  await recordActivity({
    tenantId,
    userId: updatedBy,
    memberId: member._id,
    action: "MEMBER_UPDATED",
    message: `Updated profile for ${member.name}`,
  });

  return member;
}

export async function deactivateMember(tenantId: string, memberId: string, updatedBy: string): Promise<MemberDocument> {
  return updateMemberProfile(tenantId, memberId, { status: "INACTIVE" }, updatedBy);
}

export async function searchMembersList(
  tenantId: string,
  query: ListMembersQuery,
): Promise<PaginatedResult<MemberDocument>> {
  const filter: SearchMembersFilter = {
    tenantId,
    search: query.search,
    status: query.status,
    branchId: query.branchId,
    kycStatus: query.kycStatus,
    riskBand: query.riskBand,
  };
  return searchMembers(filter, query);
}

export async function exportMembersCsv(tenantId: string, filter: Omit<SearchMembersFilter, "tenantId">): Promise<string> {
  const members = await listMembersForExport({ tenantId, ...filter });
  return serializeMembersToCsv(members);
}

export async function submitKycIdentity(
  tenantId: string,
  memberId: string,
  input: SubmitKycIdentityInput,
  actorUserId: string,
): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);

  if (input.aadhaarNumber) {
    const aadhaarHash = hashAadhaar(input.aadhaarNumber);
    const existing = await findMemberByAadhaarHash(tenantId, aadhaarHash);
    if (existing && existing._id.toString() !== memberId) {
      throw AppError.conflict("This Aadhaar number is already registered to another member");
    }
    member.kyc.aadhaarHash = aadhaarHash;
    member.kyc.aadhaarLast4 = input.aadhaarNumber.slice(-4);
  }
  if (input.panNumber) {
    member.kyc.panNumber = input.panNumber;
  }
  if (member.kyc.status === "NOT_SUBMITTED" || member.kyc.status === "REJECTED") {
    member.kyc.status = "PENDING";
    member.kyc.submittedAt = new Date();
    member.kyc.rejectionReason = undefined;
  }

  await saveMember(member);
  await recordActivity({
    tenantId,
    userId: actorUserId,
    memberId: member._id,
    action: "MEMBER_KYC_SUBMITTED",
    message: `KYC submitted for ${member.name}`,
  });

  return member;
}

export async function verifyMemberKyc(tenantId: string, memberId: string, verifiedBy: string): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);
  if (member.kyc.status !== "PENDING") {
    throw AppError.conflict("KYC is not pending review for this member");
  }

  member.kyc.status = "VERIFIED";
  member.kyc.verifiedAt = new Date();
  member.kyc.verifiedBy = new Types.ObjectId(verifiedBy);
  member.kyc.rejectionReason = undefined;
  await saveMember(member);

  await recordActivity({
    tenantId,
    userId: verifiedBy,
    memberId: member._id,
    action: "MEMBER_KYC_VERIFIED",
    message: `KYC verified for ${member.name}`,
  });

  try {
    await recomputeMemberRiskScore(tenantId, memberId);
  } catch (error) {
    logger.error({ err: error, memberId }, "Failed to recompute risk score after KYC verification");
  }

  return member;
}

export async function rejectMemberKyc(
  tenantId: string,
  memberId: string,
  input: RejectKycInput,
  rejectedBy: string,
): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);
  if (member.kyc.status !== "PENDING") {
    throw AppError.conflict("KYC is not pending review for this member");
  }

  member.kyc.status = "REJECTED";
  member.kyc.rejectionReason = input.reason;
  await saveMember(member);

  await recordActivity({
    tenantId,
    userId: rejectedBy,
    memberId: member._id,
    action: "MEMBER_KYC_REJECTED",
    message: `KYC rejected for ${member.name}: ${input.reason}`,
  });

  return member;
}

export async function addMemberDocument(
  tenantId: string,
  memberId: string,
  input: AddMemberDocumentInput,
  uploadedBy: string,
): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);

  member.documents.push({
    category: input.category,
    type: input.type,
    url: input.url,
    publicId: input.publicId,
    uploadedAt: new Date(),
    uploadedBy: new Types.ObjectId(uploadedBy),
  });
  await saveMember(member);

  await recordActivity({
    tenantId,
    userId: uploadedBy,
    memberId: member._id,
    action: "MEMBER_DOCUMENT_UPLOADED",
    message: `Uploaded ${input.type} for ${member.name}`,
  });

  return member;
}

export async function removeMemberDocument(
  tenantId: string,
  memberId: string,
  documentId: string,
): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);
  const nextDocuments = member.documents.filter((doc) => doc._id?.toString() !== documentId);
  if (nextDocuments.length === member.documents.length) {
    throw AppError.notFound("Document not found");
  }
  member.documents = nextDocuments;
  return saveMember(member);
}

export async function recomputeMemberRiskScore(tenantId: string, memberId: string): Promise<MemberDocument> {
  const member = await getMemberById(tenantId, memberId);

  const memberships = await listChitMembershipsByMemberId(tenantId, memberId);
  const membershipIds = memberships.map((membership) => membership._id.toString());

  const [punctuality, activeGuarantorCount, defaultedCount] = await Promise.all([
    getPaymentPunctualityStats(tenantId, membershipIds),
    countActiveGuarantorsForMember(memberId, tenantId),
    countDefaultedMemberships(tenantId, membershipIds),
  ]);

  const tenureDays = Math.floor((Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const result = computeRiskScore({
    kycStatus: member.kyc.status,
    duePastInstallments: punctuality.duePastInstallments,
    onTimePaidInstallments: punctuality.onTimePaidInstallments,
    overdueInstallments: punctuality.overdueInstallments,
    hasDefaultedMembership: defaultedCount > 0,
    activeGuarantorCount,
    tenureDays,
  });

  member.riskScore = { value: result.value, band: result.band, computedAt: new Date(), factors: result.factors };
  return saveMember(member);
}

export async function getMemberQrCode(tenantId: string, memberId: string): Promise<{ qrDataUrl: string }> {
  const member = await getMemberById(tenantId, memberId);
  const qrDataUrl = await generateQrDataUrl(member.qrToken);
  return { qrDataUrl };
}

export async function lookupMemberByQrToken(tenantId: string, token: string): Promise<MemberDocument> {
  const member = await findMemberByQrToken(token, tenantId);
  if (!member) {
    throw AppError.notFound("No member matches this QR code");
  }
  return member;
}

export async function getMemberPaymentHistory(
  tenantId: string,
  memberId: string,
  query: PaginationQuery,
) {
  await getMemberById(tenantId, memberId);
  const memberships = await listChitMembershipsByMemberId(tenantId, memberId);
  const membershipIds = memberships.map((membership) => membership._id.toString());
  return listPaymentsByMembershipIds(tenantId, membershipIds, query);
}

export interface PrizeHistoryEntry {
  chitGroupName: string;
  cycleNumber: number;
  prizeAmount?: number;
  settledAt?: Date;
  payoutStatus: string;
  disbursedAt?: Date;
}

export async function getMemberPrizeHistory(tenantId: string, memberId: string): Promise<PrizeHistoryEntry[]> {
  await getMemberById(tenantId, memberId);

  const memberships = await listChitMembershipsByMemberId(tenantId, memberId);
  const membershipIds = memberships.map((membership) => membership._id.toString());
  const chitGroupNameByMembershipId = new Map(memberships.map((m) => [m._id.toString(), m.chitGroupId.name]));

  const wonCycles = await listWonCyclesByMembershipIds(tenantId, membershipIds);
  const payouts = await listPayoutsByCycleIds(tenantId, wonCycles.map((cycle) => cycle._id.toString()));
  const payoutByCycleId = new Map(payouts.map((payout) => [payout.chitCycleId.toString(), payout]));

  return wonCycles.map((cycle) => {
    const payout = payoutByCycleId.get(cycle._id.toString());
    return {
      chitGroupName: chitGroupNameByMembershipId.get(cycle.winnerMembershipId?.toString() ?? "") ?? "Unknown",
      cycleNumber: cycle.cycleNumber,
      prizeAmount: cycle.prizeAmount,
      settledAt: cycle.settledAt,
      payoutStatus: payout?.status ?? "PENDING",
      disbursedAt: payout?.lastDisbursedAt,
    };
  });
}

interface TimelineEvent {
  type: string;
  message: string;
  occurredAt: Date;
}

export async function getMemberTimeline(
  tenantId: string,
  memberId: string,
  query: PaginationQuery,
): Promise<PaginatedResult<TimelineEvent>> {
  await getMemberById(tenantId, memberId);

  const activityResult = await listMemberActivity(tenantId, memberId, { page: 1, limit: 100 });
  const events: TimelineEvent[] = activityResult.items.map((log) => ({
    type: log.action,
    message: log.message,
    occurredAt: log.createdAt,
  }));

  const memberships = await listChitMembershipsByMemberId(tenantId, memberId);
  const membershipIds = memberships.map((membership) => membership._id.toString());
  const chitGroupNameByMembershipId = new Map(memberships.map((m) => [m._id.toString(), m.chitGroupId.name]));

  const [paymentsResult, wonCycles] = await Promise.all([
    listPaymentsByMembershipIds(tenantId, membershipIds, { page: 1, limit: 100 }),
    listWonCyclesByMembershipIds(tenantId, membershipIds),
  ]);

  for (const payment of paymentsResult.items) {
    if (!payment.paidAt) continue;
    events.push({
      type: "PAYMENT_RECORDED",
      message: `Paid installment for ${chitGroupNameByMembershipId.get(payment.chitMembershipId.toString()) ?? "a chit group"}`,
      occurredAt: payment.paidAt,
    });
  }

  for (const cycle of wonCycles) {
    if (!cycle.settledAt) continue;
    events.push({
      type: "PRIZE_WON",
      message: `Won cycle #${cycle.cycleNumber} in ${
        chitGroupNameByMembershipId.get(cycle.winnerMembershipId?.toString() ?? "") ?? "a chit group"
      }`,
      occurredAt: cycle.settledAt,
    });
  }

  events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const { skip, limit } = toSkipLimit(query);
  const pageItems = events.slice(skip, skip + limit);

  return buildPaginatedResult(pageItems, events.length, query);
}

export interface InviteMemberResult {
  member: MemberDocument;
  /** Null when an existing account was linked — that person keeps the password they already have. */
  temporaryPassword: string | null;
  linkedExistingAccount: boolean;
}

/**
 * The email already signs in to this organization, so the member record and the login are the same
 * person — typically an organizer or staffer who also holds a chit slot. Attach the member to that
 * account instead of minting a second login for one human.
 *
 * Their existing role is deliberately left alone: an organizer who takes a slot must not be demoted
 * to MEMBER permissions by being handed a member record.
 */
async function linkMemberToExistingUser(
  tenantId: string,
  member: MemberDocument,
  existingUser: UserDocument,
  invitedBy: string,
): Promise<InviteMemberResult> {
  if (existingUser.tenantId?.toString() !== tenantId) {
    throw AppError.conflict(
      `${existingUser.email} is already registered to an account outside this organization — invite this member with a different email address`,
    );
  }

  // One login maps to at most one member record. The unique (tenantId, userId) index is the backstop
  // for a concurrent double-invite; this check exists to name the member that already holds it.
  const alreadyLinked = await findMemberByUserId(existingUser._id.toString(), tenantId);
  if (alreadyLinked) {
    throw AppError.conflict(
      `${existingUser.email} already has portal access as ${alreadyLinked.name} (${alreadyLinked.memberCode})`,
    );
  }

  member.userId = existingUser._id;
  if (!member.email) member.email = existingUser.email;
  await saveMember(member);

  await recordActivity({
    tenantId,
    userId: invitedBy,
    memberId: member._id,
    action: "MEMBER_INVITED_TO_PORTAL",
    message: `Linked ${member.name} to the existing ${existingUser.email} account`,
  });

  return { member, temporaryPassword: null, linkedExistingAccount: true };
}

export async function inviteMemberToPortal(
  tenantId: string,
  memberId: string,
  email: string,
  invitedBy: string,
): Promise<InviteMemberResult> {
  const member = await getMemberById(tenantId, memberId);
  if (member.userId) {
    throw AppError.conflict("This member already has portal access");
  }

  // Login emails are unique across the whole platform, so resolve a taken one here rather than letting
  // the insert fail — that surfaced as a bare "email already exists" duplicate-key error, and only
  // after a bcrypt hash had already been computed for a user that could never be created.
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return linkMemberToExistingUser(tenantId, member, existingUser, invitedBy);
  }

  const role = await getOrganizationRoleBySlug(tenantId, "MEMBER");
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  // Atomic: a failure while linking the member back to the new user would otherwise strand an INVITED
  // user holding the email address, and every retry of the invite would then hit the check above.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await createUser(
        {
          tenantId,
          roleId: role._id,
          name: member.name,
          email,
          phone: member.phone,
          passwordHash,
          status: "INVITED",
          mustChangePassword: true,
        },
        session,
      );

      member.userId = user._id;
      if (!member.email) member.email = email;
      await saveMember(member, session);
    });
  } finally {
    await session.endSession();
  }

  await recordActivity({
    tenantId,
    userId: invitedBy,
    memberId: member._id,
    action: "MEMBER_INVITED_TO_PORTAL",
    message: `Invited ${member.name} to the member portal`,
  });

  return { member, temporaryPassword, linkedExistingAccount: false };
}

export async function listMemberNominees(tenantId: string, memberId: string): Promise<NomineeDocument[]> {
  await getMemberById(tenantId, memberId);
  return listNomineesByMember(memberId, tenantId);
}

export async function addNominee(
  tenantId: string,
  memberId: string,
  input: CreateNomineeInput,
): Promise<NomineeDocument> {
  await getMemberById(tenantId, memberId);

  const existingShare = await sumActiveShareForMember(memberId, tenantId);
  if (existingShare + input.sharePercent > 100) {
    throw AppError.conflict(`Total nominee share would exceed 100% (currently ${existingShare}%)`);
  }

  return createNominee({ tenantId, memberId, ...input });
}

export async function updateNominee(
  tenantId: string,
  memberId: string,
  nomineeId: string,
  input: UpdateNomineeInput,
): Promise<NomineeDocument> {
  const nominee = await findNomineeById(nomineeId, tenantId);
  if (!nominee || nominee.memberId.toString() !== memberId) {
    throw AppError.notFound("Nominee not found");
  }

  const nextSharePercent = input.sharePercent ?? nominee.sharePercent;
  const nextIsActive = input.isActive ?? nominee.isActive;
  if (nextIsActive) {
    const otherShare = await sumActiveShareForMember(memberId, tenantId, nomineeId);
    if (otherShare + nextSharePercent > 100) {
      throw AppError.conflict(`Total nominee share would exceed 100% (currently ${otherShare}%)`);
    }
  }

  if (input.name !== undefined) nominee.name = input.name;
  if (input.relation !== undefined) nominee.relation = input.relation;
  if (input.dateOfBirth !== undefined) nominee.dateOfBirth = input.dateOfBirth;
  if (input.phone !== undefined) nominee.phone = input.phone;
  if (input.address !== undefined) nominee.address = input.address;
  if (input.idProofType !== undefined) nominee.idProofType = input.idProofType;
  if (input.idProofNumber !== undefined) nominee.idProofNumber = input.idProofNumber;
  if (input.sharePercent !== undefined) nominee.sharePercent = input.sharePercent;
  if (input.isActive !== undefined) nominee.isActive = input.isActive;

  return saveNominee(nominee);
}

export async function removeNominee(tenantId: string, memberId: string, nomineeId: string): Promise<void> {
  const nominee = await findNomineeById(nomineeId, tenantId);
  if (!nominee || nominee.memberId.toString() !== memberId) {
    throw AppError.notFound("Nominee not found");
  }
  await deleteNominee(nomineeId, tenantId);
}

export async function listMemberGuarantors(tenantId: string, memberId: string): Promise<GuarantorDocument[]> {
  await getMemberById(tenantId, memberId);
  return listGuarantorsByMember(memberId, tenantId);
}

export async function addGuarantor(
  tenantId: string,
  memberId: string,
  input: CreateGuarantorInput,
): Promise<GuarantorDocument> {
  await getMemberById(tenantId, memberId);

  if (input.guarantorType === "EXISTING_MEMBER") {
    if (input.guarantorMemberId === memberId) {
      throw AppError.badRequest("A member cannot guarantee themselves");
    }
    const guarantorMember = await findMemberById(input.guarantorMemberId, tenantId);
    if (!guarantorMember) {
      throw AppError.badRequest("guarantorMemberId must reference a member in this organization");
    }
    return createGuarantor({
      tenantId,
      memberId,
      guarantorType: "EXISTING_MEMBER",
      guarantorMemberId: input.guarantorMemberId,
      relationToMember: input.relationToMember,
    });
  }

  return createGuarantor({
    tenantId,
    memberId,
    guarantorType: "EXTERNAL",
    external: input.external,
    relationToMember: input.relationToMember,
  });
}

export async function removeGuarantor(
  tenantId: string,
  memberId: string,
  guarantorId: string,
): Promise<GuarantorDocument> {
  const guarantor = await findGuarantorById(guarantorId, tenantId);
  if (!guarantor || guarantor.memberId.toString() !== memberId) {
    throw AppError.notFound("Guarantor not found");
  }
  guarantor.status = "REMOVED";
  return saveGuarantor(guarantor);
}

export async function listMemberFamily(tenantId: string, memberId: string): Promise<FamilyMemberDocument[]> {
  await getMemberById(tenantId, memberId);
  return listFamilyMembersByMember(memberId, tenantId);
}

export async function addFamilyMember(
  tenantId: string,
  memberId: string,
  input: CreateFamilyMemberInput,
): Promise<FamilyMemberDocument> {
  await getMemberById(tenantId, memberId);
  return createFamilyMember({ tenantId, memberId, ...input });
}

export async function updateFamilyMemberEntry(
  tenantId: string,
  memberId: string,
  familyMemberId: string,
  input: UpdateFamilyMemberInput,
): Promise<FamilyMemberDocument> {
  const entry = await findFamilyMemberById(familyMemberId, tenantId);
  if (!entry || entry.memberId.toString() !== memberId) {
    throw AppError.notFound("Family member not found");
  }

  if (input.name !== undefined) entry.name = input.name;
  if (input.relation !== undefined) entry.relation = input.relation;
  if (input.dateOfBirth !== undefined) entry.dateOfBirth = input.dateOfBirth;
  if (input.occupation !== undefined) entry.occupation = input.occupation;
  if (input.phone !== undefined) entry.phone = input.phone;
  if (input.isDependent !== undefined) entry.isDependent = input.isDependent;

  return saveFamilyMember(entry);
}

export async function removeFamilyMember(tenantId: string, memberId: string, familyMemberId: string): Promise<void> {
  const entry = await findFamilyMemberById(familyMemberId, tenantId);
  if (!entry || entry.memberId.toString() !== memberId) {
    throw AppError.notFound("Family member not found");
  }
  await deleteFamilyMember(familyMemberId, tenantId);
}

export interface CsvRowReport {
  row: number;
  status: "OK" | "ERROR";
  errors: string[];
  name?: string;
  phone?: string;
}

async function buildMemberInputFromCsvRow(
  tenantId: string,
  rawRow: MemberCsvRow,
): Promise<{ input?: CreateMemberInput; errors: string[] }> {
  const parsed = memberCsvRowSchema.safeParse(rawRow);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  const data = parsed.data;

  let branchId: string | undefined;
  if (data.branchCode) {
    const branch = await findBranchByCodeOrName(tenantId, data.branchCode);
    if (branch) {
      branchId = branch._id.toString();
    }
  }

  const input: CreateMemberInput = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    branchId,
    occupation: {
      type: data.occupationType,
      employerOrBusinessName: data.employerOrBusinessName,
      monthlyIncomeRupees: data.monthlyIncomeRupees ? Number(data.monthlyIncomeRupees) : undefined,
    },
    address: {
      line1: data.addressLine1,
      line2: data.addressLine2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: "India",
    },
  };

  return { input, errors: [] };
}

export async function previewBulkImport(tenantId: string, csvBuffer: Buffer): Promise<CsvRowReport[]> {
  const rows = await parseMembersCsv(csvBuffer);
  const reports: CsvRowReport[] = [];

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2;
    const { errors } = await buildMemberInputFromCsvRow(tenantId, rawRow);
    reports.push({ row: rowNumber, status: errors.length ? "ERROR" : "OK", errors, name: rawRow.name, phone: rawRow.phone });
  }

  return reports;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  reports: CsvRowReport[];
}

export async function commitBulkImport(
  tenantId: string,
  createdBy: string,
  csvBuffer: Buffer,
): Promise<BulkImportResult> {
  const rows = await parseMembersCsv(csvBuffer);
  const reports: CsvRowReport[] = [];
  let created = 0;

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2;
    const { input, errors } = await buildMemberInputFromCsvRow(tenantId, rawRow);

    if (errors.length || !input) {
      reports.push({ row: rowNumber, status: "ERROR", errors, name: rawRow.name, phone: rawRow.phone });
      continue;
    }

    try {
      await registerMember(tenantId, createdBy, input);
      created += 1;
      reports.push({ row: rowNumber, status: "OK", errors: [], name: input.name, phone: input.phone });
    } catch (error) {
      const message = error instanceof AppError ? error.message : "Failed to create member";
      reports.push({ row: rowNumber, status: "ERROR", errors: [message], name: rawRow.name, phone: rawRow.phone });
    }
  }

  return { created, skipped: reports.length - created, reports };
}
