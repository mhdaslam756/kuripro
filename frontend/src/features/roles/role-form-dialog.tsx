import { useEffect, useState } from "react";

import { FormDrawer, FormDrawerActions } from "@/components/ui/form-drawer";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import type { Role } from "./types";
import { useCreateRole, usePermissionCatalog, useUpdateRole } from "./use-roles";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const { data: permissions } = usePermissionCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const isEditing = Boolean(role);
  const isPending = createRole.isPending || updateRole.isPending;
  const mutationError = createRole.error ?? updateRole.error;

  const [name, setName] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setSelectedKeys(new Set(role?.permissionKeys ?? []));
      setNameError(null);
    }
  }, [open, role]);

  function togglePermission(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groupedPermissions = (permissions ?? []).reduce<Record<string, typeof permissions>>((acc, permission) => {
    (acc[permission.category] ??= []).push(permission);
    return acc;
  }, {});

  async function handleSubmit() {
    if (name.trim().length < 2) {
      setNameError("Enter a role name (2+ characters)");
      return;
    }

    const permissionKeys = Array.from(selectedKeys);
    if (isEditing && role) {
      await updateRole.mutateAsync({ id: role.id, permissionKeys, ...(role.isSystemRole ? {} : { name }) });
    } else {
      await createRole.mutateAsync({ name, permissionKeys });
    }
    onOpenChange(false);
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={isEditing ? `Edit ${role?.name}` : "Create role"}
      description={
        isEditing && role?.isSystemRole
          ? "Built-in role — permissions can be customized, the name can't."
          : "Choose a name and the permissions this role grants."
      }
      footer={
        <FormDrawerActions
          onCancel={() => onOpenChange(false)}
          onSubmit={() => void handleSubmit()}
          pending={isPending}
          submitLabel={isEditing ? "Save changes" : "Create role"}
          error={mutationError ? (mutationError instanceof ApiError ? mutationError.message : "Something went wrong") : null}
        />
      }
    >
        <div className="flex flex-col gap-4">
          <Field label="Role name" htmlFor="roleName" error={nameError ?? undefined}>
            <Input
              id="roleName"
              value={name}
              disabled={Boolean(isEditing && role?.isSystemRole)}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-4">
            {Object.entries(groupedPermissions).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-text-secondary">{category}</p>
                <div className="flex flex-col gap-2">
                  {items?.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded-xs"
                        checked={selectedKeys.has(permission.key)}
                        onChange={() => togglePermission(permission.key)}
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
    </FormDrawer>
  );
}
