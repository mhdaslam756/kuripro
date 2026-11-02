import {
  CheckCircle2,
  Download,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useCompleteReplacementSettlement } from "@/features/chit-groups/use-chit-groups";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import {
  DISBURSE_METHODS,
  METHOD_LABELS,
  type PaymentMethod,
} from "@/features/payouts/types";
import type { AuctionState, ExitSettlement } from "../types";
import {
  downloadAuctionPdf,
  useConfirmPayout,
  useRepick,
} from "../use-auctions";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-lg font-semibold text-text-primary tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function SettlementSummary({ state }: { state: AuctionState }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("auction.manage");
  const canDisburse = hasPermission("payout.disburse");
  const settlement = state.settlement!;
  const cycleId = state.cycle.id;
  const queryClient = useQueryClient();
  const canSettleExit = hasPermission("chit_group.enroll_member");
  const completeExit = useCompleteReplacementSettlement(state.chitGroup.id);
  const [exitTarget, setExitTarget] = useState<ExitSettlement | null>(null);
  const [exitMethod, setExitMethod] = useState<PaymentMethod>("CASH");
  const [exitError, setExitError] = useState<string | null>(null);
  const exitSettlements = settlement.exitSettlements ?? [];

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
  // Refunds taken out of this prize: shown as their own payment, never settled as a side effect of the winner's.
  const deductedRefunds = exitSettlements.filter(
    (e) =>
      e.status === "PENDING" &&
      (e.remainingPayable ?? 0) > 0 &&
      (e.prizeAllocation ?? 0) > 0,
  );
  const refundTotal = deductedRefunds.reduce(
    (s, e) => s + (e.remainingPayable ?? 0),
    0,
  );
  const refundAllocation = settlement.winner.refundDeducted ?? 0;
  const refundPreviouslyPaid = exitSettlements
    .filter((e) => (e.prizeAllocation ?? 0) > 0)
    .reduce(
      (s, e) => s + Math.min(e.previouslyPaid ?? 0, e.prizeAllocation ?? 0),
      0,
    );
  const refundShortfall = exitSettlements.reduce(
    (s, e) => s + (e.shortfall ?? 0),
    0,
  );
  const hasDeduction = (settlement.winner.refundDeducted ?? 0) > 0;
  const settleBoth =
    hasDeduction && deductedRefunds.length > 0 && outstanding.length > 0;
  const recipients = [
    settlement.winner,
    ...(settlement.coWinner ? [settlement.coWinner] : []),
  ];
  const nameByMembership = new Map(
    recipients.map((r) => [r.membershipId, r.name]),
  );

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
        <Badge
          variant={
            settlement.payoutStatus === "DISBURSED" ? "success" : "warning"
          }
        >
          Payout {humanize(settlement.payoutStatus)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          className={
            hasDeduction
              ? "grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6"
              : "contents"
          }
        >
          <div className={hasDeduction ? "flex flex-col gap-5" : "contents"}>
            <div className="rounded-md border border-good-border bg-good-bg px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-good-strong">
                {settlement.coWinner || settlement.winner.shareType === "HALF"
                  ? "Prized Subscribers (50/50 Shared Slot)"
                  : "Prized Subscriber (Winner)"}
              </p>
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-base font-semibold text-text-primary">
                    #{settlement.winner.ticketNumber}
                    {settlement.winner.subTicket || ""} ·{" "}
                    {settlement.winner.name}
                    <span className="ml-2 font-mono text-xs text-text-secondary">
                      {settlement.winner.memberCode}
                    </span>
                  </p>
                  {settlement.winner.payoutAmount && !hasDeduction ? (
                    <Badge
                      variant="neutral"
                      className="font-mono text-xs font-bold text-good-strong bg-good-bg border-good-border"
                    >
                      {settlement.winner.shareType === "HALF"
                        ? "50% Share: "
                        : "Payout: "}
                      {formatPaise(settlement.winner.payoutAmount)}
                    </Badge>
                  ) : null}
                </div>
                {hasDeduction ? (
                  <div>
                    <p className="font-display text-3xl font-semibold tabular-nums text-good-strong">
                      {formatPaise(settlement.winner.payoutAmount ?? 0)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Net amount payable to winner
                    </p>
                  </div>
                ) : null}
                {settlement.coWinner ? (
                  <div className="flex items-center justify-between flex-wrap gap-2 border-t border-good-border/40 pt-1.5 mt-0.5">
                    <p className="text-base font-semibold text-text-primary">
                      #{settlement.coWinner.ticketNumber}
                      {settlement.coWinner.subTicket || ""} ·{" "}
                      {settlement.coWinner.name}
                      <span className="ml-2 font-mono text-xs text-text-secondary">
                        {settlement.coWinner.memberCode}
                      </span>
                    </p>
                    {settlement.coWinner.payoutAmount ? (
                      <Badge
                        variant="neutral"
                        className="font-mono text-xs font-bold text-good-strong bg-good-bg border-good-border"
                      >
                        {settlement.coWinner.shareType === "HALF"
                          ? "50% Share: "
                          : "Payout: "}
                        {formatPaise(settlement.coWinner.payoutAmount)}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {settlement.winner.joinedFromCycle &&
            settlement.winner.joinedFromCycle > 1 ? (
              <p className="-mt-2 text-xs text-text-secondary">
                {settlement.winner.name} took this ticket over from cycle{" "}
                {settlement.winner.joinedFromCycle}.
              </p>
            ) : null}

            {hasDeduction ? (
              <section
                aria-label="Prize calculation"
                className="flex flex-col gap-1"
              >
                <h3 className="font-display text-base font-semibold text-text-primary">
                  Prize calculation
                </h3>
                <dl className="divide-y divide-border-default rounded-md border border-border-default px-4 text-sm">
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-text-secondary">Gross prize amount</dt>
                    <dd className="tabular-nums text-text-primary">
                      {formatPaise(settlement.winner.grossPayoutAmount ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-text-secondary">
                      Previous member refund allocation
                      {exitSettlements[0]
                        ? ` (${exitSettlements[0].previousMemberName})`
                        : ""}
                    </dt>
                    <dd className="tabular-nums text-text-primary">
                      − {formatPaise(settlement.winner.refundDeducted ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2 font-semibold">
                    <dt className="text-text-primary">Winner net payout</dt>
                    <dd className="tabular-nums text-text-primary">
                      {formatPaise(settlement.winner.payoutAmount ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-text-secondary">
                      Total prize allocation
                    </dt>
                    <dd className="tabular-nums text-text-primary">
                      {formatPaise(
                        (settlement.winner.payoutAmount ?? 0) +
                          refundAllocation,
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </div>
          <div className={hasDeduction ? "flex flex-col gap-5" : "contents"}>
            {exitSettlements.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-border-default px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Previous member refund
                </p>
                {exitSettlements.map((e) => {
                  const owedToThem = e.netAmount >= 0;
                  return (
                    <div
                      key={e.replacementId}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {e.previousMemberName}{" "}
                          <span className="font-mono text-xs text-text-secondary">
                            {e.previousMemberCode}
                          </span>
                        </p>
                        <p className="text-xs text-text-secondary">
                          Paid {formatPaise(e.totalPaid)} · left at cycle{" "}
                          {e.effectiveCycleNumber}
                          {e.status === "SETTLED" && e.settledAt
                            ? ` · settled ${formatDate(e.settledAt)}`
                            : ""}
                        </p>
                      </div>
                      <div
                        className={
                          hasDeduction
                            ? "flex w-full flex-wrap items-center justify-between gap-2"
                            : "flex items-center gap-2"
                        }
                      >
                        <span className="font-display text-base font-semibold tabular-nums text-text-primary">
                          {formatPaise(
                            hasDeduction
                              ? (e.prizeAllocation ?? 0)
                              : Math.abs(e.netAmount),
                          )}
                        </span>
                        {e.status === "SETTLED" ? (
                          <Badge variant="success">
                            {owedToThem ? "Refund paid" : "Collected"}
                          </Badge>
                        ) : (e.previouslyPaid ?? 0) > 0 ? (
                          <Badge variant="info">Partly paid</Badge>
                        ) : (
                          <Badge variant="warning">
                            {owedToThem ? "Refund pending" : "Due"}
                          </Badge>
                        )}
                        {hasDeduction ? (
                          <dl className="w-full divide-y divide-border-default text-sm">
                            <div className="flex justify-between gap-3 py-1.5">
                              <dt className="text-text-secondary">
                                Previously paid
                              </dt>
                              <dd className="tabular-nums">
                                {formatPaise(
                                  Math.min(
                                    e.previouslyPaid ?? 0,
                                    e.prizeAllocation ?? 0,
                                  ),
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3 py-1.5">
                              <dt className="text-text-secondary">
                                Remaining refund payable
                              </dt>
                              <dd className="font-semibold tabular-nums">
                                {formatPaise(e.remainingPayable ?? 0)}
                              </dd>
                            </div>
                          </dl>
                        ) : null}
                        {e.status !== "SETTLED" &&
                        canSettleExit &&
                        (e.remainingPayable ?? 0) > 0 ? (
                          <Button
                            size="sm"
                            variant={hasDeduction ? "outline" : "primary"}
                            className={
                              hasDeduction
                                ? "order-last w-full basis-full"
                                : undefined
                            }
                            onClick={() => {
                              setExitError(null);
                              setExitTarget(e);
                            }}
                          >
                            {owedToThem ? "Pay refund" : "Collect"}{" "}
                            {formatPaise(e.remainingPayable ?? 0)}
                          </Button>
                        ) : null}
                        {(e.shortfall ?? 0) > 0 ? (
                          <p
                            role="alert"
                            className="w-full rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-xs text-warn-strong"
                          >
                            {formatPaise(e.shortfall ?? 0)} of this refund is
                            more than the prize can cover. It stays outstanding
                            and needs a financial review; it is not paid by the
                            company automatically.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {hasDeduction ? (
              <section
                aria-label="Settlement summary"
                className="flex flex-col gap-1"
              >
                <h3 className="font-display text-base font-semibold text-text-primary">
                  Settlement summary
                </h3>
                <dl className="divide-y divide-border-default rounded-md border border-border-default px-4 text-sm">
                  {[
                    ["Gross prize", settlement.winner.grossPayoutAmount ?? 0],
                    ["Previous member refund allocation", refundAllocation],
                    ["Previously paid refund", refundPreviouslyPaid],
                    ["Remaining refund payable", refundTotal],
                    [
                      `${settlement.winner.name} net payout`,
                      settlement.winner.payoutAmount ?? 0,
                    ],
                    [
                      "Total prize allocation",
                      (settlement.winner.payoutAmount ?? 0) + refundAllocation,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="flex justify-between gap-3 py-2"
                    >
                      <dt className="text-text-secondary">{label}</dt>
                      <dd className="font-medium tabular-nums text-text-primary">
                        {formatPaise(value as number)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-text-secondary">Settlement status</dt>
                    <dd>
                      <Badge
                        variant={
                          refundShortfall > 0
                            ? "danger"
                            : payoutPaid && refundTotal === 0
                              ? "success"
                              : "warning"
                        }
                      >
                        {refundShortfall > 0
                          ? "Needs review"
                          : payoutPaid && refundTotal === 0
                            ? "Settled"
                            : "Pending"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Prize" value={formatPaise(settlement.prizeAmount)} />
          <Stat
            label="Discount"
            value={formatPaise(settlement.discountAmount)}
          />
          <Stat
            label="Commission"
            value={formatPaise(settlement.commissionAmount)}
          />
          <Stat
            label="Dividend / member"
            value={formatPaise(settlement.dividendPerMember)}
          />
        </dl>

        {settlement.dividendPerMember > 0 ? (
          <p className="text-xs text-text-secondary">
            Auto Dividend: {formatPaise(settlement.dividendPerMember)} is
            credited to every member — it reduces next cycle's installment
            automatically.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border-default pt-4">
          {payoutPaid ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm font-medium text-good-strong"
            >
              <CheckCircle2 size={16} /> Prize paid to the winner.
            </p>
          ) : canDisburse && outstanding.length > 0 ? (
            <>
              <Button
                size="lg"
                className="w-full bg-[#15803d] text-white hover:bg-[#166534] bg-none border-0 shadow-sm"
                onClick={() => setPayoutOpen(true)}
              >
                <CheckCircle2 size={18} />{" "}
                {settleBoth
                  ? `Confirm Settlement – ${formatPaise(outstandingTotal + refundTotal)}`
                  : `Confirm Payout – ${formatPaise(outstandingTotal)}`}
              </Button>
              <p className="text-center text-xs text-text-secondary">
                {settleBoth
                  ? "Confirm both recipient amounts and payment details before settlement."
                  : "Winner and settlement details verified?"}
              </p>
            </>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={downloading !== null}
                onClick={() => void download("minutes")}
              >
                <FileText size={15} />{" "}
                {downloading === "minutes" ? "Preparing…" : "Minutes PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={downloading !== null}
                onClick={() => void download("voucher")}
              >
                <Download size={15} />{" "}
                {downloading === "voucher" ? "Preparing…" : "Winner PDF"}
              </Button>
            </div>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="More actions"
                  >
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
            Re-pick is unavailable — the prize has been disbursed or a later
            cycle is already settled.
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
            <DialogDescription>
              Are you sure you have paid the prize amount to the selected
              winner?
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border-default rounded-md border border-border-default px-4">
            {outstanding.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-xs text-text-secondary">Winner</p>
                  <p className="font-medium text-text-primary">
                    {nameByMembership.get(p.chitMembershipId) ?? "Winner"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Payout amount</p>
                  <p className="font-display text-lg font-semibold text-text-primary tabular-nums">
                    {formatPaise(p.remaining)}
                  </p>
                </div>
              </div>
            ))}
            {settleBoth
              ? deductedRefunds.map((e) => (
                  <div
                    key={e.replacementId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-xs text-text-secondary">
                        Previous member refund
                      </p>
                      <p className="font-medium text-text-primary">
                        {e.previousMemberName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary">
                        Refund amount
                      </p>
                      <p className="font-display text-lg font-semibold text-text-primary tabular-nums">
                        {formatPaise(e.remainingPayable ?? 0)}
                      </p>
                    </div>
                  </div>
                ))
              : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid via" htmlFor="payout-method">
              <Select
                value={method}
                onValueChange={(v: string) => setMethod(v as PaymentMethod)}
              >
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
              <Input
                id="payout-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-text-secondary">
            The payout changes from Pending to Paid and the payment date is
            recorded. Re-pick is not possible afterwards.
          </p>
          {confirmPayout.isError ? (
            <p role="alert" className="text-sm text-bad-fg">
              {confirmPayout.error instanceof ApiError
                ? confirmPayout.error.message
                : "Could not record the payout"}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutOpen(false)}
              disabled={confirmPayout.isPending}
            >
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
                // The refund is its own payment, recorded after the winner's. If it fails the refund stays pending.
                if (settleBoth) {
                  for (const e of deductedRefunds) {
                    await completeExit.mutateAsync({
                      replacementId: e.replacementId,
                      method,
                      settledAmountRupees: (e.remainingPayable ?? 0) / 100,
                    });
                  }
                  void queryClient.invalidateQueries({
                    queryKey: ["auction-state", cycleId],
                  });
                }
                setPayoutOpen(false);
                setReference("");
              }}
            >
              {confirmPayout.isPending ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={exitTarget !== null}
        onOpenChange={(open) => {
          if (!completeExit.isPending && !open) setExitTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {exitTarget && exitTarget.netAmount >= 0
                ? "Pay refund"
                : "Collect from previous member"}
            </DialogTitle>
            <DialogDescription>
              {exitTarget?.previousMemberName}: refund{" "}
              {formatPaise(exitTarget?.refundAmount ?? 0)} − pending dues{" "}
              {formatPaise(exitTarget?.pendingDues ?? 0)} − deductions{" "}
              {formatPaise(exitTarget?.deductionAmount ?? 0)}.
            </DialogDescription>
          </DialogHeader>
          <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
            {formatPaise(exitTarget?.remainingPayable ?? 0)}
          </p>
          <Field label="Paid via" htmlFor="exit-method">
            <Select
              value={exitMethod}
              onValueChange={(v: string) => setExitMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="exit-method">
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
          {exitError ? (
            <p role="alert" className="text-sm text-bad-fg">
              {exitError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExitTarget(null)}
              disabled={completeExit.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={completeExit.isPending}
              onClick={async () => {
                if (!exitTarget) return;
                try {
                  await completeExit.mutateAsync({
                    replacementId: exitTarget.replacementId,
                    method: exitMethod,
                    settledAmountRupees:
                      (exitTarget.remainingPayable ?? 0) / 100,
                  });
                  void queryClient.invalidateQueries({
                    queryKey: ["auction-state", cycleId],
                  });
                  setExitTarget(null);
                } catch (err) {
                  setExitError(
                    err instanceof ApiError
                      ? err.message
                      : "Could not record the settlement",
                  );
                }
              }}
            >
              {completeExit.isPending ? "Recording…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repickOpen} onOpenChange={setRepickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-pick winner?</DialogTitle>
            <DialogDescription>
              The existing settlement will be recalculated: the payout is
              removed, the winner is unmarked, bids reopen, and the auto
              dividend is undone. You can then settle again.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)" htmlFor="repick-reason">
            <Input
              id="repick-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {repick.isError ? (
            <p role="alert" className="text-sm text-bad-fg">
              {repick.error instanceof ApiError
                ? repick.error.message
                : "Something went wrong"}
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
