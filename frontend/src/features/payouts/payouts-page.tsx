import { useState } from "react";

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

  const { data, isLoading, isError } = usePayouts({
    chitGroupId: chitGroupId === ALL ? undefined : chitGroupId,
    status: status === ALL ? undefined : status,
    page,
  });

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Prize Payouts</h1>
        <p className="text-sm text-text-secondary">
          Disburse won prizes to members — in one payment or installments — with proof and receipts.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
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
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load payouts. Please try again.</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">
            No prize payouts yet. They appear here once an auction cycle is settled.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View: Payout Cards */}
          <div className="grid gap-3.5 md:hidden">
            {data.items.map((payout) => (
              <div
                key={payout.id}
                onClick={() => openDetail(payout.id)}
                className="active-bounce flex flex-col justify-between rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs hover:border-brand-300"
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
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Prize Declared</p>
                    <p className="font-display text-lg font-bold tabular-nums text-text-primary">
                      {formatPaise(payout.declared)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-good-fg">Paid: {formatPaise(payout.paid)}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {payout.remaining > 0 ? `Rem: ${formatPaise(payout.remaining)}` : "Fully Settled"}
                    </p>
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
