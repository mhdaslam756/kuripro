import { AlertCircle, ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMembers } from "@/features/members/use-members";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import {
  DISBURSE_METHODS,
  METHOD_LABELS,
  type PaymentMethod,
} from "@/features/payouts/types";
import { Checkbox } from "@/components/ui/checkbox";
import type { NewMemberPlan } from "../types";
import { useReplaceMember, useReplacementPreview } from "../use-chit-groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId: string;
  chitGroupName: string;
  membershipId: string;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span
        className={
          strong ? "font-semibold text-text-primary" : "text-text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PlanBox({ title, plan }: { title: string; plan: NewMemberPlan }) {
  return (
    <div className="mt-4 rounded-md bg-bg-raised p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      <Row
        label="Remaining instalments"
        value={String(plan.remainingInstalments)}
        strong
      />
      <Row
        label="Total payable"
        value={formatPaise(plan.totalPayable)}
        strong
      />
      {plan.schedule.some((s) => s.basis === "ESTIMATE") ? (
        <p className="mt-1 text-xs text-text-secondary">
          Later instalments are estimates — auction dividends will reduce them
          as cycles settle.
        </p>
      ) : null}
      <details className="mt-2 text-xs text-text-secondary">
        <summary className="cursor-pointer">Instalment schedule</summary>
        <ul className="mt-1 grid gap-0.5">
          {plan.schedule.map((s) => (
            <li key={s.cycleNumber} className="flex justify-between">
              <span>
                Cycle {s.cycleNumber} · {formatDate(s.scheduledDate)}
              </span>
              <span>
                {formatPaise(s.amount)}
                {s.basis === "ESTIMATE" ? " (est.)" : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-default bg-bg-surface p-4">
      <h4 className="mb-2 font-display text-sm font-semibold text-text-primary">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function ReplaceMemberDialog({
  open,
  onOpenChange,
  chitGroupId,
  chitGroupName,
  membershipId,
}: Props) {
  const [newMemberId, setNewMemberId] = useState<string>();
  const [split, setSplit] = useState(false);
  const [secondMemberId, setSecondMemberId] = useState<string>();
  const [cycle, setCycle] = useState<number>();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  // Settlement overrides — undefined means "use the suggested value from the preview".
  const [refund, setRefund] = useState<string>();
  const [deduction, setDeduction] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [collectFee, setCollectFee] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const {
    data: preview,
    isLoading,
    error: previewError,
  } = useReplacementPreview(chitGroupId, membershipId, {
    effectiveCycleNumber: cycle,
    newMemberId,
    split,
    secondMemberId,
  });
  const { data: membersData, isLoading: loadingMembers } = useMembers({
    search: search || undefined,
    limit: 50,
  });
  const replace = useReplaceMember(chitGroupId);

  const previousMemberId = preview?.previous.member?.id;
  const candidates = useMemo(
    () => (membersData?.items ?? []).filter((m) => m.id !== previousMemberId),
    [membersData, previousMemberId],
  );

  const snapshot = preview?.previous.snapshot;
  const refundRupees =
    refund !== undefined
      ? Number(refund) || 0
      : ((snapshot?.totalPaid ?? 0) + (snapshot?.prepaidAmount ?? 0)) / 100;
  const deductionRupees = Number(deduction) || 0;
  const pendingDues = snapshot?.pendingDues ?? 0;
  const netPaise =
    Math.round(refundRupees * 100) -
    pendingDues -
    Math.round(deductionRupees * 100) -
    (preview?.financials.commission.previousMemberShare ?? 0);

  const cycleOptions = preview
    ? Array.from(
        {
          length:
            preview.effective.maxCycleNumber -
            preview.effective.minCycleNumber +
            1,
        },
        (_, i) => preview.effective.minCycleNumber + i,
      )
    : [];

  async function handleConfirm() {
    if (!preview || !newMemberId || (split && !secondMemberId)) return;
    setError(null);
    try {
      await replace.mutateAsync({
        membershipId,
        newMemberId,
        ...(split
          ? { splitIntoHalves: true, secondNewMemberId: secondMemberId }
          : {}),
        effectiveCycleNumber: preview.effective.cycleNumber,
        paymentMethod,
        collectReplacementFee: collectFee && preview.financials.fee.amount > 0,
        reason: reason.trim() || undefined,
        settlement: {
          refundAmountRupees: refund !== undefined ? refundRupees : undefined,
          deductionAmountRupees: deductionRupees,
          deductionReason: deductionReason.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setConfirming(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not replace the member. Please try again.",
      );
    }
  }

  const blockedMessage =
    previewError instanceof ApiError
      ? previewError.message
      : previewError
        ? "Couldn't load replacement details."
        : null;
  const selectedNew = preview?.newMember.member;
  const selectedSecond = preview?.secondNewMember?.member;
  const canSplit = preview
    ? preview.slot.shareType === "FULL" && !preview.slot.subTicket
    : false;
  const ready = Boolean(newMemberId) && (!split || Boolean(secondMemberId));

  function chooseMember(id: string, half: "A" | "B") {
    if (half === "A") {
      setNewMemberId(id);
      if (secondMemberId === id) setSecondMemberId(undefined);
    } else {
      setSecondMemberId(id);
      if (newMemberId === id) setNewMemberId(undefined);
    }
  }

  function changeMode(next: boolean) {
    setSplit(next);
    if (!next) setSecondMemberId(undefined);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border-default px-5 py-4 pr-14">
          <SheetTitle>
            Replace member{preview ? ` · Ticket ${preview.slot.label}` : ""}
          </SheetTitle>
          <SheetDescription>
            Hands this slot in {chitGroupName} to a new member. The current
            member's record and payments are kept untouched and settled
            separately.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {blockedMessage ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md border border-bad-fg/20 bg-bad-bg/10 p-3 text-sm text-bad-fg"
            >
              <AlertCircle size={16} /> {blockedMessage}
            </p>
          ) : isLoading || !preview || !snapshot ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <div className="flex flex-col gap-4">
              <Section title="Previous member">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">
                    {preview.previous.member?.name ?? "Member"}
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    {preview.previous.member?.memberCode}
                  </span>
                  <Badge variant="neutral">Ticket {preview.slot.label}</Badge>
                  {preview.slot.shareType === "HALF" ? (
                    <Badge variant="brand">½ Half</Badge>
                  ) : null}
                  {preview.previous.hasWon ? (
                    <Badge variant="info">Already won</Badge>
                  ) : null}
                </div>
                <Row
                  label="Member since"
                  value={formatDate(preview.previous.joinedAt)}
                />
                <Row
                  label={`Instalments paid (before cycle ${preview.effective.cycleNumber})`}
                  value={`${snapshot.instalmentsPaid} of ${snapshot.instalmentsDue}`}
                />
                <Row
                  label="Total paid"
                  value={formatPaise(snapshot.totalPaid)}
                />
                <Row
                  label="Pending dues"
                  value={formatPaise(snapshot.pendingDues)}
                  strong
                />
                {snapshot.prepaidAmount > 0 ? (
                  <Row
                    label="Already paid for handed-over cycles"
                    value={formatPaise(snapshot.prepaidAmount)}
                  />
                ) : null}
                {preview.previous.hasWon ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    This slot has already won a prize, so the new member keeps
                    paying instalments but cannot win again.
                  </p>
                ) : null}
              </Section>

              <Section title="New member & start cycle">
                {canSplit ? (
                  <div
                    role="group"
                    aria-label="Replacement type"
                    className="mb-3 flex gap-2"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={split ? "outline" : "primary"}
                      aria-pressed={!split}
                      onClick={() => changeMode(false)}
                    >
                      One member
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={split ? "primary" : "outline"}
                      aria-pressed={split}
                      onClick={() => changeMode(true)}
                    >
                      Split into two halves
                    </Button>
                  </div>
                ) : null}
                {split && preview.secondNewMember ? (
                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-md bg-accent-primary/10 p-3 text-sm">
                    {[
                      { label: "Half A", plan: preview.newMember },
                      { label: "Half B", plan: preview.secondNewMember },
                    ].map(({ label, plan }) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-text-secondary">
                          {label} pays
                        </p>
                        <p className="font-semibold text-text-primary">
                          {formatPaise(plan.totalPayable)}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {plan.schedule[0]
                            ? `${formatPaise(plan.schedule[0].amount)} × `
                            : ""}
                          {plan.remainingInstalments} instalments
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="replace-cycle"
                      className="mb-1 block text-xs font-medium text-text-secondary"
                    >
                      Takes over from
                    </label>
                    <Select
                      value={String(preview.effective.cycleNumber)}
                      onValueChange={(v: string) => setCycle(Number(v))}
                    >
                      <SelectTrigger id="replace-cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cycleOptions.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Cycle {n}
                            {n === preview.effective.cycleNumber &&
                            preview.effective.scheduledDate
                              ? ` · ${formatDate(preview.effective.scheduledDate)}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="replace-search"
                      className="mb-1 block text-xs font-medium text-text-secondary"
                    >
                      Replacement member
                    </label>
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <Input
                        id="replace-search"
                        className="pl-8"
                        placeholder="Search by name or phone"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <ul className="mt-3 max-h-44 divide-y divide-border-default overflow-y-auto rounded-md border border-border-default">
                  {loadingMembers ? (
                    <li className="p-3 text-sm text-text-secondary">
                      Loading members…
                    </li>
                  ) : candidates.length === 0 ? (
                    <li className="p-3 text-sm text-text-secondary">
                      No members found.
                    </li>
                  ) : (
                    candidates.map((m) => (
                      <li key={m.id}>
                        {split ? (
                          <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-text-primary">
                                {m.name}
                              </span>
                              <span className="font-mono text-xs text-text-secondary">
                                {m.memberCode} · {m.phone}
                              </span>
                            </span>
                            <span className="flex shrink-0 gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  newMemberId === m.id ? "primary" : "outline"
                                }
                                aria-pressed={newMemberId === m.id}
                                onClick={() => chooseMember(m.id, "A")}
                              >
                                Half A
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  secondMemberId === m.id
                                    ? "primary"
                                    : "outline"
                                }
                                aria-pressed={secondMemberId === m.id}
                                onClick={() => chooseMember(m.id, "B")}
                              >
                                Half B
                              </Button>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-pressed={newMemberId === m.id}
                            onClick={() => setNewMemberId(m.id)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg-raised ${
                              newMemberId === m.id ? "bg-accent-primary/10" : ""
                            }`}
                          >
                            <span className="font-medium text-text-primary">
                              {m.name}
                            </span>
                            <span className="font-mono text-xs text-text-secondary">
                              {m.memberCode} · {m.phone}
                            </span>
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>

                <PlanBox
                  title={
                    split
                      ? `${selectedNew ? selectedNew.name : "Half A"} will pay (half A)`
                      : selectedNew
                        ? `${selectedNew.name} will pay`
                        : "New member will pay"
                  }
                  plan={preview.newMember}
                />
                {split && preview.secondNewMember ? (
                  <PlanBox
                    title={`${selectedSecond ? selectedSecond.name : "Half B"} will pay (half B)`}
                    plan={preview.secondNewMember}
                  />
                ) : null}
                {split ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    Each half pays 50% of every instalment and takes half of the
                    prize if this ticket wins. Together they pay exactly what
                    the full ticket owed.
                  </p>
                ) : null}

                <div className="mt-3">
                  <label
                    htmlFor="replace-reason"
                    className="mb-1 block text-xs font-medium text-text-secondary"
                  >
                    Reason (optional)
                  </label>
                  <Input
                    id="replace-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Relocating, cannot continue"
                  />
                </div>
              </Section>

              <Section title="Financial summary">
                {(() => {
                  const f = preview.financials;
                  const owedToPrevious = netPaise >= 0;
                  return (
                    <>
                      <Row
                        label="Previous member"
                        value={preview.previous.member?.name ?? "—"}
                      />
                      <Row
                        label={
                          split ? "Replacement members" : "Replacement member"
                        }
                        value={
                          split
                            ? [selectedNew?.name, selectedSecond?.name]
                                .filter(Boolean)
                                .join(" & ") || "Not chosen yet"
                            : (selectedNew?.name ?? "Not chosen yet")
                        }
                      />
                      <Row
                        label="Paid by previous member"
                        value={formatPaise(f.previousMemberTotalPaid)}
                      />
                      <Row
                        label={
                          owedToPrevious
                            ? "Previous member settlement (to pay)"
                            : "Previous member settlement (to collect)"
                        }
                        value={formatPaise(Math.abs(netPaise))}
                        strong
                      />
                      <Row
                        label="Settlement status"
                        value={
                          f.installmentSettlementMode === "IMMEDIATE"
                            ? "Settled when you confirm"
                            : "Pending — settle later"
                        }
                      />
                      <div className="my-1 border-t border-border-default" />
                      <Row
                        label="Commission for this ticket (paid to the chit company)"
                        value={formatPaise(f.commission.total)}
                      />
                      <Row
                        label="Commission paid by the previous member"
                        value={formatPaise(f.commission.previousMemberShare)}
                      />
                      <Row
                        label="Commission paid by the replacement member"
                        value={formatPaise(f.commission.replacementMemberShare)}
                      />
                      {f.commission.organizationShare > 0 ? (
                        <Row
                          label="Commission not charged to either member"
                          value={formatPaise(f.commission.organizationShare)}
                        />
                      ) : null}
                      {f.allocation ? (
                        <div className="mt-1 rounded-md bg-bg-raised p-3 text-xs text-text-secondary">
                          <p className="mb-1 font-medium text-text-primary">
                            Allocation method: {humanize(f.allocation.mode)}
                          </p>
                          {(["PREVIOUS", "REPLACEMENT"] as const).map(
                            (role) => {
                              const hs = f.allocation!.holders.filter(
                                (h) => h.role === role,
                              );
                              return (
                                <p key={role}>
                                  {role === "PREVIOUS"
                                    ? "Previous"
                                    : "Replacement"}
                                  :{" "}
                                  {hs.reduce((s, h) => s + h.eligibleCycles, 0)}{" "}
                                  cycles
                                  {" · "}paid in{" "}
                                  {formatPaise(
                                    hs.reduce(
                                      (s, h) => s + h.eligibleContribution,
                                      0,
                                    ),
                                  )}
                                  {" · "}share{" "}
                                  {formatPaise(
                                    hs.reduce((s, h) => s + h.amount, 0),
                                  )}
                                </p>
                              );
                            },
                          )}
                          {f.allocation.remainingCommission > 0 ? (
                            <p>
                              Left over by the method:{" "}
                              {formatPaise(f.allocation.remainingCommission)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="my-1 border-t border-border-default" />
                      <Row
                        label="Remaining instalments"
                        value={formatPaise(
                          preview.newMember.totalPayable +
                            (preview.secondNewMember?.totalPayable ?? 0),
                        )}
                      />
                      <Row
                        label={
                          f.fee.mode === "PERCENTAGE" &&
                          f.fee.percentage !== null
                            ? `Replacement fee (${f.fee.percentage}% of ${formatPaise(f.fee.baseAmount)})`
                            : "Replacement fee"
                        }
                        value={formatPaise(f.fee.amount)}
                      />
                      <Row
                        label="Total payable by replacement"
                        value={formatPaise(f.totalPayableByReplacement)}
                        strong
                      />
                      {f.blockedReason ? (
                        <p
                          role="alert"
                          className="mt-2 flex items-center gap-2 rounded-md border border-bad-fg/20 bg-bad-bg/10 p-2.5 text-sm text-bad-fg"
                        >
                          <AlertCircle size={14} /> {f.blockedReason}. Change it
                          in Organization → Member Replacement.
                        </p>
                      ) : null}
                      {f.installmentSettlementMode === "IMMEDIATE" ||
                      f.fee.amount > 0 ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="replace-method"
                              className="mb-1 block text-xs font-medium text-text-secondary"
                            >
                              Payment method
                            </label>
                            <Select
                              value={paymentMethod}
                              onValueChange={(v: string) =>
                                setPaymentMethod(v as PaymentMethod)
                              }
                            >
                              <SelectTrigger id="replace-method">
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
                          </div>
                          {f.fee.amount > 0 ||
                          f.commission.replacementMemberShare > 0 ? (
                            <label
                              htmlFor="replace-collect-fee"
                              className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-text-primary"
                            >
                              <Checkbox
                                id="replace-collect-fee"
                                checked={collectFee}
                                onCheckedChange={(c) =>
                                  setCollectFee(c === true)
                                }
                              />
                              Fee and commission received now
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </Section>

              <Section title="Previous member settlement">
                <p className="mb-3 text-xs text-text-secondary">
                  Handled separately from the new member. Nothing paid by the
                  previous member is moved to the new one.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="replace-refund"
                      className="mb-1 block text-xs font-medium text-text-secondary"
                    >
                      Refund (₹)
                    </label>
                    <Input
                      id="replace-refund"
                      type="number"
                      min={0}
                      value={
                        refund ??
                        String(
                          (snapshot.totalPaid + snapshot.prepaidAmount) / 100 ||
                            "",
                        )
                      }
                      onChange={(e) => setRefund(e.target.value)}
                      placeholder="0"
                    />
                    <p className="mt-1.5 text-xs text-text-secondary">
                      Paid by member:{" "}
                      <strong className="text-text-primary">
                        {formatPaise(
                          snapshot.totalPaid + snapshot.prepaidAmount,
                        )}
                      </strong>
                      {snapshot.prepaidAmount > 0
                        ? ` (${formatPaise(snapshot.prepaidAmount)} for handed-over cycles)`
                        : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      {snapshot.prepaidAmount > 0 ? (
                        <button
                          type="button"
                          className="min-h-8 text-xs font-semibold text-accent-link hover:underline"
                          onClick={() =>
                            setRefund(String(snapshot.prepaidAmount / 100))
                          }
                        >
                          Refund handed-over cycles
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="min-h-8 text-xs font-semibold text-accent-link hover:underline"
                        onClick={() =>
                          setRefund(
                            String(
                              (snapshot.totalPaid + snapshot.prepaidAmount) /
                                100,
                            ),
                          )
                        }
                      >
                        Refund everything paid
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="replace-deduction"
                      className="mb-1 block text-xs font-medium text-text-secondary"
                    >
                      Deductions (₹)
                    </label>
                    <Input
                      id="replace-deduction"
                      type="number"
                      min={0}
                      value={deduction}
                      onChange={(e) => setDeduction(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {deductionRupees > 0 ? (
                  <Input
                    className="mt-3"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="Deduction reason (e.g. exit fee)"
                  />
                ) : null}
                <Textarea
                  className="mt-3 min-h-16"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Settlement notes (optional)"
                />

                <div className="mt-3 rounded-md bg-bg-raised p-3">
                  <Row
                    label="Refund"
                    value={formatPaise(Math.round(refundRupees * 100))}
                  />
                  <Row
                    label="Less: pending dues"
                    value={`− ${formatPaise(pendingDues)}`}
                  />
                  <Row
                    label="Less: deductions"
                    value={`− ${formatPaise(Math.round(deductionRupees * 100))}`}
                  />
                  <Row
                    label="Less: commission owed to the chit company"
                    value={`− ${formatPaise(preview.financials.commission.previousMemberShare)}`}
                  />
                  <div className="mt-1 border-t border-border-default pt-1">
                    <Row
                      label={
                        netPaise >= 0
                          ? "Payable to previous member"
                          : "To collect from previous member"
                      }
                      value={formatPaise(Math.abs(netPaise))}
                      strong
                    />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Settlement status starts as Pending until you mark it
                    settled.
                  </p>
                </div>
              </Section>

              {error ? (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-md border border-bad-fg/20 bg-bad-bg/10 p-2.5 text-sm text-bad-fg"
                >
                  <AlertCircle size={14} /> {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 items-center gap-2 border-t border-border-default px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-x-0">
          {confirming ? (
            <>
              <p className="mr-auto text-sm text-text-secondary">
                {split
                  ? `Split ticket ${preview?.slot.label} from ${preview?.previous.member?.name} into halves for ${selectedNew?.name} (A) and ${selectedSecond?.name} (B) from cycle ${preview?.effective.cycleNumber}? This can't be undone.`
                  : `Replace ${preview?.previous.member?.name} with ${selectedNew?.name} from cycle ${preview?.effective.cycleNumber}? This can't be undone.`}
              </p>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={replace.isPending}
              >
                Back
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={replace.isPending}
              >
                {replace.isPending ? "Replacing…" : "Confirm replacement"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={
                  !preview ||
                  !ready ||
                  Boolean(blockedMessage) ||
                  Boolean(preview.financials.blockedReason)
                }
              >
                Review replacement <ArrowRight size={15} />
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
