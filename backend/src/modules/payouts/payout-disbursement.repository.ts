import type { ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import {
  PayoutDisbursement,
  type PayoutDisbursementDoc,
  type PayoutDisbursementDocument,
} from "./payout-disbursement.model.js";

export type CreateDisbursementInput = Omit<
  PayoutDisbursementDoc,
  | "createdAt"
  | "updatedAt"
  | "tenantId"
  | "payoutId"
  | "chitGroupId"
  | "chitCycleId"
  | "chitMembershipId"
  | "memberId"
  | "disbursedBy"
  | "disbursedAt"
> & {
  tenantId: ObjectIdLike;
  payoutId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  chitMembershipId: ObjectIdLike;
  memberId: ObjectIdLike;
  disbursedBy: ObjectIdLike;
  disbursedAt?: Date;
};

export async function createDisbursement(
  data: CreateDisbursementInput,
  session?: ClientSession,
): Promise<PayoutDisbursementDocument> {
  const [disbursement] = await PayoutDisbursement.create([data], { session });
  if (!disbursement) throw new Error("Failed to create disbursement");
  return disbursement;
}

export async function listDisbursementsByPayout(
  tenantId: string,
  payoutId: string,
): Promise<PayoutDisbursementDocument[]> {
  return PayoutDisbursement.find({ tenantId, payoutId }).sort({ disbursedAt: 1 });
}

export async function findDisbursementById(id: string, tenantId: string): Promise<PayoutDisbursementDocument | null> {
  return PayoutDisbursement.findOne({ _id: id, tenantId });
}

export async function findDisbursementByReceiptToken(
  token: string,
  tenantId: string,
): Promise<PayoutDisbursementDocument | null> {
  return PayoutDisbursement.findOne({ receiptToken: token, tenantId });
}
