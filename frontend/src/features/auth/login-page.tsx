import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { isWebAuthnSupported } from "@/lib/webauthn";
import { FirstLoginModal } from "./components/first-login-modal";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your phone number or email"),
  password: z.string().min(1, "Enter your password"),
  rememberDevice: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const passkeySupported = isWebAuthnSupported();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", rememberDevice: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      const loggedUser = await login(values.identifier, values.password, values.rememberDevice);
      if (loggedUser?.mustChangePassword) {
        setShowFirstLoginModal(true);
      } else if (loggedUser?.role?.slug === "SUPER_ADMIN") {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong — please try again");
    }
  }

  async function onPasskey() {
    setFormError(null);
    const identifier = watch("identifier").trim();
    if (!identifier) {
      setFormError("Enter your email, then sign in with your passkey.");
      return;
    }
    setPasskeyBusy(true);
    try {
      await loginWithPasskey(identifier);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Passkey sign-in was cancelled or failed — try again or use your password.",
      );
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-4 py-8">
      <div className="absolute -left-24 -top-24 size-80 rounded-full bg-brand-200/35 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 size-96 rounded-full bg-[var(--good-100)]/80 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-xl border border-border-default bg-bg-surface/95 p-6 shadow-[0_18px_50px_rgb(30_33_42/0.12)] backdrop-blur sm:p-8">
        <div className="mb-7">
          <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-accent-primary font-display text-xl font-bold text-text-on-brand shadow-[0_6px_16px_rgb(114_83_32/0.22)]">K</div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-primary"><ShieldCheck className="size-3.5" /> Secure workspace</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Log in with your phone number or email to access your workspace.</p>
        </div>

        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-4">
          <Field label="Phone Number or Email" htmlFor="identifier" error={errors.identifier?.message}>
            <Input id="identifier" type="text" placeholder="e.g. +919876543210 or user@domain.com" autoComplete="username" {...register("identifier")} />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="h-4 w-4 rounded-xs" {...register("rememberDevice")} />
            Remember this device
          </label>

          {formError ? <p className="rounded-md border border-bad-border bg-bad-bg px-3 py-2.5 text-sm font-medium text-bad-fg">{formError}</p> : null}

          <Button type="submit" size="lg" disabled={isSubmitting} className="active-bounce">
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        {passkeySupported ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-text-secondary">
              <span className="h-px flex-1 bg-border-default" />
              or
              <span className="h-px flex-1 bg-border-default" />
            </div>
            <Button type="button" variant="outline" size="lg" className="w-full active-bounce" disabled={passkeyBusy} onClick={() => void onPasskey()}>
              <Fingerprint className="size-4" /> {passkeyBusy ? "Waiting for passkey…" : "Sign in with a passkey"}
            </Button>
          </>
        ) : null}

        <p className="mt-6 text-center text-sm text-text-secondary">
          New organization?{" "}
          <Link to="/register" className="font-medium text-accent-link hover:underline">
            Register organization
          </Link>
        </p>

        <div className="mt-4 border-t border-border-default pt-3 text-center">
          <Link to="/super-admin/login" className="text-xs text-text-secondary hover:text-text-primary underline">
            Super Admin Portal Login →
          </Link>
        </div>
      </div>

      <FirstLoginModal
        open={showFirstLoginModal}
        onPasswordChanged={() => {
          setShowFirstLoginModal(false);
          navigate("/dashboard", { replace: true });
        }}
      />
    </div>
  );
}
