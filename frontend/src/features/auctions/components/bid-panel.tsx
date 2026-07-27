import { Gavel, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ApiError } from "@/lib/api-client";
import { formatPaise } from "@/lib/format";
import { BidStatusBadge } from "./auction-badges";
import type { AuctionState, Bid } from "../types";
import { useRecordBid, useWithdrawBid } from "../use-auctions";

interface Props {
  state: AuctionState;
  bids: Bid[];
}

export function BidPanel({ state, bids }: Props) {
  const { hasPermission } = useAuth();
  const canBid = hasPermission("auction.record_bid");
  const cycleId = state.cycle.id;
  const biddingOpen = state.cycle.status === "BIDDING_OPEN";

  const recordBid = useRecordBid(cycleId);
  const withdrawBid = useWithdrawBid(cycleId);

  const [membershipId, setMembershipId] = useState("");
  const [discount, setDiscount] = useState("");

  const potRupees = state.cycle.potAmount / 100;
  const minRupees = Math.round((potRupees * state.chitGroup.minBidDiscountPercent) / 100);
  const maxRupees = Math.round((potRupees * state.chitGroup.maxBidDiscountPercent) / 100);

  async function handleRecord() {
    await recordBid.mutateAsync({ chitMembershipId: membershipId, discountRupees: Number(discount) });
    setMembershipId("");
    setDiscount("");
  }

  return (
    <div className="flex flex-col gap-4">
      {canBid && biddingOpen ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-raised p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Member" htmlFor="bid-member">
                <Select value={membershipId} onValueChange={setMembershipId}>
                  <SelectTrigger id="bid-member" className="w-full sm:w-56">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.eligibleMembers.map((m) => {
                      const isUnpaid = m.hasPaidCurrentCycle === false;
                      return (
                        <SelectItem key={m.membershipId} value={m.membershipId} disabled={isUnpaid}>
                          #{m.ticketNumber} · {m.name} {isUnpaid ? "⚠️ (Payment Pending - Ineligible)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex-1 sm:w-40">
              <Field
                label="Discount (₹)"
                htmlFor="bid-discount"
                helpText={`Allowed ${formatPaise(minRupees * 100)} – ${formatPaise(maxRupees * 100)}`}
              >
                <Input
                  id="bid-discount"
                  type="number"
                  className="w-full"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
            </div>
            <Button
              disabled={!membershipId || !discount || recordBid.isPending}
              onClick={() => void handleRecord()}
              className="active-bounce w-full sm:w-auto"
            >
              <Gavel size={15} /> {recordBid.isPending ? "Recording…" : "Record bid"}
            </Button>
          </div>
          {/* Quick Increment Pills on Mobile */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-medium text-text-secondary">Quick add:</span>
            {[500, 1000, 2000, 5000].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => {
                  const curr = Number(discount) || minRupees;
                  const next = Math.min(curr + inc, maxRupees);
                  setDiscount(String(next));
                }}
                className="active-bounce rounded-md border border-border-default bg-bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary hover:bg-brand-50 hover:text-accent-primary"
              >
                +₹{inc.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {recordBid.isError ? (
        <p className="text-sm text-bad-fg">
          {recordBid.error instanceof ApiError ? recordBid.error.message : "Something went wrong"}
        </p>
      ) : null}

      {bids.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-10 text-center">
          <p className="text-sm text-text-secondary">No bids recorded for this cycle yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Bids Card List */}
          <div className="grid gap-2.5 md:hidden">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface p-3.5 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent-primary bg-brand-50 px-2 py-0.5 rounded-md">
                      #{bid.chitMembershipId.ticketNumber}
                    </span>
                    <span className="font-semibold text-text-primary text-sm">
                      {bid.chitMembershipId.memberId.name}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-base font-bold text-text-primary">
                    {formatPaise(bid.discountAmount)} <span className="text-xs font-sans font-normal text-text-secondary">({bid.discountPercent}%)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BidStatusBadge status={bid.status} />
                  {canBid && biddingOpen && bid.status === "ACTIVE" ? (
                    <button
                      type="button"
                      aria-label="Withdraw bid"
                      className="p-1.5 text-text-secondary hover:text-bad-fg"
                      onClick={() => void withdrawBid.mutateAsync(bid.id)}
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Bids Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Ticket</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Discount</TableHeaderCell>
                    <TableHeaderCell>%</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    {canBid && biddingOpen ? <TableHeaderCell /> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bids.map((bid) => (
                    <TableRow key={bid.id}>
                      <TableCell className="font-mono">#{bid.chitMembershipId.ticketNumber}</TableCell>
                      <TableCell className="font-medium">{bid.chitMembershipId.memberId.name}</TableCell>
                      <TableCell>{formatPaise(bid.discountAmount)}</TableCell>
                      <TableCell className="text-text-secondary">{bid.discountPercent}%</TableCell>
                      <TableCell>
                        <BidStatusBadge status={bid.status} />
                      </TableCell>
                      {canBid && biddingOpen ? (
                        <TableCell className="text-right">
                          {bid.status === "ACTIVE" ? (
                            <button
                              type="button"
                              aria-label="Withdraw bid"
                              className="text-text-secondary hover:text-bad-fg"
                              onClick={() => void withdrawBid.mutateAsync(bid.id)}
                            >
                              <X size={16} />
                            </button>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}
    </div>
  );
}
