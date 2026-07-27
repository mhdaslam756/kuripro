import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Guarantor, type GuarantorDoc, type GuarantorDocument } from "./guarantor.model.js";

export type CreateGuarantorInput = Omit<
  GuarantorDoc,
  "createdAt" | "updatedAt" | "tenantId" | "memberId" | "guarantorMemberId" | "documents" | "status" | "addedAt"
> & {
  tenantId: ObjectIdLike;
  memberId: ObjectIdLike;
  guarantorMemberId?: ObjectIdLike;
};

export async function createGuarantor(data: CreateGuarantorInput): Promise<GuarantorDocument> {
  return Guarantor.create(data);
}

export async function findGuarantorById(id: string, tenantId: string): Promise<GuarantorDocument | null> {
  return Guarantor.findOne({ _id: id, tenantId });
}

export async function listGuarantorsByMember(memberId: string, tenantId: string): Promise<GuarantorDocument[]> {
  return Guarantor.find({ tenantId, memberId }).sort({ createdAt: 1 });
}

export async function countActiveGuarantorsForMember(memberId: string, tenantId: string): Promise<number> {
  return Guarantor.countDocuments({ tenantId, memberId, status: "ACTIVE" });
}

export async function saveGuarantor(guarantor: GuarantorDocument): Promise<GuarantorDocument> {
  return guarantor.save();
}
