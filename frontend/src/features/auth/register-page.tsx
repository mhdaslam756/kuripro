import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";

const PASSWORD_HINT = "At least 10 characters, with an uppercase letter, a lowercase letter, and a digit";

const registerSchema = z.object({
  tenantName: z.string().min(2, "Enter your organization's name"),
  registrationNumber: z.string().min(3, "Enter your statutory registration number"),
  contactEmail: z.string().email("Enter a valid email address"),
  contactPhone: z.string().min(7, "Enter a valid phone number"),
  line1: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  pincode: z.string().min(1, "Required"),
  organizerName: z.string().min(2, "Enter your name"),
  organizerEmail: z.string().email("Enter a valid email address"),
  organizerPhone: z.string().min(7, "Enter a valid phone number"),
  organizerPassword: z
    .string()
    .min(10, PASSWORD_HINT)
    .refine((v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v), { message: PASSWORD_HINT }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [registeredOrgName, setRegisteredOrgName] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    try {
      await api.post<{ isPendingApproval: boolean; message: string }>("/auth/register-organizer", {
        tenantName: values.tenantName,
        registrationNumber: values.registrationNumber,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        address: { line1: values.line1, city: values.city, state: values.state, pincode: values.pincode },
        organizerName: values.organizerName,
        organizerEmail: values.organizerEmail,
        organizerPhone: values.organizerPhone,
        organizerPassword: values.organizerPassword,
      });
      setRegisteredOrgName(values.tenantName);
      setIsPendingApproval(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong — please try again");
    }
  }

  if (isPendingApproval) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-4 py-10">
        <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-bg-surface p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-warn-bg text-warn-fg shadow-sm">
            <span className="font-display text-2xl font-bold">✓</span>
          </div>
          <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-bold text-warn-fg uppercase tracking-wider">
            Pending Super Admin Review
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold text-text-primary">
            Registration Submitted!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Thank you for registering <strong className="text-text-primary">{registeredOrgName}</strong>. Your organization application has been sent to the Super Admin for review.
          </p>
          <div className="my-5 rounded-xl border border-border-default bg-bg-raised p-4 text-xs text-text-secondary text-left space-y-1.5">
            <p>• <strong>Status:</strong> Awaiting Approval</p>
            <p>• <strong>Action:</strong> Super Admin will activate your workspace shortly.</p>
            <p>• Once approved, you can log in with your phone number/email and password.</p>
          </div>
          <Button onClick={() => navigate("/login")} className="w-full active-bounce">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-4 py-10">
      <div className="absolute -left-24 top-12 size-80 rounded-full bg-brand-200/35 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 size-96 rounded-full bg-[var(--good-100)]/80 blur-3xl" />
      <div className="relative w-full max-w-xl rounded-xl border border-border-default bg-bg-surface/95 p-6 shadow-[0_18px_50px_rgb(30_33_42/0.12)] backdrop-blur sm:p-8">
        <div className="mb-7">
          <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-accent-primary font-display text-xl font-bold text-text-on-brand shadow-[0_6px_16px_rgb(114_83_32/0.22)]">K</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">Build your home base</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Set up your organization and organizer account in a few simple steps.</p>
        </div>

        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization name" htmlFor="tenantName" error={errors.tenantName?.message}>
              <Input id="tenantName" {...register("tenantName")} />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" htmlFor="line1" error={errors.line1?.message}>
              <Input id="line1" {...register("line1")} />
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

          <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-border-default" /><span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Organizer details</span><span className="h-px flex-1 bg-border-default" /></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="organizerName" error={errors.organizerName?.message}>
              <Input id="organizerName" {...register("organizerName")} />
            </Field>
            <Field label="Your phone" htmlFor="organizerPhone" error={errors.organizerPhone?.message}>
              <Input id="organizerPhone" {...register("organizerPhone")} />
            </Field>
            <Field label="Your email (login)" htmlFor="organizerEmail" error={errors.organizerEmail?.message}>
              <Input id="organizerEmail" type="email" {...register("organizerEmail")} />
            </Field>
            <Field
              label="Password"
              htmlFor="organizerPassword"
              error={errors.organizerPassword?.message}
              helpText={!errors.organizerPassword ? PASSWORD_HINT : undefined}
            >
              <Input id="organizerPassword" type="password" {...register("organizerPassword")} />
            </Field>
          </div>

          {formError ? <p className="rounded-md border border-bad-border bg-bad-bg px-3 py-2.5 text-sm text-bad-fg">{formError}</p> : null}

          <Button type="submit" size="lg" disabled={isSubmitting} className="active-bounce">
            {isSubmitting ? "Submitting application…" : "Register organization"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent-link hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
