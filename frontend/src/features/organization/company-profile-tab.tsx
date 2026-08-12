import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import type { Organization } from "./types";
import { useUpdateCompanyProfile } from "./use-organization";

const profileSchema = z.object({
  name: z.string().min(2, "Required"),
  registrationNumber: z.string().min(3, "Required"),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().min(7, "Required"),
  line1: z.string().min(1, "Required"),
  line2: z.string().optional(),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  pincode: z.string().min(1, "Required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function CompanyProfileTab({ organization }: { organization: Organization }) {
  const updateProfile = useUpdateCompanyProfile();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: organization.name,
      registrationNumber: organization.registrationNumber,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      line1: organization.address.line1,
      line2: organization.address.line2 ?? "",
      city: organization.address.city,
      state: organization.address.state,
      pincode: organization.address.pincode,
    },
  });

  useEffect(() => {
    setSuccessMessage(null);
  }, [organization]);

  async function onSubmit(values: ProfileFormValues) {
    setSuccessMessage(null);
    try {
      await updateProfile.mutateAsync({
        name: values.name,
        registrationNumber: values.registrationNumber,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        address: {
          line1: values.line1,
          line2: values.line2 || undefined,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          country: organization.address.country,
        },
      });
      setSuccessMessage("Company profile saved");
      reset(values);
    } catch {
      // surfaced via updateProfile.error below
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Organization name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </Field>
        <Field label="Registration number" htmlFor="registrationNumber" error={errors.registrationNumber?.message}>
          <Input id="registrationNumber" {...register("registrationNumber")} />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
          <Input id="contactEmail" type="email" {...register("contactEmail")} />
        </Field>
        <Field label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone?.message}>
          <Input id="contactPhone" {...register("contactPhone")} />
        </Field>
      </div>

      <hr className="border-border-default" />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Address line 1" htmlFor="line1" error={errors.line1?.message}>
          <Input id="line1" {...register("line1")} />
        </Field>
        <Field label="Address line 2" htmlFor="line2">
          <Input id="line2" {...register("line2")} />
        </Field>
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

      {updateProfile.isError ? (
        <p className="text-sm text-bad-fg">
          {updateProfile.error instanceof ApiError ? updateProfile.error.message : "Something went wrong"}
        </p>
      ) : null}
      {successMessage ? <p className="text-sm text-good-fg">{successMessage}</p> : null}

      <div>
        <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
              🔗 Public Member Registration Link
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Share this link with potential members to let them self-register for your organization.
            </p>
          </div>
          <a
            href={`/portal/${organization.slug}/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-accent-primary hover:underline shrink-0"
          >
            Open Form ↗
          </a>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            readOnly
            value={`${window.location.origin}/portal/${organization.slug}/register`}
            className="font-mono text-xs bg-bg-surface"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/portal/${organization.slug}/register`);
              setSuccessMessage("Public member registration link copied to clipboard!");
            }}
          >
            Copy Link
          </Button>
        </div>
      </div>
    </form>
  );
}
