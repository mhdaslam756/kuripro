import { Receipt as ReceiptIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatPaise, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CollectionStatusBadge, MethodBadge } from "./components/collection-badges";
import { ReceiptDialog } from "./components/receipt-dialog";
import { COLLECTION_METHODS, COLLECTION_STATUSES, METHOD_LABELS } from "./types";
import { useBounceCollection, useClearCollection, useCollectionHistory } from "./use-collections";

const ALL = "__all__";

export function HistoryTab() {
  const { hasPermission } = useAuth();
  const canReconcile = hasPermission("collection.manage_dues");

  const [method, setMethod] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data, isLoading, isError } = useCollectionHistory({
    method: method === ALL ? undefined : method,
    status: status === ALL ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });

  const clearCollection = useClearCollection();
  const bounceCollection = useBounceCollection();

  function openReceipt(id: string) {
    setReceiptId(id);
    setReceiptOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Method</p>
          <Select value={method} onValueChange={(v: string) => { setMethod(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All methods</SelectItem>
              {COLLECTION_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {METHOD_LABELS[m]}
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
              {COLLECTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-text-primary">From</p>
          <Input type="date" className="w-40" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-text-primary">To</p>
          <Input type="date" className="w-40" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load collection history.</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">No collections match these filters.</p>
        </div>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Receipt</TableHeaderCell>
                  <TableHeaderCell>Member</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Method</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Collected</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.receiptNumber}
                      {c.isOffline ? <Badge variant="neutral" className="ml-2">Offline</Badge> : null}
                      {c.isAdvance ? <Badge variant="info" className="ml-2">Advance</Badge> : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.memberId.name}
                      <span className="ml-2 font-mono text-xs text-text-secondary">{c.memberId.memberCode}</span>
                    </TableCell>
                    <TableCell>{formatPaise(c.amount)}</TableCell>
                    <TableCell>
                      <MethodBadge method={c.method} />
                    </TableCell>
                    <TableCell>
                      <CollectionStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-text-secondary">{formatDateTime(c.collectedAt)}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {canReconcile && c.status === "PENDING_CLEARANCE" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={clearCollection.isPending}
                            onClick={() => void clearCollection.mutateAsync(c.id)}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={bounceCollection.isPending}
                            onClick={() => void bounceCollection.mutateAsync(c.id)}
                          >
                            Bounce
                          </Button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        aria-label="View receipt"
                        className="text-text-secondary hover:text-accent-primary"
                        onClick={() => openReceipt(c.id)}
                      >
                        <ReceiptIcon size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {data.total} collection{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}
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

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} collectionId={receiptId} />
    </div>
  );
}
