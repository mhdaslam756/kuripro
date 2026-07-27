import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import type { Member } from "@/features/members/types";
import { ContentComposer, useComposer } from "../components/content-composer";
import { MemberPicker } from "../components/member-picker";
import { SendResultBanner } from "../components/send-result-banner";
import type { NotificationTemplate, SendResult } from "../types";
import { useSendSingle } from "../use-notifications";

type RecipientMode = "member" | "contact";

export function SendTab({ templates }: { templates: NotificationTemplate[] }) {
  const composer = useComposer(templates);
  const send = useSendSingle();

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("member");
  const [member, setMember] = useState<Member | undefined>();
  const [toContact, setToContact] = useState("");
  const [toName, setToName] = useState("");
  const [result, setResult] = useState<SendResult | undefined>();

  const recipientValid = recipientMode === "member" ? Boolean(member) : Boolean(toContact.trim());
  const canSend = composer.contentValid && recipientValid && !send.isPending;

  async function handleSend(): Promise<void> {
    setResult(undefined);
    const content = composer.buildContent();
    const res = await send.mutateAsync(
      recipientMode === "member"
        ? { ...content, memberId: member!.id }
        : { ...content, toContact: toContact.trim(), toName: toName.trim() || undefined },
    );
    setResult(res);
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-sm text-text-secondary">
        Send a single message to one member or an ad-hoc contact. Pick a saved template or write one on
        the spot — you'll see a live preview before it goes out.
      </p>

      {result ? (
        <div className="mb-6">
          <SendResultBanner result={result} />
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        {/* Recipient */}
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Recipient</p>
          <div className="mb-3 inline-flex w-fit rounded-md border border-border-default p-0.5">
            {(["member", "contact"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRecipientMode(m)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  recipientMode === m ? "bg-brand-solid text-text-on-brand" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {m === "member" ? "A member" : "A contact"}
              </button>
            ))}
          </div>
          {recipientMode === "member" ? (
            <MemberPicker value={member} onChange={setMember} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone or email" htmlFor="send-contact">
                <Input id="send-contact" value={toContact} onChange={(e) => setToContact(e.target.value)} placeholder="9876543210 / name@email.com" />
              </Field>
              <Field label="Name (optional)" htmlFor="send-name">
                <Input id="send-name" value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Recipient name" />
              </Field>
            </div>
          )}
          {recipientMode === "contact" ? (
            <p className="mt-1.5 text-xs text-text-secondary">
              Make sure the contact matches the channel — a phone number for SMS/WhatsApp, an email address for Email.
            </p>
          ) : null}
        </div>

        {/* Content */}
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Message</p>
          <ContentComposer composer={composer} templates={templates} />
        </div>

        {send.isError ? (
          <p className="text-sm text-bad-fg">{send.error instanceof ApiError ? send.error.message : "Couldn't send. Please try again."}</p>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={!canSend} onClick={() => void handleSend()}>
            {send.isPending ? "Sending…" : "Send notification"}
          </Button>
        </div>
      </div>
    </div>
  );
}
