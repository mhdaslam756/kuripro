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
  );
}
