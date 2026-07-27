import { Check, Paperclip, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useUpload } from "@/lib/use-upload";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/format";
import { DISBURSE_METHODS, METHOD_LABELS, type PaymentMethod, type PayoutDetail } from "../types";
import { useRecordDisbursement } from "../use-payouts";

const REFERENCE_PROMPTS: Partial<Record<PaymentMethod, string>> = {
  UPI: "UPI transaction ID",
  CHEQUE: "Cheque number",
  BANK_TRANSFER: "Bank / NEFT reference",
  CARD: "Card last 4 digits",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PayoutDetail;
}

export function DisburseDialog({ open, onOpenChange, payout }: Props) {
  const disburse = useRecordDisbursement(payout.id);
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [partial, setPartial] = useState(false);
  const [amountRupees, setAmountRupees] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<{ url: string; publicId: string; name: string } | null>(null);

  const amountPaise = partial ? Math.round(Number(amountRupees) * 100) : payout.remaining;
  const amountValid = !partial || (amountPaise > 0 && amountPaise <= payout.remaining);

  function reset() {
    setMethod("BANK_TRANSFER");
    setPartial(false);
    setAmountRupees("");
    setReference("");
    setNotes("");
    setProof(null);
    disburse.reset();
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFile(file: File) {
    const uploaded = await upload.mutateAsync(file);
    setProof({ url: uploaded.url, publicId: uploaded.publicId, name: file.name });
  }

  async function handleDisburse() {
    await disburse.mutateAsync({
      amount: partial ? amountPaise : undefined,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
      proofUrl: proof?.url,
      proofPublicId: proof?.publicId,
    });
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disburse prize money</DialogTitle>
          <DialogDescription>
            {payout.member.name} · {payout.member.memberCode}
            {payout.cycleNumber ? ` · Cycle #${payout.cycleNumber}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-md border border-border-default bg-bg-raised px-4 py-3 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary">Declared</p>
              <p className="font-semibold text-text-primary">{formatPaise(payout.declared)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary">Paid</p>
              <p className="font-semibold text-good-fg">{formatPaise(payout.paid)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary">Remaining</p>
              <p className="font-semibold text-text-primary">{formatPaise(payout.remaining)}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">Method</p>
            <div className="grid grid-cols-5 gap-2">
              {DISBURSE_METHODS.map((m) => (
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
            <Field label={REFERENCE_PROMPTS[method]!} htmlFor="disburse-ref">
              <Input id="disburse-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
            Pay in installment (partial)
          </label>

          {partial ? (
            <Field
              label="Amount (₹)"
              htmlFor="disburse-amount"
              error={!amountValid && amountRupees ? "Must be between ₹1 and the remaining balance" : undefined}
            >
              <Input
                id="disburse-amount"
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
            </Field>
          ) : null}

          <Field label="Notes (optional)" htmlFor="disburse-notes">
            <Input id="disburse-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">Proof of payment (optional)</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {proof ? (
              <p className="flex items-center gap-1.5 text-sm text-good-fg">
                <Check size={14} /> <Paperclip size={13} /> {proof.name}
              </p>
            ) : (
              <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> {upload.isPending ? "Uploading…" : "Attach proof"}
              </Button>
            )}
            {upload.isError ? (
              <p className="mt-1 text-xs text-bad-fg">Upload failed — requires Cloudinary to be configured.</p>
            ) : null}
          </div>

          {disburse.isError ? (
            <p className="text-sm text-bad-fg">
              {disburse.error instanceof ApiError ? disburse.error.message : "Something went wrong"}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button disabled={!amountValid || disburse.isPending || payout.remaining <= 0} onClick={() => void handleDisburse()}>
              {disburse.isPending ? "Recording…" : `Disburse ${formatPaise(amountPaise || 0)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
