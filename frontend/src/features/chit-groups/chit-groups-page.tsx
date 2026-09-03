import { ChevronRight, Landmark, Plus } from "lucide-react";
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
import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet";
import { MobileEmptyState, MobileErrorState } from "@/components/mobile/mobile-states";
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useChitGroups(status === ALL ? undefined : status);
  const canCreate = hasPermission("chit_group.create");

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Chit Schemes</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">Create and manage chit schemes of any cadence or group size.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="hidden sm:block">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by status" />
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
          </div>
          {canCreate ? (
            <Button onClick={() => setFormOpen(true)} className="rounded-xl font-semibold gap-1.5 active-bounce">
              <Plus size={16} /> New Chit Group
            </Button>
          ) : null}
        </div>
      </div>

        {/* Mobile Filter Bar */}
        <div className="mb-4 flex items-center justify-between gap-2 sm:hidden">
          <p className="text-xs font-semibold text-text-secondary">
            Showing {data?.items.length ?? 0} scheme{(data?.items.length ?? 0) === 1 ? "" : "s"}
          </p>
          <MobileFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            activeCount={status !== ALL ? 1 : 0}
            onReset={() => setStatus(ALL)}
          >
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Scheme Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
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
            </div>
          </MobileFilterSheet>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : isError || !data ? (
          <MobileErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <MobileEmptyState
            icon={<Landmark size={32} />}
            title="No chit groups found"
            description="Create your first chit scheme to start managing group members and auctions."
            action={
              canCreate ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus size={15} /> Create First Group
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile View: Chit Group Native Cards (< md) */}
            <div className="grid gap-3.5 md:hidden">
              {data.items.map((chit) => (
                <div
                  key={chit.id}
                  onClick={() => navigate(`/chit-groups/${chit.id}`)}
                  className="active:scale-[0.98] flex flex-col justify-between rounded-2xl border border-border-default/80 bg-bg-surface p-4 shadow-xs transition-all active:bg-bg-raised"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-text-primary text-base leading-snug">{chit.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">{chit.registrationNumber}</p>
                    </div>
                    <ChitStatusBadge status={chit.status} />
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-border-default/60 pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Chit Value</p>
                      <p className="font-display text-xl font-bold tabular-nums text-accent-primary">
                        {formatPaise(chit.chitValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-accent-primary border border-brand-200/50">
                        {chit.totalMembers} seats · {FREQUENCY_LABELS[chit.frequency]}
                      </span>
                      <p className="mt-1 text-[11px] text-text-secondary flex items-center justify-end gap-1">
                        Starts {formatDate(chit.startDate)}
                        <ChevronRight size={14} className="text-text-secondary shrink-0" />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Data Table (>= md) */}
            <div className="hidden md:block">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name & Reg. No.</TableHeaderCell>
                      <TableHeaderCell>Value</TableHeaderCell>
                      <TableHeaderCell>Members</TableHeaderCell>
                      <TableHeaderCell>Cadence</TableHeaderCell>
                      <TableHeaderCell>Start Date</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((chit) => (
                      <TableRow key={chit.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => navigate(`/chit-groups/${chit.id}`)}>
                        <TableCell className="font-medium">
                          <span className="font-semibold text-text-primary">{chit.name}</span>
                          <span className="ml-2 font-mono text-xs text-text-secondary">{chit.registrationNumber}</span>
                        </TableCell>
                        <TableCell className="font-bold text-accent-primary">{formatPaise(chit.chitValue)}</TableCell>
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
