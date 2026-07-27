import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { AuctionsReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function AuctionsTab({ range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<AuctionsReport>("auctions", params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("auctions", f, params)} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Auctions settled" value={String(data.count)} />
            <StatTile label="Total prizes" value={formatPaise(data.totals.prize)} />
            <StatTile label="Total commission" value={formatPaise(data.totals.commission)} tone="text-good-fg" />
            <StatTile label="Total discount" value={formatPaise(data.totals.discount)} />
          </div>
          {data.rows.length === 0 ? (
            <EmptyReport />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Chit group</TableHeaderCell>
                    <TableHeaderCell>Cycle</TableHeaderCell>
                    <TableHeaderCell>Winner</TableHeaderCell>
                    <TableHeaderCell>Settled</TableHeaderCell>
                    <TableHeaderCell>Discount</TableHeaderCell>
                    <TableHeaderCell>Commission</TableHeaderCell>
                    <TableHeaderCell>Prize</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={`${r.chitGroupName}-${r.cycleNumber}-${i}`}>
                      <TableCell className="font-medium">{r.chitGroupName}</TableCell>
                      <TableCell>#{r.cycleNumber}</TableCell>
                      <TableCell>{r.winnerName}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(r.settledAt)}</TableCell>
                      <TableCell>{formatPaise(r.discountAmount)}</TableCell>
                      <TableCell className="text-good-fg">{formatPaise(r.commissionAmount)}</TableCell>
                      <TableCell>{formatPaise(r.prizeAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      )}
    </div>
  );
}
