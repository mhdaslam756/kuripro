import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChitStatusBadge } from "@/features/chit-groups/components/chit-badges";
import { FREQUENCY_LABELS } from "@/features/chit-groups/types";
import {
  useChitGroup,
  useMemberChitGroups,
  type MemberChitGroupEntry,
} from "@/features/chit-groups/use-chit-groups";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { EmptyState } from "./nominees-tab";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function GroupDetails({ entry }: { entry: MemberChitGroupEntry }) {
  const { data: chit, isLoading } = useChitGroup(entry.group.id);
  const rules = chit?.auctionRules;
  const ticket = `#${entry.ticketNumber}${entry.subTicket ?? ""}`;

  return (
    <section
      aria-label={`${entry.group.name} details`}
      className="rounded-md border border-border-default bg-bg-surface p-4"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {entry.group.name}
          </h3>
          <p className="font-mono text-xs text-text-secondary">
            {chit?.registrationNumber}
          </p>
        </div>
        <Link
          to={`/chit-groups/${entry.group.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-link hover:underline"
        >
          Open chit group <ExternalLink size={14} />
        </Link>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        This member
      </p>
      <dl className="mb-4 divide-y divide-border-default">
        <Row
          label="Ticket"
          value={`${ticket} · ${entry.shareType === "HALF" ? "Half share" : "Full ticket"}`}
        />
        <Row
          label="Holds the ticket"
          value={`cycle ${entry.fromCycleNumber}${entry.toCycleNumber ? ` – ${entry.toCycleNumber}` : " onwards"}`}
        />
        <Row label="Paid so far" value={formatPaise(entry.account.totalPaid)} />
        <Row label="Balance due" value={formatPaise(entry.account.balance)} />
        {entry.account.overdue > 0 ? (
          <Row label="Overdue" value={formatPaise(entry.account.overdue)} />
        ) : null}
        {entry.account.nextDueDate ? (
          <Row label="Next due" value={formatDate(entry.account.nextDueDate)} />
        ) : null}
        <Row
          label="Prize"
          value={entry.hasWon ? "Already won" : "Not won yet"}
        />
      </dl>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Chit group
      </p>
      {isLoading || !chit ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <dl className="divide-y divide-border-default">
          <Row label="Status" value={humanize(chit.status)} />
          <Row label="Chit value" value={formatPaise(chit.chitValue)} />
          <Row
            label="Instalment"
            value={`${formatPaise(chit.installmentAmount)} · ${FREQUENCY_LABELS[chit.frequency]}`}
          />
          <Row label="Members" value={String(chit.totalMembers)} />
          <Row
            label="Current cycle"
            value={`${chit.currentCycleNumber} of ${chit.totalMembers}`}
          />
          <Row
            label="Runs"
            value={`${formatDate(chit.startDate)} – ${formatDate(chit.endDate)}`}
          />
          {rules ? (
            <>
              <Row
                label="Winner chosen by"
                value={humanize(rules.allotmentMethod)}
              />
              <Row
                label="Foreman commission"
                value={
                  rules.foremanCommissionMode === "AMOUNT"
                    ? `${formatPaise(rules.foremanCommissionAmount)} per cycle`
                    : `${rules.foremanCommissionPercent}% of the pot`
                }
              />
            </>
          ) : null}
        </dl>
      )}
    </section>
  );
}

/** Every chit group this member is in. Pick one to see that group's details beside the list. */
export function ChitGroupsTab({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } = useMemberChitGroups(memberId);
  const [picked, setPicked] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError)
    return (
      <p role="alert" className="text-sm text-bad-fg">
        Couldn&apos;t load this member&apos;s chit groups.
      </p>
    );
  if (!data || data.length === 0)
    return <EmptyState label="This member isn't in any chit group yet." />;

  const selected = data.find((e) => e.membershipId === picked) ?? data[0]!;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ul className="flex flex-col gap-2" aria-label="Chit groups">
        {data.map((e) => {
          const active = e.membershipId === selected.membershipId;
          return (
            <li key={e.membershipId}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(e.membershipId)}
                className={`flex min-h-11 w-full flex-col gap-1.5 rounded-md border p-3 text-left transition-colors ${
                  active
                    ? "border-accent-primary bg-accent-primary/10"
                    : "border-border-default bg-bg-surface hover:bg-bg-raised"
                }`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">
                    {e.group.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ChitStatusBadge status={e.group.status} />
                    {e.status !== "ACTIVE" ? (
                      <Badge variant="neutral">{humanize(e.status)}</Badge>
                    ) : null}
                  </span>
                </span>
                <span className="text-xs text-text-secondary">
                  Ticket #{e.ticketNumber}
                  {e.subTicket ?? ""} · paid {formatPaise(e.account.totalPaid)}
                  {e.account.balance > 0
                    ? ` · due ${formatPaise(e.account.balance)}`
                    : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <GroupDetails entry={selected} />
    </div>
  );
}
