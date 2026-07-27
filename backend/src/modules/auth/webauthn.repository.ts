import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { WebAuthnCredential, type WebAuthnCredentialDocument } from "./webauthn.model.js";

export interface CreateCredentialInput {
  tenantId: ObjectIdLike | null;
  userId: ObjectIdLike;
  credentialId: string;
  publicKey: Buffer;
  counter: number;
  transports: string[];
  deviceLabel: string;
}

export async function createCredential(input: CreateCredentialInput): Promise<WebAuthnCredentialDocument> {
  return WebAuthnCredential.create(input);
}

export async function listCredentialsByUser(userId: string): Promise<WebAuthnCredentialDocument[]> {
  return WebAuthnCredential.find({ userId }).sort({ createdAt: -1 });
}

export async function findCredentialByCredentialId(credentialId: string): Promise<WebAuthnCredentialDocument | null> {
  return WebAuthnCredential.findOne({ credentialId });
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  await WebAuthnCredential.updateOne({ credentialId }, { $set: { counter, lastUsedAt: new Date() } });
}

export async function deleteCredential(userId: string, id: string): Promise<boolean> {
  const result = await WebAuthnCredential.deleteOne({ _id: id, userId });
  return result.deletedCount === 1;
}
