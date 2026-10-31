import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime, formatPaise, humanize } from "@/lib/format";
import type { MembershipHistoryEntry } from "../types";
import { useCompleteReplacementSettlement, useMembershipHistory } from "../use-chit-groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId: string;
  canSettle: boolean;
}

const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"] as const;

export function MembershipHistoryDialog({ open, onOpenChange, chitGroupId, canSettle }: Props) {
  const { data: slots, isLoading, isError } = useMembershipHistory(chitGroupId, open);
  const complete = useCompleteReplacementSettlement(chitGroupId);
  const [settling, setSettling] = useState<MembershipHistoryEntry | null>(null);
  const [method, setMethod] = useState<string>("CASH");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const settlement = settling?.replacement?.settlement;

  async function handleSettle() {
    if (!settling?.replacement) return;
    setError(null);
    try {
      await complete.mutateAsync({
        replacementId: settling.replacement.id,
        method,
        settledAmountRupees: amount !== "" ? Number(amount) : undefined,
        notes: notes.trim() || undefined,
      });
      setSettling(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete the settlement.");
    }
  }

  function startSettling(entry: MembershipHistoryEntry) {
    setSettling(entry);
    setAmount(String(Math.abs(entry.replacement?.settlement.netAmount ?? 0) / 100));
    setNotes("");
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membership history</DialogTitle>
          <DialogDescription>Every member who has held each slot, with their own payment totals and exit settlement.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-md" />
        ) : isError || !slots ? (
          <p role="alert" className="text-sm text-bad-fg">Couldn't load membership history.</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-text-secondary">No memberships yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {slots.map((slot) => (
              <section key={`${slot.ticketNumber}${slot.subTicket ?? ""}`} className="rounded-md border border-border-default">
                <header className="flex items-center justify-between border-b border-border-default bg-bg-raised px-4 py-2">
                  <span className="font-mono text-sm font-semibold text-text-primary">Ticket {slot.label}</span>
                  {slot.entries.length > 1 ? (
                    <Badge variant="brand">{slot.entries.length - 1} replacement{slot.entries.length > 2 ? "s" : ""}</Badge>
                  ) : null}
                </header>
                <ol className="divide-y divide-border-default">
                  {slot.entries.map((entry) => {
                    const s = entry.replacement?.settlement;
                    return (
                      <li key={entry.membershipId} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-text-primary">{entry.member?.name ?? "Member"}</span>
                          <span className="font-mono text-xs text-text-secondary">{entry.member?.memberCode}</span>
                          <Badge variant={entry.status === "ACTIVE" ? "success" : "neutral"}>{humanize(entry.status)}</Badge>
                          {entry.hasWon ? <Badge variant="info">Won</Badge> : null}
                        </div>
                        <p className="text-xs text-text-secondary">
                          Cycle {entry.fromCycleNumber}
                          {entry.toCycleNumber ? ` – ${entry.toCycleNumber}` : " onwards"} · joined {formatDate(entry.joinedAt)}
                          {entry.exitedAt ? ` · exited ${formatDate(entry.exitedAt)}` : ""}
                          {entry.exitReason ? ` · ${entry.exitReason}` : ""}
                        </p>
                        <p className="text-xs text-text-secondary">
                          Paid {formatPaise(entry.account.totalPaid)} of {formatPaise(entry.account.totalDue)} ·{" "}
                          {entry.account.paidInstalments}/{entry.account.instalments} instalments
                        </p>
                        {s ? (
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md bg-bg-raised px-3 py-2 text-xs">
                            <span className="text-text-secondary">
                              Exit settlement: refund {formatPaise(s.refundAmount)} − dues {formatPaise(s.pendingDues)} − deductions{" "}
                              {formatPaise(s.deductionAmount)} ={" "}
                              <strong className="text-text-primary">
                                {s.netAmount >= 0 ? "pay " : "collect "}
                                {formatPaise(Math.abs(s.netAmount))}
                              </strong>
                            </span>
                            <span className="flex items-center gap-2">
                              <Badge variant={s.status === "SETTLED" ? "success" : "warning"}>{humanize(s.status)}</Badge>
                              {s.status === "SETTLED" && s.settledAt ? (
                                <span className="text-text-secondary">{formatDateTime(s.settledAt)}</span>
                              ) : canSettle ? (
                                <Button size="sm" variant="outline" className="min-h-11 px-3 text-xs sm:h-8 sm:min-h-0" onClick={() => startSettling(entry)}>
                                  Mark settled
                                </Button>
                              ) : null}
                            </span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}

        {settling && settlement ? (
          <div className="rounded-md border border-border-default bg-bg-surface p-4">
            <h4 className="mb-1 font-display text-sm font-semibold text-text-primary">
              Settle {settling.member?.name} — {settlement.netAmount >= 0 ? "pay" : "collect"}{" "}
              {formatPaise(Math.abs(settlement.netAmount))}
            </h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" aria-label="Settled amount in rupees" />
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger aria-label="Payment method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {humanize(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" aria-label="Settlement notes" />
            {error ? <p role="alert" className="mt-2 text-sm text-bad-fg">{error}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSettling(null)} disabled={complete.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void handleSettle()} disabled={complete.isPending}>
                {complete.isPending ? "Saving…" : "Confirm settled"}
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
