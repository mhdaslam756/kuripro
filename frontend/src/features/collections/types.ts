export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};

/** Methods offered in the collection UI (OTHER is a catch-all we don't surface as a button). */
export const COLLECTION_METHODS: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD"];

export const DUE_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED"] as const;
export type DueStatus = (typeof DUE_STATUSES)[number];

export const COLLECTION_STATUSES = ["COMPLETED", "PENDING_CLEARANCE", "BOUNCED", "CANCELLED"] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export interface DueMember {
  _id: string;
  name: string;
  memberCode: string;
  phone: string;
}

export interface DueMembership {
  _id: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: "FULL" | "HALF";
  share?: number;
  memberId: DueMember;
}

export interface Installment {
  id: string;
  chitGroupId: string;
  chitCycleId: string;
  chitMembershipId: DueMembership;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paidAt?: string;
  status: DueStatus;
  method?: PaymentMethod;
}

export interface PaginatedDues {
  items: Installment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Collection {
  id: string;
  chitGroupId: string;
  chitCycleId: string;
  memberId: DueMember;
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  status: CollectionStatus;
  isAdvance: boolean;
  isOffline: boolean;
  receiptNumber: string;
  collectedAt: string;
}

export interface PaginatedCollections {
  items: Collection[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CycleSummary {
  byStatus: Record<DueStatus, number>;
  collectedAmount: number;
  collectedCount: number;
}

export interface Receipt {
  receiptNumber: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  isAdvance: boolean;
  collectedAt: string;
  member: { id: string; name: string; memberCode: string; phone: string };
  chitGroup: { id: string; name: string };
  cycleNumber?: number;
  installment: { amountDue: number; amountPaid: number; status: string };
  qrDataUrl: string;
}

export interface RaiseDuesResult {
  raised: number;
  alreadyRaised: number;
  totalMembers: number;
}

export interface BulkCollectionResult {
  recorded: number;
  skipped: { index: number; reason: string }[];
  receipts: { index: number; receiptNumber: string; amount: number }[];
}

export interface SyncOfflineResult {
  synced: number;
  duplicates: number;
  skipped: { clientReceiptId: string; reason: string }[];
  receipts: { clientReceiptId: string; receiptNumber: string }[];
}
