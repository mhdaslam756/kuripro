import { Award, Dices, TrendingDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/format";
import type { AuctionState, Bid, WinnerSelectionMethod } from "../types";
import { useSettle } from "../use-auctions";

interface Props {
  state: AuctionState;
  bids: Bid[];
}

const METHODS: { value: WinnerSelectionMethod; label: string; icon: typeof Award; hint: string }[] = [
  { value: "LOWEST_BID", label: "Lowest Bid", icon: TrendingDown, hint: "Highest discount wins automatically" },
  { value: "MANUAL", label: "Manual Winner", icon: Award, hint: "Declare a specific member" },
  { value: "LOTTERY", label: "Lucky Draw", icon: Dices, hint: "Random draw among non-winners" },
];

export function WinnerSelection({ state, bids }: Props) {
  const settle = useSettle(state.cycle.id);
  const [method, setMethod] = useState<WinnerSelectionMethod>(
    state.chitGroup.allotmentMethod === "LOTTERY" ? "LOTTERY" : "LOWEST_BID",
  );
  const [manualMembershipId, setManualMembershipId] = useState("");

  const activeBids = bids.filter((b) => b.status === "ACTIVE");
  const topBid = activeBids[0]; // backend sorts by highest discount first
  const manualBid = activeBids.find((b) => b.chitMembershipId._id === manualMembershipId);

  async function handleSettle() {
    if (method === "MANUAL") {
      await settle.mutateAsync({
        method,
        winnerMembershipId: manualMembershipId,
        winningBidId: manualBid?.id,
      });
    } else {
      await settle.mutateAsync({ method });
    }
  }

  const canSettle =
    method === "MANUAL" ? Boolean(manualMembershipId) : method === "LOWEST_BID" ? Boolean(topBid) : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select winner</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border px-3 py-4 text-center transition-colors",
                method === value
                  ? "border-accent-primary bg-brand-50 text-accent-primary"
                  : "border-border-default text-text-secondary hover:bg-bg-raised",
              )}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-text-secondary">{hint}</span>
            </button>
          ))}
        </div>

        {method === "LOWEST_BID" ? (
          topBid ? (
            <p className="rounded-md border border-good-border bg-good-bg px-3 py-2 text-sm text-good-fg">
              Winner: #{topBid.chitMembershipId.ticketNumber} {topBid.chitMembershipId.memberId.name} — discount{" "}
              {formatPaise(topBid.discountAmount)}
            </p>
          ) : (
            <p className="rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              No active bids. Record a bid, or pick a winner manually / by lucky draw.
            </p>
          )
        ) : null}

        {method === "MANUAL" ? (
          <div className="flex flex-col gap-2">
            <Select value={manualMembershipId} onValueChange={setManualMembershipId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the winning member" />
              </SelectTrigger>
              <SelectContent>
                {state.eligibleMembers.map((m) => {
                  const isUnpaid = m.hasPaidCurrentCycle === false;
                  return (
                    <SelectItem key={m.membershipId} value={m.membershipId} disabled={isUnpaid}>
                      #{m.ticketNumber} · {m.name}
                      {isUnpaid ? " ⚠️ (Payment Pending - Ineligible)" : m.hasActiveBid ? " (has bid)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {manualBid ? (
              <p className="text-xs text-text-secondary">
                Their recorded bid of {formatPaise(manualBid.discountAmount)} will be used as the discount.
              </p>
            ) : manualMembershipId ? (
              <p className="text-xs text-text-secondary">
                No bid from this member — prize will be the pot minus foreman commission (no dividend).
              </p>
            ) : null}
          </div>
        ) : null}

        {method === "LOTTERY" ? (
          <p className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-secondary">
            A winner will be drawn at random from the {state.eligibleMembers.length} members who haven't won yet. Prize =
            pot minus foreman commission.
          </p>
        ) : null}

        {settle.isError ? (
          <p className="text-sm text-bad-fg">
            {settle.error instanceof ApiError ? settle.error.message : "Something went wrong"}
          </p>
        ) : null}

        <div>
          <Button disabled={!canSettle || settle.isPending} onClick={() => void handleSettle()}>
            {settle.isPending ? "Settling…" : "Settle cycle"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
