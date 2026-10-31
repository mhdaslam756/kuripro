import { AlertCircle, ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMembers } from "@/features/members/use-members";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise } from "@/lib/format";
import { useReplaceMember, useReplacementPreview } from "../use-chit-groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId: string;
  chitGroupName: string;
  membershipId: string;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className={strong ? "font-semibold text-text-primary" : "text-text-primary"}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border-default bg-bg-surface p-4">
      <h4 className="mb-2 font-display text-sm font-semibold text-text-primary">{title}</h4>
      {children}
    </section>
  );
}

export function ReplaceMemberDialog({ open, onOpenChange, chitGroupId, chitGroupName, membershipId }: Props) {
  const [newMemberId, setNewMemberId] = useState<string>();
  const [cycle, setCycle] = useState<number>();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  // Settlement overrides — undefined means "use the suggested value from the preview".
  const [refund, setRefund] = useState<string>();
  const [deduction, setDeduction] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: preview, isLoading, error: previewError } = useReplacementPreview(chitGroupId, membershipId, {
    effectiveCycleNumber: cycle,
    newMemberId,
  });
  const { data: membersData, isLoading: loadingMembers } = useMembers({ search: search || undefined, limit: 50 });
  const replace = useReplaceMember(chitGroupId);

  const previousMemberId = preview?.previous.member?.id;
  const candidates = useMemo(
    () => (membersData?.items ?? []).filter((m) => m.id !== previousMemberId),
    [membersData, previousMemberId],
  );

  const snapshot = preview?.previous.snapshot;
  const refundRupees = refund !== undefined ? Number(refund) || 0 : (snapshot?.prepaidAmount ?? 0) / 100;
  const deductionRupees = Number(deduction) || 0;
  const pendingDues = snapshot?.pendingDues ?? 0;
  const netPaise = Math.round(refundRupees * 100) - pendingDues - Math.round(deductionRupees * 100);

  const cycleOptions = preview
    ? Array.from(
        { length: preview.effective.maxCycleNumber - preview.effective.minCycleNumber + 1 },
        (_, i) => preview.effective.minCycleNumber + i,
      )
    : [];

  async function handleConfirm() {
    if (!preview || !newMemberId) return;
    setError(null);
    try {
      await replace.mutateAsync({
        membershipId,
        newMemberId,
        effectiveCycleNumber: preview.effective.cycleNumber,
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
      setError(err instanceof ApiError ? err.message : "Could not replace the member. Please try again.");
    }
  }

  const blockedMessage =
    previewError instanceof ApiError ? previewError.message : previewError ? "Couldn't load replacement details." : null;
  const selectedNew = preview?.newMember.member;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replace member{preview ? ` · Ticket ${preview.slot.label}` : ""}</DialogTitle>
          <DialogDescription>
            Hands this slot in {chitGroupName} to a new member. The current member's record and payments are kept
            untouched and settled separately.
          </DialogDescription>
        </DialogHeader>

        {blockedMessage ? (
          <p role="alert" className="flex items-center gap-2 rounded-md border border-bad-fg/20 bg-bad-bg/10 p-3 text-sm text-bad-fg">
            <AlertCircle size={16} /> {blockedMessage}
          </p>
        ) : isLoading || !preview || !snapshot ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <div className="flex flex-col gap-4">
            <Section title="Previous member">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{preview.previous.member?.name ?? "Member"}</span>
                <span className="font-mono text-xs text-text-secondary">{preview.previous.member?.memberCode}</span>
                <Badge variant="neutral">Ticket {preview.slot.label}</Badge>
                {preview.slot.shareType === "HALF" ? <Badge variant="brand">½ Half</Badge> : null}
                {preview.previous.hasWon ? <Badge variant="info">Already won</Badge> : null}
              </div>
              <Row label="Member since" value={formatDate(preview.previous.joinedAt)} />
              <Row
                label={`Instalments paid (before cycle ${preview.effective.cycleNumber})`}
                value={`${snapshot.instalmentsPaid} of ${snapshot.instalmentsDue}`}
              />
              <Row label="Total paid" value={formatPaise(snapshot.totalPaid)} />
              <Row label="Pending dues" value={formatPaise(snapshot.pendingDues)} strong />
              {snapshot.prepaidAmount > 0 ? (
                <Row label="Already paid for handed-over cycles" value={formatPaise(snapshot.prepaidAmount)} />
              ) : null}
              {preview.previous.hasWon ? (
                <p className="mt-2 text-xs text-text-secondary">
                  This slot has already won a prize, so the new member keeps paying instalments but cannot win again.
                </p>
              ) : null}
            </Section>

            <Section title="New member & start cycle">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="replace-cycle" className="mb-1 block text-xs font-medium text-text-secondary">Takes over from</label>
                  <Select value={String(preview.effective.cycleNumber)} onValueChange={(v: string) => setCycle(Number(v))}>
                    <SelectTrigger id="replace-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cycleOptions.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          Cycle {n}
                          {n === preview.effective.cycleNumber && preview.effective.scheduledDate
                            ? ` · ${formatDate(preview.effective.scheduledDate)}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="replace-search" className="mb-1 block text-xs font-medium text-text-secondary">Replacement member</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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
                  <li className="p-3 text-sm text-text-secondary">Loading members…</li>
                ) : candidates.length === 0 ? (
                  <li className="p-3 text-sm text-text-secondary">No members found.</li>
                ) : (
                  candidates.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={newMemberId === m.id}
                        onClick={() => setNewMemberId(m.id)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg-raised ${
                          newMemberId === m.id ? "bg-brand-50" : ""
                        }`}
                      >
                        <span className="font-medium text-text-primary">{m.name}</span>
                        <span className="font-mono text-xs text-text-secondary">
                          {m.memberCode} · {m.phone}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-4 rounded-md bg-bg-raised p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {selectedNew ? `${selectedNew.name} will pay` : "New member will pay"}
                </p>
                <Row label="Remaining instalments" value={String(preview.newMember.remainingInstalments)} strong />
                <Row label="Total payable" value={formatPaise(preview.newMember.totalPayable)} strong />
                {preview.newMember.schedule.some((s) => s.basis === "ESTIMATE") ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    Later instalments are estimates — auction dividends will reduce them as cycles settle.
                  </p>
                ) : null}
                <details className="mt-2 text-xs text-text-secondary">
                  <summary className="cursor-pointer">Instalment schedule</summary>
                  <ul className="mt-1 grid gap-0.5">
                    {preview.newMember.schedule.map((s) => (
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

              <div className="mt-3">
                <label htmlFor="replace-reason" className="mb-1 block text-xs font-medium text-text-secondary">Reason (optional)</label>
                <Input id="replace-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Relocating, cannot continue" />
              </div>
            </Section>

            <Section title="Previous member settlement">
              <p className="mb-3 text-xs text-text-secondary">
                Handled separately from the new member. Nothing paid by the previous member is moved to the new one.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="replace-refund" className="mb-1 block text-xs font-medium text-text-secondary">Refund (₹)</label>
                  <Input
                    id="replace-refund"
                    type="number"
                    min={0}
                    value={refund ?? String((snapshot.prepaidAmount / 100) || "")}
                    onChange={(e) => setRefund(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="replace-deduction" className="mb-1 block text-xs font-medium text-text-secondary">Deductions (₹)</label>
                  <Input id="replace-deduction" type="number" min={0} value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0" />
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
              <Textarea className="mt-3 min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Settlement notes (optional)" />

              <div className="mt-3 rounded-md bg-bg-raised p-3">
                <Row label="Refund" value={formatPaise(Math.round(refundRupees * 100))} />
                <Row label="Less: pending dues" value={`− ${formatPaise(pendingDues)}`} />
                <Row label="Less: deductions" value={`− ${formatPaise(Math.round(deductionRupees * 100))}`} />
                <div className="mt-1 border-t border-border-default pt-1">
                  <Row
                    label={netPaise >= 0 ? "Payable to previous member" : "To collect from previous member"}
                    value={formatPaise(Math.abs(netPaise))}
                    strong
                  />
                </div>
                <p className="mt-1 text-xs text-text-secondary">Settlement status starts as Pending until you mark it settled.</p>
              </div>
            </Section>

            {error ? (
              <p role="alert" className="flex items-center gap-2 rounded-md border border-bad-fg/20 bg-bad-bg/10 p-2.5 text-sm text-bad-fg">
                <AlertCircle size={14} /> {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="mt-2">
          {confirming ? (
            <>
              <p className="mr-auto text-sm text-text-secondary">
                Replace {preview?.previous.member?.name} with {selectedNew?.name} from cycle {preview?.effective.cycleNumber}? This
                can't be undone.
              </p>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={replace.isPending}>
                Back
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={replace.isPending}>
                {replace.isPending ? "Replacing…" : "Confirm replacement"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfirming(true)} disabled={!preview || !newMemberId || Boolean(blockedMessage)}>
                Review replacement <ArrowRight size={15} />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
