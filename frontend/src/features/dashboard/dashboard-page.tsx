import { useState, type ReactNode } from "react";
import { Banknote, CalendarClock, Gavel, TrendingUp, Users, Wallet } from "lucide-react";
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
import { MobileHeader } from "@/components/mobile/mobile-header";
import type { DashboardTrends } from "./types";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleString("en-IN", { month: "short" });
}

// --- Small building blocks ---

function KpiTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-4 shadow-[0_2px_10px_rgb(30_33_42/0.035)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgb(30_33_42/0.07)]">
      <div className="mb-3 flex items-center gap-2 text-text-secondary">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-accent-primary">{icon}</span>
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}

function ChartCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// --- Highlight row (Today / Pending / Upcoming auction) ---

function HighlightCards() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const next = data.upcomingAuctions[0];
  return (
    <>
      {/* Mobile Native Hero Card */}
      <div className="mobile-hero-card sm:hidden relative overflow-hidden rounded-3xl p-5 shadow-xl border border-white/15">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-200/90">
          <span>Today's Live Collection</span>
          <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] text-amber-200 font-bold border border-amber-400/30">Real-time</span>
        </div>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums text-white">{formatPaise(data.today.total)}</p>
        <p className="mt-1 text-xs text-emerald-100/90">{data.today.count} collection{data.today.count === 1 ? "" : "s"} recorded today</p>
        
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-200/80 font-semibold">Pending Dues</p>
            <p className="font-display text-sm font-bold text-white">{formatPaise(data.pending.pendingAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-red-200/90 font-semibold">Overdue</p>
            <p className="font-display text-sm font-bold text-red-200">{formatPaise(data.pending.overdueAmount)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-1">
          <Link
            to="/collections"
            className="active-bounce flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white text-[#173B3F] py-2.5 text-xs font-bold shadow-md hover:bg-emerald-50"
          >
            <Banknote size={15} /> Collect Dues
          </Link>
          <Link
            to="/members"
            className="active-bounce flex items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white p-2.5 text-xs font-semibold border border-white/20 hover:bg-white/25"
            aria-label="Add Member"
          >
            <Users size={16} />
          </Link>
          <Link
            to="/auctions"
            className="active-bounce flex items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white p-2.5 text-xs font-semibold border border-white/20 hover:bg-white/25"
            aria-label="Live Auction"
          >
            <Gavel size={16} />
          </Link>
        </div>
      </div>

      {/* Desktop / Tablet Highlight Cards */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-brand-300 bg-brand-50 p-4 shadow-[0_4px_16px_rgb(114_83_32/0.08)] sm:p-5">
          <div className="mb-1 flex items-center gap-2 text-brand-strong">
            <Banknote className="size-4" />
            <span className="text-sm font-medium">Today's collection</span>
          </div>
          <p className="font-display text-3xl font-semibold tabular-nums text-text-primary">{formatPaise(data.today.total)}</p>
          <p className="mt-1 text-sm text-text-secondary">{data.today.count} payment{data.today.count === 1 ? "" : "s"} recorded today</p>
        </div>

        <div className="rounded-xl border border-warn-border bg-warn-bg p-4 shadow-[0_4px_16px_rgb(140_90_43/0.07)] sm:p-5">
          <div className="mb-1 flex items-center gap-2 text-warn-fg">
            <Wallet className="size-4" />
            <span className="text-sm font-medium">Pending collection</span>
          </div>
          <p className="font-display text-3xl font-semibold tabular-nums text-text-primary">{formatPaise(data.pending.pendingAmount)}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {data.pending.pendingCount} due · <span className="text-bad-fg">{data.pending.overdueCount} overdue</span> ({formatPaise(data.pending.overdueAmount)})
          </p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-[0_4px_16px_rgb(30_33_42/0.04)] sm:p-5">
          <div className="mb-1 flex items-center gap-2 text-text-secondary">
            <CalendarClock className="size-4" />
            <span className="text-sm font-medium">Upcoming auction</span>
          </div>
          {next ? (
            <>
              <p className="font-display text-lg font-semibold text-text-primary">{next.chitGroupName}</p>
              <p className="mt-0.5 text-sm text-text-secondary">
                Cycle #{next.cycleNumber} · {new Date(next.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · pot {formatPaise(next.potAmount)}
              </p>
              <Link to="/auctions" className="mt-2 inline-block text-sm font-medium text-accent-link hover:underline">
                Go to auctions →
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">No auctions scheduled right now.</p>
          )}
        </div>
      </div>
    </>
  );
}

// --- KPI row ---

function KpiRow() {
  const { data } = useDashboardSummary();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
  );
}

// --- Charts + analytics ---

function moneyFmt(v: number): string {
  return formatPaise(v);
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
    </>
  );
}

// --- Recent activity ---

function RecentActivity() {
  const { data, isLoading } = useDashboardActivity(12);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">No activity yet.</p>
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
  );
}

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
      {/* Mobile Top App Bar */}
      <MobileHeader
        title="Dashboard"
        subtitle="Business overview & live collections"
      />

      <div className="flex flex-col gap-5 p-4 sm:p-0 sm:gap-6">
        {/* Mobile Quick Action Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar sm:hidden">
          <Link
            to="/collections"
            className="active-bounce flex shrink-0 items-center gap-2 rounded-xl border border-brand-300 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-accent-primary shadow-xs"
          >
            <Banknote size={15} /> Quick Collect
          </Link>
          <Link
            to="/members"
            className="active-bounce flex shrink-0 items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary shadow-xs"
          >
            <Users size={15} /> Register Member
          </Link>
          <Link
            to="/auctions"
            className="active-bounce flex shrink-0 items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary shadow-xs"
          >
            <Gavel size={15} /> Auctions
          </Link>
        </div>

        <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-text-primary sm:text-3xl">Dashboard</h1>
            <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">Your chit business at a glance — today's money, what's due, and where trends are heading.</p>
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
