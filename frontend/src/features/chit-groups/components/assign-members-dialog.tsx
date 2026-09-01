import { AlertCircle, Trash2, Search, UserCheck, UserPlus, Users, PieChart, Plus, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMembers } from "@/features/members/use-members";
import { ApiError } from "@/lib/api-client";
import type { BulkAssignResult } from "../types";
import { useAssignMembers, useChitMembers, useRemoveMember } from "../use-chit-groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId: string;
  seatsRemaining: number;
  enrolledMemberIds?: Set<string>;
  isNotStarted?: boolean;
}

interface MemberSelection {
  count: number;
  shareType: "FULL" | "HALF";
}

export function AssignMembersDialog({ open, onOpenChange, chitGroupId, seatsRemaining, isNotStarted = true }: Props) {
  const [activeTab, setActiveTab] = useState<"assign" | "enrolled">("assign");
  const [search, setSearch] = useState("");
  const [defaultShareType, setDefaultShareType] = useState<"FULL" | "HALF">("FULL");
  const [selectedMembers, setSelectedMembers] = useState<Map<string, MemberSelection>>(new Map());
  const [result, setResult] = useState<BulkAssignResult | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: membersData, isLoading: isLoadingMembers } = useMembers({ search: search || undefined, limit: 100 });
  const { data: roster, isLoading: isLoadingRoster } = useChitMembers(chitGroupId);
  const assign = useAssignMembers(chitGroupId);
  const removeMember = useRemoveMember(chitGroupId);

  const enrolledMembers = useMemo(() => roster?.items ?? [], [roster?.items]);
  const enrolledMap = useMemo(() => {
    const map = new Map<
      string,
      { membershipId: string; ticketNumber: number; subTicket?: string; shareType?: string; hasWon: boolean }[]
    >();
    for (const item of enrolledMembers) {
      const memberId =
        typeof item.memberId === "object" && item.memberId
          ? item.memberId.id || item.memberId._id || ""
          : typeof item.memberId === "string"
          ? item.memberId
          : "";
      if (memberId) {
        if (!map.has(memberId)) map.set(memberId, []);
        map.get(memberId)!.push({
          membershipId: item.id || (item as any)._id,
          ticketNumber: item.ticketNumber,
          subTicket: item.subTicket,
          shareType: item.shareType,
          hasWon: item.hasWon,
        });
      }
    }
    return map;
  }, [enrolledMembers]);

  const assignable = useMemo(() => membersData?.items ?? [], [membersData]);

  const { totalSelectedShares, totalSelectedTickets, totalHalfCount, totalFullCount } = useMemo(() => {
    let shares = 0;
    let tickets = 0;
    let halfs = 0;
    let fulls = 0;
    for (const item of selectedMembers.values()) {
      const sharePerItem = item.shareType === "HALF" ? 0.5 : 1;
      shares += item.count * sharePerItem;
      tickets += item.count;
      if (item.shareType === "HALF") halfs += item.count;
      else fulls += item.count;
    }
    return {
      totalSelectedShares: shares,
      totalSelectedTickets: tickets,
      totalHalfCount: halfs,
      totalFullCount: fulls,
    };
  }, [selectedMembers]);

  const filteredEnrolled = useMemo(() => {
    if (!search.trim()) return enrolledMembers;
    const q = search.toLowerCase();
    return enrolledMembers.filter((m) => {
      const mem = typeof m.memberId === "object" && m.memberId ? m.memberId : null;
      if (!mem) return false;
      const ticketStr = `#${m.ticketNumber}${m.subTicket || ""}`.toLowerCase();
      return (
        (mem.name || "").toLowerCase().includes(q) ||
        (mem.phone || "").toLowerCase().includes(q) ||
        (mem.memberCode || "").toLowerCase().includes(q) ||
        ticketStr.includes(q)
      );
    });
  }, [enrolledMembers, search]);

  function toggle(id: string) {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const needed = defaultShareType === "HALF" ? 0.5 : 1;
        if (totalSelectedShares + needed <= seatsRemaining + 0.001) {
          next.set(id, { count: 1, shareType: defaultShareType });
        }
      }
      return next;
    });
  }

  function setMemberShare(id: string, type: "FULL" | "HALF") {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return next;
      const currentTotal = current.count * (current.shareType === "HALF" ? 0.5 : 1);
      const newTotal = current.count * (type === "HALF" ? 0.5 : 1);
      const diff = newTotal - currentTotal;
      if (diff <= 0 || totalSelectedShares + diff <= seatsRemaining + 0.001) {
        next.set(id, { ...current, shareType: type });
      }
      return next;
    });
  }

  function incrementCount(id: string) {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return next;
      const step = current.shareType === "HALF" ? 0.5 : 1;
      if (totalSelectedShares + step <= seatsRemaining + 0.001) {
        next.set(id, { ...current, count: current.count + 1 });
      }
      return next;
    });
  }

  function decrementCount(id: string) {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return next;
      if (current.count > 1) {
        next.set(id, { ...current, count: current.count - 1 });
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleAssign() {
    setActionError(null);
    try {
      const assignments: { memberId: string; shareType: "FULL" | "HALF" }[] = [];
      for (const [memberId, config] of selectedMembers.entries()) {
        for (let i = 0; i < config.count; i++) {
          assignments.push({
            memberId,
            shareType: config.shareType,
          });
        }
      }
      const res = await assign.mutateAsync({ assignments });
      setResult(res);
      setSelectedMembers(new Map());
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Failed to assign members");
      }
    }
  }

  async function handleRemoveConfirm() {
    if (!memberToRemove) return;
    setRemovingId(memberToRemove.id);
    setActionError(null);
    try {
      await removeMember.mutateAsync(memberToRemove.id);
      setMemberToRemove(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Failed to remove member");
      }
    } finally {
      setRemovingId(null);
    }
  }

  function handleClose(next: boolean) {
    if (!next) {
      setSelectedMembers(new Map());
      setResult(null);
      setSearch("");
      setMemberToRemove(null);
      setActionError(null);
      setActiveTab("assign");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign & Manage Members</DialogTitle>
          <DialogDescription>
            {seatsRemaining} ticket capacity remaining out of {roster?.total ? roster.total + seatsRemaining : seatsRemaining}.
          </DialogDescription>
        </DialogHeader>

        {memberToRemove ? (
          <div className="my-2 rounded-lg border border-bad-fg/30 bg-bad-bg/10 p-4 text-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 font-medium text-bad-fg">
              <AlertCircle size={18} /> Confirm Member Removal
            </div>
            <p className="text-text-primary">
              Are you sure you want to remove <strong className="font-semibold">{memberToRemove.name}</strong> from this group roster?
            </p>
            {actionError ? <p className="text-xs text-bad-fg">{actionError}</p> : null}
            <div className="flex justify-end gap-2 mt-1">
              <Button size="sm" variant="outline" onClick={() => setMemberToRemove(null)} disabled={Boolean(removingId)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleRemoveConfirm()}
                disabled={Boolean(removingId)}
              >
                {removingId ? "Removing…" : "Confirm Remove"}
              </Button>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm">
              <span className="text-good-fg font-medium">{result.assigned} membership(s) assigned successfully.</span>
              {result.skipped.length > 0 ? (
                <span className="text-text-secondary"> · {result.skipped.length} skipped</span>
              ) : null}
            </p>
            {result.skipped.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border-default text-sm">
                {result.skipped.map((s) => (
                  <li key={s.memberId} className="border-b border-border-default px-3 py-2 last:border-0 text-text-secondary">
                    {s.reason}
                  </li>
                ))}
              </ul>
            ) : null}
            <DialogFooter className="pt-2">
              <Button onClick={() => setResult(null)}>Assign More</Button>
              <Button variant="outline" onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "assign" | "enrolled")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="assign" className="flex items-center gap-1.5">
                <UserPlus size={15} /> Select & Assign
              </TabsTrigger>
              <TabsTrigger value="enrolled" className="flex items-center gap-1.5">
                <Users size={15} /> Assigned Roster ({enrolledMembers.length})
              </TabsTrigger>
            </TabsList>

            {activeTab === "assign" ? (
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center justify-between gap-2 p-2 bg-bg-raised/60 rounded-lg border border-border-default text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-text-secondary">
                    <PieChart size={14} className="text-accent-primary" />
                    <span>Default Mode:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-bg-surface p-0.5 rounded-md border border-border-default">
                    <button
                      type="button"
                      onClick={() => setDefaultShareType("FULL")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        defaultShareType === "FULL"
                          ? "bg-accent-primary text-white shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Full Chit (100% · 1 Slot)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultShareType("HALF")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        defaultShareType === "HALF"
                          ? "bg-accent-primary text-white shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      ½ Half Chit (50/50 Shared Slot)
                    </button>
                  </div>
                </div>

                {defaultShareType === "HALF" ? (
                  <p className="text-[11px] text-text-secondary bg-accent-primary/5 border border-accent-primary/15 rounded-md px-3 py-1.5">
                    💡 <strong>50/50 Shared Slot:</strong> Two members share 1 chit slot (50% installment each, 50% prize split). They together count as 1 slot.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <Input
                className="pl-9"
                placeholder={activeTab === "assign" ? "Search available members by name, code, phone" : "Search assigned roster"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {actionError && !memberToRemove ? (
              <div className="mt-2 text-xs text-bad-fg bg-bad-bg/10 border border-bad-fg/20 p-2.5 rounded-md flex items-center gap-2">
                <AlertCircle size={14} /> {actionError}
              </div>
            ) : null}

            <TabsContent value="assign" className="flex-1 overflow-y-auto min-h-[220px] max-h-[300px] mt-2 border border-border-default rounded-md p-0">
              {isLoadingMembers ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : assignable.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">No matching members found</p>
                  <p className="text-xs text-text-secondary">Register members in your organization first to assign them to this chit group.</p>
                  <Link to="/members" onClick={() => handleClose(false)} className="mt-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <UserPlus size={14} /> Register new member
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border-default">
                  {assignable.map((member) => {
                    const enrolledEntries = enrolledMap.get(member.id);
                    const isEnrolled = Boolean(enrolledEntries && enrolledEntries.length > 0);
                    const selection = selectedMembers.get(member.id);
                    const isChecked = Boolean(selection);
                    const needed = defaultShareType === "HALF" ? 0.5 : 1;
                    const disabled = !isChecked && totalSelectedShares + needed > seatsRemaining + 0.001;

                    return (
                      <li key={member.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-bg-raised transition-colors gap-2">
                        <label
                          className={`flex items-center gap-3 flex-1 min-w-0 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={disabled}
                            onChange={() => toggle(member.id)}
                            className="rounded border-border-default"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-text-primary truncate">{member.name}</p>
                              {isEnrolled ? (
                                <Badge variant="success" className="text-[11px] gap-1 py-0">
                                  <UserCheck size={11} />
                                  {enrolledEntries!.length > 1
                                    ? `${enrolledEntries!.length} tickets (${enrolledEntries!.map((e) => `#${e.ticketNumber}${e.subTicket || ""}`).join(", ")})`
                                    : `Ticket #${enrolledEntries![0]!.ticketNumber}${enrolledEntries![0]!.subTicket || ""}${
                                        enrolledEntries![0]!.shareType === "HALF" ? " (50% Shared)" : ""
                                      }`}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="font-mono text-xs text-text-secondary">
                              {member.memberCode} · {member.phone}
                            </p>
                          </div>
                        </label>

                        {isChecked && selection ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Share Type Toggle */}
                            <div className="flex items-center gap-0.5 bg-bg-surface p-0.5 rounded border border-border-default">
                              <button
                                type="button"
                                onClick={() => setMemberShare(member.id, "FULL")}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                  selection.shareType === "FULL"
                                    ? "bg-accent-primary text-white shadow-xs"
                                    : "text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                Full
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberShare(member.id, "HALF")}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                  selection.shareType === "HALF"
                                    ? "bg-accent-primary text-white shadow-xs"
                                    : "text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                ½ 50%
                              </button>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1 bg-bg-surface px-1 py-0.5 rounded-lg border border-border-default">
                              <button
                                type="button"
                                aria-label="Decrease tickets"
                                onClick={() => decrementCount(member.id)}
                                className="flex size-5 items-center justify-center rounded bg-bg-raised text-text-primary hover:bg-border-default transition-colors text-xs font-bold"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="min-w-[24px] text-center font-mono text-xs font-bold text-text-primary">
                                {selection.count}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase tickets"
                                disabled={totalSelectedShares + (selection.shareType === "HALF" ? 0.5 : 1) > seatsRemaining + 0.001}
                                onClick={() => incrementCount(member.id)}
                                className="flex size-5 items-center justify-center rounded bg-bg-raised text-text-primary hover:bg-border-default disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs font-bold"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="enrolled" className="flex-1 overflow-y-auto min-h-[220px] max-h-[320px] mt-2 border border-border-default rounded-md p-0">
              {isLoadingRoster ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : filteredEnrolled.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-secondary">
                  {enrolledMembers.length === 0
                    ? "No members assigned to this group yet."
                    : "No assigned members match your search."}
                </div>
              ) : (
                <ul className="divide-y divide-border-default">
                  {filteredEnrolled.map((item) => {
                    const mem = typeof item.memberId === "object" && item.memberId ? item.memberId : null;
                    const memName = mem?.name || "Member";
                    const memCode = mem?.memberCode || "";
                    const memPhone = mem?.phone || "";
                    const membershipId = item.id || (item as any)._id || "";
                    const isHalf = item.shareType === "HALF" || (item.share !== undefined && item.share < 1);
                    const ticketLabel = `#${item.ticketNumber}${item.subTicket || ""}`;

                    return (
                      <li key={membershipId || item.ticketNumber} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-bg-raised">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-bg-raised text-text-primary">
                              {ticketLabel}
                            </span>
                            <p className="text-sm font-medium text-text-primary">{memName}</p>
                            {isHalf ? (
                              <Badge variant="neutral" className="text-[10px] py-0 font-medium bg-accent-primary/10 text-accent-primary border-accent-primary/20">
                                50/50 Shared Slot
                              </Badge>
                            ) : null}
                            {item.hasWon ? (
                              <Badge variant="info" className="text-[10px] py-0">Won</Badge>
                            ) : null}
                          </div>
                          <p className="font-mono text-xs text-text-secondary mt-0.5">
                            {memCode}{memCode && memPhone ? " · " : ""}{memPhone}
                          </p>
                        </div>

                        {!item.hasWon && isNotStarted ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-text-secondary hover:text-bad-fg hover:bg-bad-bg/10 gap-1 text-xs"
                            onClick={() => setMemberToRemove({ id: membershipId, name: memName })}
                          >
                            <Trash2 size={14} /> Remove
                          </Button>
                        ) : item.hasWon ? (
                          <span className="text-xs text-text-secondary italic">Cannot remove (Won)</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              {activeTab === "assign" ? (
                <Button disabled={selectedMembers.size === 0 || assign.isPending} onClick={() => void handleAssign()}>
                  {assign.isPending
                    ? "Assigning…"
                    : `Assign ${selectedMembers.size} Member${selectedMembers.size === 1 ? "" : "s"}${
                        totalSelectedTickets > 0
                          ? ` (${[
                              totalFullCount > 0 ? `${totalFullCount} Full` : null,
                              totalHalfCount > 0 ? `${totalHalfCount} Half` : null,
                            ]
                              .filter(Boolean)
                              .join(", ")} · ${totalSelectedShares} Capacity)`
                          : ""
                      }`}
                </Button>
              ) : null}
            </DialogFooter>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
