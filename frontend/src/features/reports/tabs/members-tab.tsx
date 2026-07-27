import { Skeleton } from "@/components/ui/skeleton";
import { humanize } from "@/lib/format";
import { DonutChart } from "../charts/donut-chart";
import { ChartCard, ReportToolbar, StatTile, type DateRange } from "../components/report-shared";
import type { MembersReport } from "../types";
import { downloadReport, useReport } from "../use-reports";

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function MembersTab({ range, onRangeChange }: Props) {
  const { data, isLoading } = useReport<MembersReport>("members", {});

  return (
    <div>
      <ReportToolbar range={range} onChange={onRangeChange} onExport={(f) => downloadReport("members", f, {})} showDates={false} />
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Total members" value={String(data.total)} />
            <StatTile label="Active" value={String(data.byStatus.find((s) => s.key === "ACTIVE")?.count ?? 0)} tone="text-good-fg" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="By status">
              <DonutChart data={data.byStatus.map((s) => ({ label: humanize(s.key), value: s.count }))} />
            </ChartCard>
            <ChartCard title="By KYC">
              <DonutChart data={data.byKyc.map((s) => ({ label: humanize(s.key), value: s.count }))} />
            </ChartCard>
            <ChartCard title="By risk band">
              <DonutChart data={data.byRisk.map((s) => ({ label: humanize(s.key), value: s.count }))} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
