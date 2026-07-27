import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { useChitGroups } from "@/features/chit-groups/use-chit-groups";
import type { Member } from "@/features/members/types";
import { ContentComposer, useComposer } from "../components/content-composer";
import { MemberPicker } from "../components/member-picker";
import { SendResultBanner } from "../components/send-result-banner";
import { AUDIENCE_LABELS, NOTIFICATION_AUDIENCES, type NotificationAudience, type NotificationTemplate, type SendResult } from "../types";
import { useSendBulk } from "../use-notifications";

export function BulkTab({ templates }: { templates: NotificationTemplate[] }) {
  const composer = useComposer(templates);
  const { data: groups } = useChitGroups();
  const send = useSendBulk();

  const [audience, setAudience] = useState<NotificationAudience>("ALL_MEMBERS");
  const [chitGroupId, setChitGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [result, setResult] = useState<SendResult | undefined>();

  function addMember(m: Member | undefined): void {
    if (m && !members.some((x) => x.id === m.id)) setMembers((prev) => [...prev, m]);
  }

  const audienceValid =
    audience === "CHIT_GROUP" ? Boolean(chitGroupId) : audience === "CUSTOM_MEMBERS" ? members.length > 0 : true;
  const canSend = composer.contentValid && audienceValid && !send.isPending;

  async function handleSend(): Promise<void> {
    setResult(undefined);
    const content = composer.buildContent();
    const res = await send.mutateAsync({
      ...content,
      audience,
      chitGroupId: audience === "CHIT_GROUP" ? chitGroupId : undefined,
      memberIds: audience === "CUSTOM_MEMBERS" ? members.map((m) => m.id) : undefined,
    });
    setResult(res);
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-sm text-text-secondary">
        Send the same message to a whole audience at once — everyone, one chit group, members who are
        overdue, or today's birthdays. Recipients without a contact for the chosen channel are skipped.
      </p>

      {result ? (
        <div className="mb-6">
          <SendResultBanner result={result} />
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        {/* Audience */}
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Audience</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Send to" htmlFor="bulk-audience">
              <Select value={audience} onValueChange={(v: string) => setAudience(v as NotificationAudience)}>
                <SelectTrigger id="bulk-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {AUDIENCE_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {audience === "CHIT_GROUP" ? (
              <Field label="Chit group" htmlFor="bulk-group">
                <Select value={chitGroupId} onValueChange={setChitGroupId}>
                  <SelectTrigger id="bulk-group">
                    <SelectValue placeholder="Choose a group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(groups?.items ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>

          {audience === "CUSTOM_MEMBERS" ? (
            <div className="mt-4">
              <MemberPicker value={undefined} onChange={addMember} />
              {members.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-muted px-2.5 py-1 text-xs">
                      {m.name}
                      <button
                        type="button"
                        onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                        className="text-text-secondary hover:text-text-primary"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
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
            {send.isPending ? "Sending…" : "Send to audience"}
          </Button>
        </div>
      </div>
    </div>
  );
}
