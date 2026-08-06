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
            <>
              {/* Mobile View: Cards */}
              <div className="grid gap-3 md:hidden">
                {data.rows.map((r, i) => (
                  <div
                    key={`${r.chitGroupName}-${r.cycleNumber}-${i}`}
                    className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent-primary bg-brand-50 px-2 py-0.5 rounded-md">
                            Cycle #{r.cycleNumber}
                          </span>
                          <span className="text-xs text-text-secondary">{formatDate(r.settledAt)}</span>
                        </div>
                        <h4 className="mt-1.5 font-semibold text-text-primary text-base leading-tight">{r.chitGroupName}</h4>
                        <p className="mt-0.5 text-xs text-text-secondary">Winner: {r.winnerName}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Prize Amount</p>
                        <p className="font-display text-base font-bold tabular-nums text-text-primary">{formatPaise(r.prizeAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-good-fg">Commission</p>
                        <p className="font-display text-base font-bold tabular-nums text-good-fg">{formatPaise(r.commissionAmount)}</p>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
