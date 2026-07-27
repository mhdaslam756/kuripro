import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/features/branches/use-branches";
import { ApiError } from "@/lib/api-client";
import type { ResolvedPlace } from "@/lib/google-maps";
import { GENDERS, OCCUPATION_TYPES, type Member } from "../types";
import { humanize } from "@/lib/format";
import { useRegisterMember, useUpdateMember, type RegisterMemberInput } from "../use-members";
import { AddressAutocomplete, MapsUnconfiguredHint } from "./address-autocomplete";

const schema = z.object({
  name: z.string().min(2, "Required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(GENDERS).optional(),
  dateOfBirth: z.string().optional(),
  occupationType: z.enum(OCCUPATION_TYPES),
  employerOrBusinessName: z.string().optional(),
  monthlyIncomeRupees: z.string().optional(),
  branchId: z.string().optional(),
  line1: z.string().min(1, "Required"),
  line2: z.string().optional(),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  pincode: z.string().regex(/^\d{6}$/, "6 digits"),
});

type FormValues = z.infer<typeof schema>;

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (memberId: string) => void;
  /** When provided, the dialog edits this member instead of registering a new one. */
  member?: Member;
}

function toDefaults(member: Member | undefined): FormValues {
  if (!member) {
    return { name: "", phone: "", line1: "", city: "", state: "", pincode: "", occupationType: "SELF_EMPLOYED" };
  }
  return {
    name: member.name,
    phone: member.phone,
    email: member.email ?? "",
    gender: member.gender,
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : "",
    occupationType: member.occupation.type,
    employerOrBusinessName: member.occupation.employerOrBusinessName ?? "",
    monthlyIncomeRupees: member.occupation.monthlyIncome ? String(member.occupation.monthlyIncome / 100) : "",
    branchId: member.branchId,
    line1: member.address.line1,
    line2: member.address.line2 ?? "",
    city: member.address.city,
    state: member.address.state,
    pincode: member.address.pincode,
  };
}

export function MemberFormDialog({ open, onOpenChange, onCreated, member }: MemberFormDialogProps) {
  const isEditing = Boolean(member);
  const registerMember = useRegisterMember();
  const updateMember = useUpdateMember(member?.id ?? "");
  const mutation = isEditing ? updateMember : registerMember;
  const { data: branches } = useBranches();
  const [geo, setGeo] = useState<Pick<ResolvedPlace, "lat" | "lng" | "placeId" | "formattedAddress"> | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toDefaults(member),
  });

  const occupationType = watch("occupationType");
  const gender = watch("gender");
  const branchId = watch("branchId");

  function handleResolved(place: ResolvedPlace) {
    setValue("line1", place.line1, { shouldValidate: true });
    if (place.city) setValue("city", place.city, { shouldValidate: true });
    if (place.state) setValue("state", place.state, { shouldValidate: true });
    if (place.pincode) setValue("pincode", place.pincode, { shouldValidate: true });
    setGeo({ lat: place.lat, lng: place.lng, placeId: place.placeId, formattedAddress: place.formattedAddress });
  }

  async function onSubmit(values: FormValues) {
    const input: RegisterMemberInput = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth || undefined,
      branchId: values.branchId || undefined,
      occupation: {
        type: values.occupationType,
        employerOrBusinessName: values.employerOrBusinessName || undefined,
        monthlyIncomeRupees: values.monthlyIncomeRupees ? Number(values.monthlyIncomeRupees) : undefined,
      },
      address: {
        line1: values.line1,
        line2: values.line2 || undefined,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        country: "India",
        ...geo,
      },
    };

    if (isEditing) {
      await updateMember.mutateAsync(input);
    } else {
      const result = await registerMember.mutateAsync(input);
      onCreated?.(result.member.id);
    }
    reset();
    setGeo(undefined);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit member" : "Register member"}</DialogTitle>
          <DialogDescription>Capture the member's identity, occupation, and address.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" {...register("phone")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email (optional)" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Field label="Date of birth (optional)" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender (optional)" htmlFor="gender">
              <Select value={gender ?? ""} onValueChange={(value: string) => setValue("gender", value as FormValues["gender"])}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {humanize(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch (optional)" htmlFor="branchId">
              <Select value={branchId ?? ""} onValueChange={(value: string) => setValue("branchId", value)}>
                <SelectTrigger id="branchId">
                  <SelectValue placeholder="Head office" />
                </SelectTrigger>
                <SelectContent>
                  {(branches?.items ?? []).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Occupation" htmlFor="occupationType" error={errors.occupationType?.message}>
              <Select
                value={occupationType}
                onValueChange={(value: string) => setValue("occupationType", value as FormValues["occupationType"])}
              >
                <SelectTrigger id="occupationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {humanize(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employer / business (optional)" htmlFor="employerOrBusinessName">
              <Input id="employerOrBusinessName" {...register("employerOrBusinessName")} />
            </Field>
          </div>

          <Field
            label="Monthly income ₹ (optional)"
            htmlFor="monthlyIncomeRupees"
            error={errors.monthlyIncomeRupees?.message}
          >
            <Input id="monthlyIncomeRupees" type="number" {...register("monthlyIncomeRupees")} />
          </Field>

          <div className="border-t border-border-default pt-4">
            <Field label="Street address" htmlFor="line1" error={errors.line1?.message}>
              <AddressAutocomplete id="line1" onResolved={handleResolved} onTextChange={(v) => setValue("line1", v)} />
            </Field>
            <div className="mt-1">
              <MapsUnconfiguredHint />
            </div>
          </div>

          <Field label="Address line 2 (optional)" htmlFor="line2">
            <Input id="line2" {...register("line2")} />
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
              {mutation.isPending
                ? isEditing
                  ? "Saving…"
                  : "Registering…"
                : isEditing
                  ? "Save changes"
                  : "Register member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
