import { type ReactNode } from "react";

import { Label } from "./label";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  helpText?: string;
  children: ReactNode;
}

/** Label always visible above the input, error/help text below — the pattern every form in the app uses. */
export function Field({ label, htmlFor, error, helpText, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-bad-fg">{error}</p>
      ) : helpText ? (
        <p className="text-xs text-text-secondary">{helpText}</p>
      ) : null}
    </div>
  );
}
