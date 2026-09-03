import { useState, useRef, useEffect, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Lock, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Step = "request" | "verify_and_reset" | "success";

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 10 characters and include an uppercase letter, a lowercase letter, and a digit";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(initialEmail);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (step !== "verify_and_reset") return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, countdown]);

  async function handleRequestCode(e?: FormEvent) {
    if (e) e.preventDefault();
    const clean = identifier.trim();
    if (!clean) {
      setError("Please enter your registered email address or phone number.");
      return;
    }

    if (clean.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        setError("Please enter a valid email address (e.g. name@example.com).");
        return;
      }
    } else {
      const digitsOnly = clean.replace(/\D/g, "");
      if (digitsOnly.length < 7) {
        setError("Please enter a valid phone number or email address.");
        return;
      }
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ message: string; targetEmail?: string }>("/auth/forgot-password", {
        email: clean,
      });

      setConfirmedEmail(res.targetEmail || clean);
      setStep("verify_and_reset");
      setCountdown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to send reset code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(index: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]!;
    }
    setDigits(newDigits);

    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  }

  async function handleResendCode() {
    if (countdown > 0 || loading) return;
    setError(null);
    setLoading(true);
    setResendSuccess(false);

    try {
      await api.post<{ message: string }>("/auth/forgot-password", {
        email: identifier.trim(),
      });
      setResendSuccess(true);
      setCountdown(60);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");

    const code = digits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);

    if (newPassword.length < 10 || !hasUpper || !hasLower || !hasDigit) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: identifier.trim(),
        code,
        newPassword,
      });
      setStep("success");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please verify the code and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-4 py-8">
      <div className="absolute -left-24 -top-24 size-80 rounded-full bg-brand-200/35 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 size-96 rounded-full bg-[var(--good-100)]/80 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-xl border border-border-default bg-bg-surface/95 p-6 shadow-[0_18px_50px_rgb(30_33_42/0.12)] backdrop-blur sm:p-8">
        {step === "request" && (
          <div>
            <div className="mb-6">
              <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-accent-primary font-display text-xl font-bold text-text-on-brand shadow-[0_6px_16px_rgb(114_83_32/0.22)]">
                K
              </div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-primary">
                <KeyRound className="size-3.5" /> Password Recovery
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
                Reset password
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Enter your registered phone or email to receive a 6-digit verification code.
              </p>
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <Field label="Phone Number or Email" htmlFor="identifier">
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. user@example.com or +919876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Button type="submit" size="lg" disabled={loading || !identifier.trim()} className="active-bounce mt-1">
                {loading ? "Sending verification code…" : "Send Reset Code"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Remember your password?{" "}
              <Link to="/login" className="font-medium text-accent-link hover:underline">
                Back to log in
              </Link>
            </p>
          </div>
        )}

        {step === "verify_and_reset" && (
          <div>
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setError(null);
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div className="mb-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-100 text-accent-primary">
                <Lock size={20} />
              </div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Set New Password</h2>
              <p className="mt-1 text-xs text-text-secondary">
                Enter the code sent to <strong className="text-text-primary">{confirmedEmail || identifier}</strong>
              </p>
            </div>

            {resendSuccess ? (
              <div className="mb-3 flex items-center gap-1.5 text-xs text-good-fg font-medium">
                <CheckCircle2 size={14} /> New verification code sent to your email!
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-text-secondary">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className={cn(
                        "size-10 sm:size-11 rounded-lg border-2 bg-bg-surface text-center font-mono text-lg font-bold text-text-primary shadow-xs transition-all outline-none",
                        digit ? "border-accent-primary bg-brand-50/20 text-accent-primary" : "border-border-default hover:border-border-strong",
                        "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                      )}
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || loading}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-accent-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                  </button>
                </div>
              </div>

              <Field label="New Password" htmlFor="new-password" helpText="Min 10 chars, uppercase, lowercase, digit">
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Field>

              <Field label="Confirm New Password" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={loading || digits.join("").length !== 6 || !newPassword || !confirmPassword}
                className="active-bounce mt-1 font-semibold"
              >
                {loading ? "Updating password…" : "Reset Password"}
              </Button>
            </form>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-good-bg text-good-fg shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="font-display text-2xl font-bold text-text-primary">Password Reset!</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Your password has been successfully updated. You can now log in to your account with your new password.
            </p>

            <Button
              type="button"
              size="lg"
              onClick={() => navigate("/login")}
              className="active-bounce mt-6 w-full font-semibold"
            >
              Go to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
