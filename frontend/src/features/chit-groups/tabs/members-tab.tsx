import { AlertCircle, Lock, MessageSquare, Trash2, Trophy, UserPlus, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { openWhatsAppChat } from "@/features/collections/components/whatsapp-reminder-dialog";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AssignMembersDialog } from "../components/assign-members-dialog";
import type { ChitGroup, ChitMembership, ChitMembershipMember } from "../types";
import { useChitMembers, useRemoveMember } from "../use-chit-groups";

/**
 * Safely extract member details from a ChitMembership record.
 *
 * The backend may return `memberId` as:
 * - A populated object with `id` (toJSON-transformed) and/or `_id`
 * - A plain string ObjectId (when not populated)
 *
 * And the membership itself may have `id` and/or `_id`.
 */
function parseMember(membership: ChitMembership) {
  const raw = membership.memberId;
  let memberId = "";
  let name = "Member";
  let memberCode = "";
  let phone = "";

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as ChitMembershipMember;
    memberId = obj.id || obj._id || "";
    name = obj.name || "Member";
    memberCode = obj.memberCode || "";
    phone = obj.phone || "";
  } else if (typeof raw === "string") {
    memberId = raw;
  }

  const membershipId = membership.id || (membership as any)._id || "";

  return { memberId, membershipId, name, memberCode, phone };
}

export function MembersTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { hasPermission, user } = useAuth();
  const { data: roster, isLoading, isError } = useChitMembers(chitGroup.id);
  const removeMember = useRemoveMember(chitGroup.id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isMemberRole = user?.role?.slug === "MEMBER";
  const isNotStarted = chitGroup.status === "DRAFT";
  const canAssign = hasPermission("chit_group.enroll_member") && isNotStarted;
  const canRemove = hasPermission("chit_group.enroll_member") && isNotStarted;
  const items = roster?.items ?? [];
  const totalEnrolledShares = items.reduce(
    (sum, m) => sum + (m.share ?? (m.shareType === "HALF" ? 0.5 : 1)),
    0,
  );
  const seatsRemaining = Math.max(0, chitGroup.totalMembers - totalEnrolledShares);
  const hasSharedSlots = items.some(
    (m) => m.shareType === "HALF" || (m.share !== undefined && m.share < 1),
  );

  // Build the set of enrolled member ids for the assign dialog
  const enrolledMemberIds = new Set(
    items.map((m) => {
      const { memberId } = parseMember(m);
      return memberId;
    }).filter(Boolean)
  );

  async function handleConfirmRemove() {
    if (!memberToRemove) return;
    setRemoveError(null);
    try {
      await removeMember.mutateAsync(memberToRemove.id);
      setMemberToRemove(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setRemoveError(err.message);
      } else {
        setRemoveError("Failed to remove member from group.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: seat info + assign button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">
              Group Slots &amp; Members
            </p>
            {hasSharedSlots ? (
              <Badge variant="neutral" className="text-[10px] font-medium bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                50/50 Shared Slots Enabled
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {totalEnrolledShares} of {chitGroup.totalMembers} slots filled ({items.length} {items.length === 1 ? "member" : "members"})
            {seatsRemaining > 0 ? ` · ${seatsRemaining} slot${seatsRemaining === 1 ? "" : "s"} capacity remaining` : " · all slots filled"}
          </p>
        </div>
        {canAssign ? (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus size={15} /> {seatsRemaining > 0 ? "Assign members / slots" : "Manage Roster"}
          </Button>
        ) : (
          <Badge variant="neutral" className="gap-1.5 px-2.5 py-1 text-xs text-text-secondary border-border-default">
            <Lock size={13} className="text-text-secondary" /> Roster Locked (Chit Started)
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="rounded-md border border-bad-border/60 bg-bad-bg/10 px-4 py-8 text-center">
          <p className="text-sm text-bad-fg">Couldn't load members. Please try again.</p>
        </div>
      ) : isMemberRole ? (
        <div className="rounded-md border border-border-default bg-bg-surface px-4 py-8 text-center">
          <p className="text-sm text-text-secondary">{totalEnrolledShares} of {chitGroup.totalMembers} slots filled in this group ({items.length} members).</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-12 text-center flex flex-col items-center gap-2">
          <p className="text-sm text-text-secondary">No members assigned yet.</p>
          {canAssign ? (
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="mt-1">
              <UserPlus size={14} /> Assign members now
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Mobile View: Touch-Friendly Member Cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((membership, idx) => {
              const { memberId: memberIdStr, membershipId, name, memberCode, phone } = parseMember(membership);
              const keyId = membershipId || `ticket-${membership.ticketNumber}-${idx}`;
              const isHalf = membership.shareType === "HALF" || (membership.share !== undefined && membership.share < 1);
              const ticketLabel = `#${membership.ticketNumber}${membership.subTicket || ""}`;
              const memberInstallment = Math.round(chitGroup.installmentAmount * (membership.share ?? (isHalf ? 0.5 : 1)));

              return (
                <div
                  key={keyId}
                  className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-bold text-accent-primary">
                        {(name.trim().charAt(0) || "M").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-accent-primary">
                            {ticketLabel}
                          </span>
                          {isHalf ? (
                            <Badge variant="neutral" className="text-[10px] py-0 font-medium bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                              ½ Half
                            </Badge>
                          ) : null}
                          {memberIdStr ? (
                            <Link to={`/members/${memberIdStr}`} className="font-semibold text-text-primary text-base hover:text-accent-primary">
                              {name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-text-primary text-base">{name}</span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-text-secondary">
                          {memberCode ? `${memberCode} · ` : ""}{phone || "No phone"} · ₹{(memberInstallment / 100).toLocaleString("en-IN")}/mo
                        </p>
                      </div>
                    </div>
                    {membership.hasWon ? (
                      <Badge variant="info" className="gap-1 text-[11px] px-2 py-0.5">
                        <Trophy size={11} /> Won
                      </Badge>
                    ) : (
                      <Badge variant={membership.status === "ACTIVE" ? "success" : "danger"} className="text-[11px] px-2 py-0.5">
                        {membership.status}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-border-default/60 pt-3">
                    {phone ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="WhatsApp member"
                        className="h-9 px-3 text-xs font-semibold border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl gap-1"
                        onClick={() => openWhatsAppChat(phone, `Hi ${name}, this is regarding ${chitGroup.name}.`)}
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </Button>
                    ) : null}
                    {memberIdStr ? (
                      <Link to={`/members/${memberIdStr}?tab=payments`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs font-semibold h-9 rounded-xl">
                          <Zap size={14} /> Mark Collection
                        </Button>
                      </Link>
                    ) : null}
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove member"
                        className="h-9 px-3 text-xs font-medium text-bad-fg hover:bg-bad-bg/15 rounded-xl"
                        onClick={() => {
                          setRemoveError(null);
                          setMemberToRemove({ id: membershipId, name });
                        }}
                      >
                        <Trash2 size={15} /> Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Full Data Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Ticket</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Share / Installment</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((membership, idx) => {
                    const { memberId: memberIdStr, membershipId, name, memberCode, phone } = parseMember(membership);
                    const keyId = membershipId || `ticket-${membership.ticketNumber}-${idx}`;
                    const isHalf = membership.shareType === "HALF" || (membership.share !== undefined && membership.share < 1);
                    const ticketLabel = `#${membership.ticketNumber}${membership.subTicket || ""}`;
                    const memberInstallment = Math.round(chitGroup.installmentAmount * (membership.share ?? (isHalf ? 0.5 : 1)));

                    return (
                      <TableRow key={keyId}>
                        <TableCell className="font-mono font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span>{ticketLabel}</span>
                            {isHalf ? (
                              <Badge variant="neutral" className="text-[10px] py-0 font-medium bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                                ½ Half
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {memberIdStr ? (
                            <Link to={`/members/${memberIdStr}`} className="hover:text-accent-primary">
                              {name}
                            </Link>
                          ) : (
                            <span>{name}</span>
                          )}
                          {memberCode ? (
                            <span className="ml-2 font-mono text-xs text-text-secondary">{memberCode}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <span className="font-semibold text-text-primary">
                            ₹{(memberInstallment / 100).toLocaleString("en-IN")}
                          </span>
                          <span className="text-text-secondary">/mo {isHalf ? "(50% share)" : "(Full)"}</span>
                        </TableCell>
                        <TableCell className="text-text-secondary">{phone || "—"}</TableCell>
                        <TableCell>
                          {membership.hasWon ? (
                            <Badge variant="info">
                              <Trophy size={12} /> Won
                            </Badge>
                          ) : (
                            <Badge variant={membership.status === "ACTIVE" ? "success" : "danger"}>{membership.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {phone ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 font-semibold gap-1 text-xs h-8 px-2.5"
                                onClick={() => openWhatsAppChat(phone, `Hi ${name}, this is regarding ${chitGroup.name}.`)}
                                title="WhatsApp Member"
                              >
                                <MessageSquare size={13} /> WhatsApp
                              </Button>
                            ) : null}
                            {memberIdStr ? (
                              <Link to={`/members/${memberIdStr}?tab=payments`}>
                                <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                                  <Zap size={13} /> Mark Collection
                                </Button>
                              </Link>
                            ) : null}
                            {canRemove ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label="Remove member"
                                className="h-8 px-2 text-text-secondary hover:text-bad-fg hover:bg-bad-bg/10 gap-1"
                                onClick={() => {
                                  setRemoveError(null);
                                  setMemberToRemove({ id: membershipId, name });
                                }}
                              >
                                <Trash2 size={15} /> Remove
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}

      {/* Remove Confirmation Dialog */}
      {memberToRemove ? (
        <Dialog open={Boolean(memberToRemove)} onOpenChange={(open: boolean) => !open && setMemberToRemove(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-bad-fg">
                <AlertCircle size={20} /> Remove Member from Group
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to remove <strong className="text-text-primary">{memberToRemove.name}</strong> from this chit group roster?
              </DialogDescription>
            </DialogHeader>

            {removeError ? (
              <p className="text-xs text-bad-fg bg-bad-bg/10 border border-bad-fg/20 p-2.5 rounded-md flex items-center gap-2">
                <AlertCircle size={14} /> {removeError}
              </p>
            ) : null}

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={removeMember.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmRemove()}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? "Removing…" : "Confirm Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Assign Members Dialog */}
      <AssignMembersDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        chitGroupId={chitGroup.id}
        seatsRemaining={seatsRemaining}
        enrolledMemberIds={enrolledMemberIds}
        isNotStarted={isNotStarted}
      />
    </div>
  );
}
