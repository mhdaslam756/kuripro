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

export interface MemberDashboardGroup {
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
}

export interface MemberDashboardPayment {
  id: string;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  paidAt?: string;
  status: string;
  method?: string;
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
  groups: MemberDashboardGroup[];
  recentWinners: CycleWinnerDetail[];
  recentPayments: MemberDashboardPayment[];
}
