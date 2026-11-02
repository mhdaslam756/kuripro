import { AlertCircle, LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { EmailVerificationDialog } from "@/features/auth/components/email-verification-dialog";
import { ForgotPasswordDialog } from "@/features/auth/components/forgot-password-dialog";
import { LoginIllustration } from "@/features/auth/components/login-illustration";
import { PublicPortalLayout } from "./public-portal-layout";
import { usePublicMemberLogin, usePublicOrg } from "./use-public-portal";

export function MemberLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: org } = usePublicOrg(slug);
  const loginMutation = usePublicMemberLogin(slug || "");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError("Please enter both your phone/email and password.");
      return;
    }

    try {
      await loginMutation.mutateAsync({ identifier, password });
      navigate("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError && (err.code === "EMAIL_NOT_VERIFIED" || err.message.toLowerCase().includes("verify your email"))) {
        setUnverifiedEmail(identifier);
        setShowVerificationModal(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid phone/email or password.");
      }
    }
  }

  return (
    <PublicPortalLayout>
      <Card className="border-border-default bg-bg-surface rounded-lg shadow-sm overflow-hidden">
        <CardHeader className="bg-bg-surface pb-5 pt-6 px-5 sm:px-6 border-b border-border-default text-left">
          <LoginIllustration className="mb-3" />
          <CardTitle className="font-display text-2xl font-bold text-text-primary">
            Member Portal Login
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary mt-1">
            Access your member account for <strong>{org?.name || "Organization"}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {error ? (
            <div role="alert" className="mb-5 rounded-sm border border-bad-border bg-bad-bg/15 p-3.5 text-sm text-bad-fg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <Field label="Mobile Number or Email *" htmlFor="identifier">
              <Input
                id="identifier"
                placeholder="Enter your registered phone or email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </Field>

            <Field label="Password *" htmlFor="password">
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <div className="flex justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="min-h-8 font-semibold text-accent-link hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full h-12 font-semibold gap-2 text-base"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in…" : "Sign In to Member Portal"}
              <LogIn size={18} />
            </Button>
          </form>

          <div className="mt-6 border-t border-border-default pt-4 text-center">
            <p className="text-sm text-text-secondary">
              Don't have a member account with {org?.name}?{" "}
              <Link to={`/portal/${slug}/register`} className="font-semibold text-accent-link hover:underline">
                Register as a Member
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        open={showForgotPassword}
        initialIdentifier={identifier}
        onClose={() => setShowForgotPassword(false)}
      />

      <EmailVerificationDialog
        open={showVerificationModal}
        email={unverifiedEmail}
        onClose={() => setShowVerificationModal(false)}
        onVerified={(res) => {
          setShowVerificationModal(false);
          if (res.accessToken) {
            navigate("/dashboard", { replace: true });
          } else {
            setError("Email verified successfully! You can now log in or wait for organizer approval.");
          }
        }}
      />
    </PublicPortalLayout>
  );
}
