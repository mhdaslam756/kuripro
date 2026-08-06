import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { ChannelBadge } from "../components/notification-badges";
import { TemplateDialog } from "../components/template-dialog";
import type { NotificationTemplate } from "../types";
import { useDeleteTemplate, useTemplates } from "../use-notifications";

export function TemplatesTab() {
  const { data: templates, isLoading, isError } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | undefined>();

  function openNew(): void {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(template: NotificationTemplate): void {
    setEditing(template);
    setFormOpen(true);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteTemplate.mutateAsync(deleteTarget.id);
    setDeleteTarget(undefined);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Reusable messages for each channel. Built-in starters are provided — edit them or add your own.
        </p>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !templates ? (
        <p className="text-sm text-bad-fg">Couldn't load templates. Please try again.</p>
      ) : templates.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">No templates yet. Create your first one.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid gap-3 md:hidden">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => openEdit(t)}
                className="active-bounce flex flex-col justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-text-primary text-base leading-tight">{t.name}</h4>
                      {t.isSystem ? <Badge variant="neutral">Built-in</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Type: {humanize(t.type)}</p>
                  </div>
                  {t.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border-default/60 pt-2.5">
                  <ChannelBadge channel={t.channel} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(t);
                      }}
                      className="p-1.5 text-text-secondary hover:text-accent-primary"
                      aria-label={`Edit ${t.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    {!t.isSystem ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(t);
                        }}
                        className="p-1.5 text-text-secondary hover:text-bad-fg"
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
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
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Channel</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.name}
                        {t.isSystem ? <Badge variant="neutral" className="ml-2">Built-in</Badge> : null}
                      </TableCell>
                      <TableCell className="text-text-secondary">{humanize(t.type)}</TableCell>
                      <TableCell>
                        <ChannelBadge channel={t.channel} />
                      </TableCell>
                      <TableCell>
                        {t.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                            aria-label={`Edit ${t.name}`}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            disabled={t.isSystem}
                            title={t.isSystem ? "Built-in templates can't be deleted — deactivate them instead" : undefined}
                            className="rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-bad-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                            aria-label={`Delete ${t.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}

      <TemplateDialog open={formOpen} onOpenChange={setFormOpen} template={editing} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open: boolean) => !open && setDeleteTarget(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>This can't be undone. Sent history that used this template is kept.</DialogDescription>
          </DialogHeader>
          {deleteTemplate.isError ? (
            <p className="text-sm text-bad-fg">
              {deleteTemplate.error instanceof ApiError ? deleteTemplate.error.message : "Something went wrong"}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleteTemplate.isPending}>
              {deleteTemplate.isPending ? "Deleting…" : "Delete template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
