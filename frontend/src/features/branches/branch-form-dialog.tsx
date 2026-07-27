import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import type { Branch } from "./types";
import { useCreateBranch, useUpdateBranch } from "./use-branches";

const branchSchema = z.object({
  name: z.string().min(2, "Required"),
  code: z.string().min(2, "Required").max(10),
  line1: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  pincode: z.string().min(1, "Required"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}

export function BranchFormDialog({ open, onOpenChange, branch }: BranchFormDialogProps) {
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const isEditing = Boolean(branch);
  const isPending = createBranch.isPending || updateBranch.isPending;
  const mutationError = createBranch.error ?? updateBranch.error;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    values: branch
      ? {
          name: branch.name,
          code: branch.code,
          line1: branch.address.line1,
          city: branch.address.city,
          state: branch.address.state,
          pincode: branch.address.pincode,
        }
      : { name: "", code: "", line1: "", city: "", state: "", pincode: "" },
  });

  async function onSubmit(values: BranchFormValues) {
    const address = {
      line1: values.line1,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      country: branch?.address.country ?? "India",
    };

    if (isEditing && branch) {
      await updateBranch.mutateAsync({ id: branch.id, name: values.name, address });
    } else {
      await createBranch.mutateAsync({ name: values.name, code: values.code, address });
    }
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit branch" : "Add branch"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this branch's details." : "Create a new branch office for your organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <Field
              label="Branch code"
              htmlFor="code"
              error={errors.code?.message}
              helpText={isEditing ? undefined : "Short, unique — e.g. KOC"}
            >
              <Input id="code" {...register("code")} disabled={isEditing} />
            </Field>
          </div>
          <Field label="Address line 1" htmlFor="line1" error={errors.line1?.message}>
            <Input id="line1" {...register("line1")} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...register("city")} />
            </Field>
            <Field label="State" htmlFor="state" error={errors.state?.message}>
              <Input id="state" {...register("state")} />
            </Field>
            <Field label="Pincode" htmlFor="pincode" error={errors.pincode?.message}>
              <Input id="pincode" {...register("pincode")} />
            </Field>
          </div>

          {mutationError ? (
            <p className="text-sm text-bad-fg">
              {mutationError instanceof ApiError ? mutationError.message : "Something went wrong"}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
