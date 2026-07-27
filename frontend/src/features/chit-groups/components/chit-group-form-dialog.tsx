import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise } from "@/lib/format";
import { ALLOTMENT_METHODS, CHIT_GROUP_FREQUENCIES, FREQUENCY_LABELS, type ChitGroup } from "../types";
import { previewEndDate } from "../schedule-preview";
import { useCreateChitGroup, useUpdateChitGroup, type CreateChitGroupInput } from "../use-chit-groups";

const schema = z
  .object({
    name: z.string().min(2, "Required"),
    registrationNumber: z.string().min(3, "Required"),
    chitValueRupees: z.number({ error: "Required" }).positive("Must be positive"),
    totalMembers: z.number({ error: "Required" }).int().min(2, "At least 2").max(100, "Max 100"),
    frequency: z.enum(CHIT_GROUP_FREQUENCIES),
    customIntervalDays: z.number().int().min(1).max(365).optional(),
    startDate: z.string().min(1, "Required"),
    allotmentMethod: z.enum(ALLOTMENT_METHODS),
    foremanCommissionPercent: z.number().min(0).max(100),
    minBidDiscountPercent: z.number().min(0).max(100),
    maxBidDiscountPercent: z.number().min(0).max(100),
    bidIncrementPercent: z.number().min(0).max(100),
    termsAndConditions: z.string().optional(),
  })
  .refine((d) => d.frequency !== "CUSTOM" || d.customIntervalDays !== undefined, {
    message: "Interval days required for custom frequency",
    path: ["customIntervalDays"],
  })
  .refine((d) => d.minBidDiscountPercent <= d.maxBidDiscountPercent, {
    message: "Min cannot exceed max",
    path: ["minBidDiscountPercent"],
  });

type FormValues = z.infer<typeof schema>;

function toDefaults(chit: ChitGroup | undefined): FormValues {
  if (!chit) {
    return {
      name: "",
      registrationNumber: "",
      chitValueRupees: 0,
      totalMembers: 20,
      frequency: "MONTHLY",
      startDate: "",
      allotmentMethod: "AUCTION",
      foremanCommissionPercent: 5,
      minBidDiscountPercent: 0,
      maxBidDiscountPercent: 40,
      bidIncrementPercent: 1,
      termsAndConditions: "",
    };
  }
  return {
    name: chit.name,
    registrationNumber: chit.registrationNumber,
    chitValueRupees: chit.chitValue / 100,
    totalMembers: chit.totalMembers,
    frequency: chit.frequency,
    customIntervalDays: chit.customIntervalDays,
    startDate: chit.startDate.slice(0, 10),
    allotmentMethod: chit.auctionRules.allotmentMethod,
    foremanCommissionPercent: chit.auctionRules.foremanCommissionPercent,
    minBidDiscountPercent: chit.auctionRules.minBidDiscountPercent,
    maxBidDiscountPercent: chit.auctionRules.maxBidDiscountPercent,
    bidIncrementPercent: chit.auctionRules.bidIncrementPercent,
    termsAndConditions: chit.termsAndConditions ?? "",
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroup?: ChitGroup;
  onCreated?: (id: string) => void;
}

export function ChitGroupFormDialog({ open, onOpenChange, chitGroup, onCreated }: Props) {
  const isEditing = Boolean(chitGroup);
  const create = useCreateChitGroup();
  const update = useUpdateChitGroup(chitGroup?.id ?? "");
  const mutation = isEditing ? update : create;
  // Once a chit is ACTIVE, structural fields are locked server-side; reflect that in the form.
  const scheduleLocked = Boolean(chitGroup && chitGroup.status !== "DRAFT");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), values: toDefaults(chitGroup) });

  const frequency = watch("frequency");
  const allotmentMethod = watch("allotmentMethod");
  const totalMembers = watch("totalMembers");
  const chitValueRupees = watch("chitValueRupees");
  const startDate = watch("startDate");
  const customIntervalDays = watch("customIntervalDays");

  const installment = totalMembers > 0 && chitValueRupees > 0 ? (chitValueRupees / totalMembers) * 100 : undefined;
  const endDate =
    startDate && totalMembers > 1
      ? previewEndDate(new Date(startDate), frequency, totalMembers, customIntervalDays)
      : null;

  async function onSubmit(values: FormValues) {
    const auctionRules = {
      allotmentMethod: values.allotmentMethod,
      foremanCommissionPercent: values.foremanCommissionPercent,
      minBidDiscountPercent: values.minBidDiscountPercent,
      maxBidDiscountPercent: values.maxBidDiscountPercent,
      bidIncrementPercent: values.bidIncrementPercent,
    };

    if (isEditing) {
      await update.mutateAsync({
        name: values.name,
        termsAndConditions: values.termsAndConditions || undefined,
        ...(scheduleLocked
          ? {}
          : {
              frequency: values.frequency,
              customIntervalDays: values.frequency === "CUSTOM" ? values.customIntervalDays : undefined,
              startDate: values.startDate,
              auctionRules,
            }),
      });
    } else {
      const input: CreateChitGroupInput = {
        name: values.name,
        registrationNumber: values.registrationNumber,
        chitValueRupees: values.chitValueRupees,
        totalMembers: values.totalMembers,
        frequency: values.frequency,
        customIntervalDays: values.frequency === "CUSTOM" ? values.customIntervalDays : undefined,
        startDate: values.startDate,
        auctionRules,
        termsAndConditions: values.termsAndConditions || undefined,
      };
      const result = await create.mutateAsync(input);
      onCreated?.(result.chitGroup.id);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit chit group" : "New chit group"}</DialogTitle>
          <DialogDescription>
            Define the scheme's value, cadence, and auction rules. Cycles equal the member count — everyone wins once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Scheme name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <Field label="Registration number" htmlFor="registrationNumber" error={errors.registrationNumber?.message}>
              <Input id="registrationNumber" {...register("registrationNumber")} disabled={isEditing} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Chit value (₹)" htmlFor="chitValueRupees" error={errors.chitValueRupees?.message}>
              <Input
                id="chitValueRupees"
                type="number"
                disabled={scheduleLocked}
                {...register("chitValueRupees", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Total members"
              htmlFor="totalMembers"
              error={errors.totalMembers?.message}
              helpText="Also the number of cycles"
            >
              <Input
                id="totalMembers"
                type="number"
                disabled={scheduleLocked}
                {...register("totalMembers", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Frequency" htmlFor="frequency">
              <Select
                value={frequency}
                onValueChange={(v: string) => setValue("frequency", v as FormValues["frequency"])}
                disabled={scheduleLocked}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHIT_GROUP_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {frequency === "CUSTOM" ? (
              <Field label="Interval (days)" htmlFor="customIntervalDays" error={errors.customIntervalDays?.message}>
                <Input
                  id="customIntervalDays"
                  type="number"
                  disabled={scheduleLocked}
                  {...register("customIntervalDays", { valueAsNumber: true })}
                />
              </Field>
            ) : (
              <div />
            )}
            <Field label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
              <Input id="startDate" type="date" disabled={scheduleLocked} {...register("startDate")} />
            </Field>
          </div>

          <div className="rounded-md border border-border-default bg-bg-raised px-4 py-3 text-sm text-text-secondary">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Installment / cycle:{" "}
                <strong className="text-text-primary">{installment ? formatPaise(installment) : "—"}</strong>
              </span>
              <span>
                Ends: <strong className="text-text-primary">{endDate ? formatDate(endDate.toISOString()) : "—"}</strong>
              </span>
              <span>
                Duration: <strong className="text-text-primary">{totalMembers > 1 ? `${totalMembers} cycles` : "—"}</strong>
              </span>
            </div>
          </div>

          <div className="border-t border-border-default pt-4">
            <Field label="Allotment method" htmlFor="allotmentMethod" helpText="How each cycle's winner is decided">
              <Select
                value={allotmentMethod}
                onValueChange={(v: string) => setValue("allotmentMethod", v as FormValues["allotmentMethod"])}
                disabled={scheduleLocked}
              >
                <SelectTrigger id="allotmentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUCTION">Auction (members bid a discount)</SelectItem>
                  <SelectItem value="LOTTERY">Lottery (random draw)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Foreman commission (%)"
              htmlFor="foremanCommissionPercent"
              error={errors.foremanCommissionPercent?.message}
            >
              <Input
                id="foremanCommissionPercent"
                type="number"
                step="0.5"
                disabled={scheduleLocked}
                {...register("foremanCommissionPercent", { valueAsNumber: true })}
              />
            </Field>
            {allotmentMethod === "AUCTION" ? (
              <Field
                label="Max bid discount (%)"
                htmlFor="maxBidDiscountPercent"
                error={errors.maxBidDiscountPercent?.message}
                helpText="Statutory cap"
              >
                <Input
                  id="maxBidDiscountPercent"
                  type="number"
                  step="0.5"
                  disabled={scheduleLocked}
                  {...register("maxBidDiscountPercent", { valueAsNumber: true })}
                />
              </Field>
            ) : (
              <div />
            )}
          </div>

          {allotmentMethod === "AUCTION" ? (
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Min bid discount (%)"
                htmlFor="minBidDiscountPercent"
                error={errors.minBidDiscountPercent?.message}
              >
                <Input
                  id="minBidDiscountPercent"
                  type="number"
                  step="0.5"
                  disabled={scheduleLocked}
                  {...register("minBidDiscountPercent", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Bid increment (%)" htmlFor="bidIncrementPercent" error={errors.bidIncrementPercent?.message}>
                <Input
                  id="bidIncrementPercent"
                  type="number"
                  step="0.5"
                  disabled={scheduleLocked}
                  {...register("bidIncrementPercent", { valueAsNumber: true })}
                />
              </Field>
            </div>
          ) : null}

          <Field label="Terms & conditions (optional)" htmlFor="termsAndConditions">
            <Textarea id="termsAndConditions" rows={4} {...register("termsAndConditions")} />
          </Field>

          {scheduleLocked ? (
            <p className="text-xs text-text-secondary">
              This scheme is active — value, schedule and auction rules are locked. Name and terms remain editable.
            </p>
          ) : null}

          {mutation.isError ? (
            <p className="text-sm text-bad-fg">
              {mutation.error instanceof ApiError ? mutation.error.message : "Something went wrong"}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create chit group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
