import type { UserDocument, UserStatus } from "./user.model.js";

export interface PublicUserRole {
  id: string;
  name: string;
  slug?: string;
}

export interface PublicUser {
  id: string;
  tenantId: string | null;
  role: PublicUserRole;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: Date;
}

/** Only the fields actually used — deliberately not `UserDocument`, so callers with a
 *  populated (or otherwise reshaped) `roleId` don't fight the serializer's type. */
type SerializableUser = Pick<
  UserDocument,
  "_id" | "tenantId" | "name" | "email" | "phone" | "status" | "mustChangePassword" | "createdAt"
>;

/** Shared shape for any endpoint that returns a User to a client — never includes passwordHash. */
export function toPublicUser(user: SerializableUser, role: PublicUserRole): PublicUser {
  return {
    id: user._id.toString(),
    tenantId: user.tenantId ? user.tenantId.toString() : null,
    role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}
