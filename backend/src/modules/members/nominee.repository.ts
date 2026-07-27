import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Nominee, type NomineeDoc, type NomineeDocument } from "./nominee.model.js";

export type CreateNomineeInput = Omit<NomineeDoc, "createdAt" | "updatedAt" | "tenantId" | "memberId" | "isActive"> & {
  tenantId: ObjectIdLike;
  memberId: ObjectIdLike;
  isActive?: boolean;
};

export async function createNominee(data: CreateNomineeInput): Promise<NomineeDocument> {
  return Nominee.create(data);
}

export async function findNomineeById(id: string, tenantId: string): Promise<NomineeDocument | null> {
  return Nominee.findOne({ _id: id, tenantId });
}

export async function listNomineesByMember(memberId: string, tenantId: string): Promise<NomineeDocument[]> {
  return Nominee.find({ tenantId, memberId }).sort({ createdAt: 1 });
}

export async function sumActiveShareForMember(
  memberId: string,
  tenantId: string,
  excludeNomineeId?: string,
): Promise<number> {
  const filter: Record<string, unknown> = { tenantId, memberId, isActive: true };
  if (excludeNomineeId) filter["_id"] = { $ne: excludeNomineeId };

  const nominees = await Nominee.find(filter).select("sharePercent");
  return nominees.reduce((sum, nominee) => sum + nominee.sharePercent, 0);
}

export async function saveNominee(nominee: NomineeDocument): Promise<NomineeDocument> {
  return nominee.save();
}

export async function deleteNominee(id: string, tenantId: string): Promise<void> {
  await Nominee.deleteOne({ _id: id, tenantId });
}
