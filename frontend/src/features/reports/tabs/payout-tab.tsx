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
                          <span className="text-xs text-text-secondary">{METHOD_LABEL[r.method] ?? r.method}</span>
                        </div>
                        <h4 className="mt-1.5 font-semibold text-text-primary text-base leading-tight">{r.memberName}</h4>
                        <p className="mt-0.5 text-xs text-text-secondary">{r.chitGroupName}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Disbursed On</p>
                        <p className="text-xs font-semibold text-text-primary">{formatDate(r.disbursedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Disbursed Amount</p>
                        <p className="font-display text-base font-bold tabular-nums text-text-primary">{formatPaise(r.amount)}</p>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
