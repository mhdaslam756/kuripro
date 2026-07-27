import { listTenantActivity } from "../activity-logs/activity-log.service.js";
import * as repo from "./dashboard.repository.js";

// --- Date helpers ---

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function windowStart(months: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
}

function monthKeys(months: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

/** Builds a month→row lookup so a dense series can zero-fill months with no data. */
function monthLookup<T extends { month: string }>(rows: T[]): (month: string) => T | undefined {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return (month) => byMonth.get(month);
}

function num(value: string | number | undefined): number {
  return typeof value === "number" ? value : 0;
}

// --- Summary (KPIs + today + pending + upcoming) ---

export interface DashboardSummary {
  today: { total: number; count: number };
  monthToDate: { collection: number; profit: number };
  pending: repo.PendingSummary;
  upcomingAuctions: repo.UpcomingCycleRow[];
  kpis: {
    activeMembers: number;
    activeGroups: number;
    outstanding: number;
    collectionThisMonth: number;
  };
}

export async function getSummary(tenantId: string): Promise<DashboardSummary> {
  const monthStart = startOfMonth();
  const now = new Date();

  const [today, monthCollection, pending, upcoming, activeMembers, activeGroups, commission, financeIncome, financeExpense] =
    await Promise.all([
      repo.collectionsBetween(tenantId, startOfToday(), now),
      repo.collectionsBetween(tenantId, monthStart, now),
      repo.pendingSummary(tenantId),
      repo.upcomingCycles(tenantId, 5),
      repo.countActiveMembers(tenantId),
      repo.countActiveGroups(tenantId),
      repo.commissionSince(tenantId, monthStart),
      repo.financeByType(tenantId, "INCOME", monthStart),
      repo.financeByType(tenantId, "EXPENSE", monthStart),
    ]);

  const incomeThisMonth = commission + financeIncome.reduce((s, c) => s + c.total, 0);
  const expenseThisMonth = financeExpense.reduce((s, c) => s + c.total, 0);

  return {
    today: { total: today.total, count: today.count },
    monthToDate: { collection: monthCollection.total, profit: incomeThisMonth - expenseThisMonth },
    pending,
    upcomingAuctions: upcoming,
    kpis: {
      activeMembers,
      activeGroups,
      outstanding: pending.pendingAmount,
      collectionThisMonth: monthCollection.total,
    },
  };
}

// --- Trends (monthly series + category breakdowns over a window) ---

export interface DashboardTrends {
  months: string[];
  collectionTrend: { month: string; total: number; count: number }[];
  memberGrowth: { month: string; newMembers: number }[];
  auctionTrend: { month: string; prize: number; commission: number; count: number }[];
  incomeExpense: { month: string; income: number; expense: number }[];
  cashFlow: { month: string; inflow: number; outflow: number; net: number }[];
  incomeByCategory: repo.CategoryTotal[];
  expenseByCategory: repo.CategoryTotal[];
}

export async function getTrends(tenantId: string, months: number): Promise<DashboardTrends> {
  const from = windowStart(months);
  const keys = monthKeys(months);

  const [collections, members, auctions, finance, disbursements, income, expense, commission] = await Promise.all([
    repo.monthlyCollections(tenantId, from),
    repo.monthlyNewMembers(tenantId, from),
    repo.monthlyAuctions(tenantId, from),
    repo.monthlyFinance(tenantId, from),
    repo.monthlyDisbursements(tenantId, from),
    repo.financeByType(tenantId, "INCOME", from),
    repo.financeByType(tenantId, "EXPENSE", from),
    repo.commissionSince(tenantId, from),
  ]);

  const collLU = monthLookup(collections);
  const memberLU = monthLookup(members);
  const auctionLU = monthLookup(auctions);
  const financeLU = monthLookup(finance);
  const disbLU = monthLookup(disbursements);

  const collectionTrend = keys.map((month) => {
    const r = collLU(month);
    return { month, total: num(r?.total), count: num(r?.count) };
  });
  const memberGrowth = keys.map((month) => ({ month, newMembers: num(memberLU(month)?.count) }));
  const auctionTrend = keys.map((month) => {
    const r = auctionLU(month);
    return { month, prize: num(r?.prize), commission: num(r?.commission), count: num(r?.count) };
  });

  // Income = misc finance income + foreman commission that month; Expense = finance expense.
  const incomeExpense = keys.map((month) => ({
    month,
    income: (financeLU(month)?.income ?? 0) + num(auctionLU(month)?.commission),
    expense: financeLU(month)?.expense ?? 0,
  }));

  // Cash flow: money in (collections + finance income) vs money out (payouts + finance expense).
  const cashFlow = keys.map((month) => {
    const inflow = num(collLU(month)?.total) + (financeLU(month)?.income ?? 0);
    const outflow = num(disbLU(month)?.total) + (financeLU(month)?.expense ?? 0);
    return { month, inflow, outflow, net: inflow - outflow };
  });

  const incomeByCategory = commission > 0 ? [{ category: "Foreman Commission", total: commission }, ...income] : income;

  return {
    months: keys,
    collectionTrend,
    memberGrowth,
    auctionTrend,
    incomeExpense,
    cashFlow,
    incomeByCategory,
    expenseByCategory: expense,
  };
}

// --- Recent activity ---

export interface ActivityItem {
  id: string;
  action: string;
  message: string;
  createdAt: string;
}

export async function getActivity(tenantId: string, limit: number): Promise<ActivityItem[]> {
  const result = await listTenantActivity(tenantId, { page: 1, limit });
  return result.items.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    message: log.message,
    createdAt: log.createdAt.toISOString(),
  }));
}
