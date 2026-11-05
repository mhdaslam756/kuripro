import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { Input } from "@/components/ui/input";

export const MOBILE_NUMBER_LENGTH = 10;
export const MOBILE_NUMBER_MESSAGE = "Enter a 10-digit mobile number";

/** Keeps only digits and stops at ten, so what is typed or pasted is always a valid-shaped number. */
export function sanitizeMobileNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, MOBILE_NUMBER_LENGTH);
}

export function isValidMobileNumber(value: string): boolean {
  return new RegExp(`^\\d{${MOBILE_NUMBER_LENGTH}}$`).test(value);
}

type MobileInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, "type" | "maxLength" | "inputMode" | "pattern">;

/**
 * A mobile-number field: numeric keypad, digits only, ten characters at most. Works with react-hook-form's
 * register() because the value is cleaned before the change event reaches the form.
 */
export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(({ onChange, autoComplete, ...props }, ref) => (
  <Input
    ref={ref}
    type="tel"
    inputMode="numeric"
    maxLength={MOBILE_NUMBER_LENGTH}
    pattern={`[0-9]{${MOBILE_NUMBER_LENGTH}}`}
    title={MOBILE_NUMBER_MESSAGE}
    autoComplete={autoComplete ?? "tel-national"}
    onChange={(event) => {
      event.target.value = sanitizeMobileNumber(event.target.value);
      onChange?.(event);
    }}
    {...props}
  />
));
MobileInput.displayName = "MobileInput";
