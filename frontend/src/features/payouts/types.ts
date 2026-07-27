export const PAYOUT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

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

/** Methods offered in the disburse UI (OTHER is the fallback, not a button). */
export const DISBURSE_METHODS: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD"];

export interface PayoutListItem {
  id: string;
  chitGroupName: string;
  cycleNumber?: number;
  memberName: string;
  memberCode: string;
  memberPhone: string;
  declared: number;
  paid: number;
  remaining: number;
  status: PayoutStatus;
  lastDisbursedAt?: string;
}

export interface PaginatedPayouts {
  items: PayoutListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Disbursement {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  receiptNumber: string;
  disbursedAt: string;
}

export interface PayoutDetail {
  id: string;
  chitGroup: { id: string; name: string };
  cycleNumber?: number;
  member: { id: string; name: string; memberCode: string; phone: string };
  declared: number;
  paid: number;
  remaining: number;
  status: PayoutStatus;
  notes?: string;
  disbursements: Disbursement[];
}

export interface PayoutReceipt {
  receiptNumber: string;
  amount: number;
  method: string;
  reference?: string;
  disbursedAt: string;
  member: { name: string; memberCode: string; phone: string };
  chitGroup: { name: string };
  cycleNumber?: number;
  payout: { declared: number; paid: number; remaining: number; status: string };
  proofUrl?: string;
  qrDataUrl: string;
}
