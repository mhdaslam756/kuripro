import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationTemplate,
  type NotificationType,
} from "../types";
import { renderTemplate, VARIABLE_CATALOG } from "../lib/template-vars";
import { useCreateTemplate, useUpdateTemplate } from "../use-notifications";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this template; otherwise it creates a new one. */
  template?: NotificationTemplate;
}

const PREVIEW_CONTEXT: Record<string, string> = {
  orgName: "Your Organization",
  memberName: "Ramesh Kumar",
  memberCode: "M-0001",
  phone: "98xxxxxxxx",
  amount: "₹5,000",
  chitGroupName: "Golden Chit 2026",
  dueDate: "25 Jul 2026",
  receiptNumber: "RCPT-0042",
  cycleNumber: "6",
  prizeAmount: "₹1,00,000",
};

export function TemplateDialog({ open, onOpenChange, template }: Props) {
  const isEdit = Boolean(template);
  const create = useCreateTemplate();
  const update = useUpdateTemplate(template?.id ?? "");
  const mutation = isEdit ? update : create;

  const [name, setName] = useState("");
  const [type, setType] = useState<NotificationType>("REMINDER");
  const [channel, setChannel] = useState<NotificationChannel>("SMS");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset the form whenever the dialog opens (for a new template or a different one to edit).
  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setType(template?.type ?? "REMINDER");
    setChannel(template?.channel ?? "SMS");
    setSubject(template?.subject ?? "");
    setBody(template?.body ?? "");
    setIsActive(template?.isActive ?? true);
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  const canSave = name.trim().length >= 2 && body.trim().length > 0 && !mutation.isPending;

  async function handleSave(): Promise<void> {
    const payload = {
      name: name.trim(),
      type,
      channel,
      subject: channel === "EMAIL" && subject.trim() ? subject.trim() : undefined,
      body,
    };
    if (isEdit) {
      await update.mutateAsync({ ...payload, isActive });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            Write a reusable message. Insert <span className="font-mono text-xs">{"{{variables}}"}</span> that
            get filled in per recipient when you send.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <Field label="Name" htmlFor="tpl-name">
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment reminder (SMS)" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" htmlFor="tpl-type">
              <Select value={type} onValueChange={(v: string) => setType(v as NotificationType)}>
                <SelectTrigger id="tpl-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Channel" htmlFor="tpl-channel">
              <Select value={channel} onValueChange={(v: string) => setChannel(v as NotificationChannel)}>
                <SelectTrigger id="tpl-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      {CHANNEL_LABELS[ch]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {channel === "EMAIL" ? (
            <Field label="Subject" htmlFor="tpl-subject">
              <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
            </Field>
          ) : null}

          <Field label="Message body" htmlFor="tpl-body">
            <Textarea id="tpl-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-medium text-text-secondary">Insert a variable</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_CATALOG.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  title={v.label}
                  onClick={() => setBody(`${body}{{${v.name}}}`)}
                  className="rounded border border-border-default px-2 py-0.5 font-mono text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
          </div>

          {body ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-secondary">Preview</p>
              <div className="rounded-md border border-border-default bg-surface-muted p-4">
                {channel === "EMAIL" && subject ? (
                  <p className="mb-2 font-medium text-text-primary">{renderTemplate(subject, PREVIEW_CONTEXT)}</p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm text-text-primary">{renderTemplate(body, PREVIEW_CONTEXT)}</p>
              </div>
            </div>
          ) : null}

          {isEdit ? (
            <div className="flex items-center justify-between rounded-md border border-border-default px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Active</p>
                <p className="text-xs text-text-secondary">Inactive templates stay in the list but are hidden when sending.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}

          {mutation.isError ? (
            <p className="text-sm text-bad-fg">{mutation.error instanceof ApiError ? mutation.error.message : "Couldn't save. Please try again."}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={() => void handleSave()}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
