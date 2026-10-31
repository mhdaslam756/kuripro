import { CheckCircle2, Download, FileText, MoreHorizontal, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatPaise, humanize } from "@/lib/format";
import { DISBURSE_METHODS, METHOD_LABELS, type PaymentMethod } from "@/features/payouts/types";
import type { AuctionState } from "../types";
import { downloadAuctionPdf, useConfirmPayout, useRepick } from "../use-auctions";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold text-text-primary tabular-nums">{value}</dd>
    </div>
  );
}

export function SettlementSummary({ state }: { state: AuctionState }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("auction.manage");
  const canDisburse = hasPermission("payout.disburse");
  const settlement = state.settlement!;
  const cycleId = state.cycle.id;

  const repick = useRepick(cycleId);
  const [repickOpen, setRepickOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const confirmPayout = useConfirmPayout(cycleId);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const outstanding = settlement.payouts.filter((p) => p.remaining > 0);
  const outstandingTotal = outstanding.reduce((sum, p) => sum + p.remaining, 0);
  const payoutPaid = settlement.payoutStatus === "PAID";
  const recipients = [settlement.winner, ...(settlement.coWinner ? [settlement.coWinner] : [])];
  const nameByMembership = new Map(recipients.map((r) => [r.membershipId, r.name]));

  async function download(kind: "minutes" | "voucher") {
    setDownloading(kind);
    try {
      await downloadAuctionPdf(cycleId, kind);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy size={18} className="text-accent-primary" /> Settlement
        </CardTitle>
        <Badge variant={settlement.payoutStatus === "DISBURSED" ? "success" : "warning"}>
          Payout {humanize(settlement.payoutStatus)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="rounded-md border border-good-border bg-good-bg px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-good-strong">
            {settlement.coWinner || settlement.winner.shareType === "HALF" ? "Prized Subscribers (50/50 Shared Slot)" : "Prized Subscriber (Winner)"}
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-base font-semibold text-text-primary">
                #{settlement.winner.ticketNumber}{settlement.winner.subTicket || ""} · {settlement.winner.name}
                <span className="ml-2 font-mono text-xs text-text-secondary">{settlement.winner.memberCode}</span>
              </p>
              {settlement.winner.payoutAmount ? (
                <Badge variant="neutral" className="font-mono text-xs font-bold text-good-strong bg-good-bg border-good-border">
                  50% Share: {formatPaise(settlement.winner.payoutAmount)}
                </Badge>
              ) : null}
            </div>
            {settlement.coWinner ? (
              <div className="flex items-center justify-between flex-wrap gap-2 border-t border-good-border/40 pt-1.5 mt-0.5">
                <p className="text-base font-semibold text-text-primary">
                  #{settlement.coWinner.ticketNumber}{settlement.coWinner.subTicket || ""} · {settlement.coWinner.name}
                  <span className="ml-2 font-mono text-xs text-text-secondary">{settlement.coWinner.memberCode}</span>
                </p>
                {settlement.coWinner.payoutAmount ? (
                  <Badge variant="neutral" className="font-mono text-xs font-bold text-good-strong bg-good-bg border-good-border">
                    50% Share: {formatPaise(settlement.coWinner.payoutAmount)}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Prize" value={formatPaise(settlement.prizeAmount)} />
          <Stat label="Discount" value={formatPaise(settlement.discountAmount)} />
          <Stat label="Commission" value={formatPaise(settlement.commissionAmount)} />
          <Stat label="Dividend / member" value={formatPaise(settlement.dividendPerMember)} />
        </dl>

        {settlement.dividendPerMember > 0 ? (
          <p className="text-xs text-text-secondary">
            Auto Dividend: {formatPaise(settlement.dividendPerMember)} is credited to every member — it reduces next
            cycle's installment automatically.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border-default pt-4">
          {payoutPaid ? (
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-good-strong">
              <CheckCircle2 size={16} /> Prize paid to the winner.
            </p>
          ) : canDisburse && outstanding.length > 0 ? (
            <>
              <Button
                size="lg"
                className="w-full bg-[#15803d] text-white hover:bg-[#166534] bg-none border-0 shadow-sm"
                onClick={() => setPayoutOpen(true)}
              >
                <CheckCircle2 size={18} /> Confirm Payout – {formatPaise(outstandingTotal)}
              </Button>
              <p className="text-center text-xs text-text-secondary">Winner and settlement details verified?</p>
            </>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={downloading !== null} onClick={() => void download("minutes")}>
                <FileText size={15} /> {downloading === "minutes" ? "Preparing…" : "Minutes PDF"}
              </Button>
              <Button variant="outline" size="sm" disabled={downloading !== null} onClick={() => void download("voucher")}>
                <Download size={15} /> {downloading === "voucher" ? "Preparing…" : "Winner PDF"}
              </Button>
            </div>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" aria-label="More actions">
                    More actions <MoreHorizontal size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!state.canRepick}
                    onClick={() => setRepickOpen(true)}
                    className="cursor-pointer gap-2 font-semibold text-bad-fg focus:text-bad-fg"
                  >
                    <RotateCcw size={15} /> Re-pick winner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {!state.canRepick && canManage ? (
          <p className="text-xs text-text-secondary">
            Re-pick is unavailable — the prize has been disbursed or a later cycle is already settled.
          </p>
        ) : null}
      </CardContent>

      <Dialog
        open={payoutOpen}
        onOpenChange={(open) => {
          if (!confirmPayout.isPending) setPayoutOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Winner Payout</DialogTitle>
            <DialogDescription>Are you sure you have paid the prize amount to the selected winner?</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border-default rounded-md border border-border-default px-4">
            {outstanding.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs text-text-secondary">Winner</p>
                  <p className="font-medium text-text-primary">{nameByMembership.get(p.chitMembershipId) ?? "Winner"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Payout amount</p>
                  <p className="font-display text-lg font-semibold text-text-primary tabular-nums">{formatPaise(p.remaining)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid via" htmlFor="payout-method">
              <Select value={method} onValueChange={(v: string) => setMethod(v as PaymentMethod)}>
                <SelectTrigger id="payout-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISBURSE_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference (optional)" htmlFor="payout-reference">
              <Input id="payout-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-text-secondary">
            The payout changes from Pending to Paid and the payment date is recorded. Re-pick is not possible afterwards.
          </p>
          {confirmPayout.isError ? (
            <p role="alert" className="text-sm text-bad-fg">
              {confirmPayout.error instanceof ApiError ? confirmPayout.error.message : "Could not record the payout"}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)} disabled={confirmPayout.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-[#15803d] text-white hover:bg-[#166534] bg-none border-0"
              disabled={confirmPayout.isPending}
              onClick={async () => {
                await confirmPayout.mutateAsync({
                  payoutIds: outstanding.map((p) => p.id),
                  method,
                  reference: reference.trim() || undefined,
                });
                setPayoutOpen(false);
                setReference("");
              }}
            >
              {confirmPayout.isPending ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repickOpen} onOpenChange={setRepickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-pick winner?</DialogTitle>
            <DialogDescription>
              The existing settlement will be recalculated: the payout is removed, the winner is unmarked, bids reopen,
              and the auto dividend is undone. You can then settle again.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)" htmlFor="repick-reason">
            <Input id="repick-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {repick.isError ? (
            <p role="alert" className="text-sm text-bad-fg">
              {repick.error instanceof ApiError ? repick.error.message : "Something went wrong"}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepickOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={repick.isPending}
              onClick={async () => {
                await repick.mutateAsync(reason || undefined);
                setRepickOpen(false);
                setReason("");
              }}
            >
              {repick.isPending ? "Reversing…" : "Reverse & re-pick"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
