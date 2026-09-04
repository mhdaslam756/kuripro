import { Bell, CheckCircle2, Send, Smartphone, MessageSquare, Radio } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chitGroupId?: string;
  chitGroupName?: string;
  chitCycleId?: string;
  paymentIds?: string[];
  totalDuesCount?: number;
  onSuccess?: () => void;
}

export function BulkDueRemindersDialog({
  open,
  onOpenChange,
  chitGroupId,
  chitGroupName = "All Schemes",
  chitCycleId,
  paymentIds,
  totalDuesCount,
  onSuccess,
}: Props) {
  const isSelectedMode = Boolean(paymentIds && paymentIds.length > 0);
  const targetCount = isSelectedMode ? paymentIds!.length : totalDuesCount ?? "all";

  const [channel, setChannel] = useState<"PUSH" | "WHATSAPP" | "SMS">("PUSH");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [subject, setSubject] = useState(`Payment Reminder: ${chitGroupName}`);
  const [body, setBody] = useState(
    `Dear {{memberName}}, dues of {{amount}} for {{chitGroupName}} are due on {{dueDate}}. Kindly pay on time.`,
  );
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ queued: number; skipped: number; total: number; remindedMembers: string[] } | null>(null);

  async function handleSend() {
    setIsSending(true);
    setResult(null);

    try {
      const res = await api.post<{ queued: number; skipped: number; total: number; remindedMembers: string[] }>(
        "/collections/dues/remind",
        {
          chitGroupId: isSelectedMode ? undefined : chitGroupId,
          chitCycleId: isSelectedMode ? undefined : chitCycleId,
          paymentIds: isSelectedMode ? paymentIds : undefined,
          channel,
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
          onlyOverdue,
        },
      );

      setResult(res);
      toast.success(`Queued ${res.queued} ${channel.toLowerCase()} reminder${res.queued === 1 ? "" : "s"}!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to send due reminders.");
      }
    } finally {
      setIsSending(false);
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
            Send Bulk Due Reminders
          </DialogTitle>
          <DialogDescription>
            {isSelectedMode
              ? `Send reminder alerts to ${targetCount} selected installment${targetCount === 1 ? "" : "s"}`
              : `Send reminder alerts to members with pending dues in ${chitGroupName}`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 size={18} />
                <span>Reminders Dispatched Successfully</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-bg-surface/60 p-2 border border-border-default/40">
                  <p className="text-[10px] uppercase text-text-secondary">Queued</p>
                  <p className="font-display text-lg font-bold text-emerald-400">{result.queued}</p>
                </div>
                <div className="rounded-xl bg-bg-surface/60 p-2 border border-border-default/40">
                  <p className="text-[10px] uppercase text-text-secondary">Skipped</p>
                  <p className="font-display text-lg font-bold text-text-secondary">{result.skipped}</p>
                </div>
                <div className="rounded-xl bg-bg-surface/60 p-2 border border-border-default/40">
                  <p className="text-[10px] uppercase text-text-secondary">Total Processed</p>
                  <p className="font-display text-lg font-bold text-text-primary">{result.total}</p>
                </div>
              </div>
              {result.skipped > 0 ? (
                <p className="mt-2 text-[11px] text-text-secondary">
                  Note: {result.skipped} member{result.skipped === 1 ? "" : "s"} were skipped because they haven't registered a device for push notifications yet.
                </p>
              ) : null}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Delivery Channel Selector */}
            <div>
              <p className="mb-2 text-xs font-semibold text-text-primary">Delivery Channel</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "PUSH" as const, label: "Push", icon: Smartphone, desc: "Instant mobile/web" },
                  { id: "WHATSAPP" as const, label: "WhatsApp", icon: MessageSquare, desc: "WhatsApp queue" },
                  { id: "SMS" as const, label: "SMS", icon: Radio, desc: "Direct text" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChannel(item.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all active-bounce",
                      channel === item.id
                        ? "border-brand-500 bg-brand-500/10 text-accent-primary font-bold shadow-xs"
                        : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-raised",
                    )}
                  >
                    <item.icon size={18} className="mb-1" />
                    <span className="text-xs">{item.label}</span>
                    <span className="text-[10px] text-text-secondary opacity-80">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overdue filter */}
            {!isSelectedMode && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary select-none rounded-xl border border-border-default bg-bg-raised/50 p-2.5">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={(e) => setOnlyOverdue(e.target.checked)}
                  className="size-4 rounded border-border-strong text-accent-primary accent-accent-primary"
                />
                <span>Target <strong>overdue installments only</strong> (skip pending upcoming dues)</span>
              </label>
            )}

            {/* Custom Subject & Message */}
            <Field label="Notification Title" htmlFor="bulk-subject">
              <Input
                id="bulk-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Payment Reminder: Kuri Group"
                className="text-xs"
              />
            </Field>

            <Field label="Notification Template" htmlFor="bulk-body">
              <textarea
                id="bulk-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border-default bg-bg-surface p-3 text-xs font-sans text-text-primary shadow-xs focus:border-accent-primary focus:outline-hidden"
              />
            </Field>
            <p className="text-[11px] text-text-secondary">
              Available tags: <code className="text-accent-primary font-mono">{`{{memberName}}`}</code>,{" "}
              <code className="text-accent-primary font-mono">{`{{amount}}`}</code>,{" "}
              <code className="text-accent-primary font-mono">{`{{chitGroupName}}`}</code>,{" "}
              <code className="text-accent-primary font-mono">{`{{dueDate}}`}</code>
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-border-default/60 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSending}
                onClick={() => void handleSend()}
                className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xs active-bounce"
              >
                <Send size={13} /> {isSending ? "Sending…" : `Send ${channel} Reminders`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
