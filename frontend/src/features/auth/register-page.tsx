import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, FileText, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { EmailVerificationDialog } from "./components/email-verification-dialog";
import { RegisterIllustration } from "./components/register-illustration";

const PASSWORD_HINT = "At least 10 characters, with uppercase, lowercase, and a digit";

const registerSchema = z.object({
  tenantName: z.string().min(2, "Enter your organization's name"),
  registrationNumber: z.string().min(3, "Enter your statutory registration number"),
  contactEmail: z.string().email("Enter a valid email address"),
  contactPhone: z.string().min(7, "Enter a valid phone number"),
  line1: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  pincode: z.string().min(1, "Pincode required"),
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
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    try {
      const res = await api.post<{
        isPendingApproval: boolean;
        requireEmailVerification?: boolean;
        email?: string;
        message: string;
        accessToken?: string;
      }>("/auth/register-organizer", {
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

      if (res.requireEmailVerification) {
        setVerificationEmail(values.organizerEmail);
        setShowVerification(true);
      } else if (res.accessToken) {
        navigate("/dashboard", { replace: true });
      } else {
        setIsPendingApproval(true);
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong — please try again");
    }
  }

  function handleVerified(result: { isPendingApproval: boolean; accessToken?: string }) {
    setShowVerification(false);
    if (result.accessToken) {
      navigate("/dashboard", { replace: true });
    } else {
      setIsPendingApproval(true);
    }
  }

  if (isPendingApproval) {
    return (
      <div className="relative min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden bg-bg-app">
        <div className="relative w-full max-w-md rounded-3xl border border-border-default bg-bg-surface p-8 shadow-2xl text-center">
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
          <div className="my-5 rounded-2xl border border-border-default bg-bg-raised p-4 text-xs text-text-secondary text-left space-y-1.5">
            <p>• <strong>Status:</strong> Awaiting Approval</p>
            <p>• <strong>Action:</strong> Super Admin will activate your workspace shortly.</p>
            <p>• Once approved, you can log in with your phone number/email and password.</p>
          </div>
          <Button onClick={() => navigate("/login")} className="w-full rounded-2xl h-12 bg-accent-primary hover:bg-brand-700 text-text-on-brand font-bold active-bounce">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center p-0 sm:px-6 sm:py-8 overflow-x-hidden bg-bg-surface sm:bg-bg-app font-sans antialiased">
      {/* ── Project ambient background glows (Desktop only) ── */}
      <div className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-accent-primary/10 blur-3xl hidden sm:block" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 size-96 rounded-full bg-primary-purple/10 blur-3xl hidden sm:block" />

      {/* ── Full Page Container on Mobile / Elevated Card on Desktop ── */}
      <div className="relative w-full min-h-screen sm:min-h-0 sm:max-w-2xl rounded-none sm:rounded-3xl bg-bg-surface border-0 sm:border sm:border-border-default shadow-none sm:shadow-xl px-6 py-8 sm:px-8 sm:py-8 z-10 flex flex-col justify-center">
        {/* Vector Illustration */}
        <div className="mb-2">
          <RegisterIllustration />
        </div>

        {/* Register Headings */}
        <div className="mt-1 mb-5 text-left">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-text-primary tracking-tight">
            Register
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-text-secondary font-medium">
            Please register your organization to continue.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-4">
          {/* Section 1: Organization Details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
              <Building2 size={13} className="text-accent-primary" /> Organization Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tenant Name */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.tenantName
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Building2 className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="tenantName"
                    type="text"
                    placeholder="Organization Name"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("tenantName")}
                  />
                </div>
                {errors.tenantName ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.tenantName.message}</p>
                ) : null}
              </div>

              {/* Registration Number */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.registrationNumber
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <FileText className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="registrationNumber"
                    type="text"
                    placeholder="Registration Number"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("registrationNumber")}
                  />
                </div>
                {errors.registrationNumber ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.registrationNumber.message}</p>
                ) : null}
              </div>

              {/* Contact Email */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.contactEmail
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Mail className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder="Organization Contact Email"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("contactEmail")}
                  />
                </div>
                {errors.contactEmail ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.contactEmail.message}</p>
                ) : null}
              </div>

              {/* Contact Phone */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.contactPhone
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Phone className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="contactPhone"
                    type="tel"
                    placeholder="Organization Phone"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("contactPhone")}
                  />
                </div>
                {errors.contactPhone ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.contactPhone.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
              <MapPin size={13} className="text-accent-primary" /> Registered Address
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.line1
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <MapPin className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="line1"
                    type="text"
                    placeholder="Address Line 1"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("line1")}
                  />
                </div>
                {errors.line1 ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.line1.message}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div
                    className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                      errors.city
                        ? "border-bad-border bg-bad-bg/40"
                        : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                    }`}
                  >
                    <input
                      id="city"
                      type="text"
                      placeholder="City"
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                      {...register("city")}
                    />
                  </div>
                  {errors.city ? (
                    <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.city.message}</p>
                  ) : null}
                </div>

                <div>
                  <div
                    className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                      errors.state
                        ? "border-bad-border bg-bad-bg/40"
                        : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                    }`}
                  >
                    <input
                      id="state"
                      type="text"
                      placeholder="State"
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                      {...register("state")}
                    />
                  </div>
                  {errors.state ? (
                    <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.state.message}</p>
                  ) : null}
                </div>

                <div>
                  <div
                    className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                      errors.pincode
                        ? "border-bad-border bg-bad-bg/40"
                        : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                    }`}
                  >
                    <input
                      id="pincode"
                      type="text"
                      placeholder="Pincode"
                      className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                      {...register("pincode")}
                    />
                  </div>
                  {errors.pincode ? (
                    <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.pincode.message}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Organizer Account Details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
              <User size={13} className="text-accent-primary" /> Organizer Account (Admin)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Organizer Name */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.organizerName
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <User className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="organizerName"
                    type="text"
                    placeholder="Your Full Name"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("organizerName")}
                  />
                </div>
                {errors.organizerName ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.organizerName.message}</p>
                ) : null}
              </div>

              {/* Organizer Phone */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.organizerPhone
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Phone className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="organizerPhone"
                    type="tel"
                    placeholder="Your Phone Number"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("organizerPhone")}
                  />
                </div>
                {errors.organizerPhone ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.organizerPhone.message}</p>
                ) : null}
              </div>

              {/* Organizer Email (Login ID) */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.organizerEmail
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Mail className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="organizerEmail"
                    type="email"
                    placeholder="Your Email (Login ID)"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("organizerEmail")}
                  />
                </div>
                {errors.organizerEmail ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.organizerEmail.message}</p>
                ) : null}
              </div>

              {/* Password */}
              <div>
                <div
                  className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3 sm:py-3.5 ${
                    errors.organizerPassword
                      ? "border-bad-border bg-bad-bg/40"
                      : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
                  }`}
                >
                  <Lock className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
                  <input
                    id="organizerPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (10+ characters)"
                    autoComplete="new-password"
                    className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                    {...register("organizerPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-text-secondary hover:text-text-primary transition-colors p-1 shrink-0"
                  >
                    {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                  </button>
                </div>
                {errors.organizerPassword ? (
                  <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.organizerPassword.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {formError ? (
            <p className="rounded-xl border border-bad-border bg-bad-bg px-3.5 py-2.5 text-xs font-medium text-bad-fg text-center leading-relaxed">
              {formError}
            </p>
          ) : null}

          {/* Action Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 sm:h-13 mt-2 rounded-2xl bg-accent-primary hover:bg-brand-700 text-text-on-brand font-bold text-sm sm:text-base tracking-wide shadow-lg shadow-purple-600/25 active-bounce transition-all cursor-pointer"
          >
            {isSubmitting ? "Submitting Application…" : "Sign Up"}
          </Button>
        </form>

        {/* Footer: "Already have an account? Sign In" */}
        <p className="mt-6 text-center text-xs sm:text-sm text-text-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-accent-primary hover:underline ml-1">
            Sign In
          </Link>
        </p>
      </div>

      <EmailVerificationDialog
        open={showVerification}
        email={verificationEmail}
        onClose={() => setShowVerification(false)}
        onVerified={handleVerified}
      />
    </div>
  );
}
