import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { FAMILY_RELATIONS, type FamilyRelation } from "../types";
import { useAddFamilyMember, useFamily, useRemoveFamilyMember } from "../use-members";
import { EmptyState } from "./nominees-tab";

export function FamilyTab({ memberId }: { memberId: string }) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("members.update");
  const { data: family, isLoading } = useFamily(memberId);
  const addFamily = useAddFamilyMember(memberId);
  const removeFamily = useRemoveFamilyMember(memberId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<FamilyRelation>("SPOUSE");
  const [occupation, setOccupation] = useState("");
  const [isDependent, setIsDependent] = useState(true);

  async function handleAdd() {
    await addFamily.mutateAsync({ name, relation, occupation: occupation || undefined, isDependent });
    setOpen(false);
    setName("");
    setOccupation("");
    setIsDependent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Family members and dependents captured during onboarding.</p>
        {canUpdate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add family member
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (family ?? []).length === 0 ? (
        <EmptyState label="No family members recorded yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {family?.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-md border border-border-default px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Users size={18} className="text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {entry.name} <span className="text-text-secondary">· {humanize(entry.relation)}</span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    {entry.occupation ?? "—"}
                    {entry.isDependent ? " · dependent" : ""}
                  </p>
                </div>
              </div>
              {canUpdate ? (
                <button
                  type="button"
                  aria-label="Remove family member"
                  className="text-text-secondary hover:text-bad-fg"
                  onClick={() => void removeFamily.mutateAsync(entry.id)}
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
            <DialogTitle>Add family member</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Full name" htmlFor="family-name">
              <Input id="family-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Relation" htmlFor="family-relation">
                <Select value={relation} onValueChange={(v: string) => setRelation(v as FamilyRelation)}>
                  <SelectTrigger id="family-relation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_RELATIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {humanize(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Occupation (optional)" htmlFor="family-occupation">
                <Input id="family-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <Switch checked={isDependent} onCheckedChange={(checked: boolean) => setIsDependent(checked)} />
              Financially dependent on the member
            </label>
            {addFamily.isError ? (
              <p className="text-sm text-bad-fg">
                {addFamily.error instanceof ApiError ? addFamily.error.message : "Something went wrong"}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name || addFamily.isPending} onClick={() => void handleAdd()}>
              {addFamily.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
