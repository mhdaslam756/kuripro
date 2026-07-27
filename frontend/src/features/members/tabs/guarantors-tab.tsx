import { Plus, ShieldQuestion, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import type { GuarantorType } from "../types";
import { useAddGuarantor, useGuarantors, useRemoveGuarantor, type AddGuarantorInput } from "../use-members";
import { EmptyState } from "./nominees-tab";

export function GuarantorsTab({ memberId }: { memberId: string }) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("members.update");
  const { data: guarantors, isLoading } = useGuarantors(memberId);
  const addGuarantor = useAddGuarantor(memberId);
  const removeGuarantor = useRemoveGuarantor(memberId);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<GuarantorType>("EXTERNAL");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guarantorMemberId, setGuarantorMemberId] = useState("");
  const [relation, setRelation] = useState("");

  const active = (guarantors ?? []).filter((g) => g.status === "ACTIVE");

  async function handleAdd() {
    const input: AddGuarantorInput =
      type === "EXTERNAL"
        ? { guarantorType: "EXTERNAL", external: { name, phone }, relationToMember: relation || undefined }
        : { guarantorType: "EXISTING_MEMBER", guarantorMemberId, relationToMember: relation || undefined };
    await addGuarantor.mutateAsync(input);
    setOpen(false);
    setName("");
    setPhone("");
    setGuarantorMemberId("");
    setRelation("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">People vouching for this member's ability to pay.</p>
        {canUpdate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add guarantor
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : active.length === 0 ? (
        <EmptyState label="No active guarantors on file." />
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((guarantor) => (
            <li
              key={guarantor.id}
              className="flex items-center justify-between rounded-md border border-border-default px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <ShieldQuestion size={18} className="text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {guarantor.external?.name ?? "Existing member"}
                    {guarantor.relationToMember ? (
                      <span className="text-text-secondary"> · {guarantor.relationToMember}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {guarantor.external?.phone ?? guarantor.guarantorMemberId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={guarantor.guarantorType === "EXTERNAL" ? "neutral" : "info"}>
                  {guarantor.guarantorType === "EXTERNAL" ? "External" : "Member"}
                </Badge>
                {canUpdate ? (
                  <button
                    type="button"
                    aria-label="Remove guarantor"
                    className="text-text-secondary hover:text-bad-fg"
                    onClick={() => void removeGuarantor.mutateAsync(guarantor.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add guarantor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Guarantor type" htmlFor="guarantor-type">
              <Select value={type} onValueChange={(v: string) => setType(v as GuarantorType)}>
                <SelectTrigger id="guarantor-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTERNAL">External person</SelectItem>
                  <SelectItem value="EXISTING_MEMBER">Existing member</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {type === "EXTERNAL" ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name" htmlFor="guarantor-name">
                  <Input id="guarantor-name" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Phone" htmlFor="guarantor-phone">
                  <Input id="guarantor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </div>
            ) : (
              <Field
                label="Guarantor member ID"
                htmlFor="guarantor-member-id"
                helpText="The 24-character ID of an existing member vouching for this one."
              >
                <Input
                  id="guarantor-member-id"
                  value={guarantorMemberId}
                  onChange={(e) => setGuarantorMemberId(e.target.value)}
                />
              </Field>
            )}

            <Field label="Relation to member (optional)" htmlFor="guarantor-relation">
              <Input id="guarantor-relation" value={relation} onChange={(e) => setRelation(e.target.value)} />
            </Field>

            {addGuarantor.isError ? (
              <p className="text-sm text-bad-fg">
                {addGuarantor.error instanceof ApiError ? addGuarantor.error.message : "Something went wrong"}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={addGuarantor.isPending || (type === "EXTERNAL" ? !name || !phone : !guarantorMemberId)}
              onClick={() => void handleAdd()}
            >
              {addGuarantor.isPending ? "Adding…" : "Add guarantor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
