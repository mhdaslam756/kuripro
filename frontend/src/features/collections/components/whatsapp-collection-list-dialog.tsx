import { Check, Copy, ExternalLink, MessageSquare, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { openWhatsAppChat } from "./whatsapp-reminder-dialog";
import type { Installment } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupName: string;
  cycleNumber?: number | string;
  scheduledDate?: string;
  dues: Installment[];
}

export function buildCollectionListMessage({
  chitGroupName,
  cycleNumber,
  scheduledDate,
  paidMembers,
  pendingMembers,
  totalDue,
  totalCollected,
  includePaid = true,
  includePending = true,
  includeSummary = true,
}: {
  chitGroupName: string;
  cycleNumber?: number | string;
  scheduledDate?: string;
  paidMembers: { name: string; ticket: string; amount: number; method?: string }[];
  pendingMembers: { name: string; ticket: string; due: number }[];
  totalDue: number;
  totalCollected: number;
  includePaid?: boolean;
  includePending?: boolean;
  includeSummary?: boolean;
}): string {
  const parts: string[] = [];

  parts.push(`📊 *PAYMENT COLLECTION DONE LIST* 📊`);
  parts.push(`━━━━━━━━━━━━━━━━━━━━`);
  parts.push(`*Chit Scheme:* ${chitGroupName || "Kuri Scheme"}`);
  if (cycleNumber && cycleNumber !== "ALL") {
    parts.push(`*Cycle:* #${cycleNumber}${scheduledDate ? ` (${formatDate(scheduledDate)})` : ""}`);
  }

  if (includeSummary) {
    const totalCount = paidMembers.length + pendingMembers.length;
    parts.push(`*Collection Progress:* ${paidMembers.length}/${totalCount} Members Paid`);
    parts.push(`*Total Collected:* ${formatPaise(totalCollected)} / ${formatPaise(totalDue)}`);
  }
  parts.push(`━━━━━━━━━━━━━━━━━━━━`);

  if (includePaid && paidMembers.length > 0) {
    parts.push(``);
    parts.push(`*✅ Collections Done (${paidMembers.length}):*`);
    paidMembers.forEach((m, idx) => {
      const methodText = m.method ? ` (${humanize(m.method)})` : "";
      parts.push(`${idx + 1}. [${m.ticket}] *${m.name}* — ${formatPaise(m.amount)}${methodText}`);
    });
  }

  if (includePending && pendingMembers.length > 0) {
    parts.push(``);
    parts.push(`*⏳ Pending Collections (${pendingMembers.length}):*`);
    pendingMembers.forEach((m, idx) => {
      parts.push(`${idx + 1}. [${m.ticket}] *${m.name}* — Due ${formatPaise(m.due)}`);
    });
  }

  parts.push(``);
  parts.push(`━━━━━━━━━━━━━━━━━━━━`);
  parts.push(`Thank you for your cooperation! 🙏`);
  parts.push(`_Generated via KuriPro_`);

  return parts.join("\n");
}

export function WhatsAppCollectionListDialog({
  open,
  onOpenChange,
  chitGroupName,
  cycleNumber,
  scheduledDate,
  dues,
}: Props) {
  const [includePaid, setIncludePaid] = useState(true);
  const [includePending, setIncludePending] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [targetPhone, setTargetPhone] = useState("");
  const [copied, setCopied] = useState(false);

  // Group dues into paid vs pending
  const { paidList, pendingList, totalDue, totalCollected } = useMemo(() => {
    const paid: { name: string; ticket: string; amount: number; method?: string }[] = [];
    const pending: { name: string; ticket: string; due: number }[] = [];
    let dueSum = 0;
    let paidSum = 0;

    for (const d of dues) {
      dueSum += d.amountDue || 0;
      paidSum += d.amountPaid || 0;

      const membership = typeof d.chitMembershipId === "object" ? d.chitMembershipId : null;
      const rawTicket = membership?.ticketNumber ?? "—";
      const subTicket = membership?.subTicket ?? "";
      const isHalf = membership?.shareType === "HALF" || (membership?.share !== undefined && membership.share < 1);
      const ticket = rawTicket !== "—" ? `#${rawTicket}${subTicket}${isHalf ? " (½)" : ""}` : "—";
      const memberObj = membership?.memberId && typeof membership.memberId === "object" ? (membership.memberId as any) : null;
      const name = memberObj?.name ?? "Member";

      if (d.status === "PAID" || d.amountPaid >= d.amountDue) {
        paid.push({
          name,
          ticket,
          amount: d.amountPaid || d.amountDue,
          method: d.method,
        });
      } else if (d.status !== "WAIVED") {
        pending.push({
          name,
          ticket,
          due: (d.amountDue || 0) - (d.amountPaid || 0),
        });
      }
    }

    return { paidList: paid, pendingList: pending, totalDue: dueSum, totalCollected: paidSum };
  }, [dues]);

  const defaultMessage = useMemo(() => {
    return buildCollectionListMessage({
      chitGroupName,
      cycleNumber,
      scheduledDate,
      paidMembers: paidList,
      pendingMembers: pendingList,
      totalDue,
      totalCollected,
      includePaid,
      includePending,
      includeSummary,
    });
  }, [
    chitGroupName,
    cycleNumber,
    scheduledDate,
    paidList,
    pendingList,
    totalDue,
    totalCollected,
    includePaid,
    includePending,
    includeSummary,
  ]);

  const [message, setMessage] = useState(defaultMessage);

  // Update text when filters change
  useMemo(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  function handleCopy() {
    void navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendWhatsApp() {
    openWhatsAppChat(targetPhone, message);
    onOpenChange(false);
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Payment Collection Done List - ${chitGroupName}`,
          text: message,
        });
        onOpenChange(false);
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleSendWhatsApp();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
              <MessageSquare size={16} />
            </span>
            Share Collection Done List on WhatsApp
          </DialogTitle>
          <DialogDescription>
            {chitGroupName} {cycleNumber && cycleNumber !== "ALL" ? `· Cycle #${cycleNumber}` : ""} ·{" "}
            {paidList.length} of {dues.length} collected
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Summary Stat Bar */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border-default bg-bg-raised p-3 text-center text-xs">
            <div>
              <p className="text-text-secondary">Done / Paid</p>
              <p className="font-bold text-good-fg text-sm">{paidList.length}</p>
            </div>
            <div>
              <p className="text-text-secondary">Pending</p>
              <p className="font-bold text-bad-fg text-sm">{pendingList.length}</p>
            </div>
            <div>
              <p className="text-text-secondary">Collected</p>
              <p className="font-bold text-text-primary text-sm">{formatPaise(totalCollected)}</p>
            </div>
          </div>

          {/* Configuration switches */}
          <div className="flex flex-wrap items-center gap-2 border-y border-border-default/60 py-2.5">
            <span className="text-xs font-medium text-text-secondary mr-1">Include in list:</span>
            <Button
              type="button"
              size="sm"
              variant={includePaid ? "primary" : "outline"}
              className="text-xs h-7 px-2.5"
              onClick={() => setIncludePaid((p) => !p)}
            >
              ✅ Paid ({paidList.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={includePending ? "primary" : "outline"}
              className="text-xs h-7 px-2.5"
              onClick={() => setIncludePending((p) => !p)}
            >
              ⏳ Pending ({pendingList.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={includeSummary ? "primary" : "outline"}
              className="text-xs h-7 px-2.5"
              onClick={() => setIncludeSummary((p) => !p)}
            >
              📊 Totals Summary
            </Button>
          </div>

          {/* Recipient phone (optional) */}
          <Field
            label="Send to Specific WhatsApp Number (Optional)"
            helpText="Leave blank to pick any contact or WhatsApp Group in the app"
            htmlFor="target-phone"
          >
            <input
              id="target-phone"
              type="tel"
              placeholder="e.g. 9876543210 or leave empty for group picker"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-sans text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden"
            />
          </Field>

          {/* Editable Preview */}
          <Field label="WhatsApp Message Preview (Editable)" htmlFor="whatsapp-list-msg">
            <textarea
              id="whatsapp-list-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="w-full font-mono text-xs rounded-md border border-border-default bg-bg-surface p-3 text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden leading-relaxed"
            />
          </Field>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default/60 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check size={14} className="text-good-fg" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy List"}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {typeof navigator !== "undefined" && "share" in navigator ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleNativeShare()}
                  className="gap-1.5 text-xs"
                >
                  <Share2 size={14} /> Share…
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={handleSendWhatsApp}
                className="gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold shadow-xs"
              >
                <ExternalLink size={14} /> Open in WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
