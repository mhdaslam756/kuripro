import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDateTime, humanize } from "@/lib/format";
import { ChannelBadge, NotificationStatusBadge } from "../components/notification-badges";
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationRecord,
  type NotificationStatus,
  type NotificationType,
} from "../types";
import { useHistory } from "../use-notifications";

const ALL = "__all__";

export function HistoryTab() {
  const [channel, setChannel] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<NotificationRecord | undefined>();

  const { data, isLoading, isError } = useHistory({
    channel: channel === ALL ? undefined : (channel as NotificationChannel),
    type: type === ALL ? undefined : (type as NotificationType),
    status: status === ALL ? undefined : (status as NotificationStatus),
    page,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Channel</p>
          <Select value={channel} onValueChange={(v: string) => { setChannel(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All channels</SelectItem>
              {NOTIFICATION_CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Type</p>
          <Select value={type} onValueChange={(v: string) => { setType(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {NOTIFICATION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <p className="mb-1.5 text-sm font-medium text-text-primary">Status</p>
          <Select value={status} onValueChange={(v: string) => { setStatus(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {NOTIFICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load history. Please try again.</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">No notifications sent yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid gap-3 md:hidden">
            {data.items.map((n) => (
              <div
                key={n.id}
                onClick={() => setDetail(n)}
                className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-text-primary text-base leading-tight">{n.recipientName}</h4>
                    <p className="mt-0.5 font-mono text-xs text-text-secondary">{n.recipientContact}</p>
                  </div>
                  <NotificationStatusBadge status={n.status} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border-default/60 pt-2.5">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={n.channel} />
                    <span className="text-xs text-text-secondary">{humanize(n.type)}</span>
                  </div>
                  <span className="text-[11px] text-text-secondary">{formatDateTime(n.sentAt ?? n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Recipient</TableHeaderCell>
                    <TableHeaderCell>Channel</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>When</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((n) => (
                    <TableRow key={n.id} className="cursor-pointer" onClick={() => setDetail(n)}>
                      <TableCell className="font-medium">
                        {n.recipientName}
                        <span className="ml-2 text-xs text-text-secondary">{n.recipientContact}</span>
                      </TableCell>
                      <TableCell>
                        <ChannelBadge channel={n.channel} />
                      </TableCell>
                      <TableCell className="text-text-secondary">{humanize(n.type)}</TableCell>
                      <TableCell>
                        <NotificationStatusBadge status={n.status} />
                      </TableCell>
                      <TableCell className="text-text-secondary">{formatDateTime(n.sentAt ?? n.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <span>
              {data.total} notification{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open: boolean) => !open && setDetail(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification detail</DialogTitle>
            <DialogDescription>
              {detail ? `${CHANNEL_LABELS[detail.channel]} · ${humanize(detail.type)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="flex flex-col gap-3 text-sm">
              <DetailRow label="Recipient" value={`${detail.recipientName} · ${detail.recipientContact}`} />
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-text-secondary">Status</span>
                <NotificationStatusBadge status={detail.status} />
              </div>
              <DetailRow label="Queued" value={formatDateTime(detail.createdAt)} />
              {detail.sentAt ? <DetailRow label="Sent" value={formatDateTime(detail.sentAt)} /> : null}
              {detail.providerMessageId ? <DetailRow label="Reference ID" value={detail.providerMessageId} mono /> : null}
              {detail.subject ? <DetailRow label="Subject" value={detail.subject} /> : null}
              <div>
                <span className="text-text-secondary">Message</span>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-border-default bg-surface-muted p-3 text-text-primary">
                  {detail.body}
                </p>
              </div>
              {detail.error ? (
                <div>
                  <span className="text-text-secondary">Error</span>
                  <p className="mt-1 rounded-md border border-bad-border bg-bad-bg p-3 text-bad-fg">{detail.error}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-text-secondary">{label}</span>
      <span className={mono ? "font-mono text-xs text-text-primary" : "text-text-primary"}>{value}</span>
    </div>
  );
}
