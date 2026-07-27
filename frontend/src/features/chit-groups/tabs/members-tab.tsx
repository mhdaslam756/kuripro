import { Trophy, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth-context";
import { AssignMembersDialog } from "../components/assign-members-dialog";
import type { ChitGroup } from "../types";
import { useChitMembers, useRemoveMember } from "../use-chit-groups";

export function MembersTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { hasPermission } = useAuth();
  const { data: roster, isLoading } = useChitMembers(chitGroup.id);
  const removeMember = useRemoveMember(chitGroup.id);
  const [assignOpen, setAssignOpen] = useState(false);

  const isDraft = chitGroup.status === "DRAFT";
  const canAssign = hasPermission("chit_group.enroll_member") && isDraft;
  const enrolled = roster?.total ?? 0;
  const seatsRemaining = Math.max(0, chitGroup.totalMembers - enrolled);
  const enrolledMemberIds = new Set((roster?.items ?? []).map((m) => m.memberId._id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {enrolled} of {chitGroup.totalMembers} seats filled
          {seatsRemaining > 0 ? ` · ${seatsRemaining} remaining` : " · roster complete"}
        </p>
        {canAssign && seatsRemaining > 0 ? (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus size={15} /> Assign members
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : enrolled === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-12 text-center">
          <p className="text-sm text-text-secondary">No members assigned yet.</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Ticket</TableHeaderCell>
                <TableHeaderCell>Member</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {isDraft ? <TableHeaderCell /> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {roster?.items.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="font-mono">#{membership.ticketNumber}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/members/${membership.memberId._id}`} className="hover:text-accent-primary">
                      {membership.memberId.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-text-secondary">{membership.memberId.memberCode}</span>
                  </TableCell>
                  <TableCell className="text-text-secondary">{membership.memberId.phone}</TableCell>
                  <TableCell>
                    {membership.hasWon ? (
                      <Badge variant="info">
                        <Trophy size={12} /> Won
                      </Badge>
                    ) : (
                      <Badge variant={membership.status === "ACTIVE" ? "success" : "danger"}>{membership.status}</Badge>
                    )}
                  </TableCell>
                  {isDraft ? (
                    <TableCell className="text-right">
                      {canAssign ? (
                        <button
                          type="button"
                          aria-label="Remove member"
                          className="text-text-secondary hover:text-bad-fg"
                          onClick={() => void removeMember.mutateAsync(membership.id)}
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
      )}

      <AssignMembersDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        chitGroupId={chitGroup.id}
        seatsRemaining={seatsRemaining}
        enrolledMemberIds={enrolledMemberIds}
      />
    </div>
  );
}
