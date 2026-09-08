import { AlertOctagon, CheckCircle2, Loader2, ShieldAlert, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { useDeactivateMember, useDeleteMemberCompletely, useMemberDeletionCheck } from "../use-members";

interface DeleteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    memberCode: string;
    status: string;
  };
  onDeleted?: () => void;
}

export function DeleteMemberDialog({
  open,
  onOpenChange,
  member,
  onDeleted,
}: DeleteMemberDialogProps) {
  const { data: eligibility, isLoading, isError } = useMemberDeletionCheck(member.id, open);
  const deleteMutation = useDeleteMemberCompletely();
  const deactivateMutation = useDeactivateMember();

  async function handleDeleteCompletely() {
    try {
      await deleteMutation.mutateAsync(member.id);
      toast.success(`Member ${member.name} was permanently deleted.`);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to delete member";
      toast.error(message);
    }
  }

  async function handleDeactivate() {
    try {
      await deactivateMutation.mutateAsync(member.id);
      toast.success(`Member ${member.name} deactivated.`);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to deactivate member";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-bad-bg border border-bad-border text-bad-fg">
              <Trash2 size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-text-primary">
                Delete Member
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                {member.name} · <span className="font-mono">{member.memberCode}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 size={14} className="animate-spin text-accent-primary" />
              <span>Checking chit enrollments and eligibility…</span>
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : isError || !eligibility ? (
          <div className="rounded-2xl border border-bad-border bg-bad-bg p-4 text-xs text-bad-fg">
            Failed to verify chit enrollment status for this member. Please try again.
          </div>
        ) : !eligibility.canDelete ? (
          /* Member CANNOT be deleted because enrolled in chits or acting as guarantor */
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-2xl border border-bad-border/80 bg-bad-bg/60 p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-bad-fg font-semibold text-sm">
                <AlertOctagon size={18} className="shrink-0 mt-0.5" />
                <span>Cannot Delete Completely</span>
              </div>
              <p className="text-text-primary leading-relaxed">
                {eligibility.reason ||
                  `This member is enrolled in ${eligibility.enrolledChitCount} chit group(s) under this organization.`}
              </p>

              {eligibility.chits && eligibility.chits.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                  {eligibility.chits.map((chit) => (
                    <Badge
                      key={chit.id}
                      variant="danger"
                      className="bg-bg-surface font-medium text-[11px] px-2 py-0.5 rounded-lg"
                    >
                      <Users size={11} className="mr-1 text-bad-fg" />
                      {chit.name}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <p className="text-text-secondary text-[11px] pt-1">
                To preserve financial audits, cycle auctions, and ledger transactions, members enrolled in chit schemes cannot be deleted completely. You can deactivate this member instead.
              </p>
            </div>
          </div>
        ) : (
          /* Member CAN be deleted completely */
          <div className="flex flex-col gap-3 py-2">
            <div className="rounded-2xl border border-good-border/60 bg-good-bg/40 p-3.5 text-xs flex items-center gap-2.5 text-good-fg">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>
                <strong>Zero chit enrollments:</strong> This member is not added to any chit under this organization.
              </span>
            </div>

            <div className="rounded-2xl border border-border-default/80 bg-bg-raised/50 p-4 text-xs space-y-2">
              <p className="font-semibold text-text-primary flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-bad-fg" />
                This action is permanent and will completely erase:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary pl-1">
                <li>Member profile, contact info, and addresses</li>
                <li>Uploaded KYC proofs and documents</li>
                <li>Nominees and family member records</li>
                <li>Portal login credentials (if activated)</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending || deactivateMutation.isPending}
            className="rounded-xl"
          >
            Cancel
          </Button>

          {eligibility && !eligibility.canDelete ? (
            member.status === "ACTIVE" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deactivateMutation.isPending}
                onClick={() => void handleDeactivate()}
                className="rounded-xl gap-1.5"
              >
                {deactivateMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deactivating…
                  </>
                ) : (
                  "Deactivate Instead"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Done
              </Button>
            )
          ) : eligibility && eligibility.canDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDeleteCompletely()}
              className="rounded-xl gap-1.5 font-semibold bg-bad-fg text-white hover:bg-bad-fg/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Delete Completely
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
