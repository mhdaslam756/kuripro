import { AlertCircle, Trash2, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

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
}

export function AssignMembersDialog({ open, onOpenChange, chitGroupId, seatsRemaining }: Props) {
  const [activeTab, setActiveTab] = useState<"assign" | "enrolled">("assign");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkAssignResult | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: membersData, isLoading: isLoadingMembers } = useMembers({ search: search || undefined, limit: 100 });
  const { data: roster, isLoading: isLoadingRoster } = useChitMembers(chitGroupId);
  const assign = useAssignMembers(chitGroupId);
  const removeMember = useRemoveMember(chitGroupId);

  const enrolledMembers = roster?.items ?? [];
  const enrolledMap = useMemo(() => {
    const map = new Map<string, { membershipId: string; ticketNumber: number; hasWon: boolean }>();
    for (const item of enrolledMembers) {
      const memberId = typeof item.memberId === "object" && item.memberId
        ? (item.memberId.id || item.memberId._id || "")
        : typeof item.memberId === "string" ? item.memberId : "";
      if (memberId) {
        map.set(memberId, {
          membershipId: item.id || (item as any)._id,
          ticketNumber: item.ticketNumber,
          hasWon: item.hasWon,
        });
      }
    }
    return map;
  }, [enrolledMembers]);

  const assignable = useMemo(() => membersData?.items ?? [], [membersData]);

  const filteredEnrolled = useMemo(() => {
    if (!search.trim()) return enrolledMembers;
    const q = search.toLowerCase();
    return enrolledMembers.filter((m) => {
      const mem = typeof m.memberId === "object" && m.memberId ? m.memberId : null;
      if (!mem) return false;
      return (
        (mem.name || "").toLowerCase().includes(q) ||
        (mem.phone || "").toLowerCase().includes(q) ||
        (mem.memberCode || "").toLowerCase().includes(q) ||
        `#${m.ticketNumber}`.includes(q)
      );
    });
  }, [enrolledMembers, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < seatsRemaining) next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    setActionError(null);
    try {
      const res = await assign.mutateAsync([...selected]);
      setResult(res);
      setSelected(new Set());
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
      setSelected(new Set());
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
      <DialogContent className="max-h-[85vh] max-w-xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign & Manage Members</DialogTitle>
          <DialogDescription>
            {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} remaining out of {roster?.total ? roster.total + seatsRemaining : seatsRemaining}.
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
              <span className="text-good-fg font-medium">{result.assigned} member(s) assigned successfully.</span>
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

            <div className="relative mt-3">
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

            <TabsContent value="assign" className="flex-1 overflow-y-auto min-h-[220px] max-h-[320px] mt-3 border border-border-default rounded-md p-0">
              {isLoadingMembers ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : assignable.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-secondary">No matching members found.</p>
              ) : (
                <ul className="divide-y divide-border-default">
                  {assignable.map((member) => {
                    const enrolledInfo = enrolledMap.get(member.id);
                    const isEnrolled = Boolean(enrolledInfo);
                    const checked = selected.has(member.id);
                    const disabled = isEnrolled || (!checked && selected.size >= seatsRemaining);

                    return (
                      <li key={member.id} className={`flex items-center justify-between px-3 py-2.5 hover:bg-bg-raised transition-colors ${isEnrolled ? "bg-bg-surface/50" : ""}`}>
                        <label
                          className={`flex items-center gap-3 flex-1 min-w-0 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked || isEnrolled}
                            disabled={disabled}
                            onChange={() => !isEnrolled && toggle(member.id)}
                            className="rounded border-border-default"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary truncate">{member.name}</p>
                              {isEnrolled ? (
                                <Badge variant="success" className="text-[11px] gap-1 py-0">
                                  <UserCheck size={11} /> Assigned #{enrolledInfo?.ticketNumber}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="font-mono text-xs text-text-secondary">
                              {member.memberCode} · {member.phone}
                            </p>
                          </div>
                        </label>

                        {isEnrolled && enrolledInfo ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-text-secondary hover:text-bad-fg hover:bg-bad-bg/10 gap-1 ml-2 text-xs"
                            onClick={() => setMemberToRemove({ id: enrolledInfo.membershipId, name: member.name })}
                          >
                            <Trash2 size={13} /> Remove
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="enrolled" className="flex-1 overflow-y-auto min-h-[220px] max-h-[320px] mt-3 border border-border-default rounded-md p-0">
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

                      return (
                    <li key={membershipId || item.ticketNumber} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-bg-raised">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-bg-raised text-text-primary">
                            #{item.ticketNumber}
                          </span>
                          <p className="text-sm font-medium text-text-primary">{memName}</p>
                          {item.hasWon ? (
                            <Badge variant="info" className="text-[10px] py-0">Won</Badge>
                          ) : null}
                        </div>
                        <p className="font-mono text-xs text-text-secondary mt-0.5">
                          {memCode}{memCode && memPhone ? " · " : ""}{memPhone}
                        </p>
                      </div>

                      {!item.hasWon ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-text-secondary hover:text-bad-fg hover:bg-bad-bg/10 gap-1 text-xs"
                          onClick={() => setMemberToRemove({ id: membershipId, name: memName })}
                        >
                          <Trash2 size={14} /> Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-text-secondary italic">Cannot remove (Won)</span>
                      )}
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
                <Button disabled={selected.size === 0 || assign.isPending} onClick={() => void handleAssign()}>
                  {assign.isPending ? "Assigning…" : `Assign ${selected.size || ""}`.trim()}
                </Button>
              ) : null}
            </DialogFooter>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
