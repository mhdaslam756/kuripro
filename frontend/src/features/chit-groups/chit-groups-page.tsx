import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { ChitStatusBadge } from "./components/chit-badges";
import { ChitGroupFormDialog } from "./components/chit-group-form-dialog";
import { CHIT_GROUP_STATUSES, FREQUENCY_LABELS } from "./types";
import { useChitGroups } from "./use-chit-groups";

const ALL = "__all__";

export function ChitGroupsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError } = useChitGroups(status === ALL ? undefined : status);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Chit Groups</h1>
          <p className="text-sm text-text-secondary">Create and run unlimited chit schemes of any cadence.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CHIT_GROUP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasPermission("chit_group.create") ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> New chit group
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load chit groups. Please try again.</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">No chit groups yet. Create your first scheme to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Chit Group Cards */}
          <div className="grid gap-3.5 md:hidden">
            {data.items.map((chit) => (
              <div
                key={chit.id}
                onClick={() => navigate(`/chit-groups/${chit.id}`)}
                className="active-bounce flex flex-col justify-between rounded-xl border border-border-default bg-bg-surface p-4.5 shadow-xs hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-text-primary text-base leading-snug">{chit.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-text-secondary">{chit.registrationNumber}</p>
                  </div>
                  <ChitStatusBadge status={chit.status} />
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-border-default/60 pt-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Chit Value</p>
                    <p className="font-display text-xl font-bold tabular-nums text-text-primary">
                      {formatPaise(chit.chitValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-accent-primary">
                      {chit.totalMembers} members · {FREQUENCY_LABELS[chit.frequency]}
                    </span>
                    <p className="mt-1 text-[11px] text-text-secondary">Starts {formatDate(chit.startDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Data Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Value</TableHeaderCell>
                    <TableHeaderCell>Members</TableHeaderCell>
                    <TableHeaderCell>Cadence</TableHeaderCell>
                    <TableHeaderCell>Start</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((chit) => (
                    <TableRow key={chit.id} className="cursor-pointer" onClick={() => navigate(`/chit-groups/${chit.id}`)}>
                      <TableCell className="font-medium">
                        {chit.name}
                        <span className="ml-2 font-mono text-xs text-text-secondary">{chit.registrationNumber}</span>
                      </TableCell>
                      <TableCell>{formatPaise(chit.chitValue)}</TableCell>
                      <TableCell>{chit.totalMembers}</TableCell>
                      <TableCell className="text-text-secondary">{FREQUENCY_LABELS[chit.frequency]}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(chit.startDate)}</TableCell>
                      <TableCell>
                        <ChitStatusBadge status={chit.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}

      <ChitGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => navigate(`/chit-groups/${id}`)}
      />
    </div>
  );
}
