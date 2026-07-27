import { Lock, Unlock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useChitGroups, useCycles } from "@/features/chit-groups/use-chit-groups";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPaise } from "@/lib/format";
import { CycleStatusBadge } from "./components/auction-badges";
import { AuditTrail } from "./components/audit-trail";
import { BidPanel } from "./components/bid-panel";
import { SettlementSummary } from "./components/settlement-summary";
import { WinnerSelection } from "./components/winner-selection";
import { useAuctionState, useBids, useCloseBidding, useOpenBidding } from "./use-auctions";

export function AuctionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("auction.manage");

  const { data: groups } = useChitGroups("ACTIVE");
  const [groupId, setGroupId] = useState("");
  const { data: cycles } = useCycles(groupId || undefined, Boolean(groupId));
  const [cycleId, setCycleId] = useState("");

  const { data: state, isLoading } = useAuctionState(cycleId || undefined);
  const { data: bids } = useBids(cycleId || undefined);

  const openBidding = useOpenBidding(cycleId);
  const closeBidding = useCloseBidding(cycleId);

  function selectGroup(next: string) {
    setGroupId(next);
    setCycleId("");
  }

  const status = state?.cycle.status;

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Auctions</h1>
        <p className="text-sm text-text-secondary">
          Run each cycle's auction — take bids, pick the winner, settle the prize, and archive the minutes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Chit group</p>
          <Select value={groupId} onValueChange={selectGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Select an active chit group" />
            </SelectTrigger>
            <SelectContent>
              {(groups?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Cycle</p>
          <Select value={cycleId} onValueChange={setCycleId} disabled={!groupId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cycle" />
            </SelectTrigger>
            <SelectContent>
              {(cycles?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  Cycle #{c.cycleNumber} · {formatDate(c.scheduledDate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!cycleId ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">Select a chit group and cycle to run its auction.</p>
        </div>
      ) : isLoading || !state ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-default bg-bg-surface px-5 py-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl font-semibold text-text-primary">Cycle #{state.cycle.cycleNumber}</h2>
                <CycleStatusBadge status={state.cycle.status} />
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {formatDate(state.cycle.scheduledDate)} · Pot {formatPaise(state.cycle.potAmount)} ·{" "}
                {state.chitGroup.allotmentMethod === "LOTTERY" ? "Lottery" : "Auction"} scheme
              </p>
            </div>
            {canManage ? (
              <div className="flex gap-2">
                {status === "SCHEDULED" ? (
                  <Button variant="outline" disabled={openBidding.isPending} onClick={() => void openBidding.mutateAsync()}>
                    <Unlock size={15} /> Open bidding
                  </Button>
                ) : null}
                {status === "BIDDING_OPEN" ? (
                  <Button variant="outline" disabled={closeBidding.isPending} onClick={() => void closeBidding.mutateAsync()}>
                    <Lock size={15} /> Close bidding
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {status === "SETTLED" ? (
            <SettlementSummary state={state} />
          ) : (
            canManage && <WinnerSelection state={state} bids={bids ?? []} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Bids</CardTitle>
            </CardHeader>
            <CardContent>
              <BidPanel state={state} bids={bids ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTrail cycleId={cycleId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
