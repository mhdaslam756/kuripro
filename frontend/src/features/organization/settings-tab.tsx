import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import type { Organization } from "./types";
import { useUpdateSettings } from "./use-organization";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const settingsSchema = z.object({
  defaultForemanCommissionPercent: z.number().min(0).max(100),
  defaultMaxBidDiscountPercent: z.number().min(0).max(100),
  currency: z.string().min(1),
  financialYearStartMonth: z.number().int().min(1).max(12),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsTab({ organization }: { organization: Organization }) {
  const updateSettings = useUpdateSettings();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: organization.settings,
  });

  const financialYearStartMonth = watch("financialYearStartMonth");

  async function onSubmit(values: SettingsFormValues) {
    setSuccessMessage(null);
    try {
      await updateSettings.mutateAsync(values);
      setSuccessMessage("Settings saved");
      reset(values);
    } catch {
      // surfaced below via updateSettings.error
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex max-w-lg flex-col gap-4">
      <Field
        label="Default foreman commission (%)"
        htmlFor="defaultForemanCommissionPercent"
        error={errors.defaultForemanCommissionPercent?.message}
        helpText="Applied to new chit groups unless overridden per scheme"
      >
        <Input
          id="defaultForemanCommissionPercent"
          type="number"
          step="0.1"
          {...register("defaultForemanCommissionPercent", { valueAsNumber: true })}
        />
      </Field>

      <Field
        label="Default max bid discount (%)"
        htmlFor="defaultMaxBidDiscountPercent"
        error={errors.defaultMaxBidDiscountPercent?.message}
        helpText="Statutory cap on auction discount, per the Chit Funds Act"
      >
        <Input
          id="defaultMaxBidDiscountPercent"
          type="number"
          step="0.1"
          {...register("defaultMaxBidDiscountPercent", { valueAsNumber: true })}
        />
      </Field>

      <Field label="Currency" htmlFor="currency" error={errors.currency?.message}>
        <Input id="currency" {...register("currency")} />
      </Field>

      <Field
        label="Financial year starts in"
        htmlFor="financialYearStartMonth"
        error={errors.financialYearStartMonth?.message}
      >
        <Select
          value={String(financialYearStartMonth)}
          onValueChange={(value: string) => setValue("financialYearStartMonth", Number(value), { shouldDirty: true })}
        >
          <SelectTrigger id="financialYearStartMonth">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, index) => (
              <SelectItem key={month} value={String(index + 1)}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {updateSettings.isError ? (
        <p className="text-sm text-bad-fg">
          {updateSettings.error instanceof ApiError ? updateSettings.error.message : "Something went wrong"}
        </p>
      ) : null}
      {successMessage ? <p className="text-sm text-good-fg">{successMessage}</p> : null}

      <div>
        <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
