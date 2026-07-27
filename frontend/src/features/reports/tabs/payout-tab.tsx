import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { DonutChart } from "../charts/donut-chart";
import { ChartCard, EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import { METHOD_LABEL } from "./method-label";
import type { PayoutReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function PayoutTab({ range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<PayoutReport>("payout", params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("payout", f, params)} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total disbursed" value={formatPaise(data.total)} />
            <StatTile label="Disbursements" value={String(data.count)} />
            <StatTile label="Methods" value={String(data.byMethod.length)} />
          </div>
          {data.byMethod.length > 0 ? (
            <ChartCard title="By method">
              <DonutChart data={data.byMethod.map((m) => ({ label: METHOD_LABEL[m.method] ?? m.method, value: m.total }))} formatValue={formatPaise} />
            </ChartCard>
          ) : null}
          {data.rows.length === 0 ? (
            <EmptyReport />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Voucher</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Chit group</TableHeaderCell>
                    <TableHeaderCell>Method</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.slice(0, 200).map((r, i) => (
                    <TableRow key={`${r.receiptNumber}-${i}`}>
                      <TableCell className="font-mono text-xs">{r.receiptNumber}</TableCell>
                      <TableCell className="font-medium">{r.memberName}</TableCell>
                      <TableCell className="text-text-secondary">{r.chitGroupName}</TableCell>
                      <TableCell>{METHOD_LABEL[r.method] ?? r.method}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(r.disbursedAt)}</TableCell>
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
