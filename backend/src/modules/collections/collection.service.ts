import mongoose, { Types } from "mongoose";

import { recordActivity } from "../activity-logs/activity-log.service.js";
import { findChitGroupById, saveChitGroup } from "../chit-groups/chit-group.repository.js";
import {
  countChitMemberships,
  findChitMembershipById,
  listActiveMembershipsByGroup,
} from "../chit-groups/chit-membership.repository.js";
import { findChitCycleById, findChitCycleByNumber } from "../chit-cycles/chit-cycle.repository.js";
import type { ChitCycleDocument } from "../chit-cycles/chit-cycle.model.js";
import type { ChitMembershipDocument } from "../chit-groups/chit-membership.model.js";
import { getNextSequence } from "../counters/counter.repository.js";
import { findMemberById } from "../members/member.repository.js";
import {
  countInstallmentsByStatus,
  findInstallmentById,
  findInstallmentByCycleAndMembership,
  insertInstallments,
  listInstallments,
  listMembershipIdsWithInstallment,
  markOverdueInstallments,
  saveInstallment,
} from "../payments/payment.repository.js";
import type { PaymentDocument, PaymentStatus } from "../payments/payment.model.js";
import { computeInstallmentStatus } from "../payments/installment-status.js";
import { AppError } from "../../utils/app-error.js";
import type { PaginatedResult } from "../../utils/pagination.js";
import {
  createCollection,
  findCollectionById,
  findCollectionByClientReceiptId,
  findCollectionByPaymentId,
  findCollectionByReceiptToken,
  listCollections as repoListCollections,
  sumCollections,
  saveCollection,
  type PopulatedCollection,
} from "./collection.repository.js";
import type { CollectionDocument } from "./collection.model.js";
import { generateReceiptQrDataUrl, generateReceiptToken } from "./receipt.util.js";
import type {
  BulkCollectionInput,
  ListCollectionsQuery,
  ListDuesQuery,
  RaiseDuesInput,
  RecordCollectionInput,
  SyncOfflineInput,
} from "./collection.validators.js";

const CLEARANCE_METHODS = new Set(["CHEQUE", "CARD"]);

// --- Auto Due: raising a cycle's installments ---

import { sendBulk } from "../notifications/notification.service.js";

export interface RaiseDuesResult {
  raised: number;
  alreadyRaised: number;
  totalMembers: number;
}

export async function raiseCycleDues(
  tenantId: string,
  input: RaiseDuesInput,
  createdBy?: string,
): Promise<RaiseDuesResult> {
  const chitGroup = await findChitGroupById(input.chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");
  if (chitGroup.status === "DRAFT") {
    const scope = { tenantId, chitGroupId: input.chitGroupId };
    const enrolledCount = await countChitMemberships(scope, { status: "ACTIVE" });
    if (enrolledCount === 0) {
      throw AppError.conflict("At least 1 member must be enrolled before raising dues");
    }
    chitGroup.status = "ACTIVE";
    await saveChitGroup(chitGroup);
  }

  const cycle = await findChitCycleById(input.chitCycleId, tenantId);
  if (!cycle || cycle.chitGroupId.toString() !== input.chitGroupId) {
    throw AppError.notFound("Cycle not found in this chit group");
  }

  const memberships = await listActiveMembershipsByGroup(tenantId, input.chitGroupId);
  const alreadyRaised = new Set(await listMembershipIdsWithInstallment(tenantId, input.chitCycleId));

  // Auto Dividend: the prior cycle's auction dividend reduces this cycle's installment
  // (net = base − dividend). See the Auction module — the dividend is stored on the settled cycle.
  const priorCycle =
    cycle.cycleNumber > 1
      ? await findChitCycleByNumber(tenantId, input.chitGroupId, cycle.cycleNumber - 1)
      : null;
  const dividendCredit = priorCycle?.status === "SETTLED" ? (priorCycle.dividendPerMember ?? 0) : 0;
  const netInstallment = Math.max(0, chitGroup.installmentAmount - dividendCredit);

  const toCreate = memberships
    .filter((membership) => !alreadyRaised.has(membership._id.toString()))
    .map((membership) => ({
      tenantId,
      chitGroupId: input.chitGroupId,
      chitCycleId: input.chitCycleId,
      chitMembershipId: membership._id.toString(),
      amountDue: netInstallment,
      dueDate: cycle.scheduledDate,
    }));

  await insertInstallments(toCreate);

  if (toCreate.length > 0) {
    const formattedAmount = (netInstallment / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dueDateStr = new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const subject = `Payment Due: ${chitGroup.name} (Cycle ${cycle.cycleNumber})`;
    const body = `Dear {{memberName}}, dues of ₹${formattedAmount} for ${chitGroup.name} (Cycle ${cycle.cycleNumber}) are due on ${dueDateStr}. Please pay on time. — {{orgName}}`;

    void sendBulk(tenantId, createdBy || "SYSTEM", {
      audience: "CHIT_GROUP",
      chitGroupId: input.chitGroupId,
      channel: "PUSH",
      type: "REMINDER",
      subject,
      body,
    }).catch(() => null);

    void sendBulk(tenantId, createdBy || "SYSTEM", {
      audience: "CHIT_GROUP",
      chitGroupId: input.chitGroupId,
      channel: "SMS",
      type: "REMINDER",
      subject,
      body,
    }).catch(() => null);
  }

  return { raised: toCreate.length, alreadyRaised: alreadyRaised.size, totalMembers: memberships.length };
}

export async function flagOverdue(tenantId: string, chitGroupId: string): Promise<{ flagged: number }> {
  const chitGroup = await findChitGroupById(chitGroupId, tenantId);
  if (!chitGroup) throw AppError.notFound("Chit group not found");
  const flagged = await markOverdueInstallments(tenantId, chitGroupId, new Date());
  return { flagged };
}

// --- Recording a collection ---

interface ResolvedTarget {
  installment: PaymentDocument;
  membership: ChitMembershipDocument;
  cycle: ChitCycleDocument;
}

async function ensureInstallmentForTarget(
  tenantId: string,
  input: RecordCollectionInput,
): Promise<ResolvedTarget> {
  if ("paymentId" in input) {
    const installment = await findInstallmentById(input.paymentId, tenantId);
    if (!installment) throw AppError.notFound("Installment not found");
    const membership = await findChitMembershipById(installment.chitMembershipId.toString(), tenantId);
    const cycle = await findChitCycleById(installment.chitCycleId.toString(), tenantId);
    if (!membership || !cycle) throw AppError.notFound("Installment references a missing membership or cycle");
    return { installment, membership, cycle };
  }

  const membership = await findChitMembershipById(input.chitMembershipId, tenantId);
  if (!membership) throw AppError.badRequest("Membership not found in this organization");
  const cycle = await findChitCycleById(input.chitCycleId, tenantId);
  if (!cycle || cycle.chitGroupId.toString() !== membership.chitGroupId.toString()) {
    throw AppError.badRequest("Cycle not found in this membership's chit group");
  }

  let installment = await findInstallmentByCycleAndMembership(
    tenantId,
    input.chitCycleId,
    input.chitMembershipId,
  );
  if (!installment) {
    // Raise the installment on the fly — this is the advance-payment path for a not-yet-due cycle.
    const chitGroup = await findChitGroupById(membership.chitGroupId.toString(), tenantId);
    if (!chitGroup) throw AppError.notFound("Chit group not found");
    const [created] = await insertInstallments([
      {
        tenantId,
        chitGroupId: membership.chitGroupId.toString(),
        chitCycleId: cycle._id.toString(),
        chitMembershipId: membership._id.toString(),
        amountDue: chitGroup.installmentAmount,
        dueDate: cycle.scheduledDate,
      },
    ]);
    installment = created!;
  }
  return { installment, membership, cycle };
}


export interface RecordCollectionResult {
  collection: CollectionDocument;
  installment: PaymentDocument;
}

export async function recordCollection(
  tenantId: string,
  collectedBy: string,
  input: RecordCollectionInput,
  options: { isOffline?: boolean; clientReceiptId?: string } = {},
): Promise<RecordCollectionResult> {
  const { installment, membership, cycle } = await ensureInstallmentForTarget(tenantId, input);

  if (installment.status === "WAIVED") {
    throw AppError.conflict("This installment has been waived");
  }
  const remaining = installment.amountDue - installment.amountPaid;
  if (remaining <= 0) {
    throw AppError.conflict("This installment is already fully paid");
  }

  const amount = input.amount ?? remaining;
  if (amount > remaining) {
    throw AppError.badRequest(
      `Amount exceeds the outstanding balance of ${remaining} paise. Use an advance collection on a future cycle instead.`,
    );
  }

  const collectedAt = input.collectedAt ?? new Date();
  const isAdvance = installment.dueDate.getTime() > collectedAt.getTime();
  const needsClearance = CLEARANCE_METHODS.has(input.method);

  const sequence = await getNextSequence(tenantId, "receiptNumber");
  const receiptNumber = `RCP-${String(sequence).padStart(6, "0")}`;
  const receiptToken = generateReceiptToken();

  let collectionDoc!: CollectionDocument;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      collectionDoc = await createCollection(
        {
          tenantId,
          chitGroupId: cycle.chitGroupId.toString(),
          chitCycleId: cycle._id.toString(),
          chitMembershipId: membership._id.toString(),
          paymentId: installment._id.toString(),
          memberId: membership.memberId.toString(),
          amount,
          method: input.method,
          reference: input.reference,
          status: needsClearance ? "PENDING_CLEARANCE" : "COMPLETED",
          isAdvance,
          isOffline: options.isOffline ?? false,
          ...(options.clientReceiptId ? { clientReceiptId: options.clientReceiptId } : {}),
          receiptNumber,
          receiptToken,
          collectedBy,
          collectedAt,
          notes: input.notes,
        },
        session,
      );

      // Booked immediately even for cheque/card (reconciled later on clearance/bounce).
      installment.amountPaid += amount;
      installment.status = computeInstallmentStatus(installment.amountPaid, installment.amountDue, installment.dueDate);
      installment.paidAt = installment.status === "PAID" ? collectedAt : installment.paidAt;
      installment.method = input.method;
      installment.recordedBy = new Types.ObjectId(collectedBy);
      await saveInstallment(installment, session);
    });
  } finally {
    await session.endSession();
  }

  await recordActivity({
    tenantId,
    userId: collectedBy,
    memberId: membership.memberId.toString(),
    action: "COLLECTION_RECORDED",
    message: `Collected ${amount} paise via ${input.method} (${receiptNumber})`,
  });

  return { collection: collectionDoc, installment };
}

// --- Bulk collection ---

export interface BulkCollectionResult {
  recorded: number;
  skipped: { index: number; reason: string }[];
  receipts: { index: number; receiptNumber: string; amount: number }[];
}

export async function bulkRecordCollections(
  tenantId: string,
  collectedBy: string,
  input: BulkCollectionInput,
): Promise<BulkCollectionResult> {
  const skipped: BulkCollectionResult["skipped"] = [];
  const receipts: BulkCollectionResult["receipts"] = [];

  for (const [index, item] of input.items.entries()) {
    try {
      const { collection } = await recordCollection(tenantId, collectedBy, item);
      receipts.push({ index, receiptNumber: collection.receiptNumber, amount: collection.amount });
    } catch (error) {
      skipped.push({ index, reason: error instanceof AppError ? error.message : "Failed to record collection" });
    }
  }

  return { recorded: receipts.length, skipped, receipts };
}

// --- Offline sync ---

export interface SyncOfflineResult {
  synced: number;
  duplicates: number;
  skipped: { clientReceiptId: string; reason: string }[];
  receipts: { clientReceiptId: string; receiptNumber: string }[];
}

export async function syncOfflineCollections(
  tenantId: string,
  collectedBy: string,
  input: SyncOfflineInput,
): Promise<SyncOfflineResult> {
  const result: SyncOfflineResult = { synced: 0, duplicates: 0, skipped: [], receipts: [] };

  for (const item of input.items) {
    const { clientReceiptId, ...collectionInput } = item;
    try {
      const existing = await findCollectionByClientReceiptId(clientReceiptId, tenantId);
      if (existing) {
        result.duplicates += 1;
        result.receipts.push({ clientReceiptId, receiptNumber: existing.receiptNumber });
        continue;
      }
      const { collection } = await recordCollection(tenantId, collectedBy, collectionInput, {
        isOffline: true,
        clientReceiptId,
      });
      result.synced += 1;
      result.receipts.push({ clientReceiptId, receiptNumber: collection.receiptNumber });
    } catch (error) {
      result.skipped.push({ clientReceiptId, reason: error instanceof AppError ? error.message : "Failed to sync" });
    }
  }

  return result;
}

// --- Reconciliation: clear / bounce ---

export async function clearCollection(tenantId: string, collectionId: string): Promise<CollectionDocument> {
  const collection = await findCollectionById(collectionId, tenantId);
  if (!collection) throw AppError.notFound("Collection not found");
  if (collection.status !== "PENDING_CLEARANCE") {
    throw AppError.conflict("Only a collection pending clearance can be cleared");
  }
  collection.status = "COMPLETED";
  return saveCollection(collection);
}

export async function bounceCollection(
  tenantId: string,
  collectionId: string,
  actorUserId: string,
): Promise<CollectionDocument> {
  const collection = await findCollectionById(collectionId, tenantId);
  if (!collection) throw AppError.notFound("Collection not found");
  if (collection.status !== "PENDING_CLEARANCE") {
    throw AppError.conflict("Only a collection pending clearance can be bounced");
  }

  const installment = await findInstallmentById(collection.paymentId.toString(), tenantId);
  if (!installment) throw AppError.notFound("Linked installment not found");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      collection.status = "BOUNCED";
      await saveCollection(collection, session);

      installment.amountPaid = Math.max(0, installment.amountPaid - collection.amount);
      installment.status = computeInstallmentStatus(installment.amountPaid, installment.amountDue, installment.dueDate);
      if (installment.status !== "PAID") installment.paidAt = undefined;
      await saveInstallment(installment, session);
    });
  } finally {
    await session.endSession();
  }

  await recordActivity({
    tenantId,
    userId: actorUserId,
    memberId: collection.memberId.toString(),
    action: "COLLECTION_REVERSED",
    message: `Reversed collection ${collection.receiptNumber} (${collection.amount} paise bounced)`,
  });

  return collection;
}

// --- Listing ---

export async function listDues(tenantId: string, query: ListDuesQuery & { chitMembershipIds?: string[] }) {
  return listInstallments(
    {
      tenantId,
      chitGroupId: query.chitGroupId,
      chitCycleId: query.chitCycleId,
      chitMembershipId: query.chitMembershipId,
      chitMembershipIds: query.chitMembershipIds,
      status: query.status,
    },
    query,
  );
}

export async function listCollections(
  tenantId: string,
  query: ListCollectionsQuery,
): Promise<PaginatedResult<PopulatedCollection>> {
  return repoListCollections(
    {
      tenantId,
      chitGroupId: query.chitGroupId,
      memberId: query.memberId,
      method: query.method,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    query,
  );
}

export interface CycleCollectionSummary {
  byStatus: Record<PaymentStatus, number>;
  collectedAmount: number;
  collectedCount: number;
}

export async function getCycleCollectionSummary(
  tenantId: string,
  chitGroupId: string,
  chitCycleId: string,
): Promise<CycleCollectionSummary> {
  const [byStatus, totals] = await Promise.all([
    countInstallmentsByStatus(tenantId, chitCycleId),
    sumCollections({ tenantId, chitGroupId }),
  ]);
  return { byStatus, collectedAmount: totals.amount, collectedCount: totals.count };
}

// --- Receipts ---

export interface ReceiptDto {
  receiptNumber: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  isAdvance: boolean;
  collectedAt: Date;
  member: { id: string; name: string; memberCode: string; phone: string };
  chitGroup: { id: string; name: string };
  cycleNumber?: number;
  installment: { amountDue: number; amountPaid: number; status: string };
  qrDataUrl: string;
}

async function buildReceipt(tenantId: string, collection: CollectionDocument): Promise<ReceiptDto> {
  const [member, chitGroup, cycle, installment, qrDataUrl] = await Promise.all([
    findMemberById(collection.memberId.toString(), tenantId),
    findChitGroupById(collection.chitGroupId.toString(), tenantId),
    findChitCycleById(collection.chitCycleId.toString(), tenantId),
    findInstallmentById(collection.paymentId.toString(), tenantId),
    generateReceiptQrDataUrl(collection.receiptToken),
  ]);

  return {
    receiptNumber: collection.receiptNumber,
    amount: collection.amount,
    method: collection.method,
    status: collection.status,
    reference: collection.reference,
    isAdvance: collection.isAdvance,
    collectedAt: collection.collectedAt,
    member: {
      id: collection.memberId.toString(),
      name: member?.name ?? "Unknown",
      memberCode: member?.memberCode ?? "",
      phone: member?.phone ?? "",
    },
    chitGroup: { id: collection.chitGroupId.toString(), name: chitGroup?.name ?? "Unknown" },
    cycleNumber: cycle?.cycleNumber,
    installment: {
      amountDue: installment?.amountDue ?? 0,
      amountPaid: installment?.amountPaid ?? 0,
      status: installment?.status ?? "UNKNOWN",
    },
    qrDataUrl,
  };
}

export async function getReceipt(tenantId: string, collectionId: string): Promise<ReceiptDto> {
  const collection = await findCollectionById(collectionId, tenantId);
  if (!collection) throw AppError.notFound("Receipt not found");
  return buildReceipt(tenantId, collection);
}

export async function getReceiptByPaymentId(tenantId: string, paymentId: string): Promise<ReceiptDto> {
  const collection = await findCollectionByPaymentId(paymentId, tenantId);
  if (!collection) throw AppError.notFound("Receipt not found for this payment");
  return buildReceipt(tenantId, collection);
}

export async function verifyReceipt(tenantId: string, token: string): Promise<ReceiptDto> {
  const collection = await findCollectionByReceiptToken(token, tenantId);
  if (!collection) throw AppError.notFound("No receipt matches this code");
  return buildReceipt(tenantId, collection);
}
