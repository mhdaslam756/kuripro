import { Banknote, Paperclip, Plus, Receipt as ReceiptIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatPaise } from "@/lib/format";
import { DisburseDialog } from "./disburse-dialog";
import { MethodBadge, PayoutStatusBadge } from "./payout-badges";
import { PayoutReceiptDialog } from "./payout-receipt-dialog";
import { usePayout } from "../use-payouts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payoutId?: string;
}

export function PayoutDetailDialog({ open, onOpenChange, payoutId }: Props) {
  const { hasPermission } = useAuth();
  const canDisburse = hasPermission("payout.disburse");
  const { data: payout, isLoading } = usePayout(payoutId);

  const [disburseOpen, setDisburseOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);

  function openReceipt(id: string) {
    setReceiptId(id);
    setReceiptOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {isLoading || !payout ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote size={18} className="text-accent-primary" /> Prize payout
              </DialogTitle>
              <DialogDescription>
                {payout.member.name} · {payout.member.memberCode}
                {payout.cycleNumber ? ` · ${payout.chitGroup.name} · Cycle #${payout.cycleNumber}` : ` · ${payout.chitGroup.name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 rounded-md border border-border-default bg-bg-raised px-4 py-3 text-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">Declared</p>
                  <p className="font-display text-lg font-semibold text-text-primary">{formatPaise(payout.declared)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">Paid</p>
                  <p className="font-display text-lg font-semibold text-good-fg">{formatPaise(payout.paid)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">Remaining</p>
                  <p className="font-display text-lg font-semibold text-text-primary">{formatPaise(payout.remaining)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <PayoutStatusBadge status={payout.status} />
                {canDisburse && payout.remaining > 0 ? (
                  <Button size="sm" onClick={() => setDisburseOpen(true)}>
                    <Plus size={15} /> Disburse
                  </Button>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-text-primary">Installments</p>
                {payout.disbursements.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-default py-8 text-center">
                    <p className="text-sm text-text-secondary">No disbursements yet.</p>
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
                    {payout.disbursements.map((d) => (
                      <li key={d.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{formatPaise(d.amount)}</span>
                            <MethodBadge method={d.method} />
                            {d.proofUrl ? <Paperclip size={13} className="text-text-secondary" /> : null}
                          </div>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {d.receiptNumber} · {formatDateTime(d.disbursedAt)}
                            {d.reference ? ` · ${d.reference}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="View voucher"
                          className="text-text-secondary hover:text-accent-primary"
                          onClick={() => openReceipt(d.id)}
                        >
                          <ReceiptIcon size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DisburseDialog open={disburseOpen} onOpenChange={setDisburseOpen} payout={payout} />
            <PayoutReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} disbursementId={receiptId} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
