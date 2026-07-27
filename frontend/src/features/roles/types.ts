export interface Role {
  id: string;
  tenantId: string | null;
  name: string;
  slug?: "SUPER_ADMIN" | "ORGANIZER" | "STAFF" | "MEMBER";
  isSystemRole: boolean;
  permissionKeys: string[];
  createdAt: string;
}

export interface Permission {
  key: string;
  label: string;
  category: string;
}
