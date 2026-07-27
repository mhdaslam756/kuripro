import { AppError } from "../../utils/app-error.js";
import * as repo from "./report.repository.js";
import type { ExportTable } from "./export.util.js";

export interface ReportParams {
  from?: Date;
  to?: Date;
  chitGroupId?: string;
}

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

// --- Monthly summary ---

export async function getMonthly(tenantId: string, params: ReportParams) {
  const { from, to } = params;
  const [byMethod, byDay, commission, incomeCats, expenseCats, disburseByMethod, members, settled] = await Promise.all([
    repo.collectionsByMethod(tenantId, from, to),
    repo.collectionsByDay(tenantId, from, to),
    repo.commissionIncome(tenantId, from, to),
    repo.financeByCategory(tenantId, "INCOME", from, to),
    repo.financeByCategory(tenantId, "EXPENSE", from, to),
    repo.disbursementsByMethod(tenantId, from, to),
    repo.memberStats(tenantId, from, to),
    repo.settledCycles(tenantId, from, to),
  ]);

  const collectionsTotal = byMethod.reduce((s, m) => s + m.total, 0);
  const collectionsCount = byMethod.reduce((s, m) => s + m.count, 0);
  const otherIncome = incomeCats.reduce((s, c) => s + c.total, 0);
  const expense = expenseCats.reduce((s, c) => s + c.total, 0);
  const disbursed = disburseByMethod.reduce((s, m) => s + m.total, 0);
  const totalIncome = commission + otherIncome;

  return {
    period: { from, to },
    collections: { total: collectionsTotal, count: collectionsCount },
    disbursed,
    commissionIncome: commission,
    otherIncome,
    totalIncome,
    expense,
    netProfit: totalIncome - expense,
    newMembers: members.newInRange,
    auctionsSettled: settled.length,
    collectionsByDay: byDay,
  };
}

// --- Collections ---

export async function getCollections(tenantId: string, params: ReportParams) {
  const { from, to, chitGroupId } = params;
  const [byMethod, byDay, rows] = await Promise.all([
    repo.collectionsByMethod(tenantId, from, to, chitGroupId),
    repo.collectionsByDay(tenantId, from, to, chitGroupId),
    repo.collectionRows(tenantId, from, to, chitGroupId),
  ]);
  const total = byMethod.reduce((s, m) => s + m.total, 0);
  const count = byMethod.reduce((s, m) => s + m.count, 0);
  return { total, count, byMethod, byDay, rows };
}

// --- Defaulters ---

export async function getDefaulters(tenantId: string, params: ReportParams) {
  const rows = await repo.defaulters(tenantId, params.chitGroupId);
  const totalOverdue = rows.reduce((s, r) => s + r.overdueAmount, 0);
  return { rows, totalOverdue, count: rows.length };
}

// --- Members ---

export async function getMembers(tenantId: string, params: ReportParams) {
  return repo.memberStats(tenantId, params.from, params.to);
}

// --- Auctions ---

export async function getAuctions(tenantId: string, params: ReportParams) {
  const rows = await repo.settledCycles(tenantId, params.from, params.to, params.chitGroupId);
  const totals = rows.reduce(
    (acc, r) => ({
      prize: acc.prize + r.prizeAmount,
      commission: acc.commission + r.commissionAmount,
      discount: acc.discount + r.discountAmount,
    }),
    { prize: 0, commission: 0, discount: 0 },
  );
  return { rows, totals, count: rows.length };
}

// --- Payout ---

export async function getPayout(tenantId: string, params: ReportParams) {
  const [rows, byMethod] = await Promise.all([
    repo.disbursementRows(tenantId, params.from, params.to),
    repo.disbursementsByMethod(tenantId, params.from, params.to),
  ]);
  const total = byMethod.reduce((s, m) => s + m.total, 0);
  return { rows, byMethod, total, count: rows.length };
}

// --- Cashbook / Bank ---

function withRunningBalance(movements: repo.MovementRow[]) {
  let balance = 0;
  const rows = movements.map((m) => {
    balance += m.inflow - m.outflow;
    return { ...m, balance };
  });
  const totalIn = movements.reduce((s, m) => s + m.inflow, 0);
  const totalOut = movements.reduce((s, m) => s + m.outflow, 0);
  return { rows, totalIn, totalOut, net: totalIn - totalOut };
}

export async function getCashbook(tenantId: string, params: ReportParams) {
  return withRunningBalance(await repo.cashMovements(tenantId, params.from, params.to));
}

export async function getBank(tenantId: string, params: ReportParams) {
  return withRunningBalance(await repo.bankMovements(tenantId, params.from, params.to));
}

// --- Income / Expense / Profit ---

export async function getIncome(tenantId: string, params: ReportParams) {
  const [commission, financeCats] = await Promise.all([
    repo.commissionIncome(tenantId, params.from, params.to),
    repo.financeByCategory(tenantId, "INCOME", params.from, params.to),
  ]);
  const byCategory = [
    ...(commission > 0 ? [{ category: "Foreman Commission", total: commission, count: 0, system: true }] : []),
    ...financeCats.map((c) => ({ ...c, system: false })),
  ];
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  return { byCategory, total };
}

export async function getExpense(tenantId: string, params: ReportParams) {
  const byCategory = await repo.financeByCategory(tenantId, "EXPENSE", params.from, params.to);
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  return { byCategory, total };
}

export async function getProfit(tenantId: string, params: ReportParams) {
  const [income, expense] = await Promise.all([getIncome(tenantId, params), getExpense(tenantId, params)]);
  return {
    totalIncome: income.total,
    totalExpense: expense.total,
    netProfit: income.total - expense.total,
    incomeByCategory: income.byCategory,
    expenseByCategory: expense.byCategory,
  };
}

// --- Export tables ---

function periodSubtitle(params: ReportParams): string {
  const fmt = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "—");
  return params.from || params.to ? `Period: ${fmt(params.from)} to ${fmt(params.to)}` : "All time";
}

export async function buildExportTable(tenantId: string, type: ReportType, params: ReportParams): Promise<ExportTable> {
  const subtitle = periodSubtitle(params);

  switch (type) {
    case "collections": {
      const data = await getCollections(tenantId, params);
      return {
        title: "Collections Report",
        subtitle,
        columns: [
          { key: "receiptNumber", label: "Receipt" },
          { key: "memberName", label: "Member" },
          { key: "memberCode", label: "Code" },
          { key: "method", label: "Method" },
          { key: "status", label: "Status" },
          { key: "collectedAt", label: "Date" },
          { key: "amount", label: "Amount", money: true },
        ],
        rows: data.rows as unknown as Record<string, unknown>[],
        totals: { memberName: "TOTAL", amount: data.total },
      };
    }
    case "defaulters": {
      const data = await getDefaulters(tenantId, params);
      return {
        title: "Defaulters Report",
        subtitle,
        columns: [
          { key: "memberName", label: "Member" },
          { key: "memberCode", label: "Code" },
          { key: "phone", label: "Phone" },
          { key: "chitGroupName", label: "Chit group" },
          { key: "overdueCount", label: "Overdue #" },
          { key: "oldestDueDate", label: "Oldest due" },
          { key: "overdueAmount", label: "Overdue amount", money: true },
        ],
        rows: data.rows as unknown as Record<string, unknown>[],
        totals: { memberName: "TOTAL", overdueAmount: data.totalOverdue },
      };
    }
    case "members": {
      const data = await getMembers(tenantId, params);
      const rows = [
        ...data.byStatus.map((s) => ({ group: "Status", key: s.key, count: s.count })),
        ...data.byKyc.map((s) => ({ group: "KYC", key: s.key, count: s.count })),
        ...data.byRisk.map((s) => ({ group: "Risk", key: s.key, count: s.count })),
      ];
      return {
        title: "Members Report",
        subtitle,
        columns: [
          { key: "group", label: "Dimension" },
          { key: "key", label: "Value" },
          { key: "count", label: "Members" },
        ],
        rows,
        totals: { group: "TOTAL MEMBERS", count: data.total },
      };
    }
    case "auctions": {
      const data = await getAuctions(tenantId, params);
      return {
        title: "Auctions Report",
        subtitle,
        columns: [
          { key: "chitGroupName", label: "Chit group" },
          { key: "cycleNumber", label: "Cycle" },
          { key: "winnerName", label: "Winner" },
          { key: "settledAt", label: "Settled" },
          { key: "discountAmount", label: "Discount", money: true },
          { key: "commissionAmount", label: "Commission", money: true },
          { key: "prizeAmount", label: "Prize", money: true },
        ],
        rows: data.rows as unknown as Record<string, unknown>[],
        totals: { chitGroupName: "TOTAL", discountAmount: data.totals.discount, commissionAmount: data.totals.commission, prizeAmount: data.totals.prize },
      };
    }
    case "payout": {
      const data = await getPayout(tenantId, params);
      return {
        title: "Payout Report",
        subtitle,
        columns: [
          { key: "receiptNumber", label: "Voucher" },
          { key: "memberName", label: "Member" },
          { key: "chitGroupName", label: "Chit group" },
          { key: "method", label: "Method" },
          { key: "disbursedAt", label: "Date" },
          { key: "amount", label: "Amount", money: true },
        ],
        rows: data.rows as unknown as Record<string, unknown>[],
        totals: { memberName: "TOTAL", amount: data.total },
      };
    }
    case "cashbook":
    case "bank": {
      const data = type === "cashbook" ? await getCashbook(tenantId, params) : await getBank(tenantId, params);
      return {
        title: type === "cashbook" ? "Cashbook" : "Bank Book",
        subtitle,
        columns: [
          { key: "date", label: "Date" },
          { key: "particulars", label: "Particulars" },
          { key: "reference", label: "Reference" },
          { key: "inflow", label: "Inflow", money: true },
          { key: "outflow", label: "Outflow", money: true },
          { key: "balance", label: "Balance", money: true },
        ],
        rows: data.rows as unknown as Record<string, unknown>[],
        totals: { particulars: "TOTAL", inflow: data.totalIn, outflow: data.totalOut, balance: data.net },
      };
    }
    case "income": {
      const data = await getIncome(tenantId, params);
      return {
        title: "Income Report",
        subtitle,
        columns: [
          { key: "category", label: "Category" },
          { key: "count", label: "Entries" },
          { key: "total", label: "Amount", money: true },
        ],
        rows: data.byCategory as unknown as Record<string, unknown>[],
        totals: { category: "TOTAL INCOME", total: data.total },
      };
    }
    case "expense": {
      const data = await getExpense(tenantId, params);
      return {
        title: "Expense Report",
        subtitle,
        columns: [
          { key: "category", label: "Category" },
          { key: "count", label: "Entries" },
          { key: "total", label: "Amount", money: true },
        ],
        rows: data.byCategory as unknown as Record<string, unknown>[],
        totals: { category: "TOTAL EXPENSE", total: data.total },
      };
    }
    case "profit": {
      const data = await getProfit(tenantId, params);
      const rows = [
        ...data.incomeByCategory.map((c) => ({ section: "Income", category: c.category, amount: c.total })),
        ...data.expenseByCategory.map((c) => ({ section: "Expense", category: c.category, amount: -c.total })),
      ];
      return {
        title: "Profit & Loss",
        subtitle,
        columns: [
          { key: "section", label: "Section" },
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", money: true },
        ],
        rows,
        totals: { section: "NET PROFIT", amount: data.netProfit },
      };
    }
    case "monthly": {
      const data = await getMonthly(tenantId, params);
      const rows = [
        { metric: "Collections", value: data.collections.total },
        { metric: "Prize disbursed", value: data.disbursed },
        { metric: "Commission income", value: data.commissionIncome },
        { metric: "Other income", value: data.otherIncome },
        { metric: "Expenses", value: data.expense },
        { metric: "Net profit", value: data.netProfit },
      ];
      return {
        title: "Monthly Summary",
        subtitle,
        columns: [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Amount", money: true },
        ],
        rows,
      };
    }
    default:
      throw AppError.badRequest(`Unknown report type: ${String(type)}`);
  }
}
