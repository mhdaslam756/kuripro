import { CheckCircle2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPaise, humanize } from "@/lib/format";
import { useDisbursementReceipt } from "../use-payouts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disbursementId?: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

/** Payment voucher (receipt) for a single prize disbursement, with a scannable verification QR. */
export function PayoutReceiptDialog({ open, onOpenChange, disbursementId }: Props) {
  const { data: receipt, isLoading } = useDisbursementReceipt(disbursementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-good-fg" /> Payment voucher
          </DialogTitle>
        </DialogHeader>

        {isLoading || !receipt ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="font-mono text-sm text-text-secondary">{receipt.receiptNumber}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-text-primary">{formatPaise(receipt.amount)}</p>
              <p className="text-xs text-text-secondary">paid to the prize winner</p>
            </div>

            <div className="rounded-md border border-border-default p-3">
              <Row label="Member" value={`${receipt.member.name} (${receipt.member.memberCode})`} />
              <Row label="Chit group" value={receipt.chitGroup.name} />
              {receipt.cycleNumber ? <Row label="Cycle" value={`#${receipt.cycleNumber}`} /> : null}
              <Row label="Method" value={humanize(receipt.method)} />
              {receipt.reference ? <Row label="Reference" value={receipt.reference} /> : null}
              <Row label="Paid on" value={formatDateTime(receipt.disbursedAt)} />
              <Row
                label="Prize progress"
                value={`${formatPaise(receipt.payout.paid)} / ${formatPaise(receipt.payout.declared)}`}
              />
            </div>

            {receipt.proofUrl ? (
              <a
                href={receipt.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent-link hover:underline"
              >
                <Paperclip size={14} /> View proof of payment
              </a>
            ) : null}

            <div className="flex flex-col items-center gap-1">
              <img
                src={receipt.qrDataUrl}
                alt={`Voucher QR for ${receipt.receiptNumber}`}
                className="h-40 w-40 rounded-md border border-border-default bg-white p-1.5"
              />
              <p className="text-xs text-text-secondary">Scan to verify this voucher</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
