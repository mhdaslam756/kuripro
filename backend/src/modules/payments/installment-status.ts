import type { PaymentStatus } from "./payment.model.js";

/**
 * Derives an installment's status from its running paid total against what's due. Shared by the
 * Collections write path and the Auction dividend adjustments so the rule lives in exactly one place.
 * WAIVED is a manual terminal state and is never produced here.
 */
export function computeInstallmentStatus(amountPaid: number, amountDue: number, dueDate: Date): PaymentStatus {
  if (amountPaid >= amountDue) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return dueDate.getTime() < Date.now() ? "OVERDUE" : "PENDING";
}
