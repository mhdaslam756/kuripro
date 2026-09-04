import * as DialogPrimitive from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Coins,
  FileText,
  Gavel,
  Hash,
  IndianRupee,
  Landmark,
  Percent,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
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

interface FormFieldProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function FormField({ icon: Icon, label, error, helpText, disabled, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          {Icon ? <Icon className="size-3.5 text-accent-primary shrink-0" /> : null}
          {label}
        </label>
        {helpText && !error ? <span className="text-[11px] text-text-tertiary">{helpText}</span> : null}
      </div>
      <div
        className={cn(
          "relative flex items-center rounded-2xl bg-bg-raised border border-border-default/80 transition-all px-3.5 py-2.5 sm:py-3",
          error
            ? "border-bad-border bg-bad-bg/30"
            : "focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface",
          disabled && "opacity-60 cursor-not-allowed bg-bg-raised/50"
        )}
      >
        {children}
      </div>
      {error ? <p className="text-[11px] font-medium text-bad-fg px-1">{error}</p> : null}
    </div>
  );
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-bg-surface shadow-2xl focus:outline-none flex flex-col transition ease-in-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
            /* Mobile View: Bottom Sheet Drawer */
            "inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-[32px] border-t border-border-default",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            /* Desktop View: Slide-over Right Drawer */
            "sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:bottom-0 sm:h-full sm:max-h-full",
            "sm:w-full sm:max-w-xl md:max-w-2xl sm:rounded-t-none sm:rounded-l-[32px] sm:rounded-r-none",
            "sm:border-t-0 sm:border-l sm:border-border-default",
            "sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right"
          )}
        >
          {/* Mobile Drag Handle */}
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-border-strong/40 sm:hidden" />

          {/* Drawer Header (Fixed at top) */}
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4 sm:py-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary shrink-0 border border-accent-primary/20">
                <Landmark className="size-5.5" />
              </div>
              <div>
                <DialogPrimitive.Title className="font-display text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                  {isEditing ? "Edit Chit Group" : "Register Chit Group"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  Define the scheme's value, cadence, and auction rules.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="flex size-9 items-center justify-center rounded-full bg-bg-raised text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-all active-bounce">
              <X size={18} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Drawer Body (Scrollable Form Content) */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="chit-group-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-6">
              {/* Section 1: General Info */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-primary/15 text-[11px] font-bold text-accent-primary">
                    1
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Scheme Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField icon={Building2} label="Scheme Name" error={errors.name?.message}>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. Gold Scheme 2026"
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                      {...register("name")}
                    />
                  </FormField>

                  <FormField
                    icon={Hash}
                    label="Registration Number"
                    error={errors.registrationNumber?.message}
                    disabled={isEditing}
                  >
                    <input
                      id="registrationNumber"
                      type="text"
                      placeholder="e.g. REG-1049"
                      disabled={isEditing}
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                      {...register("registrationNumber")}
                    />
                  </FormField>
                </div>
              </div>

              {/* Section 2: Valuation & Cadence */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-primary/15 text-[11px] font-bold text-accent-primary">
                    2
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Valuation & Cadence
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    icon={IndianRupee}
                    label="Chit Value (₹)"
                    error={errors.chitValueRupees?.message}
                    disabled={scheduleLocked}
                  >
                    <input
                      id="chitValueRupees"
                      type="number"
                      placeholder="e.g. 100000"
                      disabled={scheduleLocked}
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                      {...register("chitValueRupees", { valueAsNumber: true })}
                    />
                  </FormField>

                  <FormField
                    icon={Users}
                    label="Total Members"
                    helpText="Equals number of cycles"
                    error={errors.totalMembers?.message}
                    disabled={scheduleLocked}
                  >
                    <input
                      id="totalMembers"
                      type="number"
                      placeholder="e.g. 20"
                      disabled={scheduleLocked}
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                      {...register("totalMembers", { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField icon={CalendarDays} label="Frequency" disabled={scheduleLocked}>
                    <Select
                      value={frequency}
                      onValueChange={(v: string) => setValue("frequency", v as FormValues["frequency"])}
                      disabled={scheduleLocked}
                    >
                      <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm font-medium text-text-primary focus:ring-0 focus:border-0 shadow-none min-h-0">
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
                  </FormField>

                  {frequency === "CUSTOM" ? (
                    <FormField
                      icon={Clock}
                      label="Interval (Days)"
                      error={errors.customIntervalDays?.message}
                      disabled={scheduleLocked}
                    >
                      <input
                        id="customIntervalDays"
                        type="number"
                        placeholder="e.g. 15"
                        disabled={scheduleLocked}
                        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                        {...register("customIntervalDays", { valueAsNumber: true })}
                      />
                    </FormField>
                  ) : null}

                  <FormField
                    icon={Calendar}
                    label="Start Date"
                    error={errors.startDate?.message}
                    disabled={scheduleLocked}
                  >
                    <input
                      id="startDate"
                      type="date"
                      disabled={scheduleLocked}
                      className="w-full bg-transparent text-sm font-medium text-text-primary outline-none disabled:cursor-not-allowed cursor-pointer"
                      {...register("startDate")}
                    />
                  </FormField>
                </div>

                {/* Live Calculation Preview Card */}
                <div className="relative overflow-hidden rounded-2xl border border-accent-primary/20 bg-gradient-to-br from-accent-primary/10 via-bg-raised to-bg-surface p-4 text-text-secondary shadow-xs mt-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex size-6 items-center justify-center rounded-lg bg-accent-primary text-white">
                      <Sparkles size={13} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">
                      Live Calculation Summary
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-bg-surface/80 border border-border-default/50 p-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block">
                        Installment / Cycle
                      </span>
                      <strong className="text-base font-bold text-accent-primary mt-0.5 block">
                        {installment ? formatPaise(installment) : "—"}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-bg-surface/80 border border-border-default/50 p-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block">
                        Estimated End Date
                      </span>
                      <strong className="text-sm font-bold text-text-primary mt-0.5 block">
                        {endDate ? formatDate(endDate.toISOString()) : "—"}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-bg-surface/80 border border-border-default/50 p-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block">
                        Total Duration
                      </span>
                      <strong className="text-sm font-bold text-text-primary mt-0.5 block">
                        {totalMembers > 1 ? `${totalMembers} cycles` : "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Allotment & Auction Rules */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-primary/15 text-[11px] font-bold text-accent-primary">
                    3
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Auction & Allotment Rules
                  </h3>
                </div>

                <FormField
                  icon={Gavel}
                  label="Allotment Method"
                  helpText="How each cycle's winner is decided"
                  disabled={scheduleLocked}
                >
                  <Select
                    value={allotmentMethod}
                    onValueChange={(v: string) => setValue("allotmentMethod", v as FormValues["allotmentMethod"])}
                    disabled={scheduleLocked}
                  >
                    <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm font-medium text-text-primary focus:ring-0 focus:border-0 shadow-none min-h-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUCTION">Auction (members bid a discount)</SelectItem>
                      <SelectItem value="LOTTERY">Lottery (random draw)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    icon={Percent}
                    label="Foreman Commission (%)"
                    error={errors.foremanCommissionPercent?.message}
                    disabled={scheduleLocked}
                  >
                    <input
                      id="foremanCommissionPercent"
                      type="number"
                      step="0.5"
                      disabled={scheduleLocked}
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                      {...register("foremanCommissionPercent", { valueAsNumber: true })}
                    />
                  </FormField>

                  {allotmentMethod === "AUCTION" ? (
                    <FormField
                      icon={TrendingDown}
                      label="Max Bid Discount (%)"
                      helpText="Statutory cap"
                      error={errors.maxBidDiscountPercent?.message}
                      disabled={scheduleLocked}
                    >
                      <input
                        id="maxBidDiscountPercent"
                        type="number"
                        step="0.5"
                        disabled={scheduleLocked}
                        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                        {...register("maxBidDiscountPercent", { valueAsNumber: true })}
                      />
                    </FormField>
                  ) : null}
                </div>

                {allotmentMethod === "AUCTION" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      icon={TrendingUp}
                      label="Min Bid Discount (%)"
                      error={errors.minBidDiscountPercent?.message}
                      disabled={scheduleLocked}
                    >
                      <input
                        id="minBidDiscountPercent"
                        type="number"
                        step="0.5"
                        disabled={scheduleLocked}
                        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                        {...register("minBidDiscountPercent", { valueAsNumber: true })}
                      />
                    </FormField>

                    <FormField
                      icon={ArrowUpRight}
                      label="Bid Increment (%)"
                      error={errors.bidIncrementPercent?.message}
                      disabled={scheduleLocked}
                    >
                      <input
                        id="bidIncrementPercent"
                        type="number"
                        step="0.5"
                        disabled={scheduleLocked}
                        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none disabled:cursor-not-allowed"
                        {...register("bidIncrementPercent", { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>

              {/* Section 4: Terms & Conditions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent-primary/15 text-[11px] font-bold text-accent-primary">
                    4
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Terms & Conditions
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <FileText className="size-3.5 text-accent-primary shrink-0" />
                    Agreement & Rules (Optional)
                  </label>
                  <textarea
                    id="termsAndConditions"
                    rows={3}
                    placeholder="Specify rules, late fee penalties, or disbursement criteria..."
                    className="w-full rounded-2xl bg-bg-raised border border-border-default/80 p-3.5 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:bg-bg-surface resize-none"
                    {...register("termsAndConditions")}
                  />
                </div>
              </div>

              {/* Active Scheme Notice */}
              {scheduleLocked ? (
                <div className="rounded-2xl border border-warn-border bg-warn-bg/20 p-3.5 text-xs text-warn-fg flex items-start gap-2.5">
                  <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
                  <span>
                    This scheme is currently active. Financial values, schedules, and auction rules are locked. Scheme name and terms remain editable.
                  </span>
                </div>
              ) : null}

              {/* Submission Error Banner */}
              {mutation.isError ? (
                <div className="rounded-2xl border border-bad-border bg-bad-bg/30 p-3.5 text-xs text-bad-fg flex items-start gap-2.5">
                  <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
                  <span>
                    {mutation.error instanceof ApiError ? mutation.error.message : "Something went wrong — please try again."}
                  </span>
                </div>
              ) : null}
            </form>
          </div>

          {/* Drawer Footer (Sticky action bar at bottom) */}
          <div className="sticky bottom-0 bg-bg-surface/95 backdrop-blur-md border-t border-border-default px-6 py-4 sm:py-4.5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-11 px-5 rounded-xl font-semibold active-bounce"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="chit-group-form"
              disabled={mutation.isPending}
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-accent-primary hover:bg-brand-700 text-white shadow-lg shadow-purple-600/20 active-bounce flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                "Saving…"
              ) : isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Coins className="size-4" />
                  <span>Register Chit Group</span>
                </>
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
