import { useState, type ReactNode } from "react";
import {
  Banknote,
  BarChart3,
  CalendarClock,
  Eye,
  EyeOff,
  Gavel,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/features/reports/charts/area-chart";
import { BarChart } from "@/features/reports/charts/bar-chart";
import { DonutChart } from "@/features/reports/charts/donut-chart";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPaise, humanize } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { AtmCard, AtmCardStat } from "@/components/mobile/atm-card";
import { IconTile, toneFor, type IconTone } from "@/components/ui/icon-tile";
import { HeroAction, MobileHero, MobileSheet } from "@/components/mobile/mobile-hero";
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

function KpiTile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-text-secondary">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#6D28D9]/15 text-[#8B5CF6]">{icon}</span>
        <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={cn("font-display text-2xl font-bold tabular-nums", tone === "pos" ? "text-good-strong" : tone === "neg" ? "text-bad-fg" : "text-text-primary")}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}

/** Shown when a dashboard request fails, so a failed load never looks like an endless skeleton. */
function LoadError({ what, onRetry, className }: { what: string; onRetry: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad-border bg-bad-bg p-4 text-sm text-text-primary",
        className,
      )}
    >
      <span>Couldn't load {what}. Check your connection and try again.</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
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

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Hero Balance Card
// ─────────────────────────────────────────────────────────────────────────────

function MobileHeroCard() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const [hidden, setHidden] = useState(false);

  if (isError && !data) {
    return <LoadError what="today's collection" onRetry={() => void refetch()} className="sm:hidden" />;
  }

  if (isLoading || !data) {
    return (
      <div className="sm:hidden">
        <AtmCard
          label="Today's collection"
          amount={<span className="skeleton-balance inline-block h-10 w-44 rounded-lg align-middle" />}
          caption={<span className="skeleton-balance inline-block h-3 w-32 rounded align-middle" />}
          footer={
            <>
              <span className="skeleton-balance h-8 w-20 rounded" />
              <span className="skeleton-balance h-8 w-20 rounded" />
              <span className="skeleton-balance h-8 w-20 rounded" />
            </>
          }
        />
      </div>
    );
  }

  const next = data.upcomingAuctions[0];

  return (
    <div className="flex flex-col gap-7 sm:hidden">
      <AtmCard
        label="Today's collection"
        amount={hidden ? "₹ ••••••" : formatPaise(data.today.total)}
        caption={`${data.today.count} collection${data.today.count === 1 ? "" : "s"} recorded today`}
        action={
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            className="relative flex size-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors active-bounce after:absolute after:-inset-2 after:content-['']"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        }
        footer={
          <>
            <AtmCardStat label="Pending dues" value={hidden ? "₹ •••" : formatPaise(data.pending.pendingAmount)} />
            <AtmCardStat label="Overdue" value={hidden ? "₹ •••" : formatPaise(data.pending.overdueAmount)} />
            {next ? <AtmCardStat label="Next auction" value={next.chitGroupName} align="right" /> : null}
          </>
        }
      />

      {/* Quick actions sit under the card, like the action row in a banking app */}
      <div className="flex items-start gap-2">
        <HeroAction to="/collections" label="Collect" tone="emerald" icon={<Banknote size={22} />} />
        <HeroAction to="/members" label="Members" tone="sky" icon={<Users size={22} />} />
        <HeroAction to="/auctions" label="Auctions" tone="amber" icon={<Gavel size={22} />} />
        <HeroAction to="/reports" label="Reports" tone="rose" icon={<BarChart3 size={22} />} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight cards — desktop only (mobile gets the hero card above)
// ─────────────────────────────────────────────────────────────────────────────

function HighlightCards() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isError && !data) {
    return <LoadError what="the summary" onRetry={() => void refetch()} className="hidden sm:flex" />;
  }

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
      <div className="mobile-hero-card rounded-xl p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-white/90">
          <Banknote className="size-4" />
          <span className="text-sm font-medium">Today's collection</span>
        </div>
        <p className="font-display text-4xl font-bold tabular-nums tracking-tight text-white">{formatPaise(data.today.total)}</p>
        <p className="mt-1 text-sm text-white/90">{data.today.count} payment{data.today.count === 1 ? "" : "s"} recorded today</p>
      </div>

      <div className="rounded-xl border border-warn-border bg-warn-bg p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-warn-strong">
          <Wallet className="size-4" />
          <span className="text-sm font-medium">Pending collection</span>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums text-text-primary">{formatPaise(data.pending.pendingAmount)}</p>
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
            <p className="font-display text-lg font-bold text-text-primary">{next.chitGroupName}</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Cycle #{next.cycleNumber} · {new Date(next.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · pot {formatPaise(next.potAmount)}
            </p>
            <Link to="/auctions" className="mt-2 inline-block text-sm font-medium text-accent-primary hover:underline">
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
    { icon: <Users size={16} />, label: "Active Members", value: data ? String(data.kpis.activeMembers) : "—", tile: "sky" as IconTone },
    { icon: <Gavel size={16} />, label: "Active Chit Groups", value: data ? String(data.kpis.activeGroups) : "—", tile: "violet" as IconTone },
    { icon: <Banknote size={16} />, label: "Collection this month", value: data ? formatPaise(data.kpis.collectionThisMonth) : "—", tile: "emerald" as IconTone },
    { icon: <TrendingUp size={16} />, label: "Net profit (MTD)", value: data ? formatPaise(data.monthToDate.profit) : "—", sub: data ? `${formatPaise(data.kpis.outstanding)} outstanding` : undefined, tile: "amber" as IconTone, tone: data ? (data.monthToDate.profit > 0 ? "pos" : data.monthToDate.profit < 0 ? "neg" : undefined) : undefined },
  ];

  return (
    <>
      {/* Mobile: native section list */}
      <div className="sm:hidden flex flex-col gap-1.5">
        <p className="native-section-label">Key Metrics</p>
        <div className="native-section">
          {kpis.map(({ icon, label, value, sub, tile, tone }) => (
            <div key={label} className="native-kpi-row">
              <div className="flex items-center gap-3">
                <IconTile size="sm" tone={tile}>
                  {icon}
                </IconTile>
                <div>
                  <p className="text-xs text-text-secondary font-medium">{label}</p>
                  {sub && <p className="text-xs text-text-secondary">{sub}</p>}
                </div>
              </div>
              <p className={cn("font-display text-lg font-bold tabular-nums", tone === "pos" ? "text-good-strong" : tone === "neg" ? "text-bad-fg" : "text-text-primary")}>{value}</p>
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
          tone={data ? (data.monthToDate.profit > 0 ? "pos" : data.monthToDate.profit < 0 ? "neg" : undefined) : undefined}
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
        {action && <div className="text-xs text-text-secondary">{action}</div>}
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
              In <span className="font-bold text-good-strong">{formatPaise(totalInflow)}</span> · Out{" "}
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
                In <span className="font-medium text-good-strong">{formatPaise(totalInflow)}</span> · Out{" "}
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
                <IconTile tone={toneFor(item.action)} className="text-xs">
                  {item.action.charAt(0).toUpperCase()}
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.message}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{humanize(item.action)} · {formatDateTime(item.createdAt)}</p>
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
                    <span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-text-secondary">
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
  const { data: trends, isLoading: trendsLoading, isError: trendsError, refetch: refetchTrends } = useDashboardTrends(months);

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
          <div role="group" aria-label="Chart range" className="inline-flex rounded-lg border border-border-default bg-bg-surface p-1 shadow-xs">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={months === r}
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
      <div className="flex flex-col sm:hidden">
        <MobileHero>
          <MobileHeroCard />
        </MobileHero>
        <MobileSheet className="flex flex-col gap-4">
        <KpiRow />
        {trendsError && !trends ? (
          <LoadError what="the analytics" onRetry={() => void refetchTrends()} />
        ) : trendsLoading || !trends ? (
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
        </MobileSheet>
      </div>

      {/* Desktop: spaced column */}
      <div className="hidden sm:flex flex-col gap-6">
        <HighlightCards />
        <KpiRow />
        {trendsError && !trends ? (
          <LoadError what="the analytics" onRetry={() => void refetchTrends()} />
        ) : trendsLoading || !trends ? (
          <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
        ) : (
          <ChartsSection trends={trends} />
        )}
        <RecentActivity />
      </div>
    </div>
  );
}
