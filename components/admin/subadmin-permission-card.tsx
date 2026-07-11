"use client";

import { Icon } from "@/components/icon";
import type { PermissionDefinition } from "@/lib/admin-permissions";

export function SubadminPermissionCard({
  permission,
  checked,
  onToggle,
}: {
  permission: PermissionDefinition;
  checked: boolean;
  onToggle: (permissionKey: PermissionDefinition["key"]) => void;
}) {
  return (
    <label className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 py-2.5 transition hover:border-primary/30 hover:bg-surface-container-low">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(permission.key)}
        className="sr-only"
      />
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
          checked
            ? "border-primary bg-primary text-white"
            : "border-outline-variant bg-white text-on-surface-variant group-hover:text-primary"
        }`}
      >
        <Icon name={checked ? "check" : "add"} className="text-lg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-bold text-on-surface">{permission.label}</span>
        <span className="mt-0.5 block break-all text-[10px] font-semibold text-on-surface-variant">
          {permission.key}
        </span>
      </span>
    </label>
  );
}
