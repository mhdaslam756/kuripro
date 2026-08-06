import { useState } from "react";
import { BadgeCheck, Calendar, CheckCircle2, Gavel, ShieldCheck, Trophy, Wallet, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ReceiptDialog } from "@/features/collections/components/receipt-dialog";
import { DueStatusBadge } from "@/features/collections/components/collection-badges";
import { formatDateTime, formatPaise } from "@/lib/format";
import { useMemberDashboard } from "../use-dashboard";

export function MemberDashboardView() {
  const { data, isLoading } = useMemberDashboard();
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
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
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-300 bg-gradient-to-r from-brand-100 via-brand-50 to-bg-surface p-6 shadow-sm sm:p-8">
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

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-accent-primary">
              <Wallet size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Included Groups</span>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-text-primary">{summary.totalGroups}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Active chit enrollments</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-md bg-good-bg text-good-fg">
              <CheckCircle2 size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Cycles</span>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-text-primary">{summary.completedCycles}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Finished auction cycles</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-md bg-brand-100 text-accent-primary">
              <Zap size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Total Paid</span>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-good-fg">{formatPaise(summary.totalPaid)}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Cumulative contributions</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-md bg-warn-bg text-warn-fg">
              <Calendar size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Balance Dues</span>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-text-primary">{formatPaise(summary.totalOutstanding)}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Outstanding balance</p>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-md bg-info-bg text-info-fg">
              <Trophy size={16} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">Prizes Won</span>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-accent-primary">{summary.prizesWon}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Auction payouts won</p>
        </div>
      </div>

      {/* Included Chit Groups Cards Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Included Chit Groups ({groups.length})</CardTitle>
            <Link to="/chit-groups" className="text-xs font-medium text-accent-link hover:underline">
              View all groups →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">You are not enrolled in any chit groups currently.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => {
                const progressPercent = Math.min(100, Math.round((group.completedCyclesCount / group.totalMembers) * 100));
                return (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between rounded-xl border border-border-default bg-bg-surface p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-bold text-text-primary">{group.name}</h3>
                          <p className="text-xs font-mono text-text-secondary mt-0.5">{group.registrationNumber}</p>
                        </div>
                        <Badge variant="neutral" className="font-mono text-xs font-bold px-2 py-0.5">
                          Ticket #{group.ticketNumber}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-border-default pt-3">
                        <div>
                          <p className="text-text-secondary">Chit Value</p>
                          <p className="font-display text-base font-bold text-text-primary">{formatPaise(group.chitValueRupees * 100)}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary">Monthly Due</p>
                          <p className="font-display text-base font-bold text-text-primary">{formatPaise(group.installmentAmount)}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-text-secondary">Cycle Progress</span>
                          <span className="font-bold text-text-primary">
                            {group.completedCyclesCount} / {group.totalMembers} Cycles ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full bg-brand-600 transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted/60 px-3 py-2 text-xs">
                        <span className="text-text-secondary">Cycle #{group.currentCycleNumber || 1} Payment Status:</span>
                        <span className="font-semibold text-text-primary tabular-nums">
                          {group.currentCyclePaidCount || 0} / {group.totalMembers} Members Paid
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border-default pt-3">
                      {group.hasWon ? (
                        <Badge variant="info" className="gap-1.5 text-xs font-semibold px-2.5 py-1">
                          <Trophy size={13} /> Kuri Prize Won
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs font-medium px-2.5 py-1">
                          Active Bidder
                        </Badge>
                      )}

                      <Link to={`/chit-groups/${group.id}`}>
                        <Button size="sm" variant="outline" className="text-xs font-semibold">
                          View Group →
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History & Receipts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Payment Receipts</CardTitle>
            <Link to="/collections" className="text-xs font-medium text-accent-link hover:underline">
              View all collections →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">No payment history found.</p>
          ) : (
            <>
              {/* Mobile View: Receipt Cards */}
              <div className="grid gap-3 md:hidden">
                {recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Due {formatDateTime(p.dueDate)}</p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : "Not Paid"}
                        </p>
                      </div>
                      <DueStatusBadge status={p.status as any} />
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Amount Paid</p>
                        <p className="font-display text-lg font-bold tabular-nums text-good-fg">{formatPaise(p.amountPaid)}</p>
                        <p className="text-[10px] text-text-secondary">Due: {formatPaise(p.amountDue)}</p>
                      </div>
                      {p.status === "PAID" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold h-8 rounded-xl"
                          onClick={() => {
                            setReceiptId(`payment-${p.id}`);
                            setReceiptOpen(true);
                          }}
                        >
                          View Receipt
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block">
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
                          <TableCell>
                            <DueStatusBadge status={p.status as any} />
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === "PAID" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5"
                                onClick={() => {
                                  setReceiptId(`payment-${p.id}`);
                                  setReceiptOpen(true);
                                }}
                              >
                                View Receipt
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} collectionId={receiptId} />
    </div>
  );
}
