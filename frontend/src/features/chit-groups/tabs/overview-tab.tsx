import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { ChitGroupFormDialog } from "../components/chit-group-form-dialog";
import { FREQUENCY_LABELS, type ChitGroup } from "../types";
import { useActivateChitGroup, useChitMembers } from "../use-chit-groups";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
    </div>
  );
}

export function OverviewTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const activate = useActivateChitGroup(chitGroup.id);
  const { data: roster } = useChitMembers(chitGroup.id);

  const items = roster?.items ?? [];
  const totalShares = items.reduce(
    (sum, m) => sum + (m.share ?? (m.shareType === "HALF" ? 0.5 : 1)),
    0,
  );
  const enrolledCount = items.length;
  const rosterFull = totalShares >= chitGroup.totalMembers - 0.001;
  const canActivate = hasPermission("chit_group.activate") && chitGroup.status === "DRAFT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {hasPermission("chit_group.update") ? (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        ) : null}
        {canActivate ? (
          <Button disabled={!rosterFull || activate.isPending} onClick={() => void activate.mutateAsync()}>
            {activate.isPending ? "Activating…" : "Activate scheme"}
          </Button>
        ) : null}
      </div>

      {chitGroup.status === "DRAFT" && !rosterFull ? (
        <p className="rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          Roster is {totalShares}/{chitGroup.totalMembers} slots filled ({enrolledCount} members). Fill all {chitGroup.totalMembers} slots before activating.
        </p>
      ) : null}

      {activate.isError ? (
        <p className="text-sm text-bad-fg">
          {activate.error instanceof ApiError ? activate.error.message : "Something went wrong"}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scheme</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Registration no." value={chitGroup.registrationNumber} />
              <Detail label="Chit value" value={formatPaise(chitGroup.chitValue)} />
              <Detail label="Total slots" value={String(chitGroup.totalMembers)} />
              <Detail label="Installment / cycle" value={formatPaise(chitGroup.installmentAmount)} />
              <Detail label="Allotment" value={humanize(chitGroup.auctionRules.allotmentMethod)} />
              <Detail label="Commission" value={`${chitGroup.auctionRules.foremanCommissionPercent}%`} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail
                label="Cadence"
                value={
                  chitGroup.frequency === "CUSTOM"
                    ? `Every ${chitGroup.customIntervalDays} days`
                    : FREQUENCY_LABELS[chitGroup.frequency]
                }
              />
              <Detail label="Duration" value={`${chitGroup.totalMembers} cycles`} />
              <Detail label="Start date" value={formatDate(chitGroup.startDate)} />
              <Detail label="End date" value={formatDate(chitGroup.endDate)} />
              <Detail label="Roster" value={`${totalShares} / ${chitGroup.totalMembers} slots (${enrolledCount} members)`} />
              <Detail label="Current cycle" value={chitGroup.currentCycleNumber ? `#${chitGroup.currentCycleNumber}` : "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <ChitGroupFormDialog open={editOpen} onOpenChange={setEditOpen} chitGroup={chitGroup} />
    </div>
  );
}
