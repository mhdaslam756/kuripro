import { useMemo, useState } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/format";
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationTemplate,
  type NotificationType,
  type SendContentInput,
} from "../types";
import { manualVariables, renderTemplate, VARIABLE_CATALOG, variableLabel } from "../lib/template-vars";

export type ComposerMode = "template" | "custom";

/** Sample values used only to render the live preview — real sends fill these per recipient. */
const PREVIEW_CONTEXT: Record<string, string> = {
  orgName: "Your Organization",
  memberName: "Ramesh Kumar",
  memberCode: "M-0001",
  phone: "98xxxxxxxx",
};

export interface ComposerState {
  mode: ComposerMode;
  setMode: (m: ComposerMode) => void;
  templateId: string;
  setTemplateId: (id: string) => void;
  channel: NotificationChannel;
  setChannel: (c: NotificationChannel) => void;
  type: NotificationType;
  setType: (t: NotificationType) => void;
  subject: string;
  setSubject: (s: string) => void;
  body: string;
  setBody: (b: string) => void;
  context: Record<string, string>;
  setContextValue: (key: string, value: string) => void;
  selectedTemplate: NotificationTemplate | undefined;
  effectiveChannel: NotificationChannel | undefined;
  effectiveBody: string;
  effectiveSubject: string | undefined;
  manualVars: string[];
  contentValid: boolean;
  buildContent: () => SendContentInput;
}

export function useComposer(templates: NotificationTemplate[]): ComposerState {
  const [mode, setMode] = useState<ComposerMode>("template");
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("SMS");
  const [type, setType] = useState<NotificationType>("CUSTOM");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [context, setContext] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const effectiveChannel = mode === "template" ? selectedTemplate?.channel : channel;
  const effectiveBody = mode === "template" ? selectedTemplate?.body ?? "" : body;
  const effectiveSubject = mode === "template" ? selectedTemplate?.subject : effectiveChannel === "EMAIL" ? subject : undefined;
  const manualVars = useMemo(() => manualVariables(effectiveBody, effectiveSubject), [effectiveBody, effectiveSubject]);

  function setContextValue(key: string, value: string): void {
    setContext((prev) => ({ ...prev, [key]: value }));
  }

  const contentValid = mode === "template" ? Boolean(selectedTemplate) : Boolean(channel && body.trim());

  function buildContent(): SendContentInput {
    const ctx = Object.fromEntries(manualVars.map((v) => [v, context[v] ?? ""]).filter(([, v]) => v.trim() !== ""));
    const hasCtx = Object.keys(ctx).length > 0;
    if (mode === "template") {
      return { templateId, context: hasCtx ? ctx : undefined };
    }
    return {
      channel,
      type,
      subject: effectiveChannel === "EMAIL" && subject.trim() ? subject : undefined,
      body,
      context: hasCtx ? ctx : undefined,
    };
  }

  return {
    mode, setMode, templateId, setTemplateId, channel, setChannel, type, setType, subject, setSubject,
    body, setBody, context, setContextValue, selectedTemplate, effectiveChannel, effectiveBody,
    effectiveSubject, manualVars, contentValid, buildContent,
  };
}

export function ContentComposer({ composer, templates }: { composer: ComposerState; templates: NotificationTemplate[] }) {
  const c = composer;
  const previewContext = { ...PREVIEW_CONTEXT, ...c.context };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="inline-flex w-fit rounded-md border border-border-default p-0.5">
        {(["template", "custom"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => c.setMode(m)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              c.mode === m ? "bg-brand-solid text-text-on-brand" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {m === "template" ? "Use a template" : "Compose custom"}
          </button>
        ))}
      </div>

      {c.mode === "template" ? (
        <Field label="Template" htmlFor="cmp-template">
          <Select value={c.templateId} onValueChange={c.setTemplateId}>
            <SelectTrigger id="cmp-template">
              <SelectValue placeholder="Choose a template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-secondary">No templates yet</div>
              ) : (
                templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {CHANNEL_LABELS[t.channel]}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Channel" htmlFor="cmp-channel">
              <Select value={c.channel} onValueChange={(v: string) => c.setChannel(v as NotificationChannel)}>
                <SelectTrigger id="cmp-channel">
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
            <Field label="Type" htmlFor="cmp-type">
              <Select value={c.type} onValueChange={(v: string) => c.setType(v as NotificationType)}>
                <SelectTrigger id="cmp-type">
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
          </div>

          {c.channel === "EMAIL" ? (
            <Field label="Subject" htmlFor="cmp-subject">
              <Input id="cmp-subject" value={c.subject} onChange={(e) => c.setSubject(e.target.value)} placeholder="Email subject line" />
            </Field>
          ) : null}

          <Field label="Message" htmlFor="cmp-body">
            <Textarea
              id="cmp-body"
              rows={5}
              value={c.body}
              onChange={(e) => c.setBody(e.target.value)}
              placeholder="Type your message. Use {{memberName}}, {{orgName}}, {{amount}}…"
            />
          </Field>

          {/* Variable chips — click to insert into the message */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-secondary">Insert a variable</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_CATALOG.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  title={v.label}
                  onClick={() => c.setBody(`${c.body}{{${v.name}}}`)}
                  className="rounded border border-border-default px-2 py-0.5 font-mono text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Manual variable values */}
      {c.manualVars.length > 0 ? (
        <div className="rounded-md border border-border-default p-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Fill in the variables</p>
          <p className="mb-3 text-xs text-text-secondary">
            {c.manualVars.length === 1
              ? "1 variable in this message isn't filled automatically. Provide a value for it — "
              : `${c.manualVars.length} variables in this message aren't filled automatically. Provide a value for each — `}
            the same value is used for every recipient.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {c.manualVars.map((name) => (
              <Field key={name} label={variableLabel(name)} htmlFor={`cmp-var-${name}`}>
                <Input
                  id={`cmp-var-${name}`}
                  value={c.context[name] ?? ""}
                  onChange={(e) => c.setContextValue(name, e.target.value)}
                  placeholder={`{{${name}}}`}
                />
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      {/* Live preview */}
      {c.effectiveBody ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Preview</p>
          <div className="rounded-md border border-border-default bg-surface-muted p-4">
            {c.effectiveChannel ? (
              <p className="mb-1 text-xs uppercase tracking-wide text-text-secondary">{CHANNEL_LABELS[c.effectiveChannel]}</p>
            ) : null}
            {c.effectiveSubject ? (
              <p className="mb-2 font-medium text-text-primary">{renderTemplate(c.effectiveSubject, previewContext)}</p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm text-text-primary">{renderTemplate(c.effectiveBody, previewContext)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
