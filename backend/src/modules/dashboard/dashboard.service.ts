import { listTenantActivity } from "../activity-logs/activity-log.service.js";
import { ChitCycle } from "../chit-cycles/chit-cycle.model.js";
import { countSettledCycles, findChitCycleByNumber } from "../chit-cycles/chit-cycle.repository.js";
import { findChitGroupById } from "../chit-groups/chit-group.repository.js";
import { ChitMembership } from "../chit-groups/chit-membership.model.js";
import { listChitMembershipsByMemberId } from "../chit-groups/chit-membership.repository.js";
import { resolveMemberForUser } from "../members/member.service.js";
import { Payment } from "../payments/payment.model.js";
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

// --- Member Dashboard ---

export interface CycleWinnerDetail {
  cycleId: string;
  cycleNumber: number;
  chitGroupId: string;
  chitGroupName: string;
  winnerName: string;
  winnerCode: string;
  ticketNumber: number;
  subTicket?: string;
  shareType?: string;
  share?: number;
  prizeAmount: number;
  dividendPerMember?: number;
  discountAmount?: number;
  settledAt?: string;
  isCurrentUserWinner: boolean;
  payoutAmount: number;
  coWinner?: {
    membershipId: string;
    name: string;
    memberCode: string;
    ticketNumber: number;
    subTicket?: string;
    shareType: string;
    share: number;
    payoutAmount: number;
  };
}

export interface MemberDashboardData {
  isMember: boolean;
  member: {
    id: string;
    memberCode: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
  } | null;
  summary: {
    totalGroups: number;
    completedCycles: number;
    totalPaid: number;
    totalOutstanding: number;
    prizesWon: number;
  };
  groups: {
    id: string;
    name: string;
    registrationNumber: string;
    chitValueRupees: number;
    ticketNumber: number;
    shareType?: string;
    share?: number;
    subTicket?: string;
    frequency: string;
    totalMembers: number;
    completedCyclesCount: number;
    currentCycleNumber?: number;
    currentCyclePaidCount?: number;
    installmentAmount: number;
    baseInstallmentAmount?: number;
    status: string;
    hasWon: boolean;
    latestWinner?: CycleWinnerDetail | null;
  }[];
  recentWinners: CycleWinnerDetail[];
  recentPayments: {
    id: string;
    amountPaid: number;
    amountDue: number;
    dueDate: string;
    paidAt?: string;
    status: string;
    method?: string;
  }[];
}

export async function getMemberDashboard(tenantId: string, userId: string): Promise<MemberDashboardData> {
  const member = await resolveMemberForUser(userId, tenantId);
  if (!member) {
    return {
      isMember: false,
      member: null,
      summary: { totalGroups: 0, completedCycles: 0, totalPaid: 0, totalOutstanding: 0, prizesWon: 0 },
      groups: [],
      recentWinners: [],
      recentPayments: [],
    };
  }

  const memberId = member._id.toString();
  const memberships = await listChitMembershipsByMemberId(tenantId, memberId);
  const membershipIds = memberships.map((m) => m._id);

  if (memberships.length === 0) {
    return {
      isMember: true,
      member: {
        id: member._id.toString(),
        memberCode: member.memberCode,
        name: member.name,
        phone: member.phone,
        email: member.email,
        status: member.status,
      },
      summary: { totalGroups: 0, completedCycles: 0, totalPaid: 0, totalOutstanding: 0, prizesWon: 0 },
      groups: [],
      recentWinners: [],
      recentPayments: [],
    };
  }

  // Parallel Batch: Fetch all payments, group details, and settled cycles concurrently
  const validGroupIds = memberships
    .map((m) => {
      const groupRef = m.chitGroupId as any;
      return groupRef?._id ? groupRef._id.toString() : groupRef?.toString();
    })
    .filter(Boolean);

  const [allPayments, groupDetails, settledCycles] = await Promise.all([
    Payment.find({ tenantId, chitMembershipId: { $in: membershipIds } }).sort({ paidAt: -1, updatedAt: -1 }),
    Promise.all(
      memberships.map(async (m) => {
        const groupRef = m.chitGroupId as any;
        const chitGroupId = groupRef?._id ? groupRef._id.toString() : groupRef?.toString();
        if (!chitGroupId) return null;

        const chitGroup = await findChitGroupById(chitGroupId, tenantId);
        if (!chitGroup) return null;

        const cycleNumber = chitGroup.currentCycleNumber || 1;
        const [settledCyclesCount, currentCycle] = await Promise.all([
          countSettledCycles(tenantId, chitGroupId),
          findChitCycleByNumber(tenantId, chitGroupId, cycleNumber),
        ]);

        const currentCyclePaidCount = currentCycle
          ? await Payment.countDocuments({ tenantId, chitGroupId, chitCycleId: currentCycle._id, status: "PAID" })
          : 0;

        return { m, chitGroup, settledCyclesCount, cycleNumber, currentCyclePaidCount };
      }),
    ),
    ChitCycle.find({
      tenantId,
      chitGroupId: { $in: validGroupIds },
      status: "SETTLED",
    })
      .sort({ settledAt: -1, cycleNumber: -1 })
      .populate({
        path: "winnerMembershipId",
        populate: { path: "memberId", select: "name memberCode phone" },
      })
      .lean(),
  ]);

  // Find co-winners for any half-share winning tickets
  const halfShareWinners: { chitGroupId: string; ticketNumber: number; membershipId: string }[] = [];
  for (const sc of settledCycles) {
    const wm: any = sc.winnerMembershipId;
    if (wm && (wm.shareType === "HALF" || (wm.share !== undefined && wm.share < 1))) {
      halfShareWinners.push({
        chitGroupId: sc.chitGroupId.toString(),
        ticketNumber: wm.ticketNumber,
        membershipId: wm._id.toString(),
      });
    }
  }

  const coWinnersMap = new Map<string, any>();
  if (halfShareWinners.length > 0) {
    const coMembers = await ChitMembership.find({
      tenantId,
      $or: halfShareWinners.map((w) => ({
        chitGroupId: w.chitGroupId,
        ticketNumber: w.ticketNumber,
        _id: { $ne: w.membershipId },
      })),
    })
      .populate("memberId", "name memberCode phone")
      .lean();

    for (const cm of coMembers as any[]) {
      coWinnersMap.set(`${cm.chitGroupId.toString()}_${cm.ticketNumber}`, cm);
    }
  }

  // Helper to format winner info
  function formatWinnerInfo(c: any): CycleWinnerDetail | null {
    const wm: any = c.winnerMembershipId;
    if (!wm) return null;
    const memRef: any = wm.memberId || {};
    const isHalf = wm.shareType === "HALF" || (wm.share !== undefined && wm.share < 1);
    const payoutAmount = isHalf ? Math.round((c.prizeAmount || 0) / 2) : (c.prizeAmount || 0);

    let coWinner: CycleWinnerDetail["coWinner"] = undefined;
    if (isHalf) {
      const coWm = coWinnersMap.get(`${c.chitGroupId.toString()}_${wm.ticketNumber}`);
      if (coWm) {
        const coMemRef = coWm.memberId || {};
        coWinner = {
          membershipId: coWm._id.toString(),
          name: coMemRef.name || "Co-member",
          memberCode: coMemRef.memberCode || "",
          ticketNumber: coWm.ticketNumber,
          subTicket: coWm.subTicket,
          shareType: coWm.shareType || "HALF",
          share: coWm.share ?? 0.5,
          payoutAmount,
        };
      }
    }

    const isCurrentUserWinner =
      (member && memRef._id?.toString() === member._id.toString()) ||
      Boolean(coWinner && coWinner.membershipId && memberships.some((m) => m._id.toString() === coWinner.membershipId));

    return {
      cycleId: c._id.toString(),
      cycleNumber: c.cycleNumber,
      chitGroupId: c.chitGroupId.toString(),
      chitGroupName: "",
      winnerName: memRef.name || "Member",
      winnerCode: memRef.memberCode || "",
      ticketNumber: wm.ticketNumber,
      subTicket: wm.subTicket,
      shareType: wm.shareType || "FULL",
      share: wm.share ?? (isHalf ? 0.5 : 1),
      prizeAmount: c.prizeAmount || 0,
      dividendPerMember: c.dividendPerMember || 0,
      discountAmount: c.discountAmount || 0,
      settledAt: c.settledAt ? new Date(c.settledAt).toISOString() : undefined,
      isCurrentUserWinner: Boolean(isCurrentUserWinner),
      payoutAmount,
      coWinner,
    };
  }

  // Fast O(1) Map lookup for payments per membership
  const paymentsByMembership = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    const key = p.chitMembershipId.toString();
    const list = paymentsByMembership.get(key) || [];
    list.push(p);
    paymentsByMembership.set(key, list);
  }

  let completedCycles = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let prizesWon = 0;

  const groupsList = [];
  const groupNameMap = new Map<string, string>();

  for (const item of groupDetails) {
    if (!item) continue;
    const { m, chitGroup, settledCyclesCount, cycleNumber, currentCyclePaidCount } = item;
    const gId = chitGroup._id.toString();
    groupNameMap.set(gId, chitGroup.name);

    completedCycles += settledCyclesCount;
    if (m.hasWon) prizesWon += 1;

    const mPayments = paymentsByMembership.get(m._id.toString()) || [];
    const paidForGroup = mPayments.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const dueForGroup = mPayments.reduce((s, p) => s + (p.amountDue || 0), 0);
    const outstandingForGroup = Math.max(0, dueForGroup - paidForGroup);

    totalPaid += paidForGroup;
    totalOutstanding += outstandingForGroup;

    const memberShare = m.share ?? (m.shareType === "HALF" ? 0.5 : 1);
    const memberInstallmentAmount = Math.round(chitGroup.installmentAmount * memberShare);

    // Latest settled cycle for this group
    const latestSettled = settledCycles.find((sc) => sc.chitGroupId.toString() === gId);
    const latestWinner = latestSettled ? formatWinnerInfo(latestSettled) : null;
    if (latestWinner) {
      latestWinner.chitGroupName = chitGroup.name;
    }

    groupsList.push({
      id: gId,
      name: chitGroup.name,
      registrationNumber: chitGroup.registrationNumber,
      chitValueRupees: Math.round(chitGroup.chitValue / 100),
      ticketNumber: m.ticketNumber,
      shareType: m.shareType ?? "FULL",
      share: memberShare,
      subTicket: m.subTicket,
      frequency: chitGroup.frequency,
      totalMembers: chitGroup.totalMembers,
      completedCyclesCount: settledCyclesCount,
      currentCycleNumber: cycleNumber,
      currentCyclePaidCount,
      installmentAmount: memberInstallmentAmount,
      baseInstallmentAmount: chitGroup.installmentAmount,
      status: chitGroup.status,
      hasWon: Boolean(m.hasWon),
      latestWinner,
    });
  }

  // Recent winners across all groups
  const recentWinners: CycleWinnerDetail[] = [];
  for (const sc of settledCycles) {
    const formatted = formatWinnerInfo(sc);
    if (formatted) {
      formatted.chitGroupName = groupNameMap.get(sc.chitGroupId.toString()) || "";
      recentWinners.push(formatted);
      if (recentWinners.length >= 10) break;
    }
  }

  const recentPayments = allPayments.slice(0, 10).map((p) => ({
    id: p._id.toString(),
    amountPaid: p.amountPaid,
    amountDue: p.amountDue,
    dueDate: p.dueDate.toISOString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
    status: p.status,
    method: p.method,
  }));

  return {
    isMember: true,
    member: {
      id: member._id.toString(),
      memberCode: member.memberCode,
      name: member.name,
      phone: member.phone,
      email: member.email,
      status: member.status,
    },
    summary: {
      totalGroups: memberships.length,
      completedCycles,
      totalPaid,
      totalOutstanding,
      prizesWon,
    },
    groups: groupsList,
    recentWinners,
    recentPayments,
  };
}
