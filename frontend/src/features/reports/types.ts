export const REPORT_TYPES = [
  "monthly",
  "collections",
  "defaulters",
  "members",
  "auctions",
  "payout",
  "cashbook",
  "bank",
  "income",
  "expense",
  "profit",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const EXPORT_FORMATS = ["pdf", "excel", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface MethodTotal {
  method: string;
  total: number;
  count: number;
}
export interface DaySeriesPoint {
  day: string;
  total: number;
  count: number;
}
export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  system?: boolean;
}

export interface MonthlyReport {
  period: { from?: string; to?: string };
  collections: { total: number; count: number };
  disbursed: number;
  commissionIncome: number;
  otherIncome: number;
  totalIncome: number;
  expense: number;
  netProfit: number;
  newMembers: number;
  auctionsSettled: number;
  collectionsByDay: DaySeriesPoint[];
}

export interface CollectionsReport {
  total: number;
  count: number;
  byMethod: MethodTotal[];
  byDay: DaySeriesPoint[];
  rows: { receiptNumber: string; memberName: string; memberCode: string; amount: number; method: string; status: string; collectedAt: string }[];
}

export interface DefaultersReport {
  rows: { memberName: string; memberCode: string; phone: string; chitGroupName: string; overdueCount: number; overdueAmount: number; oldestDueDate: string }[];
  totalOverdue: number;
  count: number;
}

export interface MembersReport {
  total: number;
  byStatus: { key: string; count: number }[];
  byKyc: { key: string; count: number }[];
  byRisk: { key: string; count: number }[];
  newInRange: number;
}

export interface AuctionsReport {
  rows: { chitGroupName: string; cycleNumber: number; winnerName: string; prizeAmount: number; discountAmount: number; commissionAmount: number; dividendPerMember: number; settledAt?: string }[];
  totals: { prize: number; commission: number; discount: number };
  count: number;
}

export interface PayoutReport {
  rows: { receiptNumber: string; memberName: string; chitGroupName: string; amount: number; method: string; disbursedAt: string }[];
  byMethod: MethodTotal[];
  total: number;
  count: number;
}

export interface MovementRow {
  date: string;
  particulars: string;
  reference: string;
  inflow: number;
  outflow: number;
  balance: number;
}
export interface BookReport {
  rows: MovementRow[];
  totalIn: number;
  totalOut: number;
  net: number;
}

export interface IncomeReport {
  byCategory: CategoryTotal[];
  total: number;
}
export interface ExpenseReport {
  byCategory: CategoryTotal[];
  total: number;
}
export interface ProfitReport {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

// --- Finance entries ---

export const FINANCE_ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;
export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];
export const FINANCE_CHANNELS = ["CASH", "BANK"] as const;
export type FinanceChannel = (typeof FINANCE_CHANNELS)[number];

export interface FinanceEntry {
  id: string;
  type: FinanceEntryType;
  category: string;
  amount: number;
  channel: FinanceChannel;
  date: string;
  description?: string;
  createdAt: string;
}

export interface PaginatedFinanceEntries {
  items: FinanceEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
