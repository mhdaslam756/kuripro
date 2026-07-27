import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatPaise } from "@/lib/format";
import { DonutChart } from "../charts/donut-chart";
import { ChartCard, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { ProfitReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function ProfitTab({ range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<ProfitReport>("profit", params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("profit", f, params)} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total income" value={formatPaise(data.totalIncome)} tone="text-good-fg" />
            <StatTile label="Total expense" value={formatPaise(data.totalExpense)} tone="text-bad-fg" />
            <StatTile
              label="Net profit"
              value={formatPaise(data.netProfit)}
              tone={data.netProfit >= 0 ? "text-good-fg" : "text-bad-fg"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Income vs expense">
              <DonutChart
                data={[
                  { label: "Income", value: data.totalIncome },
                  { label: "Expense", value: data.totalExpense },
                ]}
                centerValue={formatPaise(data.netProfit)}
                centerLabel="Net profit"
                formatValue={formatPaise}
              />
            </ChartCard>
            <ChartCard title="Profit & loss statement">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Section</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.incomeByCategory.map((c) => (
                      <TableRow key={`i-${c.category}`}>
                        <TableCell className="text-good-fg">Income</TableCell>
                        <TableCell className="font-medium">{c.category}</TableCell>
                        <TableCell className="text-good-fg">{formatPaise(c.total)}</TableCell>
                      </TableRow>
                    ))}
                    {data.expenseByCategory.map((c) => (
                      <TableRow key={`e-${c.category}`}>
                        <TableCell className="text-bad-fg">Expense</TableCell>
                        <TableCell className="font-medium">{c.category}</TableCell>
                        <TableCell className="text-bad-fg">({formatPaise(c.total)})</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold" />
                      <TableCell className="font-semibold text-text-primary">Net profit</TableCell>
                      <TableCell className={`font-semibold ${data.netProfit >= 0 ? "text-good-fg" : "text-bad-fg"}`}>
                        {formatPaise(data.netProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
