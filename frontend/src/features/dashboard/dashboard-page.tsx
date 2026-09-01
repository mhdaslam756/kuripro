import { useState, type ReactNode } from "react";
import {
  Banknote,
  BarChart3,
  CalendarClock,
  Eye,
  EyeOff,
  Gavel,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/features/reports/charts/area-chart";
import { BarChart } from "@/features/reports/charts/bar-chart";
import { DonutChart } from "@/features/reports/charts/donut-chart";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPaise, humanize } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { MemberDashboardView } from "./components/member-dashboard-view";
import { useDashboardActivity, useDashboardSummary, useDashboardTrends } from "./use-dashboard";
import type { DashboardTrends } from "./types";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleString("en-IN", { month: "short" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop-only building blocks (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function KpiTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong">
      <div className="mb-3 flex items-center gap-2 text-text-secondary">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#6D28D9]/15 text-[#8B5CF6]">{icon}</span>
        <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold tabular-nums text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}

function ChartCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Hero Balance Card
// ─────────────────────────────────────────────────────────────────────────────

function MobileHeroCard() {
  const { data, isLoading } = useDashboardSummary();
  const [hidden, setHidden] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="mobile-hero-card sm:hidden relative overflow-hidden rounded-3xl p-5 shadow-xl border border-[#2A2340]">
        <div className="flex items-center justify-between mb-2">
          <div className="skeleton-balance h-3 w-32 rounded" />
          <div className="skeleton-balance h-6 w-6 rounded-full" />
        </div>
        <div className="skeleton-balance mt-3 h-10 w-48 rounded-lg" />
        <div className="skeleton-balance mt-2 h-3 w-24 rounded" />
        <div className="mt-5 border-t border-white/10 pt-4 flex gap-3">
          <div className="skeleton-balance h-3 w-20 rounded flex-1" />
          <div className="skeleton-balance h-3 w-20 rounded flex-1" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="skeleton-balance h-10 flex-1 rounded-2xl" />
          <div className="skeleton-balance h-10 w-10 rounded-2xl" />
          <div className="skeleton-balance h-10 w-10 rounded-2xl" />
        </div>
      </div>
    );
  }

  const next = data.upcomingAuctions[0];

  return (
    <div className="mobile-hero-card sm:hidden relative overflow-hidden rounded-3xl p-5 shadow-xl border border-[#2A2340]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
          <Shield size={12} className="text-[#22C55E]" />
          <span>Today's Collection</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#6D28D9]/20 px-2.5 py-0.5 text-[10px] text-[#A855F7] font-bold border border-[#8B5CF6]/30">
            Real-time
          </span>
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white transition-colors active-bounce"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* Balance */}
      <p className="mt-3 font-display text-4xl font-bold tabular-nums tracking-tight text-white leading-none">
        {hidden ? "₹ ••••••" : formatPaise(data.today.total)}
      </p>
      <p className="mt-1.5 text-xs text-[#A1A1AA]">
        {data.today.count} collection{data.today.count === 1 ? "" : "s"} recorded today
      </p>

      {/* Sub-row */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-semibold">Pending Dues</p>
          <p className="font-display text-sm font-bold text-white">
            {hidden ? "₹ •••" : formatPaise(data.pending.pendingAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-[#EF4444] font-semibold">Overdue</p>
          <p className="font-display text-sm font-bold text-[#EF4444]">
            {hidden ? "₹ •••" : formatPaise(data.pending.overdueAmount)}
          </p>
        </div>
        {next && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[#A855F7] font-semibold">Next Auction</p>
            <p className="font-display text-xs font-bold text-white truncate max-w-[80px]">{next.chitGroupName}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex items-center gap-3">
        <Link
          to="/collections"
          className="active-bounce flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white py-2.5 text-xs font-bold shadow-md shadow-[#6D28D9]/25 border border-[#8B5CF6]/30"
        >
          <Banknote size={15} /> Collect Dues
        </Link>
        <Link to="/members" className="active-bounce flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-white p-2.5 border border-white/15" aria-label="Members">
          <Users size={16} />
        </Link>
        <Link to="/auctions" className="active-bounce flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-white p-2.5 border border-white/15" aria-label="Auction">
          <Gavel size={16} />
        </Link>
        <Link to="/reports" className="active-bounce flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-white p-2.5 border border-white/15" aria-label="Reports">
          <BarChart3 size={16} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight cards — desktop only (mobile gets the hero card above)
// ─────────────────────────────────────────────────────────────────────────────

function HighlightCards() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return (
      <div className="hidden sm:grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const next = data.upcomingAuctions[0];
  return (
    <div className="hidden sm:grid sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-[#8B5CF6]/30 bg-[#6D28D9]/10 p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-[#A855F7]">
          <Banknote className="size-4" />
          <span className="text-sm font-medium">Today's collection</span>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums text-white">{formatPaise(data.today.total)}</p>
        <p className="mt-1 text-sm text-text-secondary">{data.today.count} payment{data.today.count === 1 ? "" : "s"} recorded today</p>
      </div>

      <div className="rounded-xl border border-warn-border bg-warn-bg p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-warn-fg">
          <Wallet className="size-4" />
          <span className="text-sm font-medium">Pending collection</span>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums text-white">{formatPaise(data.pending.pendingAmount)}</p>
        <p className="mt-1 text-sm text-text-secondary">
          {data.pending.pendingCount} due · <span className="text-bad-fg">{data.pending.overdueCount} overdue</span> ({formatPaise(data.pending.overdueAmount)})
        </p>
      </div>

      <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-text-secondary">
          <CalendarClock className="size-4" />
          <span className="text-sm font-medium">Upcoming auction</span>
        </div>
        {next ? (
          <>
            <p className="font-display text-lg font-bold text-white">{next.chitGroupName}</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Cycle #{next.cycleNumber} · {new Date(next.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · pot {formatPaise(next.potAmount)}
            </p>
            <Link to="/auctions" className="mt-2 inline-block text-sm font-medium text-[#8B5CF6] hover:text-[#A855F7] hover:underline">
              Go to auctions →
            </Link>
          </>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">No auctions scheduled right now.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI row — native section on mobile, grid on desktop
// ─────────────────────────────────────────────────────────────────────────────

function KpiRow() {
  const { data } = useDashboardSummary();

  const kpis = [
    { icon: <Users size={16} />, label: "Active Members", value: data ? String(data.kpis.activeMembers) : "—", iconBg: "bg-brand-50", iconFg: "text-accent-primary" },
    { icon: <Gavel size={16} />, label: "Active Chit Groups", value: data ? String(data.kpis.activeGroups) : "—", iconBg: "bg-info-bg", iconFg: "text-info-fg" },
    { icon: <Banknote size={16} />, label: "Collection this month", value: data ? formatPaise(data.kpis.collectionThisMonth) : "—", iconBg: "bg-good-bg", iconFg: "text-good-fg" },
    { icon: <TrendingUp size={16} />, label: "Net profit (MTD)", value: data ? formatPaise(data.monthToDate.profit) : "—", sub: data ? `${formatPaise(data.kpis.outstanding)} outstanding` : undefined, iconBg: "bg-warn-bg", iconFg: "text-warn-fg" },
  ];

  return (
    <>
      {/* Mobile: native section list */}
      <div className="sm:hidden flex flex-col gap-1.5">
        <p className="native-section-label">Key Metrics</p>
        <div className="native-section">
          {kpis.map(({ icon, label, value, sub, iconBg, iconFg }) => (
            <div key={label} className="native-kpi-row">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-8 items-center justify-center rounded-xl shrink-0", iconBg, iconFg)}>
                  {icon}
                </span>
                <div>
                  <p className="text-xs text-text-secondary font-medium">{label}</p>
                  {sub && <p className="text-[10px] text-text-secondary">{sub}</p>}
                </div>
              </div>
              <p className="font-display text-lg font-bold tabular-nums text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid tiles */}
      <div className="hidden sm:grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile icon={<Users className="size-4" />} label="Active members" value={data ? String(data.kpis.activeMembers) : "—"} />
        <KpiTile icon={<Gavel className="size-4" />} label="Active chit groups" value={data ? String(data.kpis.activeGroups) : "—"} />
        <KpiTile icon={<Banknote className="size-4" />} label="Collection this month" value={data ? formatPaise(data.kpis.collectionThisMonth) : "—"} />
        <KpiTile
          icon={<TrendingUp className="size-4" />}
          label="Net profit (MTD)"
          value={data ? formatPaise(data.monthToDate.profit) : "—"}
          sub={data ? `${formatPaise(data.kpis.outstanding)} outstanding` : undefined}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Charts — flat section on mobile, ChartCard on desktop
// ─────────────────────────────────────────────────────────────────────────────

function moneyFmt(v: number): string {
  return formatPaise(v);
}

/** Compact chart section for mobile — no card border, just label + chart */
function MobileChartSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="sm:hidden flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="native-section-label">{title}</p>
        {action && <div className="text-[10px] text-text-secondary">{action}</div>}
      </div>
      <div className="native-section px-4 py-4">
        {children}
      </div>
    </div>
  );
}

function ChartsSection({ trends }: { trends: DashboardTrends }) {
  const collection = trends.collectionTrend.map((p) => ({ label: monthLabel(p.month), value: p.total }));
  const members = trends.memberGrowth.map((p) => ({ label: monthLabel(p.month), value: p.newMembers }));
  const auctions = trends.auctionTrend.map((p) => ({ label: monthLabel(p.month), value: p.prize }));
  const cashNet = trends.cashFlow.map((p) => ({ label: monthLabel(p.month), value: p.net }));
  const income = trends.incomeByCategory.map((c) => ({ label: c.category, value: c.total }));
  const expense = trends.expenseByCategory.map((c) => ({ label: c.category, value: c.total }));

  const totalInflow = trends.cashFlow.reduce((s, p) => s + p.inflow, 0);
  const totalOutflow = trends.cashFlow.reduce((s, p) => s + p.outflow, 0);
  const totalIncome = income.reduce((s, c) => s + c.value, 0);
  const totalExpense = expense.reduce((s, c) => s + c.value, 0);

  return (
    <>
      {/* Mobile: flat native sections */}
      <div className="sm:hidden flex flex-col gap-4">
        <MobileChartSection title="Collection Trend">
          <AreaChart data={collection} formatValue={moneyFmt} />
        </MobileChartSection>
        <MobileChartSection
          title="Cash Flow"
          action={
            <span>
              In <span className="font-bold text-good-fg">{formatPaise(totalInflow)}</span> · Out{" "}
              <span className="font-bold text-bad-fg">{formatPaise(totalOutflow)}</span>
            </span>
          }
        >
          <AreaChart data={cashNet} color="var(--color-good-fg)" formatValue={moneyFmt} />
        </MobileChartSection>
        <MobileChartSection title="Member Growth">
          <BarChart data={members} color="var(--color-info-fg)" formatValue={(v) => String(v)} />
        </MobileChartSection>
        {income.length > 0 && (
          <MobileChartSection title="Income Breakdown">
            <div className="flex justify-center">
              <DonutChart data={income} centerLabel="Income" centerValue={formatPaise(totalIncome)} formatValue={moneyFmt} />
            </div>
          </MobileChartSection>
        )}
      </div>

      {/* Desktop: ChartCards */}
      <div className="hidden sm:flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Collection trend">
            <AreaChart data={collection} formatValue={moneyFmt} />
          </ChartCard>
          <ChartCard
            title="Cash flow"
            action={
              <span className="text-xs text-text-secondary">
                In <span className="font-medium text-good-fg">{formatPaise(totalInflow)}</span> · Out{" "}
                <span className="font-medium text-bad-fg">{formatPaise(totalOutflow)}</span>
              </span>
            }
          >
            <AreaChart data={cashNet} color="var(--color-good-fg)" formatValue={moneyFmt} />
          </ChartCard>
          <ChartCard title="Member growth">
            <BarChart data={members} color="var(--color-info-fg)" formatValue={(v) => String(v)} />
          </ChartCard>
          <ChartCard title="Auction trend (prize disbursed)">
            <BarChart data={auctions} formatValue={moneyFmt} />
          </ChartCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Income">
            {income.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart data={income} centerLabel="Income" centerValue={formatPaise(totalIncome)} formatValue={moneyFmt} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-text-secondary">No income recorded in this period.</p>
            )}
          </ChartCard>
          <ChartCard title="Expense">
            {expense.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart data={expense} centerLabel="Expense" centerValue={formatPaise(totalExpense)} formatValue={moneyFmt} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-text-secondary">No expenses recorded in this period.</p>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent activity — native section on mobile, Card on desktop
// ─────────────────────────────────────────────────────────────────────────────

function RecentActivity() {
  const { data, isLoading } = useDashboardActivity(12);

  const emptyState = <p className="py-6 text-center text-sm text-text-secondary">No activity yet.</p>;

  return (
    <>
      {/* Mobile: native section */}
      <div className="sm:hidden flex flex-col gap-1.5">
        <p className="native-section-label">Recent Activity</p>
        <div className="native-section">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-border-default">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="native-row">
                  <div className="skeleton-shimmer h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-2.5 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            emptyState
          ) : (
            data.map((item) => (
              <div key={item.id} className="native-row">
                {/* Activity type icon bubble */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-accent-primary font-bold text-xs">
                  {item.action.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.message}</p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">{humanize(item.action)} · {formatDateTime(item.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop: Card */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !data || data.length === 0 ? (
            emptyState
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {data.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                      {humanize(item.action)}
                    </span>
                    <span className="text-sm text-text-primary">{item.message}</span>
                  </div>
                  <span className="shrink-0 text-xs text-text-secondary">{formatDateTime(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

const RANGES = [6, 12] as const;

export function DashboardPage() {
  const { user } = useAuth();
  const [months, setMonths] = useState<number>(6);
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends(months);

  if (user?.role?.slug === "MEMBER") {
    return <MemberDashboardView />;
  }

  return (
    <div>
      {/* Desktop page header + range picker */}
      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-text-primary sm:text-3xl">Dashboard</h1>
          <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
            Your chit business at a glance — today's money, what's due, and where trends are heading.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-1 shadow-xs">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMonths(r)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs sm:text-sm font-semibold transition-colors active-bounce",
                  months === r ? "bg-brand-solid text-text-on-brand shadow-xs" : "text-text-secondary hover:bg-brand-50 hover:text-text-primary",
                )}
              >
                {r} months
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: no padding wrapper — sections handle their own spacing */}
      <div className="flex flex-col gap-4 sm:hidden">
        <MobileHeroCard />
        <KpiRow />
        {trendsLoading || !trends ? (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="native-section-label">Analytics</p>
              <div className="native-section px-4 py-8 flex items-center justify-center">
                <div className="skeleton-shimmer h-40 w-full rounded-xl" />
              </div>
            </div>
          </>
        ) : (
          <ChartsSection trends={trends} />
        )}
        <RecentActivity />
      </div>

      {/* Desktop: spaced column */}
      <div className="hidden sm:flex flex-col gap-6">
        <HighlightCards />
        <KpiRow />
        {trendsLoading || !trends ? (
          <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
        ) : (
          <ChartsSection trends={trends} />
        )}
        <RecentActivity />
      </div>
    </div>
  );
}
