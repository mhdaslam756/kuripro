import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPaise, humanize } from "@/lib/format";
import { useReceipt } from "../use-collections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

/** Printable receipt with a scannable QR ("QR Receipt") that resolves back to this server-side record. */
export function ReceiptDialog({ open, onOpenChange, collectionId }: Props) {
  const { data: receipt, isLoading } = useReceipt(collectionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-good-fg" /> Receipt
          </DialogTitle>
        </DialogHeader>

        {isLoading || !receipt ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="font-mono text-sm text-text-secondary">{receipt.receiptNumber}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-text-primary">{formatPaise(receipt.amount)}</p>
              {receipt.isAdvance ? <p className="text-xs text-info-fg">Advance payment</p> : null}
            </div>

            <div className="rounded-md border border-border-default p-3">
              <Row label="Member" value={`${receipt.member.name} (${receipt.member.memberCode})`} />
              <Row label="Chit group" value={receipt.chitGroup.name} />
              {receipt.cycleNumber ? <Row label="Cycle" value={`#${receipt.cycleNumber}`} /> : null}
              <Row label="Method" value={humanize(receipt.method)} />
              {receipt.reference ? <Row label="Reference" value={receipt.reference} /> : null}
              <Row label="Status" value={humanize(receipt.status)} />
              <Row label="Collected" value={formatDateTime(receipt.collectedAt)} />
              <Row
                label="Installment"
                value={`${formatPaise(receipt.installment.amountPaid)} / ${formatPaise(receipt.installment.amountDue)}`}
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <img
                src={receipt.qrDataUrl}
                alt={`Receipt QR for ${receipt.receiptNumber}`}
                className="h-40 w-40 rounded-md border border-border-default bg-white p-1.5"
              />
              <p className="text-xs text-text-secondary">Scan to verify this receipt</p>
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
