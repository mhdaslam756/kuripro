import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { usePrizeHistory } from "../use-members";
import { EmptyState } from "./nominees-tab";

export function PrizesTab({ memberId }: { memberId: string }) {
  const { data, isLoading } = usePrizeHistory(memberId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState label="This member hasn't won any chit cycles yet." />;
  }

  return (
    <>
      {/* Mobile View: Cards */}
      <div className="grid gap-3 md:hidden">
        {data.map((prize, index) => (
          <div
            key={index}
            className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-text-primary text-base leading-tight">{prize.chitGroupName}</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Cycle #{prize.cycleNumber} · {formatDate(prize.settledAt)}</p>
              </div>
              <Badge variant={prize.payoutStatus === "DISBURSED" ? "success" : "warning"}>
                {humanize(prize.payoutStatus)}
              </Badge>
            </div>

            <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Prize Amount</p>
                <p className="font-display text-lg font-bold tabular-nums text-accent-primary">{formatPaise(prize.prizeAmount)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Chit group</TableHeaderCell>
                <TableHeaderCell>Cycle</TableHeaderCell>
                <TableHeaderCell>Prize amount</TableHeaderCell>
                <TableHeaderCell>Settled</TableHeaderCell>
                <TableHeaderCell>Payout</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((prize, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{prize.chitGroupName}</TableCell>
                  <TableCell>#{prize.cycleNumber}</TableCell>
                  <TableCell>{formatPaise(prize.prizeAmount)}</TableCell>
                  <TableCell>{formatDate(prize.settledAt)}</TableCell>
                  <TableCell>
                    <Badge variant={prize.payoutStatus === "DISBURSED" ? "success" : "warning"}>
                      {humanize(prize.payoutStatus)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
}
