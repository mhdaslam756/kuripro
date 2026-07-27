import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPaise } from "@/lib/format";
import { useChitReport } from "../use-chit-groups";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ReportsTab({ chitGroupId }: { chitGroupId: string }) {
  const { data: report, isLoading } = useChitReport(chitGroupId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!report) return <p className="text-sm text-bad-fg">Couldn't load the report.</p>;

  const { chitGroup, roster, cycles, financials } = report;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-text-primary">Scheme summary</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Chit value" value={formatPaise(chitGroup.chitValue)} sub={`${chitGroup.frequencyLabel} · ${chitGroup.totalMembers} members`} />
          <Stat label="Installment / cycle" value={formatPaise(chitGroup.installmentAmount)} />
          <Stat label="Commission" value={`${chitGroup.foremanCommissionPercent}%`} sub={chitGroup.allotmentMethod} />
          <Stat label="Runs" value={`${formatDate(chitGroup.startDate)}`} sub={`to ${formatDate(chitGroup.endDate)}`} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-text-primary">Roster &amp; progress</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Seats filled" value={`${roster.enrolled} / ${chitGroup.totalMembers}`} sub={`${roster.seatsRemaining} remaining`} />
          <Stat label="Cycles generated" value={`${cycles.scheduled} / ${cycles.total}`} />
          <Stat label="Cycles settled" value={String(cycles.settled)} />
          <Stat label="Current cycle" value={cycles.currentCycleNumber ? `#${cycles.currentCycleNumber}` : "—"} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-text-primary">Financials to date</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Max commission / cycle" value={formatPaise(financials.maxCommissionPerCycle)} />
          <Stat label="Commission collected" value={formatPaise(financials.commissionCollectedToDate)} />
          <Stat label="Prizes disbursed" value={formatPaise(financials.prizesDisbursedToDate)} />
          <Stat label="Dividend distributed" value={formatPaise(financials.dividendDistributedToDate)} />
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Collection &amp; outstanding figures populate once the Payments module records live installment data.
        </p>
      </section>
    </div>
  );
}
