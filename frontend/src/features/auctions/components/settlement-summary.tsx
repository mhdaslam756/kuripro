import { Download, FileText, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatPaise, humanize } from "@/lib/format";
import type { AuctionState } from "../types";
import { downloadAuctionPdf, useRepick } from "../use-auctions";

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
  const settlement = state.settlement!;
  const cycleId = state.cycle.id;

  const repick = useRepick(cycleId);
  const [repickOpen, setRepickOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

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
          <p className="text-xs uppercase tracking-wide text-good-fg">
            {settlement.coWinner || settlement.winner.shareType === "HALF" ? "Prized Subscribers (50/50 Shared Slot)" : "Prized Subscriber (Winner)"}
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-base font-semibold text-text-primary">
                #{settlement.winner.ticketNumber}{settlement.winner.subTicket || ""} · {settlement.winner.name}
                <span className="ml-2 font-mono text-xs text-text-secondary">{settlement.winner.memberCode}</span>
              </p>
              {settlement.winner.payoutAmount ? (
                <Badge variant="neutral" className="font-mono text-xs font-bold text-good-fg bg-good-bg border-good-border">
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
                  <Badge variant="neutral" className="font-mono text-xs font-bold text-good-fg bg-good-bg border-good-border">
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

        <div className="flex flex-wrap gap-2 border-t border-border-default pt-4">
          <Button variant="outline" disabled={downloading !== null} onClick={() => void download("minutes")}>
            <FileText size={15} /> {downloading === "minutes" ? "Preparing…" : "Minutes PDF"}
          </Button>
          <Button variant="outline" disabled={downloading !== null} onClick={() => void download("voucher")}>
            <Download size={15} /> {downloading === "voucher" ? "Preparing…" : "Winner PDF"}
          </Button>
          {canManage && state.canRepick ? (
            <Button variant="destructive" onClick={() => setRepickOpen(true)}>
              <RotateCcw size={15} /> Re-pick winner
            </Button>
          ) : null}
        </div>

        {!state.canRepick && canManage ? (
          <p className="text-xs text-text-secondary">
            Re-pick is unavailable — the prize has been disbursed or a later cycle is already settled.
          </p>
        ) : null}
      </CardContent>

      <Dialog open={repickOpen} onOpenChange={setRepickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-pick winner?</DialogTitle>
            <DialogDescription>
              This reverses the settlement — the payout is removed, the winner is unmarked, bids reopen, and the auto
              dividend is undone. You can then settle again.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)" htmlFor="repick-reason">
            <Input id="repick-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {repick.isError ? (
            <p className="text-sm text-bad-fg">
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
