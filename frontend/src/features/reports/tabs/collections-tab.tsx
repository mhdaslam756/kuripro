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
            <>
              {/* Mobile View: Cards */}
              <div className="grid gap-3 md:hidden">
                {data.rows.slice(0, 200).map((r, i) => (
                  <div
                    key={`${r.receiptNumber}-${i}`}
                    className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent-primary bg-brand-50 px-2 py-0.5 rounded-md">
                            {r.receiptNumber}
                          </span>
                          <span className="text-xs text-text-secondary">{humanize(r.status)}</span>
                        </div>
                        <h4 className="mt-1.5 font-semibold text-text-primary text-base leading-tight">{r.memberName}</h4>
                        <p className="mt-0.5 font-mono text-xs text-text-secondary">{r.memberCode}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Method / Date</p>
                        <p className="text-xs font-semibold text-text-primary">
                          {METHOD_LABEL[r.method] ?? r.method} · {formatDate(r.collectedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Amount</p>
                        <p className="font-display text-base font-bold text-good-fg">{formatPaise(r.amount)}</p>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
