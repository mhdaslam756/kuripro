import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Lock, Mail, Phone, ShieldAlert, Sparkles, User } from "lucide-react";
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
  
  // Setup fields
  const [setupName, setSetupName] = useState("");
  const [setupPhone, setSetupPhone] = useState("");

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

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post<{ message: string }>("/super-admin/setup", {
        name: setupName,
        email,
        phone: setupPhone,
        password,
      });

      setSuccess("Super Admin created! Now sign in with your new credentials.");
      setNeedsSetup(false);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to create Super Admin account");
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
          <form onSubmit={(e) => void handleSetup(e)} className="flex flex-col gap-4">
            <Field label="Full Name *" htmlFor="setup-name">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <Input
                  id="setup-name"
                  type="text"
                  required
                  placeholder="e.g. Master Administrator"
                  className="pl-9"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Super Admin Email *" htmlFor="super-email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <Input
                  id="super-email"
                  type="email"
                  required
                  placeholder="e.g. admin@platform.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Phone Number *" htmlFor="setup-phone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <Input
                  id="setup-phone"
                  type="tel"
                  required
                  placeholder="e.g. +919876543210"
                  className="pl-9"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Set Password *" htmlFor="super-password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <Input
                  id="super-password"
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </Field>

            <Button type="submit" disabled={loading} className="mt-2 w-full active-bounce font-semibold">
              {loading ? "Creating Credentials…" : "Create Super Admin Credentials"}
            </Button>
          </form>
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
