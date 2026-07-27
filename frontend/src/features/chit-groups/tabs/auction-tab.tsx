import { Gavel, Shuffle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize } from "@/lib/format";
import type { ChitGroup } from "../types";

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-default py-2.5 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export function AuctionTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { auctionRules } = chitGroup;
  const isAuction = auctionRules.allotmentMethod === "AUCTION";

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        {isAuction ? <Gavel size={18} className="text-accent-primary" /> : <Shuffle size={18} className="text-accent-primary" />}
        <CardTitle>{isAuction ? "Auction rules" : "Lottery allotment"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Rule label="Allotment method" value={humanize(auctionRules.allotmentMethod)} />
        <Rule label="Foreman commission" value={`${auctionRules.foremanCommissionPercent}%`} />
        {isAuction ? (
          <>
            <Rule label="Minimum bid discount" value={`${auctionRules.minBidDiscountPercent}%`} />
            <Rule label="Maximum bid discount (statutory cap)" value={`${auctionRules.maxBidDiscountPercent}%`} />
            <Rule label="Minimum bid increment" value={`${auctionRules.bidIncrementPercent}%`} />
          </>
        ) : (
          <p className="pt-3 text-sm text-text-secondary">
            Each cycle's winner is drawn at random from members who haven't yet won. Bid discount rules don't apply.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
