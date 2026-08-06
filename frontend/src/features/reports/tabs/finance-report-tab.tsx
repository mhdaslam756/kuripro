import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { formatPaise } from "@/lib/format";
import { DonutChart } from "../charts/donut-chart";
import { FinanceEntryDialog } from "../components/finance-entry-dialog";
import { ChartCard, EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { ExpenseReport, IncomeReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  kind: "income" | "expense";
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

/** Shared Income and Expense report — category breakdown + a button to record an entry. */
export function FinanceReportTab({ kind, range, onRangeChange }: Props) {
  const { hasPermission } = useAuth();
  const canRecord = hasPermission("report.manage_finance");
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<IncomeReport | ExpenseReport>(kind, params);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isIncome = kind === "income";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport(kind, f, params)} />
        </div>
        {canRecord ? (
          <Button className="mb-5 ml-3" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={15} /> Record {isIncome ? "income" : "expense"}
          </Button>
        ) : null}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              label={isIncome ? "Total income" : "Total expense"}
              value={formatPaise(data.total)}
              tone={isIncome ? "text-good-fg" : "text-bad-fg"}
            />
            <StatTile label="Categories" value={String(data.byCategory.length)} />
          </div>

          {data.byCategory.length === 0 ? (
            <EmptyReport label={`No ${kind} recorded for this period.`} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="By category">
                <DonutChart
                  data={data.byCategory.map((c) => ({ label: c.category, value: c.total }))}
                  centerValue={formatPaise(data.total)}
                  centerLabel={isIncome ? "Income" : "Expense"}
                  formatValue={formatPaise}
                />
              </ChartCard>
              <ChartCard title="Breakdown">
                {/* Mobile View: Cards */}
                <div className="grid gap-2.5 md:hidden p-1">
                  {data.byCategory.map((c) => (
                    <div
                      key={c.category}
                      className="active-bounce flex items-center justify-between rounded-xl border border-border-default bg-bg-surface p-3 shadow-xs"
                    >
                      <div>
                        <p className="font-semibold text-text-primary text-sm">
                          {c.category} {c.system ? <span className="text-xs font-normal text-text-secondary">(auto)</span> : null}
                        </p>
                        <p className="text-[11px] text-text-secondary">{c.system ? "Auto generated" : `${c.count} entries`}</p>
                      </div>
                      <p className="font-display text-base font-bold text-text-primary tabular-nums">{formatPaise(c.total)}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Category</TableHeaderCell>
                          <TableHeaderCell>Entries</TableHeaderCell>
                          <TableHeaderCell>Amount</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.byCategory.map((c) => (
                          <TableRow key={c.category}>
                            <TableCell className="font-medium">
                              {c.category}
                              {c.system ? <span className="ml-2 text-xs text-text-secondary">(auto)</span> : null}
                            </TableCell>
                            <TableCell className="text-text-secondary">{c.system ? "—" : c.count}</TableCell>
                            <TableCell>{formatPaise(c.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </ChartCard>
            </div>
          )}
        </div>
      )}

      <FinanceEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} type={isIncome ? "INCOME" : "EXPENSE"} />
    </div>
  );
}
