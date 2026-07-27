import type { Address } from "@/features/organization/types";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: Address;
  managerId?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface PaginatedBranches {
  items: Branch[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
