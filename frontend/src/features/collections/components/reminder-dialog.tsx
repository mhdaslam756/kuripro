import { Bell, Check, Copy, ExternalLink, MessageSquare, Send, Smartphone, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatPaise } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { useSendSingle } from "@/features/notifications/use-notifications";
import type { Installment } from "../types";
import {
  buildReminderMessage,
  formatWhatsAppPhone,
  openWhatsAppChat,
  WhatsAppReminderDialog,
} from "./whatsapp-reminder-dialog";

export { buildReminderMessage, formatWhatsAppPhone, openWhatsAppChat, WhatsAppReminderDialog };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment;
  chitGroupName: string;
}

export function ReminderDialog({ open, onOpenChange, installment, chitGroupName }: Props) {
  const membership = typeof installment.chitMembershipId === "object" ? installment.chitMembershipId : null;
  const rawTicket = membership?.ticketNumber ?? "—";
  const subTicket = membership?.subTicket ?? "";
  const isHalf = membership?.shareType === "HALF" || (membership?.share !== undefined && membership.share < 1);
  const ticketNumber = rawTicket !== "—" ? `${rawTicket}${subTicket}${isHalf ? " (½)" : ""}` : "—";
  const memberObj = membership?.memberId && typeof membership.memberId === "object" ? (membership.memberId as any) : null;
  const memberName = memberObj?.name ?? "Member";
  const memberId = memberObj?.id || memberObj?._id;
  const phone = memberObj?.phone ?? "";
  const outstanding = installment.amountDue - installment.amountPaid;
  const formattedAmount = formatPaise(outstanding);
  const formattedDueDate = formatDate(installment.dueDate);

  const [activeTab, setActiveTab] = useState<"push" | "whatsapp">("push");

  // --- Push State ---
  const defaultPushSubject = `Payment Due: ${chitGroupName || "Chit Group"}`;
  const defaultPushBody = `Dear ${memberName}, dues of ${formattedAmount} for ${chitGroupName || "Chit Group"} (Ticket #${ticketNumber}) are due on ${formattedDueDate}. Kindly pay on time.`;

  const [pushSubject, setPushSubject] = useState(defaultPushSubject);
  const [pushBody, setPushBody] = useState(defaultPushBody);
  const [pushError, setPushError] = useState<string | null>(null);

  const sendSingle = useSendSingle();

  // --- WhatsApp State ---
  const defaultWhatsAppMessage = useMemo(() => {
    return buildReminderMessage({
      memberName,
      ticketNumber,
      chitGroupName,
      outstanding,
      dueDate: installment.dueDate,
    });
  }, [memberName, ticketNumber, chitGroupName, outstanding, installment.dueDate]);

  const [waMessage, setWaMessage] = useState<string>(defaultWhatsAppMessage);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(waMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendWhatsApp() {
    openWhatsAppChat(phone, waMessage);
    onOpenChange(false);
  }

  async function handleSendPush() {
    if (!memberId) {
      toast.error("Member ID not found for this installment");
      return;
    }
    setPushError(null);
    try {
      await sendSingle.mutateAsync({
        memberId,
        channel: "PUSH",
        type: "REMINDER",
        subject: pushSubject.trim() || defaultPushSubject,
        body: pushBody.trim() || defaultPushBody,
        context: {
          chitGroupName: chitGroupName || "Chit Group",
          amount: formattedAmount,
          dueDate: formattedDueDate,
        },
      });

      toast.success(`Push reminder sent to ${memberName}!`);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setPushError(err.message);
      } else {
        setPushError("Failed to send push notification.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-500/15 text-accent-primary">
              <Bell size={16} />
            </span>
            Send Installment Reminder
          </DialogTitle>
          <DialogDescription>
            {memberName} · Ticket #{ticketNumber} {phone ? `· ${phone}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Due Info Card */}
          <div className="rounded-xl border border-border-default bg-bg-raised p-3 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Chit Scheme:</span>
              <span className="font-semibold text-text-primary">{chitGroupName || "—"}</span>
            </div>
            <div className="mt-1 flex justify-between text-text-secondary">
              <span>Outstanding Due:</span>
              <span className="font-bold text-good-fg font-mono text-sm">{formattedAmount}</span>
            </div>
            <div className="mt-1 flex justify-between text-text-secondary">
              <span>Due Date:</span>
              <span className="font-semibold text-text-primary">{formattedDueDate}</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "push" | "whatsapp")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="push" className="gap-1.5 text-xs font-semibold">
                <Smartphone size={14} /> Push Notification
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-1.5 text-xs font-semibold">
                <MessageSquare size={14} /> WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* --- Push Notification Tab --- */}
            <TabsContent value="push" className="flex flex-col gap-3.5 pt-2">
              {pushError ? (
                <div className="rounded-xl border border-bad-border/50 bg-bad-bg/15 p-3 text-xs text-bad-fg flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{pushError}</span>
                  </div>
                  {pushError.toLowerCase().includes("no registered device") ? (
                    <div className="mt-1 flex items-center justify-between border-t border-bad-border/30 pt-1.5">
                      <span className="text-[11px] text-text-secondary">The member hasn't enabled push yet. Send via WhatsApp instead:</span>
                      <button
                        type="button"
                        onClick={() => { setPushError(null); setActiveTab("whatsapp"); }}
                        className="text-xs font-bold text-accent-primary hover:underline"
                      >
                        Switch to WhatsApp →
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Field label="Notification Title" htmlFor="push-title">
                <Input
                  id="push-title"
                  value={pushSubject}
                  onChange={(e) => setPushSubject(e.target.value)}
                  placeholder="e.g. Payment Due: Kuri Group"
                  className="text-xs"
                />
              </Field>

              <Field label="Notification Message" htmlFor="push-body">
                <textarea
                  id="push-body"
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-border-default bg-bg-surface p-3 text-xs font-sans text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden"
                />
              </Field>

              <p className="text-[11px] text-text-secondary flex items-center gap-1.5">
                <Smartphone size={13} className="text-accent-primary" />
                Delivered instantly to all registered phones, tablets, or desktop browsers linked to {memberName}.
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-border-default/60 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={sendSingle.isPending}
                  onClick={() => void handleSendPush()}
                  className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xs active-bounce"
                >
                  <Send size={13} /> {sendSingle.isPending ? "Sending Push…" : "Send Push Reminder"}
                </Button>
              </div>
            </TabsContent>

            {/* --- WhatsApp Tab --- */}
            <TabsContent value="whatsapp" className="flex flex-col gap-3.5 pt-2">
              <Field label="WhatsApp Message" htmlFor="whatsapp-msg">
                <textarea
                  id="whatsapp-msg"
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-border-default bg-bg-surface p-3 text-xs font-sans text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden"
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
                    className="gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold shadow-xs active-bounce"
                  >
                    <ExternalLink size={14} /> Send WhatsApp
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
