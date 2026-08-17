import { CloudUpload, MessageSquare, RefreshCw, Trophy, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { useChitGroups, useCycles } from "@/features/chit-groups/use-chit-groups";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CollectDialog } from "./components/collect-dialog";
import { DueStatusBadge } from "./components/collection-badges";
import { ReceiptDialog } from "./components/receipt-dialog";
import { WhatsAppReminderDialog } from "./components/whatsapp-reminder-dialog";
import { clearSyncedFromQueue, countQueue, getQueue } from "./offline-queue";
import type { Installment } from "./types";
import {
  useBulkCollect,
  useCycleSummary,
  useDues,
  useFlagOverdue,
  useRaiseDues,
  useSyncOffline,
} from "./use-collections";

function SummaryChip({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`font-display text-lg font-semibold tabular-nums ${tone ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}

export function CollectTab({ initialGroupId }: { initialGroupId?: string } = {}) {
  const { user, hasPermission } = useAuth();
  const canRecord = hasPermission("collection.record");
  const canManageDues = hasPermission("collection.manage_dues");

  const { data: groups } = useChitGroups();
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? "ALL");
  const { data: cycles } = useCycles(groupId && groupId !== "ALL" ? groupId : undefined, Boolean(groupId && groupId !== "ALL"));
  const [cycleId, setCycleId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "PRIZE_WON">("ALL");

  useEffect(() => {
    if (initialGroupId && initialGroupId !== groupId) {
      setGroupId(initialGroupId);
    }
  }, [initialGroupId, groupId]);

  const { data: dues, isLoading: duesLoading } = useDues(groupId && groupId !== "ALL" ? groupId : undefined, cycleId && cycleId !== "ALL" ? cycleId : undefined);
  const { data: summary } = useCycleSummary(groupId && groupId !== "ALL" ? groupId : undefined, cycleId && cycleId !== "ALL" ? cycleId : undefined);

  const raiseDues = useRaiseDues();
  const flagOverdue = useFlagOverdue();
  const bulkCollect = useBulkCollect();
  const syncOffline = useSyncOffline();

  const noDuesRaised = Boolean(cycleId) && cycleId !== "ALL" && !duesLoading && (dues?.items.length ?? 0) === 0;

  const [collectTarget, setCollectTarget] = useState<Installment | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Installment | null>(null);
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [offlineCount, setOfflineCount] = useState(0);

  const refreshOfflineCount = useCallback(() => {
    void countQueue().then(setOfflineCount);
  }, []);

  const groupName = groups?.items.find((g) => g.id === groupId)?.name ?? "";
  const unpaid = useMemo(() => (dues?.items ?? []).filter((d) => d.status !== "PAID" && d.status !== "WAIVED"), [dues]);

  const filteredDues = useMemo(() => {
    const items = dues?.items ?? [];
    if (statusFilter === "PAID") return items.filter((d) => d.status === "PAID");
    if (statusFilter === "UNPAID") return items.filter((d) => d.status === "PENDING" || d.status === "PARTIAL" || d.status === "OVERDUE");
    if (statusFilter === "PRIZE_WON") return items.filter((d) => Boolean((d.chitMembershipId as any)?.hasWon));
    return items;
  }, [dues, statusFilter]);

  function selectGroup(next: string) {
    setGroupId(next);
    setCycleId("ALL");
    setSelected(new Set());
  }

  function selectCycle(next: string) {
    setCycleId(next);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function handleBulk(method: string) {
    const items = [...selected].map((paymentId) => ({ paymentId, method }));
    await bulkCollect.mutateAsync(items);
    setSelected(new Set());
  }

  const handleSync = useCallback(async () => {
    const queued = await getQueue();
    if (queued.length === 0) return;
    const result = await syncOffline.mutateAsync(queued);
    await clearSyncedFromQueue(result.receipts.map((r) => r.clientReceiptId));
    refreshOfflineCount();
  }, [syncOffline, refreshOfflineCount]);

  useEffect(() => {
    refreshOfflineCount();
    function onOnline() {
      void handleSync();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshOfflineCount, handleSync]);

  const isMemberUser = user?.role?.slug === "MEMBER";

  const myTotalDue = useMemo(() => dues?.items.reduce((s, d) => s + (d.amountDue || 0), 0) ?? 0, [dues]);
  const myTotalPaid = useMemo(() => dues?.items.reduce((s, d) => s + (d.amountPaid || 0), 0) ?? 0, [dues]);
  const myOutstanding = Math.max(0, myTotalDue - myTotalPaid);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={groupId || "ALL"} onValueChange={selectGroup}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Select a chit group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Chit Groups</SelectItem>
              {(groups?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cycleId || "ALL"} onValueChange={selectCycle} disabled={!groupId || groupId === "ALL"}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Select a cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Cycles</SelectItem>
              {(cycles?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  Cycle #{c.cycleNumber} · {formatDate(c.scheduledDate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManageDues && groupId && groupId !== "ALL" ? (
          <Button variant="outline" disabled={flagOverdue.isPending} onClick={() => void flagOverdue.mutateAsync(groupId)}>
            <RefreshCw size={15} /> Flag overdue
          </Button>
        ) : null}
      </div>

      {offlineCount > 0 ? (
        <div className="flex items-center justify-between rounded-md border border-warn-border bg-warn-bg px-4 py-2.5">
          <span className="text-sm text-warn-fg">
            {offlineCount} collection{offlineCount === 1 ? "" : "s"} captured offline, waiting to sync.
          </span>
          <Button size="sm" disabled={syncOffline.isPending} onClick={() => void handleSync()}>
            <CloudUpload size={15} /> {syncOffline.isPending ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      ) : null}

      {isMemberUser ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryChip label="My Installment Due" value={formatPaise(myTotalDue)} />
          <SummaryChip label="My Amount Paid" value={formatPaise(myTotalPaid)} tone="text-good-fg" />
          <SummaryChip
            label="My Outstanding Balance"
            value={formatPaise(myOutstanding)}
            tone={myOutstanding > 0 ? "text-bad-fg" : "text-text-secondary"}
          />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryChip label="Collected Persons" value={`${summary.byStatus.PAID} members`} tone="text-good-fg" />
          <SummaryChip
            label="Uncollected Persons"
            value={`${(summary.byStatus.PENDING || 0) + (summary.byStatus.OVERDUE || 0) + (summary.byStatus.PARTIAL || 0)} members`}
            tone="text-bad-fg"
          />
          <SummaryChip label="Receipts Issued" value={summary.collectedCount} />
          <SummaryChip label="Total Collected" value={formatPaise(summary.collectedAmount)} tone="text-accent-primary" />
        </div>
      ) : null}

      {(dues?.items.length ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              isMemberUser
                ? [
                  { key: "ALL", label: `My Installments (${dues?.items.length ?? 0})` },
                  { key: "UNPAID", label: `My Pending Dues (${unpaid.length})` },
                  { key: "PAID", label: `My Paid Receipts (${dues?.items.filter((d) => d.status === "PAID").length ?? 0})` },
                ]
                : [
                  { key: "UNPAID", label: `Uncollected / Pending (${unpaid.length})` },
                  { key: "PAID", label: `Collected / Paid (${dues?.items.filter((d) => d.status === "PAID").length})` },
                  { key: "ALL", label: `All Members (${dues?.items.length})` },
                  {
                    key: "PRIZE_WON",
                    label: `Kuri Winners (${dues?.items.filter((d) => (d.chitMembershipId as any)?.hasWon).length})`,
                  },
                ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as any)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-bold transition-all",
                  statusFilter === tab.key
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-bg-raised text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {canRecord && unpaid.length > 0 ? (
            <Button size="sm" className="gap-1.5 font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs" onClick={() => setCollectTarget(unpaid[0])}>
              <Zap size={14} /> Quick Collect Payment
            </Button>
          ) : null}
        </div>
      ) : null}

      {!groupId ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">
            {isMemberUser ? "Select a chit group to view your installment dues." : "Select a chit group to begin collecting."}
          </p>
        </div>
      ) : duesLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : noDuesRaised ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="mb-3 text-sm text-text-secondary">
            {isMemberUser ? "No installment dues have been raised for this cycle yet." : "No dues have been raised for this cycle yet."}
          </p>
          {canManageDues && cycleId && cycleId !== "ALL" ? (
            <Button
              disabled={raiseDues.isPending}
              onClick={() => void raiseDues.mutateAsync({ chitGroupId: groupId, chitCycleId: cycleId })}
            >
              {raiseDues.isPending ? "Raising…" : "Raise dues for all members"}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {canRecord && dues?.items.length ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-300 bg-brand-50/95 p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-accent-primary">
                  {selected.size > 0 ? `${selected.size} selected` : `${unpaid.length} members unpaid`}
                </span>
                {unpaid.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selected.size === unpaid.length) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(unpaid.map((d) => d.id)));
                      }
                    }}
                    className="text-xs font-medium text-accent-primary underline hover:text-brand-700"
                  >
                    {selected.size === unpaid.length ? "Deselect all" : `Mark All Unpaid (${unpaid.length})`}
                  </button>
                ) : null}
              </div>
              {selected.size > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Mark collected as:</span>
                  <Button size="sm" variant="outline" disabled={bulkCollect.isPending} onClick={() => void handleBulk("CASH")}>
                    Cash
                  </Button>
                  <Button size="sm" disabled={bulkCollect.isPending} onClick={() => void handleBulk("UPI")}>
                    UPI
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:hidden">
            {filteredDues.map((due) => {
              const outstanding = due.amountDue - due.amountPaid;
              const settled = due.status === "PAID" || due.status === "WAIVED";
              const hasWon = Boolean((due.chitMembershipId as any)?.hasWon);
              const membership = typeof due.chitMembershipId === "object" ? due.chitMembershipId : null;
              const ticketNumber = membership?.ticketNumber ?? "—";
              const memberObj = membership?.memberId && typeof membership.memberId === "object" ? (membership.memberId as any) : null;
              const memberName = memberObj?.name ?? "Member";
              const memberCode = memberObj?.memberCode ?? "";
              return (
                <div
                  key={due.id}
                  className="relative flex flex-col justify-between rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs transition-all active:bg-bg-raised"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {canRecord && !settled ? (
                        <input
                          type="checkbox"
                          checked={selected.has(due.id)}
                          onChange={() => toggle(due.id)}
                          className="size-5 rounded border-border-strong text-accent-primary accent-accent-primary"
                        />
                      ) : null}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent-primary bg-brand-50 px-2 py-0.5 rounded-md">
                            #{ticketNumber}
                          </span>
                          <span className="font-semibold text-text-primary text-base">
                            {memberName}
                          </span>
                          {hasWon ? (
                            <Badge variant="info" className="gap-1 text-[11px] px-1.5 py-0">
                              <Trophy size={11} /> Kuri Won
                            </Badge>
                          ) : null}
                        </div>
                        {memberCode ? (
                          <p className="mt-0.5 font-mono text-xs text-text-secondary">
                            {memberCode}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <DueStatusBadge status={due.status} />
                  </div>

                  <div className="mt-3.5 flex items-end justify-between border-t border-border-default/60 pt-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Outstanding</p>
                      <p className={cn("font-display text-xl font-bold tabular-nums", outstanding > 0 ? "text-text-primary" : "text-good-fg")}>
                        {formatPaise(outstanding)}
                      </p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Due {formatPaise(due.amountDue)} · Paid {formatPaise(due.amountPaid)}
                      </p>
                    </div>
                    {canRecord ? (
                      !settled ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="md"
                            type="button"
                            variant="outline"
                            className="active-bounce gap-1.5 px-3 text-xs font-semibold border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
                            onClick={() => setReminderTarget(due)}
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare size={14} /> Remind
                          </Button>
                          <Button
                            size="md"
                            className="active-bounce gap-1.5 px-4 font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
                            onClick={() => setCollectTarget(due)}
                          >
                            <Zap size={16} /> Collect
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="text-xs px-2.5 py-1 font-medium">
                            Paid
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 px-2.5"
                            onClick={() => {
                              setReceiptId(`payment-${due.id}`);
                              setReceiptOpen(true);
                            }}
                          >
                            View Receipt
                          </Button>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {canRecord ? <TableHeaderCell /> : null}
                    <TableHeaderCell>Ticket</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Due</TableHeaderCell>
                    <TableHeaderCell>Paid</TableHeaderCell>
                    <TableHeaderCell>Outstanding</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    {canRecord ? <TableHeaderCell /> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDues.map((due) => {
                    const outstanding = due.amountDue - due.amountPaid;
                    const settled = due.status === "PAID" || due.status === "WAIVED";
                    const hasWon = Boolean((due.chitMembershipId as any)?.hasWon);
                    const membership = typeof due.chitMembershipId === "object" ? due.chitMembershipId : null;
                    const ticketNumber = membership?.ticketNumber ?? "—";
                    const memberObj = membership?.memberId && typeof membership.memberId === "object" ? (membership.memberId as any) : null;
                    const memberName = memberObj?.name ?? "Member";
                    const memberCode = memberObj?.memberCode ?? "";
                    return (
                      <TableRow key={due.id}>
                        {canRecord ? (
                          <TableCell>
                            {!settled ? (
                              <input type="checkbox" checked={selected.has(due.id)} onChange={() => toggle(due.id)} />
                            ) : null}
                          </TableCell>
                        ) : null}
                        <TableCell className="font-mono">#{ticketNumber}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{memberName}</span>
                            {hasWon ? (
                              <Badge variant="info" className="gap-1 text-[11px] px-1.5 py-0">
                                <Trophy size={11} /> Kuri Won
                              </Badge>
                            ) : null}
                          </div>
                          {memberCode ? (
                            <span className="ml-2 font-mono text-xs text-text-secondary">
                              {memberCode}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatPaise(due.amountDue)}</TableCell>
                        <TableCell>{formatPaise(due.amountPaid)}</TableCell>
                        <TableCell className={outstanding > 0 ? "font-medium text-text-primary" : "text-text-secondary"}>
                          {formatPaise(outstanding)}
                        </TableCell>
                        <TableCell>
                          <DueStatusBadge status={due.status} />
                        </TableCell>
                        {canRecord ? (
                          <TableCell className="text-right">
                            {!settled ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  className="border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 font-semibold gap-1 text-xs px-2.5 h-8"
                                  onClick={() => setReminderTarget(due)}
                                  title="Send WhatsApp Reminder"
                                >
                                  <MessageSquare size={13} /> Remind
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold gap-1.5 shadow-xs h-8"
                                  onClick={() => setCollectTarget(due)}
                                >
                                  <Zap size={14} /> Collect
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="success" className="gap-1 text-xs px-2 py-0.5 font-medium">
                                  Paid
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2.5"
                                  onClick={() => {
                                    setReceiptId(`payment-${due.id}`);
                                    setReceiptOpen(true);
                                  }}
                                >
                                  View Receipt
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
          <p className="text-xs text-text-secondary">{unpaid.length} of {dues?.items.length} members still owe this cycle.</p>
        </>
      )}

      {collectTarget ? (
        <CollectDialog
          open={Boolean(collectTarget)}
          onOpenChange={(o) => !o && setCollectTarget(null)}
          installment={collectTarget}
          chitGroupName={groupName}
          onCollected={(id) => {
            setCollectTarget(null);
            setReceiptId(id);
            setReceiptOpen(true);
          }}
          onQueuedOffline={() => {
            setCollectTarget(null);
            refreshOfflineCount();
          }}
        />
      ) : null}

      {reminderTarget ? (
        <WhatsAppReminderDialog
          open={Boolean(reminderTarget)}
          onOpenChange={(o) => !o && setReminderTarget(null)}
          installment={reminderTarget}
          chitGroupName={groupName}
        />
      ) : null}

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} collectionId={receiptId} />
    </div>
  );
}
