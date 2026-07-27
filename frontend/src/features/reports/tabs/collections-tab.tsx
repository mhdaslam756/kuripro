import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { AreaChart } from "../charts/area-chart";
import { DonutChart } from "../charts/donut-chart";
import { ChartCard, EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import { METHOD_LABEL } from "./method-label";
import type { CollectionsReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function CollectionsTab({ range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<CollectionsReport>("collections", params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("collections", f, params)} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total collected" value={formatPaise(data.total)} tone="text-good-fg" />
            <StatTile label="Receipts" value={String(data.count)} />
            <StatTile label="Methods used" value={String(data.byMethod.length)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="By method">
              <DonutChart
                data={data.byMethod.map((m) => ({ label: METHOD_LABEL[m.method] ?? m.method, value: m.total }))}
                formatValue={formatPaise}
              />
            </ChartCard>
            <ChartCard title="Daily trend">
              {data.byDay.length === 0 ? (
                <EmptyReport />
              ) : (
                <AreaChart data={data.byDay.map((d) => ({ label: d.day, value: d.total }))} formatValue={formatPaise} />
              )}
            </ChartCard>
          </div>

          {data.rows.length === 0 ? (
            <EmptyReport />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Receipt</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Method</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.slice(0, 200).map((r, i) => (
                    <TableRow key={`${r.receiptNumber}-${i}`}>
                      <TableCell className="font-mono text-xs">{r.receiptNumber}</TableCell>
                      <TableCell className="font-medium">
                        {r.memberName} <span className="font-mono text-xs text-text-secondary">{r.memberCode}</span>
                      </TableCell>
                      <TableCell>{METHOD_LABEL[r.method] ?? r.method}</TableCell>
                      <TableCell className="text-text-secondary">{humanize(r.status)}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(r.collectedAt)}</TableCell>
                      <TableCell>{formatPaise(r.amount)}</TableCell>
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
