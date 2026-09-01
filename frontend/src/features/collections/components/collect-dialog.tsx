import { WifiOff, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/format";
import { requestOutboxSync } from "@/lib/pwa";
import { enqueueCollection } from "../offline-queue";
import { COLLECTION_METHODS, METHOD_LABELS, type Installment, type PaymentMethod } from "../types";
import { useRecordCollection } from "../use-collections";

const REFERENCE_PROMPTS: Partial<Record<PaymentMethod, string>> = {
  UPI: "UPI transaction ID",
  CHEQUE: "Cheque number",
  BANK_TRANSFER: "Bank reference",
  CARD: "Card last 4 digits",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment;
  chitGroupName: string;
  onCollected: (collectionId: string) => void;
  onQueuedOffline: () => void;
}

export function CollectDialog({ open, onOpenChange, installment, chitGroupName, onCollected, onQueuedOffline }: Props) {
  const record = useRecordCollection();
  const outstanding = installment.amountDue - installment.amountPaid;
  const member = installment.chitMembershipId.memberId;
  const isFuture = new Date(installment.dueDate).getTime() > Date.now();

  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [partial, setPartial] = useState(false);
  const [amountRupees, setAmountRupees] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const amountPaise = partial ? Math.round(Number(amountRupees) * 100) : outstanding;
  const amountValid = !partial || (amountPaise > 0 && amountPaise <= outstanding);

  function reset() {
    setMethod("CASH");
    setPartial(false);
    setAmountRupees("");
    setReference("");
    setNotes("");
    record.reset();
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleCollect() {
    const payload = {
      paymentId: installment.id,
      amount: partial ? amountPaise : undefined,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueCollection({ ...payload, memberName: member.name, chitGroupName });
      // Ask the service worker to flush the outbox the moment connectivity returns, even if the
      // app has since been closed. The in-app online listener is the fallback when this isn't supported.
      void requestOutboxSync();
      handleClose(false);
      onQueuedOffline();
      return;
    }

    const result = await record.mutateAsync(payload);
    handleClose(false);
    onCollected(result.collection.id);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            {member.name} · {member.memberCode} · Ticket #{installment.chitMembershipId.ticketNumber}
            {installment.chitMembershipId.subTicket || ""}
            {installment.chitMembershipId.shareType === "HALF" ? " (50% Shared Slot)" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border-default bg-bg-raised px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-text-secondary">Outstanding</p>
            <p className="font-display text-2xl font-semibold text-text-primary">{formatPaise(outstanding)}</p>
            {isFuture ? (
              <p className="mt-0.5 text-xs text-info-fg">Not yet due — this will be recorded as an advance payment.</p>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">Method</p>
            <div className="grid grid-cols-5 gap-2">
              {COLLECTION_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    method === m
                      ? "border-accent-primary bg-brand-50 text-accent-primary"
                      : "border-border-default text-text-secondary hover:bg-bg-raised",
                  )}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {REFERENCE_PROMPTS[method] ? (
            <Field label={REFERENCE_PROMPTS[method]!} htmlFor="reference">
              <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          ) : null}

          {method === "CHEQUE" || method === "CARD" ? (
            <p className="-mt-2 text-xs text-text-secondary">
              Booked now and marked pending clearance — reconcile (clear or bounce) from Collection History.
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
            Partial payment
          </label>

          {partial ? (
            <Field
              label="Amount (₹)"
              htmlFor="amount"
              error={!amountValid && amountRupees ? "Must be between ₹1 and the outstanding balance" : undefined}
            >
              <Input id="amount" type="number" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value)} />
            </Field>
          ) : null}

          <Field label="Notes (optional)" htmlFor="notes">
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {record.isError ? (
            <p className="text-sm text-bad-fg">
              {record.error instanceof ApiError ? record.error.message : "Something went wrong"}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button disabled={!amountValid || record.isPending} onClick={() => void handleCollect()}>
              {record.isPending ? (
                "Recording…"
              ) : (
                <>
                  <Zap size={15} /> Collect {formatPaise(amountPaise || 0)}
                </>
              )}
            </Button>
          </div>

          {typeof navigator !== "undefined" && !navigator.onLine ? (
            <p className="flex items-center gap-1.5 text-xs text-warn-fg">
              <WifiOff size={13} /> You're offline — this will be queued and synced later.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
