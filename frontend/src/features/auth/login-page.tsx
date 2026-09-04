import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { EmailVerificationDialog } from "./components/email-verification-dialog";
import { FirstLoginModal } from "./components/first-login-modal";
import { ForgotPasswordDialog } from "./components/forgot-password-dialog";
import { LoginIllustration } from "./components/login-illustration";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your username, email, or phone"),
  password: z.string().min(1, "Please enter your password"),
  rememberDevice: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [lastEnteredPassword, setLastEnteredPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", rememberDevice: false },
  });

  const rememberDevice = watch("rememberDevice");

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    setLastEnteredPassword(values.password);

    try {
      const loggedUser = await login(values.identifier, values.password, values.rememberDevice);

      if (loggedUser?.mustChangePassword) {
        setShowFirstLoginModal(true);
      } else if (loggedUser?.role?.slug === "SUPER_ADMIN") {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      if (
        error instanceof ApiError &&
        (error.code === "EMAIL_NOT_VERIFIED" || error.message.toLowerCase().includes("verify your email"))
      ) {
        setUnverifiedEmail(values.identifier);
        setShowVerificationModal(true);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Invalid credentials. Please try again.");
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center p-0 sm:px-6 sm:py-8 overflow-x-hidden bg-bg-surface sm:bg-bg-app">
      {/* ── Project ambient background glows (Desktop only) ── */}
      <div className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-accent-primary/10 blur-3xl hidden sm:block" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 size-96 rounded-full bg-primary-purple/10 blur-3xl hidden sm:block" />

      {/* ── Mobile: Complete full page / Desktop: Elevated Card Container ── */}
      <div className="relative w-full min-h-screen sm:min-h-0 sm:max-w-[420px] rounded-none sm:rounded-3xl bg-bg-surface border-0 sm:border sm:border-border-default shadow-none sm:shadow-xl px-6 py-8 sm:px-8 sm:py-8 z-10 flex flex-col justify-center">
        {/* Hero Vector Illustration with Project Colors */}
        <div className="mb-2">
          <LoginIllustration />
        </div>

        {/* Login Headings */}
        <div className="mt-1 mb-5 text-left">
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-text-primary tracking-tight">
            Login
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-text-secondary font-medium">
            Please Sign in to continue.
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-4">
          {/* Username / Phone / Email Input */}
          <div>
            <div
              className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3.5 ${
                errors.identifier
                  ? "border-bad-border bg-bad-bg/40"
                  : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
              }`}
            >
              <User className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
              <input
                id="identifier"
                type="text"
                placeholder="Username"
                autoComplete="username"
                className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled outline-none"
                {...register("identifier")}
              />
            </div>
            {errors.identifier ? (
              <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.identifier.message}</p>
            ) : null}
          </div>

          {/* Password Input with Dots & Eye Toggle */}
          <div>
            <div
              className={`relative flex items-center rounded-2xl bg-bg-raised border transition-all px-4 py-3.5 ${
                errors.password
                  ? "border-bad-border bg-bad-bg/40"
                  : "border-border-default/80 focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 focus-within:bg-bg-surface"
              }`}
            >
              <Lock className="size-4.5 text-text-secondary shrink-0" strokeWidth={1.8} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent pl-3 text-sm font-medium text-text-primary placeholder:text-text-disabled tracking-wider outline-none"
                {...register("password")}
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
            {errors.password ? (
              <p className="mt-1 text-[11px] font-medium text-bad-fg px-3">{errors.password.message}</p>
            ) : null}
          </div>

          {/* "Reminder me nextime" Switch & Forgot Password */}
          <div className="flex items-center justify-between pt-0.5 pb-1">
            <label htmlFor="rememberDevice" className="text-xs font-medium text-text-secondary select-none cursor-pointer">
              Reminder me nextime
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-medium text-accent-link hover:underline transition-colors cursor-pointer"
              >
                Forgot?
              </button>
              <Switch
                id="rememberDevice"
                checked={rememberDevice}
                onCheckedChange={(checked: boolean) => setValue("rememberDevice", checked)}
                className="data-[state=checked]:bg-accent-primary scale-85 origin-right"
              />
            </div>
          </div>

          {/* Form Error Banner */}
          {formError ? (
            <p className="rounded-xl border border-bad-border bg-bad-bg px-3.5 py-2 text-xs font-medium text-bad-fg text-center leading-relaxed">
              {formError}
            </p>
          ) : null}

          {/* Big Pill Action Button: "Sign In" using project brand color */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 sm:h-13 mt-1 rounded-2xl bg-accent-primary hover:bg-brand-700 text-text-on-brand font-bold text-sm sm:text-base tracking-wide shadow-lg shadow-purple-600/25 active-bounce transition-all cursor-pointer"
          >
            {isSubmitting ? "Signing In…" : "Sign In"}
          </Button>
        </form>

        {/* Footer: "Don't have account? Sign Up" */}
        <p className="mt-6 text-center text-xs sm:text-sm text-text-secondary">
          Don't have account?{" "}
          <Link to="/register" className="font-bold text-accent-primary hover:underline ml-1">
            Sign Up
          </Link>
        </p>

    
      </div>

      {/* Existing Auth Dialogs (Preserved) */}
      <ForgotPasswordDialog
        open={showForgotPassword}
        initialIdentifier={watch("identifier") || ""}
        onClose={() => setShowForgotPassword(false)}
      />

      <FirstLoginModal
        open={showFirstLoginModal}
        initialPassword={lastEnteredPassword}
        onPasswordChanged={() => {
          setShowFirstLoginModal(false);
          navigate("/dashboard", { replace: true });
        }}
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
            setFormError("Email verified successfully! Once approved, you will be notified.");
          }
        }}
      />
    </div>
  );
}
