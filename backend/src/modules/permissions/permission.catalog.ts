import type { PermissionCategory } from "./permission.model.js";

export interface PermissionCatalogEntry {
  key: string;
  label: string;
  category: PermissionCategory;
}

/**
 * The full set of permissions the platform understands. Seeded into the `Permission` collection
 * at boot (idempotent upsert — see `seedPermissionCatalog`). Adding a new permission means adding
 * a row here; keys are never renamed or removed once shipped, since roles reference them by key.
 */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { key: "chit_group.create", label: "Create chit groups", category: "Chit Groups" },
  { key: "chit_group.view", label: "View chit groups", category: "Chit Groups" },
  { key: "chit_group.update", label: "Edit chit groups, auction rules, documents and terms", category: "Chit Groups" },
  { key: "chit_group.enroll_member", label: "Assign members to a chit group", category: "Chit Groups" },
  { key: "chit_group.activate", label: "Activate a chit group", category: "Chit Groups" },

  { key: "users.create_member", label: "Create member accounts", category: "Users" },
  { key: "users.create_staff", label: "Create staff accounts", category: "Users" },
  { key: "users.view", label: "View tenant users", category: "Users" },
  { key: "users.approve", label: "Approve pending accounts", category: "Users" },

  { key: "activity_log.view_tenant", label: "View tenant-wide activity logs", category: "Activity" },

  { key: "organization.manage", label: "Manage organization profile and settings", category: "Organization" },
  { key: "branch.manage", label: "Manage branches", category: "Organization" },
  { key: "subscription.view", label: "View subscription details", category: "Organization" },

  { key: "role.manage", label: "Manage roles and permissions", category: "Roles" },

  { key: "upload.create", label: "Upload files", category: "Uploads" },

  { key: "members.create", label: "Register new members", category: "Members" },
  { key: "members.view", label: "View member profiles and search", category: "Members" },
  { key: "members.update", label: "Edit member profile, KYC, nominees, family and guarantors", category: "Members" },
  { key: "members.delete", label: "Deactivate members", category: "Members" },
  { key: "members.verify_kyc", label: "Verify or reject member KYC submissions", category: "Members" },
  { key: "members.import_export", label: "Bulk import and export members", category: "Members" },

  { key: "collection.record", label: "Record collections and issue receipts", category: "Collections" },
  { key: "collection.view", label: "View dues, collections and receipts", category: "Collections" },
  { key: "collection.manage_dues", label: "Raise dues, reverse or clear collections", category: "Collections" },

  { key: "auction.view", label: "View auctions, bids, minutes and audit trail", category: "Auctions" },
  { key: "auction.record_bid", label: "Record and withdraw bids", category: "Auctions" },
  { key: "auction.manage", label: "Open/close bidding, select winner, settle and re-pick", category: "Auctions" },

  { key: "payout.view", label: "View prize payouts and disbursement history", category: "Payouts" },
  { key: "payout.disburse", label: "Disburse prize money and attach proof", category: "Payouts" },

  { key: "report.view", label: "View reports, cashbook, bank, income, expense and profit", category: "Reports" },
  { key: "report.export", label: "Export reports as PDF, Excel and CSV", category: "Reports" },
  { key: "report.manage_finance", label: "Record income and expense entries", category: "Reports" },

  { key: "notification.view", label: "View notification history and templates", category: "Notifications" },
  { key: "notification.send", label: "Send notifications and bulk messages", category: "Notifications" },
  { key: "notification.manage_templates", label: "Create and edit notification templates", category: "Notifications" },

  { key: "dashboard.view", label: "View the dashboard — KPIs, trends, cash flow and recent activity", category: "Dashboard" },
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((entry) => entry.key);
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
