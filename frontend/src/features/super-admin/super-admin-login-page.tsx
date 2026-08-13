import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Lock, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type AuthUser } from "@/lib/auth-context";

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api
      .get<{ needsSetup: boolean }>("/super-admin/setup-status")
      .then((res) => setNeedsSetup(res.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post<{
        accessToken: string;
        user: AuthUser;
      }>("/super-admin/login", { email, password });

      loginWithTokens(response.accessToken, response.user);
      navigate("/super-admin/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Invalid Super Admin credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.get<{ message: string }>("/super-admin/setup");
      setSuccess("Super Admin initialized from .env! Sign in below.");
      setEmail("admin@kuripro.com");
      setPassword("SuperAdminSecret123!");
      setNeedsSetup(false);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to initialize Super Admin account");
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
            <Sparkles size={14} /> Platform Control Center
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {needsSetup ? "Initialize Super Admin" : "Super Admin Portal"}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            {needsSetup
              ? "No Super Admin user exists yet. Create your platform administrator credentials below."
              : "Isolated platform login for SaaS global administrators."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-good-border bg-good-bg p-3 text-xs font-medium text-good-fg">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {needsSetup ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="rounded-xl border border-brand-300 bg-brand-50/80 p-4 text-xs text-text-secondary">
              <p className="font-semibold text-accent-primary mb-1">⚡ Automatic Environment Initialization</p>
              Click below to create the Super Admin account using credentials from <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-border-default">.env</code>.
            </div>

            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleSetup()}
              className="w-full active-bounce font-semibold"
            >
              {loading ? "Initializing..." : "Initialize Super Admin from .env"}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
            <Field label="Super Admin Email" htmlFor="super-email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <Input
                  id="super-email"
                  type="email"
                  required
                  placeholder="Enter your super admin email"
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
              {loading ? "Authenticating…" : "Sign In to Super Admin"}
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-border-default pt-4 text-center">
          <p className="text-xs text-text-secondary">
            Organization user?{" "}
            <a href="/login" className="font-semibold text-accent-link hover:underline">
              Go to Organization Login →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
