import { useState, useRef, useEffect, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Lock, RefreshCw, ShieldAlert, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface ForgotPasswordDialogProps {
  open: boolean;
  initialIdentifier?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "request" | "verify_and_reset" | "success";

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 10 characters and include an uppercase letter, a lowercase letter, and a digit";

export function ForgotPasswordDialog({
  open,
  initialIdentifier = "",
  onClose,
  onSuccess,
}: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setStep("request");
      setIdentifier(initialIdentifier);
      setConfirmedEmail("");
      setDigits(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setLoading(false);
      setCountdown(60);
      setResendSuccess(false);
    }
  }, [open, initialIdentifier]);

  // Countdown timer for resend
  useEffect(() => {
    if (!open || step !== "verify_and_reset") return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, step, countdown]);

  if (!open) return null;

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
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please check your verification code.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-border-default/80 bg-bg-surface p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {step === "request" && (
          <div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-accent-primary shadow-xs">
                <KeyRound size={28} />
              </div>

              <h2 className="font-display text-2xl font-bold text-text-primary">Reset Your Password</h2>
              <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                Enter your registered email address or phone number. We’ll send an OTP code to your email.
              </p>
            </div>

            {error ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleRequestCode} className="mt-6 flex flex-col gap-4">
              <Field label="Email Address or Phone Number" htmlFor="forgot-identifier">
                <Input
                  id="forgot-identifier"
                  type="text"
                  placeholder="e.g. user@example.com or +919876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Button type="submit" size="lg" disabled={loading || !identifier.trim()} className="active-bounce mt-2 font-semibold">
                {loading ? "Sending Code…" : "Send Reset Code"}
              </Button>
            </form>
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
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-accent-primary shadow-xs">
                <Lock size={24} />
              </div>

              <h2 className="font-display text-2xl font-bold text-text-primary">Set New Password</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
                Enter the 6-digit code sent to <strong className="text-text-primary">{confirmedEmail || identifier}</strong>
              </p>
            </div>

            {resendSuccess ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-good-fg font-medium">
                <CheckCircle2 size={14} /> New verification code sent to your email!
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleResetPassword} className="mt-5 flex flex-col gap-4">
              {/* 6-box OTP digits */}
              <div>
                <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-2.5">
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
                        "size-11 sm:size-12 rounded-xl border-2 bg-bg-surface text-center font-mono text-xl font-bold text-text-primary shadow-xs transition-all outline-none",
                        digit ? "border-accent-primary bg-brand-50/20 text-accent-primary" : "border-border-default hover:border-border-strong",
                        "focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/15",
                      )}
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-2.5 text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || loading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                  </button>
                </div>
              </div>

              {/* Password Fields */}
              <Field label="New Password" htmlFor="reset-new-password" helpText="Min 10 chars, uppercase, lowercase, digit">
                <Input
                  id="reset-new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Field>

              <Field label="Confirm New Password" htmlFor="reset-confirm-password">
                <Input
                  id="reset-confirm-password"
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
                className="active-bounce mt-2 font-semibold"
              >
                {loading ? "Resetting Password…" : "Confirm & Reset Password"}
              </Button>
            </form>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-good-bg text-good-fg shadow-xs">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="font-display text-2xl font-bold text-text-primary">Password Reset!</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Your password has been successfully updated. You can now log in to your account with your new password.
            </p>

            <Button
              type="button"
              size="lg"
              onClick={onClose}
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
