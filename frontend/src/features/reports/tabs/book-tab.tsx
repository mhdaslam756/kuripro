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
            <>
              {/* Mobile View: Cards */}
              <div className="grid gap-3 md:hidden">
                {data.rows.slice(0, 300).map((r, i) => (
                  <div
                    key={i}
                    className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-text-primary text-base leading-tight">{r.particulars}</h4>
                        <p className="mt-0.5 font-mono text-xs text-text-secondary">{r.reference} · {formatDate(r.date)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Balance</p>
                        <p className="font-display text-base font-bold tabular-nums text-text-primary">{formatPaise(r.balance)}</p>
                      </div>
                      <div className="text-right">
                        {r.inflow ? (
                          <span className="font-display text-base font-bold text-good-fg">+{formatPaise(r.inflow)}</span>
                        ) : r.outflow ? (
                          <span className="font-display text-base font-bold text-bad-fg">-{formatPaise(r.outflow)}</span>
                        ) : null}
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
