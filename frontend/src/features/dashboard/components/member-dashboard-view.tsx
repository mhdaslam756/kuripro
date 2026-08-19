import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Gavel,
  Shield,
  ShieldCheck,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableHeaderCell, TableRow,
} from "@/components/ui/table";
import { ReceiptDialog } from "@/features/collections/components/receipt-dialog";
import { DueStatusBadge } from "@/features/collections/components/collection-badges";
import { formatDateTime, formatPaise } from "@/lib/format";
import { useMemberDashboard } from "../use-dashboard";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton (mobile only)
// ─────────────────────────────────────────────────────────────────────────────

function MobileLoadingSkeleton() {
  return (
    <div className="sm:hidden flex flex-col gap-4">
      {/* Balance card skeleton */}
      <div className="mobile-balance-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="skeleton-balance h-3 w-28 rounded" />
          <div className="skeleton-balance h-6 w-6 rounded-full" />
        </div>
        <div className="skeleton-balance mt-3 h-11 w-44 rounded-lg" />
        <div className="skeleton-balance mt-2 h-3 w-32 rounded" />
        <div className="mt-5 border-t border-white/15 pt-4 flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="skeleton-balance h-12 w-12 rounded-full" />
              <div className="skeleton-balance h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* KPI rows skeleton */}
      <div className="flex flex-col gap-1.5">
        <div className="native-section">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="native-kpi-row">
              <div className="skeleton-shimmer h-8 w-8 rounded-xl" />
              <div className="skeleton-shimmer h-3 flex-1 rounded" />
              <div className="skeleton-shimmer h-5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Groups skeleton */}
      <div className="flex flex-col gap-1.5">
        <p className="native-section-label">My Chit Groups</p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-shimmer mobile-chit-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Balance Card
// ─────────────────────────────────────────────────────────────────────────────

interface BalanceCardProps {
  totalPaid: number;
  outstanding: number;
  memberName: string;
  memberCode: string;
}

function MobileBalanceCard({ totalPaid, outstanding, memberName, memberCode }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="mobile-balance-card sm:hidden p-5">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            Total Contributions
          </span>
        </div>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white transition-colors active-bounce"
          aria-label={hidden ? "Show balance" : "Hide balance"}
        >
          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Balance */}
      <div className="relative z-10 mt-3">
        <p className="font-display text-4xl font-bold tabular-nums tracking-tight text-white leading-none">
          {hidden ? "₹ ••••••" : formatPaise(totalPaid)}
        </p>
        <p className="mt-1.5 text-xs text-white/60">
          {memberName} · <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300/80">{memberCode}</span>
        </p>
      </div>

      {/* Outstanding chip */}
      <div className="relative z-10 mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1">
        <ArrowUpRight size={11} className="text-red-300" />
        <span className="text-[11px] font-semibold text-red-200">
          {hidden ? "₹ •••" : formatPaise(outstanding)} outstanding
        </span>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/15 pt-4">
        <Link to="/collections" className="mobile-quick-action">
          <div className="mobile-quick-action-icon"><Wallet size={20} className="text-white" /></div>
          <span className="mobile-quick-action-label">Pay Dues</span>
        </Link>
        <Link to="/auctions" className="mobile-quick-action">
          <div className="mobile-quick-action-icon"><Gavel size={20} className="text-white" /></div>
          <span className="mobile-quick-action-label">Auctions</span>
        </Link>
        <Link to="/chit-groups" className="mobile-quick-action">
          <div className="mobile-quick-action-icon"><Shield size={20} className="text-white" /></div>
          <span className="mobile-quick-action-label">My Chits</span>
        </Link>
        <Link to="/collections" className="mobile-quick-action">
          <div className="mobile-quick-action-icon"><BadgeCheck size={20} className="text-white" /></div>
          <span className="mobile-quick-action-label">Receipts</span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile KPI — native section list (no individual card borders)
// ─────────────────────────────────────────────────────────────────────────────

interface KpiStripProps {
  totalGroups: number;
  completedCycles: number;
  totalPaid: number;
  totalOutstanding: number;
  prizesWon: number;
}

function MobileKpiSection({ totalGroups, completedCycles, totalPaid, totalOutstanding, prizesWon }: KpiStripProps) {
  const items = [
    { label: "Chit Groups Enrolled", value: String(totalGroups), icon: <Wallet size={16} />, iconBg: "bg-brand-50", iconFg: "text-accent-primary" },
    { label: "Completed Cycles", value: String(completedCycles), icon: <CheckCircle2 size={16} />, iconBg: "bg-good-bg", iconFg: "text-good-fg" },
    { label: "Total Contributed", value: formatPaise(totalPaid), icon: <Zap size={16} />, iconBg: "bg-brand-100", iconFg: "text-accent-primary" },
    { label: "Outstanding Balance", value: formatPaise(totalOutstanding), icon: <Calendar size={16} />, iconBg: "bg-warn-bg", iconFg: "text-warn-fg" },
    { label: "Auction Prizes Won", value: String(prizesWon), icon: <Trophy size={16} />, iconBg: "bg-info-bg", iconFg: "text-info-fg" },
  ];

  return (
    <div className="sm:hidden flex flex-col gap-1.5">
      <p className="native-section-label">My Summary</p>
      <div className="native-section">
        {items.map(({ label, value, icon, iconBg, iconFg }) => (
          <div key={label} className="native-kpi-row">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-8 items-center justify-center rounded-xl shrink-0", iconBg, iconFg)}>
                {icon}
              </span>
              <p className="text-sm font-medium text-text-secondary">{label}</p>
            </div>
            <p className="font-display text-base font-bold tabular-nums text-text-primary">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Swipeable chit group cards (these ARE intentional banking-style cards)
// ─────────────────────────────────────────────────────────────────────────────

interface MobileChitCardsProps {
  groups: Array<{
    id: string;
    name: string;
    registrationNumber: string;
    ticketNumber: number | string;
    chitValueRupees: number;
    installmentAmount: number;
    completedCyclesCount: number;
    totalMembers: number;
    hasWon: boolean;
  }>;
}

function MobileChitCards({ groups }: MobileChitCardsProps) {
  if (groups.length === 0) return null;

  const gradients = [
    "linear-gradient(135deg, #173b3f 0%, #1d464b 60%, #7d5f26 100%)",
    "linear-gradient(145deg, #102d30 0%, #7d5f26 70%, #173b3f 100%)",
    "linear-gradient(125deg, #1d464b 0%, #102d30 50%, #61491b 100%)",
  ];

  return (
    <div className="sm:hidden flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="native-section-label">My Chit Groups</p>
        <Link to="/chit-groups" className="text-[11px] font-bold text-accent-link">View all →</Link>
      </div>
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
        <div className="flex gap-3 pb-2">
          {groups.map((group, idx) => {
            const progress = Math.min(100, Math.round((group.completedCyclesCount / group.totalMembers) * 100));
            return (
              <Link
                key={group.id}
                to={`/chit-groups/${group.id}`}
                className="mobile-chit-card"
                style={{ background: gradients[idx % gradients.length] }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-white truncate leading-tight">{group.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-white/60 truncate">{group.registrationNumber}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 border border-white/15">
                    #{group.ticketNumber}
                  </span>
                </div>
                <div>
                  <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-amber-400/80 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Monthly</p>
                      <p className="font-display text-sm font-bold text-white tabular-nums">{formatPaise(group.installmentAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Progress</p>
                      <p className="text-xs font-bold text-amber-300">{group.completedCyclesCount}/{group.totalMembers}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Payment list — native section rows (no outer card)
// ─────────────────────────────────────────────────────────────────────────────

interface MobilePaymentListProps {
  payments: Array<{
    id: string;
    dueDate: string;
    paidAt?: string | null;
    amountPaid: number;
    amountDue: number;
    status: string;
  }>;
  onViewReceipt: (id: string) => void;
}

function MobilePaymentList({ payments, onViewReceipt }: MobilePaymentListProps) {
  return (
    <div className="sm:hidden flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="native-section-label">Recent Payments</p>
        <Link to="/collections" className="text-[11px] font-bold text-accent-link">View all →</Link>
      </div>
      <div className="native-section">
        {payments.map((p) => {
          const isPaid = p.status === "PAID";
          const isOverdue = p.status === "OVERDUE";
          return (
            <div key={p.id} className="native-row">
              {/* Status icon bubble */}
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                  isPaid ? "bg-good-bg text-good-fg" : isOverdue ? "bg-bad-bg text-bad-fg" : "bg-warn-bg text-warn-fg",
                )}
              >
                {isPaid ? "✓" : isOverdue ? "!" : "○"}
              </div>

              {/* Label + date */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary leading-tight">
                  {isPaid ? "Payment Received" : isOverdue ? "Overdue Due" : "Upcoming Due"}
                </p>
                <p className="mt-0.5 text-[11px] text-text-secondary truncate">
                  {p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : `Due ${formatDateTime(p.dueDate)}`}
                </p>
              </div>

              {/* Amount + receipt link */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  isPaid ? "mobile-tx-amount-credit" : "mobile-tx-amount-debit",
                )}>
                  {formatPaise(isPaid ? p.amountPaid : p.amountDue)}
                </span>
                {isPaid && (
                  <button
                    type="button"
                    onClick={() => onViewReceipt(`payment-${p.id}`)}
                    className="text-[10px] font-bold text-accent-link hover:underline active-bounce"
                  >
                    Receipt →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function MemberDashboardView() {
  const { data, isLoading } = useMemberDashboard();
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <MobileLoadingSkeleton />
        {/* Desktop skeleton */}
        <div className="hidden sm:flex flex-col gap-6">
          <div className="skeleton-shimmer h-40 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-28 w-full rounded-lg" />)}
          </div>
          <div className="skeleton-shimmer h-64 w-full rounded-xl" />
        </div>
      </>
    );
  }

  if (!data || !data.isMember || !data.member) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-bg-surface p-12 text-center shadow-xs">
        <ShieldCheck className="mb-3 size-12 text-brand-strong" />
        <h2 className="font-display text-xl font-bold text-text-primary">Member Profile Not Found</h2>
        <p className="mt-1 max-w-md text-sm text-text-secondary">
          Your account is not linked to a member business profile yet. Please contact your organization administrator.
        </p>
      </div>
    );
  }

  const { member, summary, groups, recentPayments } = data;

  return (
    <div className="flex flex-col gap-5">

      {/* ══ MOBILE ═══════════════════════════════════════════════════════════ */}

      {/* Balance card */}
      <MobileBalanceCard
        totalPaid={summary.totalPaid}
        outstanding={summary.totalOutstanding}
        memberName={member.name}
        memberCode={member.memberCode}
      />

      {/* KPI native section */}
      <MobileKpiSection
        totalGroups={summary.totalGroups}
        completedCycles={summary.completedCycles}
        totalPaid={summary.totalPaid}
        totalOutstanding={summary.totalOutstanding}
        prizesWon={summary.prizesWon}
      />

      {/* Swipeable chit group cards */}
      <MobileChitCards groups={groups} />

      {/* Payment history — native section */}
      {recentPayments.length > 0 && (
        <MobilePaymentList
          payments={recentPayments}
          onViewReceipt={(id) => { setReceiptId(id); setReceiptOpen(true); }}
        />
      )}

      {/* ══ DESKTOP (unchanged) ═══════════════════════════════════════════════ */}

      {/* Welcome Header */}
      <div className="hidden sm:block relative overflow-hidden rounded-2xl border border-brand-300 bg-gradient-to-r from-brand-100 via-brand-50 to-bg-surface p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="success" className="gap-1.5 px-2.5 py-0.5 font-medium">
                <BadgeCheck size={14} /> Active Member
              </Badge>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {member.memberCode}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              Welcome back, {member.name}!
            </h1>
            <p className="mt-1 text-xs text-text-secondary sm:text-sm">
              Phone: {member.phone} {member.email ? `· Email: ${member.email}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/auctions">
              <Button size="md" className="active-bounce gap-2 font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs">
                <Gavel size={16} /> Live Bidding
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop KPI grid */}
      <div className="hidden sm:grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { icon: <Wallet size={16} />, bg: "bg-brand-50", fg: "text-accent-primary", label: "Included Groups", value: String(summary.totalGroups), sub: "Active chit enrollments" },
          { icon: <CheckCircle2 size={16} />, bg: "bg-good-bg", fg: "text-good-fg", label: "Completed Cycles", value: String(summary.completedCycles), sub: "Finished auction cycles" },
          { icon: <Zap size={16} />, bg: "bg-brand-100", fg: "text-accent-primary", label: "Total Paid", value: formatPaise(summary.totalPaid), sub: "Cumulative contributions", valFg: "text-good-fg" },
          { icon: <Calendar size={16} />, bg: "bg-warn-bg", fg: "text-warn-fg", label: "Balance Dues", value: formatPaise(summary.totalOutstanding), sub: "Outstanding balance" },
          { icon: <Trophy size={16} />, bg: "bg-info-bg", fg: "text-info-fg", label: "Prizes Won", value: String(summary.prizesWon), sub: "Auction payouts won", valFg: "text-accent-primary" },
        ].map(({ icon, bg, fg, label, value, sub, valFg }) => (
          <div key={label} className={cn("rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs", label === "Balance Dues" ? "col-span-2 lg:col-span-1" : "")}>
            <div className="mb-2 flex items-center gap-2 text-text-secondary">
              <span className={cn("flex size-7 items-center justify-center rounded-md", bg, fg)}>{icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className={cn("font-display text-2xl font-bold tabular-nums", valFg ?? "text-text-primary")}>{value}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
          </div>
        ))}
      </div>

      {/* Desktop chit groups grid */}
      <Card className="hidden sm:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Included Chit Groups ({groups.length})</CardTitle>
            <Link to="/chit-groups" className="text-xs font-medium text-accent-link hover:underline">View all groups →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">You are not enrolled in any chit groups currently.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => {
                const pp = Math.min(100, Math.round((group.completedCyclesCount / group.totalMembers) * 100));
                return (
                  <div key={group.id} className="flex flex-col justify-between rounded-xl border border-border-default bg-bg-surface p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-bold text-text-primary">{group.name}</h3>
                          <p className="text-xs font-mono text-text-secondary mt-0.5">{group.registrationNumber}</p>
                        </div>
                        <Badge variant="neutral" className="font-mono text-xs font-bold px-2 py-0.5">Ticket #{group.ticketNumber}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-border-default pt-3">
                        <div><p className="text-text-secondary">Chit Value</p><p className="font-display text-base font-bold text-text-primary">{formatPaise(group.chitValueRupees * 100)}</p></div>
                        <div><p className="text-text-secondary">Monthly Due</p><p className="font-display text-base font-bold text-text-primary">{formatPaise(group.installmentAmount)}</p></div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-text-secondary">Cycle Progress</span>
                          <span className="font-bold text-text-primary">{group.completedCyclesCount} / {group.totalMembers} ({pp}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full bg-brand-600 transition-all duration-500 rounded-full" style={{ width: `${pp}%` }} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted/60 px-3 py-2 text-xs">
                        <span className="text-text-secondary">Cycle #{group.currentCycleNumber || 1} Payment:</span>
                        <span className="font-semibold text-text-primary tabular-nums">{group.currentCyclePaidCount || 0} / {group.totalMembers} Paid</span>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-border-default pt-3">
                      {group.hasWon ? (
                        <Badge variant="info" className="gap-1.5 text-xs font-semibold px-2.5 py-1"><Trophy size={13} /> Kuri Prize Won</Badge>
                      ) : (
                        <Badge variant="success" className="text-xs font-medium px-2.5 py-1">Active Bidder</Badge>
                      )}
                      <Link to={`/chit-groups/${group.id}`}><Button size="sm" variant="outline" className="text-xs font-semibold">View Group →</Button></Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop payment table */}
      <Card className="hidden sm:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Payment Receipts</CardTitle>
            <Link to="/collections" className="text-xs font-medium text-accent-link hover:underline">View all collections →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">No payment history found.</p>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Due Date</TableHeaderCell>
                    <TableHeaderCell>Paid Date</TableHeaderCell>
                    <TableHeaderCell>Amount Due</TableHeaderCell>
                    <TableHeaderCell>Amount Paid</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{formatDateTime(p.dueDate)}</TableCell>
                      <TableCell className="text-xs text-text-secondary">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</TableCell>
                      <TableCell>{formatPaise(p.amountDue)}</TableCell>
                      <TableCell className="font-semibold text-good-fg">{formatPaise(p.amountPaid)}</TableCell>
                      <TableCell><DueStatusBadge status={p.status as any} /></TableCell>
                      <TableCell className="text-right">
                        {p.status === "PAID" ? (
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" onClick={() => { setReceiptId(`payment-${p.id}`); setReceiptOpen(true); }}>
                            View Receipt
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} collectionId={receiptId} />
    </div>
  );
}
