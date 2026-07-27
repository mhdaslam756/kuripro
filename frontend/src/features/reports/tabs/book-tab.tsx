import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { BookReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  kind: "cashbook" | "bank";
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

/** Cashbook and Bank book share the same movement-ledger shape (inflow / outflow / running balance). */
export function BookTab({ kind, range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<BookReport>(kind, params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport(kind, f, params)} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total in" value={formatPaise(data.totalIn)} tone="text-good-fg" />
            <StatTile label="Total out" value={formatPaise(data.totalOut)} tone="text-bad-fg" />
            <StatTile label="Net" value={formatPaise(data.net)} tone={data.net >= 0 ? "text-good-fg" : "text-bad-fg"} />
          </div>
          {data.rows.length === 0 ? (
            <EmptyReport label={`No ${kind === "cashbook" ? "cash" : "bank"} movements in this period.`} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Particulars</TableHeaderCell>
                    <TableHeaderCell>Reference</TableHeaderCell>
                    <TableHeaderCell>Inflow</TableHeaderCell>
                    <TableHeaderCell>Outflow</TableHeaderCell>
                    <TableHeaderCell>Balance</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.slice(0, 300).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-text-secondary">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.particulars}</TableCell>
                      <TableCell className="font-mono text-xs text-text-secondary">{r.reference}</TableCell>
                      <TableCell className="text-good-fg">{r.inflow ? formatPaise(r.inflow) : "—"}</TableCell>
                      <TableCell className="text-bad-fg">{r.outflow ? formatPaise(r.outflow) : "—"}</TableCell>
                      <TableCell className="font-medium tabular-nums">{formatPaise(r.balance)}</TableCell>
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
