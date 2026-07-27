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
  );
}
