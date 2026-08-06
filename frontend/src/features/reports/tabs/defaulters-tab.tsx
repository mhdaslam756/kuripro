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
            <>
              {/* Mobile View: Cards */}
              <div className="grid gap-3 md:hidden">
                {data.rows.map((r, i) => (
                  <div
                    key={`${r.memberCode}-${i}`}
                    className="active-bounce flex flex-col justify-between rounded-2xl border border-bad-border/60 bg-bg-surface p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-text-primary text-base leading-tight">{r.memberName}</h4>
                        <p className="mt-0.5 font-mono text-xs text-text-secondary">{r.memberCode} · {r.phone}</p>
                      </div>
                      <span className="rounded-md bg-bad-bg px-2 py-0.5 font-mono text-xs font-bold text-bad-fg">
                        {r.overdueCount} Overdue
                      </span>
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Chit Group</p>
                        <p className="text-xs font-semibold text-text-primary">{r.chitGroupName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-bad-fg">Amount Overdue</p>
                        <p className="font-display text-base font-bold text-bad-fg">{formatPaise(r.overdueAmount)}</p>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
