import { useState, type FormEvent } from "react";
import { Lock, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type AuthUser } from "@/lib/auth-context";

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post<{
        accessToken: string;
        user: AuthUser;
      }>("/super-admin/login", { email, password });

      loginWithTokens(response.accessToken, response.user);
      navigate("/super-admin/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg-app px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border-strong bg-bg-surface p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-accent-primary font-display text-xl font-bold text-text-on-brand shadow-lg">
            K
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-accent-primary uppercase tracking-wider mb-2">
            <Sparkles size={14} /> System Administration
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Super Admin Portal
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Sign in with your administrator credentials to access platform controls.
          </p>
        </div>

        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
          <Field label="Admin Email" htmlFor="super-email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <Input
                id="super-email"
                type="email"
                required
                placeholder="admin@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="super-password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <Input
                id="super-password"
                type="password"
                required
                placeholder="Enter your password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </Field>

          <Button type="submit" disabled={loading} className="mt-2 w-full active-bounce font-semibold">
            {loading ? "Signing in…" : "Sign In to Admin Portal"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border-default pt-4 text-center">
          <p className="text-xs text-text-secondary">
            Looking for organization login?{" "}
            <a href="/login" className="font-semibold text-accent-link hover:underline">
              Go to Organization Login →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
