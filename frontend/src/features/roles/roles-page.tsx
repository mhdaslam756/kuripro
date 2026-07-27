import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import { RoleFormDialog } from "./role-form-dialog";
import type { Role } from "./types";
import { useDeleteRole, useRoles } from "./use-roles";

export function RolesPage() {
  const { data: roles, isLoading, isError } = useRoles();
  const deleteRole = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Role | undefined>(undefined);

  function openCreateDialog() {
    setEditingRole(undefined);
    setFormOpen(true);
  }

  function openEditDialog(role: Role) {
    setEditingRole(role);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteRole.mutateAsync(deleteTarget.id);
    setDeleteTarget(undefined);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Roles &amp; Permissions</h1>
          <p className="text-sm text-text-secondary">
            Built-in roles cover most cases — create a custom role for anything more specific.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus size={16} />
          Create role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !roles ? (
        <p className="text-sm text-bad-fg">Couldn't load roles. Please try again.</p>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Permissions</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant={role.isSystemRole ? "info" : "brand"}>
                      {role.isSystemRole ? "Built-in" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">{role.permissionKeys.length} granted</TableCell>
                  <TableCell className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => openEditDialog(role)}
                      className="text-text-secondary hover:text-accent-primary"
                      aria-label={`Edit ${role.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    {!role.isSystemRole && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(role)}
                        className="text-text-secondary hover:text-bad-fg"
                        aria-label={`Delete ${role.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editingRole} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open: boolean) => !open && setDeleteTarget(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This can't be undone. You can only delete a role once no one is assigned to it.
            </DialogDescription>
          </DialogHeader>
          {deleteRole.isError ? (
            <p className="text-sm text-bad-fg">
              {deleteRole.error instanceof ApiError ? deleteRole.error.message : "Something went wrong"}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleteRole.isPending}>
              {deleteRole.isPending ? "Deleting…" : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
