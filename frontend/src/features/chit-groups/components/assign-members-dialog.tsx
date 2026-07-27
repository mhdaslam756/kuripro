import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers } from "@/features/members/use-members";
import { ApiError } from "@/lib/api-client";
import type { BulkAssignResult } from "../types";
import { useAssignMembers } from "../use-chit-groups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId: string;
  seatsRemaining: number;
  enrolledMemberIds?: Set<string>;
}

export function AssignMembersDialog({ open, onOpenChange, chitGroupId, seatsRemaining }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkAssignResult | null>(null);

  const { data, isLoading } = useMembers({ search: search || undefined, limit: 100 });
  const assign = useAssignMembers(chitGroupId);

  const assignable = useMemo(
    () => data?.items ?? [],
    [data],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < seatsRemaining) next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    const res = await assign.mutateAsync([...selected]);
    setResult(res);
    setSelected(new Set());
  }

  function handleClose(next: boolean) {
    if (!next) {
      setSelected(new Set());
      setResult(null);
      setSearch("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign members</DialogTitle>
          <DialogDescription>
            {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} remaining. Select active members to add to this
            scheme's roster.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <span className="text-good-fg">{result.assigned} assigned</span>
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
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <Input
                className="pl-9"
                placeholder="Search members by name, phone, or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-border-default">
              {isLoading ? (
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : assignable.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">No assignable members found.</p>
              ) : (
                <ul>
                  {assignable.map((member) => {
                    const checked = selected.has(member.id);
                    const disabled = !checked && selected.size >= seatsRemaining;
                    return (
                      <li key={member.id} className="border-b border-border-default last:border-0">
                        <label
                          className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${disabled ? "opacity-40" : "hover:bg-bg-raised"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(member.id)}
                          />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{member.name}</p>
                            <p className="font-mono text-xs text-text-secondary">
                              {member.memberCode} · {member.phone}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {assign.isError ? (
              <p className="text-sm text-bad-fg">
                {assign.error instanceof ApiError ? assign.error.message : "Something went wrong"}
              </p>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button disabled={selected.size === 0 || assign.isPending} onClick={() => void handleAssign()}>
                {assign.isPending ? "Assigning…" : `Assign ${selected.size || ""}`.trim()}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
