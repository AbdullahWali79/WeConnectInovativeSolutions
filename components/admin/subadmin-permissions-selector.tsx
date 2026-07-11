"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { SubadminPermissionCard } from "@/components/admin/subadmin-permission-card";
import {
  OTHER_PERMISSION_MODULES,
  TEACHER_PERMISSION_GROUPS,
  isTeacherSelectablePermissionKey,
  type TeacherSelectablePermissionKey,
} from "@/lib/admin-permissions";

export function SubadminPermissionsSelector({
  selectedPermissions,
  onChange,
}: {
  selectedPermissions: TeacherSelectablePermissionKey[];
  onChange: (permissions: TeacherSelectablePermissionKey[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [expandedOtherModules, setExpandedOtherModules] = useState<Set<string>>(() => new Set());

  function update(next: Set<TeacherSelectablePermissionKey>) {
    onChange(Array.from(next));
  }

  function togglePermission(permissionKey: TeacherSelectablePermissionKey) {
    const next = new Set(selectedSet);
    const parts = permissionKey.split(".");
    const action = parts.pop();
    const moduleKey = parts.join(".");

    if (next.has(permissionKey)) {
      if (action === "view") {
        selectedSet.forEach((selectedPermission) => {
          if (selectedPermission === permissionKey || selectedPermission.startsWith(`${moduleKey}.`)) {
            next.delete(selectedPermission);
          }
        });
      } else {
        next.delete(permissionKey);
      }
    } else {
      next.add(permissionKey);
      const viewPermission = `${moduleKey}.view`;
      if (action !== "view" && isTeacherSelectablePermissionKey(viewPermission)) {
        next.add(viewPermission);
      }
    }
    update(next);
  }

  function selectPermissions(permissionKeys: readonly TeacherSelectablePermissionKey[]) {
    const next = new Set(selectedSet);
    permissionKeys.forEach((permissionKey) => {
      next.add(permissionKey);
    });
    update(next);
  }

  function clearPermissions(permissionKeys: readonly TeacherSelectablePermissionKey[]) {
    const next = new Set(selectedSet);
    permissionKeys.forEach((permissionKey) => {
      next.delete(permissionKey);
    });
    update(next);
  }

  function toggleGroupExpansion(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function toggleOtherModule(moduleId: string) {
    setExpandedOtherModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed">
            <Icon name="admin_panel_settings" className="text-xl" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-on-surface">Teacher permissions</h3>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">
              Select the modules this teacher can see and use. Certificate issuing remains admin-only.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {TEACHER_PERMISSION_GROUPS.map((group) => {
          const permissionKeys = group.permissions.map((permission) => permission.key);
          const allSelected = permissionKeys.every((permissionKey) => selectedSet.has(permissionKey));
          const selectedCount = permissionKeys.filter((permissionKey) => selectedSet.has(permissionKey)).length;
          const expanded = expandedGroups.has(group.id);
          const panelId = `teacher-permissions-${group.id}`;

          return (
            <section key={group.id} className="overflow-hidden rounded-xl border border-outline-variant/70 bg-white shadow-card">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleGroupExpansion(group.id)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-black text-primary">{group.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">{group.description}</span>
                </span>
                <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold text-on-secondary-fixed">
                  {selectedCount}/{permissionKeys.length}
                </span>
                <Icon
                  name="chevron_right"
                  className={`shrink-0 text-2xl text-primary transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden border-t border-outline-variant/70 bg-surface-container-lowest"
                  >
                    <div className="space-y-3 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => selectPermissions(permissionKeys)}
                          disabled={allSelected}
                          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white px-3 text-xs font-bold text-primary transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="select_all" className="text-base" />
                          Select all in this module
                        </button>
                        <button
                          type="button"
                          onClick={() => clearPermissions(permissionKeys)}
                          disabled={selectedCount === 0}
                          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-xs font-bold text-on-surface-variant transition hover:border-error/40 hover:bg-error-container/40 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="backspace" className="text-base" />
                          Clear module
                        </button>
                      </div>

                      <div className="grid gap-2">
                        {group.id === "other" ? (
                          OTHER_PERMISSION_MODULES.map((module) => {
                            const moduleKeys = module.permissions.map((permission) => permission.key);
                            const moduleSelectedCount = moduleKeys.filter((permissionKey) => selectedSet.has(permissionKey)).length;
                            const moduleAllSelected = moduleKeys.every((permissionKey) => selectedSet.has(permissionKey));
                            const moduleExpanded = expandedOtherModules.has(module.id);
                            const modulePanelId = `teacher-permissions-other-${module.id}`;

                            return (
                              <div key={module.id} className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white">
                                <button
                                  type="button"
                                  aria-expanded={moduleExpanded}
                                  aria-controls={modulePanelId}
                                  onClick={() => toggleOtherModule(module.id)}
                                  className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm font-bold text-on-surface transition hover:bg-surface-container-low"
                                >
                                  <span className="min-w-0 flex-1 break-words">{module.title}</span>
                                  <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-secondary-fixed">
                                    {moduleSelectedCount}/{moduleKeys.length}
                                  </span>
                                  <Icon
                                    name="chevron_right"
                                    className={`shrink-0 text-xl text-primary transition-transform duration-200 ${moduleExpanded ? "rotate-90" : ""}`}
                                  />
                                </button>

                                <AnimatePresence initial={false}>
                                  {moduleExpanded ? (
                                    <motion.div
                                      id={modulePanelId}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                      className="overflow-hidden border-t border-outline-variant/70 bg-surface-container-lowest"
                                    >
                                      <div className="space-y-3 p-2 sm:p-3">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                          <button
                                            type="button"
                                            onClick={() => selectPermissions(moduleKeys)}
                                            disabled={moduleAllSelected}
                                            className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white px-3 text-[10px] font-bold text-primary transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <Icon name="select_all" className="text-base" />
                                            Select all in this module
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => clearPermissions(moduleKeys)}
                                            disabled={moduleSelectedCount === 0}
                                            className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-[10px] font-bold text-on-surface-variant transition hover:border-error/40 hover:bg-error-container/40 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <Icon name="backspace" className="text-base" />
                                            Clear module
                                          </button>
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-2">
                                          {module.permissions.map((permission) => (
                                            <SubadminPermissionCard
                                              key={permission.key}
                                              permission={permission}
                                              checked={selectedSet.has(permission.key)}
                                              onToggle={togglePermission}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                            );
                          })
                        ) : (
                          <div className="grid gap-2 md:grid-cols-2">
                            {group.permissions.map((permission) => (
                              <SubadminPermissionCard
                                key={permission.key}
                                permission={permission}
                                checked={selectedSet.has(permission.key)}
                                onToggle={togglePermission}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </div>
  );
}
