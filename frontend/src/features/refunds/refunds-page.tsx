import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useChitGroups } from "@/features/chit-groups/use-chit-groups";
import {
  DISBURSE_METHODS,
  METHOD_LABELS,
  type PaymentMethod,
} from "@/features/payouts/types";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise } from "@/lib/format";
import {
  usePayRefund,
  useRefunds,
  type RefundRow,
  type RefundStatus,
} from "./use-refunds";

const ALL = "__all__";
const STATUS_LABEL: Record<RefundStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partly paid",
  PAID: "Paid",
};
const STATUS_VARIANT: Record<RefundStatus, BadgeProps["variant"]> = {
  UNPAID: "warning",
  PARTIAL: "info",
  PAID: "success",
};
const TABS: { value: string; label: string }[] = [
  { value: ALL, label: "All" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL", label: "Partly paid" },
  { value: "PAID", label: "Paid" },
];

function StatusBadge({ row }: { row: RefundRow }) {
  const paidLabel = row.direction === "PAY" ? "Paid" : "Collected";
  return (
    <Badge variant={STATUS_VARIANT[row.status]}>
      {row.status === "PAID" ? paidLabel : STATUS_LABEL[row.status]}
    </Badge>
  );
}

function PayDialog({
  row,
  onClose,
}: {
  row: RefundRow | null;
  onClose: () => void;
}) {
  const pay = usePayRefund();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);

  // Start from the full outstanding balance each time a different refund is opened.
  if (row && seen !== row.replacementId) {
    setSeen(row.replacementId);
    setAmount(String(row.outstanding / 100));
    setError(null);
  }

  const rupees = Number(amount);
  const invalid =
    !row || !(rupees > 0) || Math.round(rupees * 100) > row.outstanding;

  async function submit() {
    if (!row || invalid) return;
    setError(null);
    try {
      await pay.mutateAsync({
        chitGroupId: row.chitGroupId,
        replacementId: row.replacementId,
        method,
        settledAmountRupees: rupees,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not record the payment.",
      );
    }
  }

  const verb = row?.direction === "PAY" ? "Pay refund" : "Collect";
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open && !pay.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{verb}</DialogTitle>
          <DialogDescription>
            {row?.previousMember.name} · {row?.groupName} · ticket {row?.ticket}
            . Balance {formatPaise(row?.outstanding ?? 0)} of{" "}
            {formatPaise(row?.owed ?? 0)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Amount (₹)"
            htmlFor="refund-amount"
            helpText="Pay part now and the rest later if you need to."
          >
            <Input
              id="refund-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Paid via" htmlFor="refund-method">
            <Select
              value={method}
              onValueChange={(v: string) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="refund-method">
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
        </div>
        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 text-sm text-bad-fg"
          >
            <AlertCircle size={14} /> {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pay.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={invalid || pay.isPending}
          >
            {pay.isPending
              ? "Recording…"
              : `${verb} ${invalid ? "" : formatPaise(Math.round(rupees * 100))}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefundsPage() {
  const { hasPermission } = useAuth();
  const canPay = hasPermission("chit_group.enroll_member");
  const { data: groups } = useChitGroups();
  const [status, setStatus] = useState<string>(ALL);
  const [chitGroupId, setChitGroupId] = useState<string>(ALL);
  const [target, setTarget] = useState<RefundRow | null>(null);

  const { data, isLoading, isError } = useRefunds({
    status: status === ALL ? undefined : (status as RefundStatus),
    chitGroupId: chitGroupId === ALL ? undefined : chitGroupId,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Refunds
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          What previous members are owed after being replaced, what has been
          paid, and what is still to pay.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Total", data?.totals.owed],
          ["Paid", data?.totals.paid],
          ["Still to pay", data?.totals.outstanding],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-md border border-border-default bg-bg-surface p-3"
          >
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              {label}
            </dt>
            <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-text-primary sm:text-xl">
              {value === undefined ? "—" : formatPaise(value as number)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap gap-1.5"
        >
          {TABS.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={status === t.value ? "primary" : "outline"}
              aria-pressed={status === t.value}
              onClick={() => setStatus(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="w-full sm:ml-auto sm:w-56">
          <Select value={chitGroupId} onValueChange={setChitGroupId}>
            <SelectTrigger aria-label="Chit group">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All chit groups</SelectItem>
              {(groups?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError || !data ? (
        <p role="alert" className="text-sm text-bad-fg">
          Couldn&apos;t load the refunds.
        </p>
      ) : data.items.length === 0 ? (
        <p className="rounded-md border border-border-default bg-bg-surface p-6 text-center text-sm text-text-secondary">
          No refunds found.
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {data.items.map((r) => (
              <div
                key={r.replacementId}
                className="flex flex-col gap-2 rounded-md border border-border-default bg-bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">
                      {r.previousMember.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {r.groupName} · ticket {r.ticket} · cycle{" "}
                      {r.effectiveCycleNumber}
                    </p>
                  </div>
                  <StatusBadge row={r} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-text-secondary">Total</dt>
                    <dd className="tabular-nums">{formatPaise(r.owed)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">Paid</dt>
                    <dd className="tabular-nums">{formatPaise(r.paid)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">To pay</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatPaise(r.outstanding)}
                    </dd>
                  </div>
                </dl>
                {r.settledAt ? (
                  <p className="text-xs text-text-secondary">
                    Paid on {formatDate(r.settledAt)}
                    {r.method
                      ? ` · ${METHOD_LABELS[r.method as PaymentMethod] ?? r.method}`
                      : ""}
                  </p>
                ) : null}
                {canPay && r.outstanding > 0 ? (
                  <Button className="min-h-11" onClick={() => setTarget(r)}>
                    {r.direction === "PAY" ? "Pay refund" : "Collect"}{" "}
                    {formatPaise(r.outstanding)}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Previous member</TableHeaderCell>
                    <TableHeaderCell>Chit group · ticket</TableHeaderCell>
                    <TableHeaderCell>Replaced on</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Total
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Paid
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      To pay
                    </TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Paid on</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((r) => (
                    <TableRow key={r.replacementId}>
                      <TableCell>
                        <span className="font-medium text-text-primary">
                          {r.previousMember.name}
                        </span>
                        <span className="block font-mono text-xs text-text-secondary">
                          {r.previousMember.memberCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.groupName} · {r.ticket}
                      </TableCell>
                      <TableCell>{formatDate(r.replacedOn)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPaise(r.owed)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPaise(r.paid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPaise(r.outstanding)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge row={r} />
                      </TableCell>
                      <TableCell>
                        {r.settledAt
                          ? `${formatDate(r.settledAt)}${r.method ? ` · ${METHOD_LABELS[r.method as PaymentMethod] ?? r.method}` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canPay && r.outstanding > 0 ? (
                          <Button size="sm" onClick={() => setTarget(r)}>
                            {r.direction === "PAY" ? "Pay" : "Collect"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}

      <PayDialog row={target} onClose={() => setTarget(null)} />
    </div>
  );
}
