import { AlertCircle, LogIn, UserCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
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
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid phone/email or password.");
      }
    }
  }

  return (
    <PublicPortalLayout>
      <Card className="border-border-default/80 shadow-lg bg-bg-surface rounded-3xl overflow-hidden">
        <CardHeader className="bg-brand-50/60 pb-6 pt-7 px-6 border-b border-border-default/60 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-accent-primary mb-2 shadow-xs">
            <UserCheck size={24} />
          </div>
          <CardTitle className="font-display text-2xl font-bold text-text-primary">
            Member Portal Login
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary mt-1">
            Access your member account for <strong>{org?.name || "Organization"}</strong>
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
            <Field label="Mobile Number or Email *" htmlFor="identifier">
              <Input
                id="identifier"
                placeholder="Enter your registered phone or email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full h-11 rounded-2xl font-semibold gap-2 shadow-sm text-base"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in…" : "Sign In to Member Portal"}
              <LogIn size={18} />
            </Button>
          </form>

          <div className="mt-6 border-t border-border-default/60 pt-4 text-center flex flex-col gap-2">
            <p className="text-xs text-text-secondary">
              Don't have a member account with {org?.name}?{" "}
              <Link to={`/portal/${slug}/register`} className="font-semibold text-accent-primary hover:underline">
                Register as a Member
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </PublicPortalLayout>
  );
}
