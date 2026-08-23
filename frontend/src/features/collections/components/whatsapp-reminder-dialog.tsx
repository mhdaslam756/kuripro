import { Copy, Check, MessageSquare, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { formatDate, formatPaise } from "@/lib/format";
import type { Installment } from "../types";

/**
 * Format raw phone string into international format without '+' or special chars.
 * E.g., "9876543210" -> "919876543210" (defaulting to India +91 for 10-digit numbers)
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Generate a pre-filled WhatsApp reminder message string.
 */
export function buildReminderMessage({
  memberName,
  ticketNumber,
  chitGroupName,
  outstanding,
  dueDate,
}: {
  memberName: string;
  ticketNumber: string | number;
  chitGroupName: string;
  outstanding: number;
  dueDate: string;
}): string {
  const formattedAmount = formatPaise(outstanding);
  const formattedDate = formatDate(dueDate);

  return `*Payment Reminder* 🔔

Dear *${memberName}*,

This is a gentle reminder regarding your chit installment for *${chitGroupName || "Chit Group"}* (Ticket #${ticketNumber}).

📌 *Outstanding Amount:* ${formattedAmount}
📅 *Due Date:* ${formattedDate}

Please make the payment at your earliest convenience. If you have already paid, please ignore this message.

Thank you!`;
}

/**
 * Opens WhatsApp Web or Mobile app directly with the target phone and pre-filled message.
 */
export function openWhatsAppChat(phone: string, text: string) {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = formattedPhone
    ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment;
  chitGroupName: string;
}

export function WhatsAppReminderDialog({ open, onOpenChange, installment, chitGroupName }: Props) {
  const membership = typeof installment.chitMembershipId === "object" ? installment.chitMembershipId : null;
  const rawTicket = membership?.ticketNumber ?? "—";
  const subTicket = membership?.subTicket ?? "";
  const isHalf = membership?.shareType === "HALF" || (membership?.share !== undefined && membership.share < 1);
  const ticketNumber = rawTicket !== "—" ? `${rawTicket}${subTicket}${isHalf ? " (½)" : ""}` : "—";
  const memberObj = membership?.memberId && typeof membership.memberId === "object" ? (membership.memberId as any) : null;
  const memberName = memberObj?.name ?? "Member";
  const phone = memberObj?.phone ?? "";
  const outstanding = installment.amountDue - installment.amountPaid;

  const defaultMessage = useMemo(() => {
    return buildReminderMessage({
      memberName,
      ticketNumber,
      chitGroupName,
      outstanding,
      dueDate: installment.dueDate,
    });
  }, [memberName, ticketNumber, chitGroupName, outstanding, installment.dueDate]);

  const [message, setMessage] = useState<string>(defaultMessage);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendWhatsApp() {
    openWhatsAppChat(phone, message);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
              <MessageSquare size={16} />
            </span>
            Send WhatsApp Reminder
          </DialogTitle>
          <DialogDescription>
            {memberName} · Ticket #{ticketNumber} {phone ? `· ${phone}` : "· (No phone number saved)"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border-default bg-bg-raised p-3 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Outstanding Due:</span>
              <span className="font-semibold text-text-primary">{formatPaise(outstanding)}</span>
            </div>
            <div className="mt-1 flex justify-between text-text-secondary">
              <span>Due Date:</span>
              <span className="font-semibold text-text-primary">{formatDate(installment.dueDate)}</span>
            </div>
          </div>

          <Field label="Reminder Message" htmlFor="whatsapp-msg">
            <textarea
              id="whatsapp-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full rounded-md border border-border-default bg-bg-surface p-3 text-xs font-sans text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden"
            />
          </Field>

          {!phone ? (
            <p className="text-xs text-warn-fg bg-warn-bg/20 p-2 rounded-md">
              ⚠️ Member does not have a phone number saved. WhatsApp will open without recipient pre-selected.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-border-default/60 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check size={14} className="text-good-fg" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy message"}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendWhatsApp}
                className="gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold shadow-xs"
              >
                <ExternalLink size={14} /> Send WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
