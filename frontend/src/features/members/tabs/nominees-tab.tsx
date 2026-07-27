import { Plus, Trash2, UserCog } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { NOMINEE_RELATIONS, type NomineeRelation } from "../types";
import { useAddNominee, useNominees, useRemoveNominee } from "../use-members";

export function NomineesTab({ memberId }: { memberId: string }) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("members.update");
  const { data: nominees, isLoading } = useNominees(memberId);
  const addNominee = useAddNominee(memberId);
  const removeNominee = useRemoveNominee(memberId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<NomineeRelation>("SPOUSE");
  const [sharePercent, setSharePercent] = useState("100");
  const [phone, setPhone] = useState("");

  const totalShare = (nominees ?? []).filter((n) => n.isActive).reduce((sum, n) => sum + n.sharePercent, 0);

  async function handleAdd() {
    await addNominee.mutateAsync({ name, relation, sharePercent: Number(sharePercent), phone: phone || undefined });
    setOpen(false);
    setName("");
    setPhone("");
    setSharePercent("100");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Nominees receive the payout on the member's death. Active shares total <strong>{totalShare}%</strong>.
        </p>
        {canUpdate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add nominee
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (nominees ?? []).length === 0 ? (
        <EmptyState label="No nominees recorded yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {nominees?.map((nominee) => (
            <li
              key={nominee.id}
              className="flex items-center justify-between rounded-md border border-border-default px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <UserCog size={18} className="text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {nominee.name} <span className="text-text-secondary">· {humanize(nominee.relation)}</span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    {nominee.sharePercent}% share{nominee.phone ? ` · ${nominee.phone}` : ""}
                    {nominee.isActive ? "" : " · inactive"}
                  </p>
                </div>
              </div>
              {canUpdate ? (
                <button
                  type="button"
                  aria-label="Remove nominee"
                  className="text-text-secondary hover:text-bad-fg"
                  onClick={() => void removeNominee.mutateAsync(nominee.id)}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add nominee</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Full name" htmlFor="nominee-name">
              <Input id="nominee-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Relation" htmlFor="nominee-relation">
                <Select value={relation} onValueChange={(v: string) => setRelation(v as NomineeRelation)}>
                  <SelectTrigger id="nominee-relation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOMINEE_RELATIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {humanize(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Share %" htmlFor="nominee-share">
                <Input
                  id="nominee-share"
                  type="number"
                  min={1}
                  max={100}
                  value={sharePercent}
                  onChange={(e) => setSharePercent(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Phone (optional)" htmlFor="nominee-phone">
              <Input id="nominee-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            {addNominee.isError ? (
              <p className="text-sm text-bad-fg">
                {addNominee.error instanceof ApiError ? addNominee.error.message : "Something went wrong"}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name || addNominee.isPending} onClick={() => void handleAdd()}>
              {addNominee.isPending ? "Adding…" : "Add nominee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border-default py-12 text-center">
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  );
}
