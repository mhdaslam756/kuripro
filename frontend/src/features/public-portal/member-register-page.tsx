import { AlertCircle, ArrowRight, CheckCircle2, Lock, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { PublicPortalLayout } from "./public-portal-layout";
import { usePublicMemberRegister, usePublicOrg } from "./use-public-portal";

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

  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.phone || !form.password || !form.line1 || !form.city || !form.state || !form.pincode) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      await registerMutation.mutateAsync({
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

      // Successful registration & session created -> Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to complete registration. Please try again.");
      }
    }
  }

  return (
    <PublicPortalLayout>
      <Card className="border-border-default/80 shadow-lg bg-bg-surface rounded-3xl overflow-hidden">
        <CardHeader className="bg-brand-50/60 pb-6 pt-7 px-6 border-b border-border-default/60">
          <div className="flex items-center gap-2 text-accent-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <UserPlus size={15} /> Member Self-Registration
          </div>
          <CardTitle className="font-display text-2xl font-bold text-text-primary">
            Join {org?.name || "Organization"}
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary mt-1">
            Create your member account to participate in chit schemes, track auctions, and view collection statements.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {error ? (
            <div className="mb-5 rounded-2xl border border-bad-border/60 bg-bad-bg/15 p-3.5 text-xs text-bad-fg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            {/* Personal Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name *" required>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </Field>

              <Field label="Mobile Number *" required>
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address (Optional)">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </Field>

              <Field label="Create Password *" required>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </Field>
            </div>

            {/* Address */}
            <div className="border-t border-border-default/60 pt-4 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Residential Address
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Street / Door / Flat No. *" required>
                  <Input
                    placeholder="Address Line 1"
                    value={form.line1}
                    onChange={(e) => handleChange("line1", e.target.value)}
                    required
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="City *" required>
                    <Input
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="State *" required>
                    <Input
                      placeholder="State"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Pincode *" required>
                    <Input
                      placeholder="Pincode"
                      value={form.pincode}
                      onChange={(e) => handleChange("pincode", e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Occupation */}
            <div className="border-t border-border-default/60 pt-4 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Occupation & Employment
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Occupation Type *" required>
                  <Select
                    value={form.occupationType}
                    onValueChange={(val) => handleChange("occupationType", val)}
                  >
                    <SelectTrigger>
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

                <Field label="Employer / Company Name">
                  <Input
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
              className="mt-4 w-full h-11 rounded-2xl font-semibold gap-2 shadow-sm text-base"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Creating Account…" : "Register as Member"}
              <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-6 border-t border-border-default/60 pt-4 text-center">
            <p className="text-xs text-text-secondary">
              Already a registered member of {org?.name}?{" "}
              <Link to={`/portal/${slug}/login`} className="font-semibold text-accent-primary hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </PublicPortalLayout>
  );
}
