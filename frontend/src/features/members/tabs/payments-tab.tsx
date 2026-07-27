import { Zap } from "lucide-react";
import { useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { CollectDialog } from "@/features/collections/components/collect-dialog";
import { ReceiptDialog } from "@/features/collections/components/receipt-dialog";
import type { Installment } from "@/features/collections/types";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import type { PaymentHistoryEntry } from "../types";
import { usePaymentHistory } from "../use-members";
import { EmptyState } from "./nominees-tab";

const STATUS_VARIANT: Record<PaymentHistoryEntry["status"], BadgeProps["variant"]> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAIVED: "info",
};

export function PaymentsTab({ memberId }: { memberId: string }) {
  const { hasPermission } = useAuth();
  const canRecord = hasPermission("collection.record");
  const { data, isLoading } = usePaymentHistory(memberId);

  const [collectTarget, setCollectTarget] = useState<Installment | null>(null);
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.items.length === 0) {
    return <EmptyState label="No installment payments recorded yet." />;
  }

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Due date</TableHeaderCell>
              <TableHeaderCell>Amount due</TableHeaderCell>
              <TableHeaderCell>Paid</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Method</TableHeaderCell>
              {canRecord ? <TableHeaderCell className="text-right">Action</TableHeaderCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((payment) => {
              const isUnpaid = payment.status === "PENDING" || payment.status === "PARTIAL" || payment.status === "OVERDUE";
              return (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.dueDate)}</TableCell>
                  <TableCell>{formatPaise(payment.amountDue)}</TableCell>
                  <TableCell>{formatPaise(payment.amountPaid)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[payment.status]}>{humanize(payment.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">{payment.method ? humanize(payment.method) : "—"}</TableCell>
                  {canRecord ? (
                    <TableCell className="text-right">
                      {isUnpaid ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            setCollectTarget({
                              id: payment.id,
                              tenantId: payment.tenantId ?? "",
                              chitGroupId: payment.chitGroupId ?? "",
                              chitCycleId: payment.chitCycleId ?? "",
                              chitMembershipId: {
                                _id: payment.chitMembershipId ?? "",
                                ticketNumber: payment.ticketNumber ?? 1,
                                memberId: {
                                  _id: memberId,
                                  name: "Member",
                                  memberCode: "",
                                  phone: "",
                                },
                              },
                              dueDate: payment.dueDate,
                              amountDue: payment.amountDue,
                              amountPaid: payment.amountPaid,
                              status: payment.status,
                            } as unknown as Installment)
                          }
                        >
                          <Zap size={14} /> Mark Collection
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {collectTarget ? (
        <CollectDialog
          open={Boolean(collectTarget)}
          onOpenChange={(o) => !o && setCollectTarget(null)}
          installment={collectTarget}
          chitGroupName="Chit Group"
          onCollected={(id) => {
            setCollectTarget(null);
            setReceiptId(id);
            setReceiptOpen(true);
          }}
          onQueuedOffline={() => {
            setCollectTarget(null);
          }}
        />
      ) : null}

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} collectionId={receiptId} />
    </>
  );
}
