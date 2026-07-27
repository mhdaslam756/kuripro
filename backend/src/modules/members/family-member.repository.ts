import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { FamilyMember, type FamilyMemberDoc, type FamilyMemberDocument } from "./family-member.model.js";

export type CreateFamilyMemberInput = Omit<
  FamilyMemberDoc,
  "createdAt" | "updatedAt" | "tenantId" | "memberId" | "isDependent"
> & {
  tenantId: ObjectIdLike;
  memberId: ObjectIdLike;
  isDependent?: boolean;
};

export async function createFamilyMember(data: CreateFamilyMemberInput): Promise<FamilyMemberDocument> {
  return FamilyMember.create(data);
}

export async function findFamilyMemberById(id: string, tenantId: string): Promise<FamilyMemberDocument | null> {
  return FamilyMember.findOne({ _id: id, tenantId });
}

export async function listFamilyMembersByMember(memberId: string, tenantId: string): Promise<FamilyMemberDocument[]> {
  return FamilyMember.find({ tenantId, memberId }).sort({ createdAt: 1 });
}

export async function saveFamilyMember(familyMember: FamilyMemberDocument): Promise<FamilyMemberDocument> {
  return familyMember.save();
}

export async function deleteFamilyMember(id: string, tenantId: string): Promise<void> {
  await FamilyMember.deleteOne({ _id: id, tenantId });
}
