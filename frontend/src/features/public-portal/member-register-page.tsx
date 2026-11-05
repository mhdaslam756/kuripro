import { AlertCircle, ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isValidMobileNumber, MOBILE_NUMBER_MESSAGE, MobileInput } from "@/components/ui/mobile-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { EmailVerificationDialog } from "@/features/auth/components/email-verification-dialog";
import { RegisterIllustration } from "@/features/auth/components/register-illustration";
import { PublicPortalLayout } from "./public-portal-layout";
import { usePublicJoin, usePublicMemberRegister, usePublicOrg, usePublicPhoneCheck, usePublicVerifyAccount, type PublicPhoneCheck } from "./use-public-portal";

const OCCUPATION_OPTIONS = [
  { value: "SALARIED", label: "Salaried Employee" },
  { value: "SELF_EMPLOYED", label: "Self Employed / Freelancer" },
  { value: "BUSINESS_OWNER", label: "Business Owner / Entrepreneur" },
  { value: "HOMEMAKER", label: "Homemaker" },
  { value: "STUDENT", label: "Student" },
  { value: "RETIRED", label: "Retired" },
  { value: "OTHER", label: "Other" },
];

export function MemberRegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: org } = usePublicOrg(slug);
  const registerMutation = usePublicMemberRegister(slug || "");
  const phoneCheck = usePublicPhoneCheck(slug || "");
  const joinMutation = usePublicJoin(slug || "");
  const verifyMutation = usePublicVerifyAccount(slug || "");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    occupationType: "SALARIED",
    employerOrBusinessName: "",
  });

  // Registration starts with the mobile number: an existing account joins with a password instead of the long form.
  const [step, setStep] = useState<"phone" | "member" | "join" | "form">("phone");
  const [phoneInfo, setPhoneInfo] = useState<PublicPhoneCheck | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  // Set once the existing account's password has been confirmed; only then is the Join button offered.
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function changeNumber() {
    setStep("phone");
    setPhoneInfo(null);
    setJoinPassword("");
    setVerifiedName(null);
    setNeedsProfile(false);
    setError(null);
  }

  async function handlePhoneContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidMobileNumber(form.phone)) {
      setError(MOBILE_NUMBER_MESSAGE);
      return;
    }

    try {
      const info = await phoneCheck.mutateAsync(form.phone.trim());
      setPhoneInfo(info);
      setStep(info.alreadyMember ? "member" : info.accountExists ? "join" : "form");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check that number. Please try again.");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!joinPassword) {
      setError("Enter your KuriPro password to continue.");
      return;
    }

    try {
      const res = await verifyMutation.mutateAsync({ phone: form.phone.trim(), password: joinPassword });
      setVerifiedName(res.name);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_MEMBER") {
        setStep("member");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not check your password. Please try again.");
      }
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!joinPassword || !verifiedName) {
      setError("Confirm your password first.");
      return;
    }
    if (needsProfile && (!form.line1 || !form.city || !form.state || !form.pincode)) {
      setError("Please fill in your address.");
      return;
    }

    try {
      await joinMutation.mutateAsync({
        phone: form.phone.trim(),
        password: joinPassword,
        ...(needsProfile
          ? {
              address: { line1: form.line1, city: form.city, state: form.state, pincode: form.pincode, country: "India" },
              occupationType: form.occupationType,
            }
          : {}),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROFILE_REQUIRED") {
        setNeedsProfile(true);
        setError("Add your address and occupation to finish joining.");
      } else if (err instanceof ApiError && err.code === "ALREADY_MEMBER") {
        setStep("member");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not join this organization. Please try again.");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.phone || !form.password || !form.line1 || !form.city || !form.state || !form.pincode) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      const res = await registerMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        address: {
          line1: form.line1,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          country: "India",
        },
        occupation: {
          type: form.occupationType,
          employerOrBusinessName: form.employerOrBusinessName || undefined,
        },
      });

      if (res.requireEmailVerification && res.email) {
        setVerificationEmail(res.email);
        setShowVerification(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_EXISTS") {
        setPhoneInfo({ accountExists: true, alreadyMember: false });
        setError(null);
        setStep("join");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to complete registration. Please try again.");
      }
    }
  }

  function handleVerified(_result: { isPendingApproval: boolean; accessToken?: string }) {
    setShowVerification(false);
    if (_result.accessToken) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/dashboard");
    }
  }

  const profileFields = (
      <div className="flex flex-col gap-3 rounded-2xl border border-border-default p-4">
                  <p className="text-sm font-semibold text-text-primary">A few details for this organization</p>
                  <Field label="Address *" htmlFor="join-line1">
                    <Input id="join-line1" autoComplete="address-line1" value={form.line1} onChange={(e) => handleChange("line1", e.target.value)} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="City *" htmlFor="join-city">
                      <Input id="join-city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
                    </Field>
                    <Field label="State *" htmlFor="join-state">
                      <Input id="join-state" value={form.state} onChange={(e) => handleChange("state", e.target.value)} />
                    </Field>
                    <Field label="Pincode *" htmlFor="join-pincode">
                      <Input id="join-pincode" inputMode="numeric" value={form.pincode} onChange={(e) => handleChange("pincode", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Occupation" htmlFor="join-occupation">
                    <Select value={form.occupationType} onValueChange={(v: string) => handleChange("occupationType", v)}>
                      <SelectTrigger id="join-occupation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OCCUPATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
  );

  return (
    <PublicPortalLayout>
      <Card className="border-border-default bg-bg-surface rounded-lg shadow-sm overflow-hidden max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none">
        <CardHeader className="bg-bg-surface pb-5 pt-6 px-5 sm:px-6 border-b border-border-default max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:pb-5">
          <RegisterIllustration className="mb-3 max-sm:hidden" />
          <div className="flex items-center gap-2 text-accent-primary font-semibold text-xs tracking-wider uppercase mb-2">
            <UserPlus size={15} /> Member Self-Registration
          </div>
          <CardTitle className="font-display text-2xl font-bold text-text-primary">
            Join {org?.name || "Organization"}
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary mt-1">
            {step === "phone"
              ? "Enter your mobile number to get started. If you already have a KuriPro account, joining takes one tap."
              : step === "join"
                ? "We found your account. Confirm with your password to join."
                : step === "member"
                  ? "You're already part of this organization."
                  : "Create your member account to participate in chit schemes, track auctions, and view collection statements."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 max-sm:p-0">
          {error ? (
            <div role="alert" className="mb-5 rounded-sm border border-bad-border bg-bad-bg/15 p-3.5 text-sm text-bad-fg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === "phone" ? (
            <form onSubmit={(e) => void handlePhoneContinue(e)} className="flex flex-col gap-4">
              <Field label="Mobile Number *" htmlFor="reg-phone-first">
                <MobileInput
                  id="reg-phone-first"
                  placeholder="10-digit mobile number"
                  autoFocus
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" size="lg" className="mt-1 h-12 w-full gap-2 rounded-xl text-base font-semibold" disabled={phoneCheck.isPending}>
                {phoneCheck.isPending ? "Checking…" : "Continue"}
                <ArrowRight size={18} />
              </Button>
            </form>
          ) : null}

          {step === "member" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-2xl border border-good-border bg-good-bg/30 p-4 text-sm text-text-primary">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-good-fg" />
                <span>
                  <strong>{form.phone}</strong> is already registered with {org?.name || "this organization"}. Sign in to continue.
                </span>
              </div>
              <Button asChild size="lg" className="h-12 w-full gap-2 rounded-xl text-base font-semibold">
                <Link to={`/portal/${slug}/login`}>
                  Go to sign in <ArrowRight size={18} />
                </Link>
              </Button>
              <button type="button" onClick={changeNumber} className="text-sm font-semibold text-accent-link hover:underline">
                Use a different number
              </button>
            </div>
          ) : null}

          {step === "join" ? (
            <form onSubmit={(e) => void (verifiedName ? handleJoin(e) : handleVerify(e))} className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border-default bg-bg-raised p-4 text-sm text-text-primary">
                <p className="font-semibold">You are already a registered member of KuriPro.</p>
                <p className="mt-1 text-text-secondary">
                  {form.phone}
                  {phoneInfo?.maskedEmail ? ` · ${phoneInfo.maskedEmail}` : ""}
                </p>
                {!verifiedName ? (
                  <p className="mt-2 text-text-secondary">
                    Enter the password of your existing KuriPro account to confirm it's you. We'll then offer to add you to{" "}
                    <strong className="text-text-primary">{org?.name || "this organization"}</strong>.
                  </p>
                ) : null}
              </div>

              {!verifiedName ? (
                <>
                  <Field label="Your KuriPro password *" htmlFor="join-password">
                    <Input
                      id="join-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="The password you already use to sign in"
                      autoFocus
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" size="lg" className="h-12 w-full gap-2 rounded-xl text-base font-semibold" disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending ? "Checking…" : "Confirm password"}
                    <ArrowRight size={18} />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-good-border bg-good-bg/30 p-4 text-sm text-text-primary">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-good-fg" />
                    <span>
                      Password confirmed. Welcome back, <strong>{verifiedName}</strong>. Your existing profile will be used — no form to
                      fill in.
                    </span>
                  </div>

                  {needsProfile ? profileFields : null}

                  <Button type="submit" size="lg" className="h-12 w-full gap-2 rounded-xl text-base font-semibold" disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? "Joining…" : `Join ${org?.name || "organization"}`}
                    <ArrowRight size={18} />
                  </Button>
                </>
              )}

              <button type="button" onClick={changeNumber} className="text-sm font-semibold text-accent-link hover:underline">
                Not you? Use a different number
              </button>
            </form>
          ) : null}

          {step === "form" ? (
            <>
              <p className="mb-4 text-sm text-text-secondary">
                Registering with <strong className="text-text-primary">{form.phone}</strong> ·{" "}
                <button type="button" onClick={changeNumber} className="font-semibold text-accent-link hover:underline">
                  Change number
                </button>
              </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            {/* Personal Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name *" htmlFor="reg-name">
                <Input
                  id="reg-name"
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </Field>

              <Field label="Mobile Number *" htmlFor="reg-phone">
                <MobileInput
                  id="reg-phone"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  readOnly
                  required
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address (Optional)" htmlFor="reg-email">
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </Field>

              <Field label="Create Password *" htmlFor="reg-password">
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </Field>
            </div>

            {/* Address */}
            <div className="border-t border-border-default pt-4 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Residential Address
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Street / Door / Flat No. *" htmlFor="reg-line1">
                  <Input
                    id="reg-line1"
                    placeholder="Address Line 1"
                    autoComplete="address-line1"
                    value={form.line1}
                    onChange={(e) => handleChange("line1", e.target.value)}
                    required
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="City *" htmlFor="reg-city">
                    <Input
                      id="reg-city"
                      placeholder="City"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="State *" htmlFor="reg-state">
                    <Input
                      id="reg-state"
                      placeholder="State"
                      autoComplete="address-level1"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Pincode *" htmlFor="reg-pincode">
                    <Input
                      id="reg-pincode"
                      placeholder="Pincode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode}
                      onChange={(e) => handleChange("pincode", e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Occupation */}
            <div className="border-t border-border-default pt-4 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Occupation & Employment
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Occupation Type *" htmlFor="reg-occupation">
                  <Select
                    value={form.occupationType}
                    onValueChange={(val: string) => handleChange("occupationType", val)}
                  >
                    <SelectTrigger id="reg-occupation">
                      <SelectValue placeholder="Select Occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Employer / Company Name" htmlFor="reg-employer">
                  <Input
                    id="reg-employer"
                    placeholder="Company or Business Name"
                    value={form.employerOrBusinessName}
                    onChange={(e) => handleChange("employerOrBusinessName", e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-4 w-full h-12 font-semibold gap-2 text-base"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Creating Account…" : "Register as Member"}
              <ArrowRight size={18} />
            </Button>
          </form>

            </>
          ) : null}

          <div className="mt-6 border-t border-border-default pt-4 text-center">
            <p className="text-sm text-text-secondary">
              Already a registered member of {org?.name}?{" "}
              <Link to={`/portal/${slug}/login`} className="font-semibold text-accent-link hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <EmailVerificationDialog
        open={showVerification}
        email={verificationEmail}
        onClose={() => setShowVerification(false)}
        onVerified={handleVerified}
      />
    </PublicPortalLayout>
  );
}
