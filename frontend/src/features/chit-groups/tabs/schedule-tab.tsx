import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { CycleStatusBadge } from "../components/chit-badges";
import type { ChitGroup } from "../types";
import { useCycles, useSchedule } from "../use-chit-groups";

export function ScheduleTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { data: schedule, isLoading } = useSchedule(chitGroup.id);
  const isActive = chitGroup.status !== "DRAFT";
  const { data: cycles } = useCycles(chitGroup.id, isActive);

  const cycleByNumber = new Map((cycles?.items ?? []).map((c) => [c.cycleNumber, c]));

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Every member pays {formatPaise(chitGroup.installmentAmount)} each cycle. {isActive
          ? "Live cycle status is shown once the scheme is active."
          : "Cycles are generated when the scheme is activated."}
      </p>
      {/* Mobile View: Cards */}
      <div className="grid gap-3 md:hidden">
        {(schedule ?? []).map((entry) => {
          const cycle = cycleByNumber.get(entry.cycleNumber);
          return (
            <div
              key={entry.cycleNumber}
              className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-accent-primary">
                    Cycle #{entry.cycleNumber}
                  </span>
                  <p className="mt-1 text-xs font-medium text-text-secondary">
                    Date: {formatDate(entry.scheduledDate)}
                  </p>
                </div>
                {isActive && cycle ? <CycleStatusBadge status={cycle.status} /> : null}
              </div>

              <div className="mt-3 flex items-end justify-between border-t border-border-default/60 pt-2.5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Installment</p>
                  <p className="font-display text-base font-bold text-text-primary">{formatPaise(entry.baseInstallment)}</p>
                </div>
                {isActive && cycle?.prizeAmount ? (
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-good-fg">Prize Won</p>
                    <p className="font-display text-base font-bold text-good-fg">{formatPaise(cycle.prizeAmount)}</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Cycle</TableHeaderCell>
                <TableHeaderCell>Scheduled date</TableHeaderCell>
                <TableHeaderCell>Base installment</TableHeaderCell>
                {isActive ? <TableHeaderCell>Status</TableHeaderCell> : null}
                {isActive ? <TableHeaderCell>Prize</TableHeaderCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {(schedule ?? []).map((entry) => {
                const cycle = cycleByNumber.get(entry.cycleNumber);
                return (
                  <TableRow key={entry.cycleNumber}>
                    <TableCell className="font-medium">#{entry.cycleNumber}</TableCell>
                    <TableCell>{formatDate(entry.scheduledDate)}</TableCell>
                    <TableCell>{formatPaise(entry.baseInstallment)}</TableCell>
                    {isActive ? (
                      <TableCell>{cycle ? <CycleStatusBadge status={cycle.status} /> : "—"}</TableCell>
                    ) : null}
                    {isActive ? <TableCell>{cycle?.prizeAmount ? formatPaise(cycle.prizeAmount) : "—"}</TableCell> : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
