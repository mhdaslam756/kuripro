export interface UpcomingCycle {
  cycleId: string;
  chitGroupId: string;
  chitGroupName: string;
  cycleNumber: number;
  scheduledDate: string;
  status: string;
  potAmount: number;
}

export interface DashboardSummary {
  today: { total: number; count: number };
  monthToDate: { collection: number; profit: number };
  pending: { pendingCount: number; pendingAmount: number; overdueCount: number; overdueAmount: number };
  upcomingAuctions: UpcomingCycle[];
  kpis: { activeMembers: number; activeGroups: number; outstanding: number; collectionThisMonth: number };
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface DashboardTrends {
  months: string[];
  collectionTrend: { month: string; total: number; count: number }[];
  memberGrowth: { month: string; newMembers: number }[];
  auctionTrend: { month: string; prize: number; commission: number; count: number }[];
  incomeExpense: { month: string; income: number; expense: number }[];
  cashFlow: { month: string; inflow: number; outflow: number; net: number }[];
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

export interface ActivityItem {
  id: string;
  action: string;
  message: string;
  createdAt: string;
}
