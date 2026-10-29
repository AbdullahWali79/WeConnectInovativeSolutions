import type { PermissionKey } from "@/lib/admin-permissions";

/**
 * Where a sub-admin should land when they open `/admin`.
 *
 * Teachers are usually granted one module, not the dashboard. Without this the
 * login flow sent them to `/admin`, which rendered "Access denied — Dashboard
 * access has not been enabled for this teacher account." even though the module
 * they *do* own was one click away.
 *
 * The order mirrors the sidebar (components/admin/admin-shell.tsx) so the first
 * route listed here is also the first entry they see in the nav.
 */
const ADMIN_LANDING_ROUTES: { permission: PermissionKey; href: string }[] = [
  { permission: "dashboard.view", href: "/admin" },
  { permission: "courses.view", href: "/admin/courses" },
  { permission: "tasks.view", href: "/admin/tasks" },
  { permission: "submissions.view", href: "/admin/submissions" },
  { permission: "progress.view", href: "/admin/progress" },
  { permission: "applications.view", href: "/admin/applications" },
  { permission: "students.view", href: "/admin/students" },
  { permission: "trainees.view", href: "/admin/trainees" },
  { permission: "products.view", href: "/admin/products" },
  { permission: "social_campaigns.view", href: "/admin/social-media-campaigns" },
  { permission: "announcements.view", href: "/admin/announcements" },
  { permission: "promotional_popups.view", href: "/admin/promotional-popups" },
  { permission: "team_members.view", href: "/admin/team-members" },
];

/**
 * The first admin route this user can actually open, or `null` when they have
 * no module permissions at all.
 */
export function firstAllowedAdminRoute(permissions: readonly string[]): string | null {
  const granted = new Set(permissions);
  return ADMIN_LANDING_ROUTES.find((route) => granted.has(route.permission))?.href ?? null;
}
