import { useState, useRef, useEffect, type ClipboardEvent, type KeyboardEvent } from "react";
import { CheckCircle2, Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface EmailVerificationDialogProps {
  open: boolean;
  email: string;
  onClose?: () => void;
  onVerified: (result: {
    isPendingApproval: boolean;
    message: string;
    accessToken?: string;
    user?: any;
  }) => void;
}

export function EmailVerificationDialog({
  open,
  email,
  onClose,
  onVerified,
}: EmailVerificationDialogProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (!open) return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdown]);

  // Auto focus first input on open
  useEffect(() => {
    if (open) {
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setCountdown(60);
      setResendSuccess(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [open]);

  if (!open) return null;

  async function handleVerifyCode(code: string) {
    if (code.length !== 6) return;
    setError(null);
    setIsVerifying(true);

    try {
      const res = await api.post<{
        isPendingApproval: boolean;
        message: string;
        accessToken?: string;
        user?: any;
      }>("/auth/verify-email", {
        email,
        code,
      });

      onVerified(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } finally {
      setIsVerifying(false);
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

    const fullCode = newDigits.join("");
    if (fullCode.length === 6) {
      void handleVerifyCode(fullCode);
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

    if (pasted.length === 6) {
      void handleVerifyCode(pasted);
    }
  }

  async function handleResend() {
    if (countdown > 0 || isResending) return;
    setError(null);
    setIsResending(true);
    setResendSuccess(false);

    try {
      await api.post<{ message: string }>("/auth/resend-verification-email", {
        email,
      });
      setResendSuccess(true);
      setCountdown(60);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md rounded-3xl border border-border-default/80 bg-bg-surface p-6 shadow-2xl backdrop-blur-2xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        ) : null}

        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-accent-primary shadow-xs">
            <Mail size={28} />
          </div>

          <h2 className="font-display text-2xl font-bold text-text-primary">
            Verify Your Email
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
            We sent a 6-digit verification code to
            <br />
            <strong className="font-semibold text-text-primary">{email}</strong>
          </p>
        </div>

        {/* 6-box OTP Input */}
        <div className="mt-6 flex justify-center gap-2 sm:gap-3">
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
              disabled={isVerifying}
              className={cn(
                "size-11 sm:size-12 rounded-2xl border text-center font-display text-xl font-bold tabular-nums transition-all focus:outline-hidden",
                digit
                  ? "border-accent-primary bg-brand-50/50 text-text-primary shadow-xs"
                  : "border-border-default bg-bg-raised text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                error && "border-bad-fg ring-1 ring-bad-fg",
              )}
            />
          ))}
        </div>

        {/* Error / Resend status feedback */}
        {error ? (
          <p className="mt-4 rounded-xl border border-bad-border bg-bad-bg/20 px-3 py-2 text-center text-xs font-semibold text-bad-fg">
            {error}
          </p>
        ) : resendSuccess ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-good-fg">
            <CheckCircle2 size={14} /> A new verification code has been sent!
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            className="w-full h-11 rounded-2xl font-bold active-bounce"
            disabled={digits.join("").length !== 6 || isVerifying}
            onClick={() => void handleVerifyCode(digits.join(""))}
          >
            {isVerifying ? "Verifying…" : "Verify & Continue"}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary">
            <span>Didn't receive the code?</span>
            {countdown > 0 ? (
              <span className="font-semibold tabular-nums text-text-primary">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={isResending}
                className="inline-flex items-center gap-1 font-bold text-accent-primary hover:underline disabled:opacity-50"
              >
                <RefreshCw size={12} className={cn(isResending && "animate-spin")} />
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
