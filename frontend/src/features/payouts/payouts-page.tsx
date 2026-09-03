import { useState } from "react";
import { ChevronRight, Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet";
import { MobileEmptyState, MobileErrorState } from "@/components/mobile/mobile-states";
import { useChitGroups } from "@/features/chit-groups/use-chit-groups";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { PayoutDetailDialog } from "./components/payout-detail-dialog";
import { PayoutStatusBadge } from "./components/payout-badges";
import { PAYOUT_STATUSES } from "./types";
import { usePayouts } from "./use-payouts";

const ALL = "__all__";

export function PayoutsPage() {
  const { data: groups } = useChitGroups();
  const [chitGroupId, setChitGroupId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount = (chitGroupId !== ALL ? 1 : 0) + (status !== ALL ? 1 : 0);

  const { data, isLoading, isError, refetch } = usePayouts({
    chitGroupId: chitGroupId === ALL ? undefined : chitGroupId,
    status: status === ALL ? undefined : status,
    page,
  });

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function handleResetFilters() {
    setChitGroupId(ALL);
    setStatus(ALL);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Prize Disbursal</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">
          Disburse won prizes to members — in single lump sum or structured installments — with proof and receipts.
        </p>
      </div>

        {/* Mobile Filter Bar */}
        <div className="mb-4 flex items-center justify-between gap-2 sm:hidden">
          <p className="text-xs font-semibold text-text-secondary">
            Showing {data?.items.length ?? 0} payout{(data?.items.length ?? 0) === 1 ? "" : "s"}
          </p>
          <MobileFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            activeCount={activeFilterCount}
            onReset={handleResetFilters}
          >
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Chit Group</label>
                <Select value={chitGroupId} onValueChange={(v: string) => { setChitGroupId(v); setPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All groups</SelectItem>
                    {(groups?.items ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Payout Status</label>
                <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All statuses</SelectItem>
                    {PAYOUT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {humanize(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </MobileFilterSheet>
        </div>

        {/* Desktop Filter Controls */}
        <div className="mb-4 hidden sm:flex flex-wrap items-end gap-3">
          <div className="w-56">
            <p className="mb-1.5 text-sm font-medium text-text-primary">Chit group</p>
            <Select value={chitGroupId} onValueChange={(v: string) => { setChitGroupId(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All groups</SelectItem>
                {(groups?.items ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <p className="mb-1.5 text-sm font-medium text-text-primary">Status</p>
            <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {PAYOUT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : isError || !data ? (
          <MobileErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <MobileEmptyState
            icon={<Award size={32} />}
            title="No prize payouts found"
            description="Prize disbursal records appear here automatically after auction cycles are settled."
          />
        ) : (
          <>
            {/* Mobile View: Payout Native Cards (< md) */}
            <div className="grid gap-3.5 md:hidden">
              {data.items.map((payout) => (
                <div
                  key={payout.id}
                  onClick={() => openDetail(payout.id)}
                  className="active:scale-[0.98] flex flex-col justify-between rounded-2xl border border-border-default/80 bg-bg-surface p-4 shadow-xs transition-all active:bg-bg-raised"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-text-primary text-base leading-tight">{payout.memberName}</h3>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">
                        {payout.memberCode} · {payout.chitGroupName} {payout.cycleNumber ? `(#${payout.cycleNumber})` : ""}
                      </p>
                    </div>
                    <PayoutStatusBadge status={payout.status} />
                  </div>

                  <div className="mt-3.5 flex items-end justify-between border-t border-border-default/60 pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Prize Declared</p>
                      <p className="font-display text-lg font-bold tabular-nums text-text-primary">
                        {formatPaise(payout.declared)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-1">
                      <div>
                        <p className="text-xs font-bold text-good-fg">Paid: {formatPaise(payout.paid)}</p>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {payout.remaining > 0 ? `Rem: ${formatPaise(payout.remaining)}` : "Fully Settled"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-text-secondary shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          {/* Desktop View: Data Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Chit group</TableHeaderCell>
                    <TableHeaderCell>Cycle</TableHeaderCell>
                    <TableHeaderCell>Declared</TableHeaderCell>
                    <TableHeaderCell>Paid</TableHeaderCell>
                    <TableHeaderCell>Remaining</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Last paid</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((payout) => (
                    <TableRow key={payout.id} className="cursor-pointer" onClick={() => openDetail(payout.id)}>
                      <TableCell className="font-medium">
                        {payout.memberName}
                        <span className="ml-2 font-mono text-xs text-text-secondary">{payout.memberCode}</span>
                      </TableCell>
                      <TableCell className="text-text-secondary">{payout.chitGroupName}</TableCell>
                      <TableCell>{payout.cycleNumber ? `#${payout.cycleNumber}` : "—"}</TableCell>
                      <TableCell>{formatPaise(payout.declared)}</TableCell>
                      <TableCell className="text-good-fg">{formatPaise(payout.paid)}</TableCell>
                      <TableCell className={payout.remaining > 0 ? "font-medium text-text-primary" : "text-text-secondary"}>
                        {formatPaise(payout.remaining)}
                      </TableCell>
                      <TableCell>
                        <PayoutStatusBadge status={payout.status} />
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {payout.lastDisbursedAt ? formatDate(payout.lastDisbursedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <span>
              {data.total} payout{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <PayoutDetailDialog open={detailOpen} onOpenChange={setDetailOpen} payoutId={detailId} />
    </div>
  );
}
