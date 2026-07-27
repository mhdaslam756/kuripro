import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

/**
 * A registered WebAuthn credential (passkey) for one user on one authenticator. The stored public key
 * verifies future assertions; `counter` guards against cloned-authenticator replay. Credentials are
 * user-owned and looked up by their globally-unique `credentialId` at login (before a tenant is known),
 * so this collection is intentionally not tenant-scoped — `tenantId` is kept for reference only.
 */
export interface WebAuthnCredentialDoc extends Timestamps {
  tenantId: Types.ObjectId | null;
  userId: Types.ObjectId;
  /** base64url credential id, as returned by the authenticator. */
  credentialId: string;
  /** COSE public key bytes. */
  publicKey: Buffer;
  counter: number;
  transports: string[];
  deviceLabel: string;
  lastUsedAt?: Date;
}

export type WebAuthnCredentialDocument = HydratedDocument<WebAuthnCredentialDoc>;

const webAuthnCredentialSchema = new Schema<WebAuthnCredentialDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceLabel: { type: String, required: true, trim: true, default: "Passkey" },
    lastUsedAt: { type: Date },
  },
  baseSchemaOptions,
);

webAuthnCredentialSchema.index({ userId: 1, createdAt: -1 });

export const WebAuthnCredential = model<WebAuthnCredentialDoc>("WebAuthnCredential", webAuthnCredentialSchema);
