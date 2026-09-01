import mongoose from "mongoose";

import { recordActivity } from "../activity-logs/activity-log.service.js";
import { findChitGroupById } from "../chit-groups/chit-group.repository.js";
import { findChitCycleById, listChitCyclesByIds } from "../chit-cycles/chit-cycle.repository.js";
import { getNextSequence } from "../counters/counter.repository.js";
import { findMemberById } from "../members/member.repository.js";
import { AppError } from "../../utils/app-error.js";
import { buildPaginatedResult, type PaginatedResult } from "../../utils/pagination.js";
import { generateReceiptQrDataUrl, generateReceiptToken } from "../../utils/receipt-token.js";
import {
  createDisbursement,
  findDisbursementById,
  findDisbursementByReceiptToken,
  listDisbursementsByPayout,
} from "./payout-disbursement.repository.js";
import { Counter } from "../counters/counter.model.js";
import { PayoutDisbursement, type PayoutDisbursementDocument } from "./payout-disbursement.model.js";
import { findPayoutById, listPayouts as repoListPayouts, savePayout } from "./payout.repository.js";
import type { PayoutDocument } from "./payout.model.js";
import type { ListPayoutsQuery, RecordDisbursementInput } from "./payout.validators.js";

async function generateUniquePayoutReceiptNumber(tenantId: string, session?: mongoose.ClientSession): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const sequence = await getNextSequence(tenantId, "payoutReceiptNumber", session);
    const candidate = `PV-${String(sequence).padStart(6, "0")}`;
    const exists = await PayoutDisbursement.exists({ tenantId, receiptNumber: candidate }).session(session ?? null);
    if (!exists) {
      return candidate;
    }
  }

  const disbursements = await PayoutDisbursement.find({ tenantId }).select("receiptNumber").lean();
  let maxSeq = 0;
  for (const d of disbursements) {
    if (d.receiptNumber) {
      const match = d.receiptNumber.match(/PV-(\d+)/);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  await Counter.findOneAndUpdate(
    { tenantId, name: "payoutReceiptNumber" },
    { $set: { value: nextSeq } },
    { upsert: true, session },
  );

  return `PV-${String(nextSeq).padStart(6, "0")}`;
}

// --- History ---

export interface PayoutListItem {
  id: string;
  chitGroupName: string;
  cycleNumber?: number;
  memberName: string;
  memberCode: string;
  memberPhone: string;
  declared: number;
  paid: number;
  remaining: number;
  status: string;
  lastDisbursedAt?: Date;
}

export async function listPayouts(
  tenantId: string,
  query: ListPayoutsQuery,
): Promise<PaginatedResult<PayoutListItem>> {
  const result = await repoListPayouts(
    { tenantId, chitGroupId: query.chitGroupId, memberId: query.memberId, status: query.status },
    query,
  );

  const cycles = await listChitCyclesByIds(
    tenantId,
    result.items.map((payout) => payout.chitCycleId.toString()),
  );
  const cycleNumberById = new Map(cycles.map((cycle) => [cycle._id.toString(), cycle.cycleNumber]));

  const items = result.items.map((payout) => ({
    id: payout._id.toString(),
    chitGroupName: payout.chitGroupId.name,
    cycleNumber: cycleNumberById.get(payout.chitCycleId.toString()),
    memberName: payout.memberId.name,
    memberCode: payout.memberId.memberCode,
    memberPhone: payout.memberId.phone,
    declared: payout.amount,
    paid: payout.amountPaid,
    remaining: payout.amount - payout.amountPaid,
    status: payout.status,
    lastDisbursedAt: payout.lastDisbursedAt,
  }));

  return buildPaginatedResult(items, result.total, query);
}

// --- Detail ---

export interface DisbursementDto {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  receiptNumber: string;
  disbursedAt: Date;
}

export interface PayoutDetail {
  id: string;
  chitGroup: { id: string; name: string };
  cycleNumber?: number;
  member: { id: string; name: string; memberCode: string; phone: string };
  declared: number;
  paid: number;
  remaining: number;
  status: string;
  notes?: string;
  disbursements: DisbursementDto[];
}

function toDisbursementDto(d: PayoutDisbursementDocument): DisbursementDto {
  return {
    id: d._id.toString(),
    amount: d.amount,
    method: d.method,
    reference: d.reference,
    notes: d.notes,
    proofUrl: d.proofUrl,
    receiptNumber: d.receiptNumber,
    disbursedAt: d.disbursedAt,
  };
}

async function getPayoutOrThrow(tenantId: string, payoutId: string): Promise<PayoutDocument> {
  const payout = await findPayoutById(payoutId, tenantId);
  if (!payout) throw AppError.notFound("Payout not found");
  return payout;
}

export async function getPayoutDetail(tenantId: string, payoutId: string): Promise<PayoutDetail> {
  const payout = await getPayoutOrThrow(tenantId, payoutId);
  const [chitGroup, member, cycle, disbursements] = await Promise.all([
    findChitGroupById(payout.chitGroupId.toString(), tenantId),
    findMemberById(payout.memberId.toString(), tenantId),
    findChitCycleById(payout.chitCycleId.toString(), tenantId),
    listDisbursementsByPayout(tenantId, payoutId),
  ]);

  return {
    id: payout._id.toString(),
    chitGroup: { id: payout.chitGroupId.toString(), name: chitGroup?.name ?? "Unknown" },
    cycleNumber: cycle?.cycleNumber,
    member: {
      id: payout.memberId.toString(),
      name: member?.name ?? "Unknown",
      memberCode: member?.memberCode ?? "",
      phone: member?.phone ?? "",
    },
    declared: payout.amount,
    paid: payout.amountPaid,
    remaining: payout.amount - payout.amountPaid,
    status: payout.status,
    notes: payout.notes,
    disbursements: disbursements.map(toDisbursementDto),
  };
}

// --- Recording a disbursement (installment) ---

export interface RecordDisbursementResult {
  disbursement: DisbursementDto;
  payout: { declared: number; paid: number; remaining: number; status: string };
}

export async function recordDisbursement(
  tenantId: string,
  payoutId: string,
  disbursedBy: string,
  input: RecordDisbursementInput,
): Promise<RecordDisbursementResult> {
  const payout = await getPayoutOrThrow(tenantId, payoutId);

  const remaining = payout.amount - payout.amountPaid;
  if (remaining <= 0) throw AppError.conflict("This prize has already been fully paid out");

  const amount = input.amount ?? remaining;
  if (amount > remaining) {
    throw AppError.badRequest(`Amount exceeds the remaining balance of ${remaining} paise`);
  }

  const disbursedAt = input.disbursedAt ?? new Date();
  const receiptNumber = await generateUniquePayoutReceiptNumber(tenantId);
  const receiptToken = generateReceiptToken();

  let created!: PayoutDisbursementDocument;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      created = await createDisbursement(
        {
          tenantId,
          payoutId,
          chitGroupId: payout.chitGroupId.toString(),
          chitCycleId: payout.chitCycleId.toString(),
          chitMembershipId: payout.chitMembershipId.toString(),
          memberId: payout.memberId.toString(),
          amount,
          method: input.method,
          reference: input.reference,
          notes: input.notes,
          proofUrl: input.proofUrl,
          proofPublicId: input.proofPublicId,
          receiptNumber,
          receiptToken,
          disbursedBy,
          disbursedAt,
        },
        session,
      );

      payout.amountPaid += amount;
      payout.status = payout.amountPaid >= payout.amount ? "PAID" : "PARTIALLY_PAID";
      payout.lastDisbursedAt = disbursedAt;
      await savePayout(payout, session);
    });
  } finally {
    await session.endSession();
  }

  await recordActivity({
    tenantId,
    userId: disbursedBy,
    memberId: payout.memberId.toString(),
    action: "PAYOUT_DISBURSED",
    message: `Disbursed ${amount} paise of prize money via ${input.method} (${receiptNumber})`,
  });

  return {
    disbursement: toDisbursementDto(created),
    payout: {
      declared: payout.amount,
      paid: payout.amountPaid,
      remaining: payout.amount - payout.amountPaid,
      status: payout.status,
    },
  };
}

// --- Receipts ---

export interface PayoutReceiptDto {
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  disbursedAt: Date;
  member: { name: string; memberCode: string; phone: string };
  chitGroup: { name: string };
  cycleNumber?: number;
  payout: { declared: number; paid: number; remaining: number; status: string };
  proofUrl?: string;
  qrDataUrl: string;
}

async function buildReceipt(tenantId: string, disbursement: PayoutDisbursementDocument): Promise<PayoutReceiptDto> {
  const [payout, member, chitGroup, cycle, qrDataUrl] = await Promise.all([
    findPayoutById(disbursement.payoutId.toString(), tenantId),
    findMemberById(disbursement.memberId.toString(), tenantId),
    findChitGroupById(disbursement.chitGroupId.toString(), tenantId),
    findChitCycleById(disbursement.chitCycleId.toString(), tenantId),
    generateReceiptQrDataUrl(disbursement.receiptToken),
  ]);

  return {
    receiptNumber: disbursement.receiptNumber,
    amount: disbursement.amount,
    method: disbursement.method,
    reference: disbursement.reference,
    disbursedAt: disbursement.disbursedAt,
    member: { name: member?.name ?? "Unknown", memberCode: member?.memberCode ?? "", phone: member?.phone ?? "" },
    chitGroup: { name: chitGroup?.name ?? "Unknown" },
    cycleNumber: cycle?.cycleNumber,
    payout: {
      declared: payout?.amount ?? 0,
      paid: payout?.amountPaid ?? 0,
      remaining: (payout?.amount ?? 0) - (payout?.amountPaid ?? 0),
      status: payout?.status ?? "PENDING",
    },
    proofUrl: disbursement.proofUrl,
    qrDataUrl,
  };
}

export async function getDisbursementReceipt(tenantId: string, disbursementId: string): Promise<PayoutReceiptDto> {
  const disbursement = await findDisbursementById(disbursementId, tenantId);
  if (!disbursement) throw AppError.notFound("Receipt not found");
  return buildReceipt(tenantId, disbursement);
}

export async function verifyDisbursementReceipt(tenantId: string, token: string): Promise<PayoutReceiptDto> {
  const disbursement = await findDisbursementByReceiptToken(token, tenantId);
  if (!disbursement) throw AppError.notFound("No voucher matches this code");
  return buildReceipt(tenantId, disbursement);
}
