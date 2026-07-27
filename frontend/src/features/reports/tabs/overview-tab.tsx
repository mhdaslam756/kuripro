import { Skeleton } from "@/components/ui/skeleton";
import { formatPaise } from "@/lib/format";
import { AreaChart } from "../charts/area-chart";
import { DonutChart } from "../charts/donut-chart";
import { ChartCard, EmptyReport, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { MonthlyReport } from "../types";
import { downloadReport, useReport, type ReportParams } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function OverviewTab({ range, onRangeChange }: Props) {
  const params: ReportParams = { from: range.from || undefined, to: range.to || undefined };
  const { data, isLoading } = useReport<MonthlyReport>("monthly", params);

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("monthly", f, params)} />

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Collections" value={formatPaise(data.collections.total)} sub={`${data.collections.count} receipts`} />
            <StatTile label="Prize disbursed" value={formatPaise(data.disbursed)} />
            <StatTile label="Total income" value={formatPaise(data.totalIncome)} sub={`incl. ${formatPaise(data.commissionIncome)} commission`} tone="text-good-fg" />
            <StatTile label="Net profit" value={formatPaise(data.netProfit)} tone={data.netProfit >= 0 ? "text-good-fg" : "text-bad-fg"} />
            <StatTile label="Expenses" value={formatPaise(data.expense)} tone="text-bad-fg" />
            <StatTile label="New members" value={String(data.newMembers)} />
            <StatTile label="Auctions settled" value={String(data.auctionsSettled)} />
            <StatTile label="Other income" value={formatPaise(data.otherIncome)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Collections trend">
              {data.collectionsByDay.length === 0 ? (
                <EmptyReport />
              ) : (
                <AreaChart
                  data={data.collectionsByDay.map((d) => ({ label: d.day, value: d.total }))}
                  formatValue={formatPaise}
                />
              )}
            </ChartCard>
            <ChartCard title="Income vs expense">
              <DonutChart
                data={[
                  { label: "Income", value: data.totalIncome },
                  { label: "Expense", value: data.expense },
                ]}
                centerValue={formatPaise(data.netProfit)}
                centerLabel="Net"
                formatValue={formatPaise}
              />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
