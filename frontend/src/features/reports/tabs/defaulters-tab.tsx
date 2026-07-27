import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { DefaultersReport } from "../types";
import { downloadReport, useReport } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function DefaultersTab({ range, onRangeChange }: Props) {
  const { data, isLoading } = useReport<DefaultersReport>("defaulters", {});

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("defaulters", f, {})} showDates={false} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Defaulters" value={String(data.count)} tone="text-bad-fg" />
            <StatTile label="Total overdue" value={formatPaise(data.totalOverdue)} tone="text-bad-fg" />
          </div>
          {data.rows.length === 0 ? (
            <EmptyReport label="No overdue installments — everyone is up to date." />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Chit group</TableHeaderCell>
                    <TableHeaderCell>Overdue #</TableHeaderCell>
                    <TableHeaderCell>Oldest due</TableHeaderCell>
                    <TableHeaderCell>Overdue amount</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={`${r.memberCode}-${i}`}>
                      <TableCell className="font-medium">
                        {r.memberName} <span className="font-mono text-xs text-text-secondary">{r.memberCode}</span>
                      </TableCell>
                      <TableCell className="text-text-secondary">{r.phone}</TableCell>
                      <TableCell className="text-text-secondary">{r.chitGroupName}</TableCell>
                      <TableCell>{r.overdueCount}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(r.oldestDueDate)}</TableCell>
                      <TableCell className="font-medium text-bad-fg">{formatPaise(r.overdueAmount)}</TableCell>
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
