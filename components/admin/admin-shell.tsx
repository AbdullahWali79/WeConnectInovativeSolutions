"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Profile } from "@/lib/supabase/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { PermissionKey } from "@/lib/admin-permissions";
import Image from "next/image";
import { brandingToCssVars } from "@/lib/branding-settings";
import type { BrandingSettingsSnapshot } from "@/lib/supabase/types";
import { useBranding } from "@/components/branding-provider";

type NavItem = { href: string; label: string; icon: string; permission?: PermissionKey; adminOnly?: boolean };
type NavGroup = { id: string; label: string; icon: string; items: NavItem[] };

const dashboardItem: NavItem = { href: "/admin", label: "Dashboard", icon: "dashboard", permission: "dashboard.view" };
const navGroups: NavGroup[] = [
  { id: "academics", label: "Academics", icon: "school", items: [
    { href: "/admin/courses", label: "Courses", icon: "school", permission: "courses.view" },
    { href: "/admin/tasks", label: "Tasks", icon: "assignment_add", permission: "tasks.view" },
    { href: "/admin/submissions", label: "Reviews", icon: "rate_review", permission: "submissions.view" },
    { href: "/admin/progress", label: "Progress", icon: "monitoring", permission: "progress.view" },
    { href: "/admin/task-analytics", label: "Reports", icon: "summarize", permission: "dashboard.view" },
    { href: "/admin/helping-videos", label: "Helping Videos", icon: "smart_display", adminOnly: true },
  ]},
  { id: "students", label: "Students", icon: "groups", items: [
    { href: "/admin/applications", label: "Applications", icon: "pending_actions", permission: "applications.view" },
    { href: "/admin/students", label: "Students", icon: "groups", permission: "students.view" },
    { href: "/admin/trainees", label: "Trainees", icon: "school", permission: "trainees.view" },
    { href: "/admin/manual-enrollments", label: "Manual Enrollments", icon: "how_to_reg", adminOnly: true },
  ]},
  { id: "finance", label: "Finance", icon: "payments", items: [
    { href: "/admin/fees", label: "Fees", icon: "receipt_long", adminOnly: true },
    { href: "/admin/products", label: "Products", icon: "inventory_2", permission: "products.view" },
    { href: "/admin/projects", label: "Student Projects", icon: "folder_special", adminOnly: true },
    { href: "/admin/client-hunting", label: "Client Hunting", icon: "manage_search", adminOnly: true },
    { href: "/admin/software-houses", label: "Software Houses", icon: "add_business", adminOnly: true },
  ]},
  { id: "communication", label: "Communication", icon: "campaign", items: [
    { href: "/admin/announcements", label: "Announcements", icon: "campaign", permission: "announcements.view" },
    { href: "/admin/feedback", label: "Feedback", icon: "reviews", adminOnly: true },
    { href: "/admin/blogs", label: "Blogs", icon: "article", adminOnly: true },
    { href: "/admin/social-media", label: "Social Media", icon: "share", adminOnly: true },
    { href: "/admin/promotional-popups", label: "Promotions", icon: "auto_awesome", permission: "promotional_popups.view" },
  ]},
  { id: "certificates", label: "Certificates & Letters", icon: "workspace_premium", items: [
    { href: "/admin/completions", label: "Completion", icon: "workspace_premium", adminOnly: true },
    { href: "/admin/internship-letters", label: "Internship Letters", icon: "description", adminOnly: true },
    { href: "/admin/manual-completions", label: "Manual Completion", icon: "workspace_premium", adminOnly: true },
  ]},
  { id: "team", label: "Team & Permissions", icon: "manage_accounts", items: [
    { href: "/admin/team-members", label: "Team Members", icon: "groups", permission: "team_members.view" },
    { href: "/admin/subadmins", label: "Teachers / Sub-Admins", icon: "manage_accounts", adminOnly: true },
  ]},
  { id: "settings", label: "Settings", icon: "settings", items: [
    { href: "/admin/notification-settings", label: "WhatsApp Alerts", icon: "chat", adminOnly: true },
    { href: "/admin/settings/notifications", label: "Email Notifications", icon: "notifications_active", adminOnly: true },
    { href: "/admin/settings/signature", label: "Signature & Stamp", icon: "draw", adminOnly: true },
    { href: "/admin/settings/branding", label: "Branding", icon: "palette", adminOnly: true },
    { href: "/admin/settings/ai-assistant", label: "AI Assistant", icon: "smart_toy", adminOnly: true },
  ]},
];

export function AdminShell({
  profile,
  permissions,
  branding,
  children,
}: {
  profile: Profile | null;
  permissions: PermissionKey[];
  branding?: BrandingSettingsSnapshot;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const brandingContext = useBranding();
  const activeBranding = branding ?? brandingContext.settings;
  const activeBrandingStyle = brandingToCssVars(activeBranding);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const canSeeItem = (item: NavItem) => {
    if (!profile) return item.adminOnly;
    if (profile.role === "admin") return true;
    if (item.adminOnly || !item.permission) return false;
    return permissions.includes(item.permission);
  };
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canSeeItem) }))
    .filter((group) => group.items.length > 0);
  const activeGroupId = visibleGroups.find((group) => group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))?.id ?? null;
  const [openGroupId, setOpenGroupId] = useState<string | null>(activeGroupId);
  const portalTitle = profile?.role === "teacher" ? "Sub-Admin Portal" : "Admin Portal";

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId, pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const toggleSidebar = useCallback(() => setCollapsed((prev) => !prev), []);

  return (
    <div className="min-h-screen bg-background text-on-background lg:flex" style={activeBrandingStyle}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg lg:hidden"
      >
        <Icon name="menu" className="text-xl" />
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-white/10 bg-primary text-on-primary lg:block",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4">
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="expanded-logo"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/15">
                    <Image src={activeBranding.logo_url ?? "/logo.jpeg"} alt="WeConnect logo" fill className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold leading-tight">{portalTitle}</h1>
                    <p className="text-[10px] text-blue-100 leading-tight">WeConnect</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-9 w-9 overflow-hidden rounded-lg bg-white/15"
                >
                  <Image src={activeBranding.logo_url ?? "/logo.jpeg"} alt="WeConnect logo" fill className="object-cover" unoptimized />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapse toggle - desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-white/20 hover:text-white lg:flex"
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Icon name="chevron_left" className="text-sm" />
              </motion.div>
            </button>

            {/* Close button - mobile only */}
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-blue-100 lg:hidden"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
            {canSeeItem(dashboardItem) && (
              <SidebarLink item={dashboardItem} active={pathname === "/admin"} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
            )}
            {visibleGroups.map((group) => {
              const isOpen = !collapsed && openGroupId === group.id;
              const hasActiveItem = activeGroupId === group.id;
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed) {
                        setCollapsed(false);
                        setOpenGroupId(group.id);
                        return;
                      }
                      setOpenGroupId((current) => current === group.id ? null : group.id);
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
                      hasActiveItem ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                    title={collapsed ? group.label : undefined}
                    aria-expanded={isOpen}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center"><Icon name={group.icon} className="text-[20px]" /></span>
                    {!collapsed && <><span className="min-w-0 flex-1 truncate text-left">{group.label}</span><motion.span animate={{ rotate: isOpen ? 180 : 0 }}><Icon name="expand_more" className="text-lg" /></motion.span></>}
                    {collapsed && hasActiveItem && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-secondary" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 space-y-1 border-l border-white/15 py-1 pl-2">
                          {group.items.map((item) => <SidebarLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} collapsed={false} nested onNavigate={() => setMobileOpen(false)} />)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4">
            {!collapsed ? (
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary-container px-3 py-2.5 text-sm font-bold text-on-secondary-fixed transition hover:brightness-105"
              >
                <Icon name="logout" className="text-lg" />
                Sign out
              </button>
            ) : (
              <button
                onClick={logout}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed transition hover:brightness-105"
                title="Sign out"
              >
                <Icon name="logout" className="text-lg" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "min-w-0 flex-1 p-4 pt-16 transition-[margin] duration-300 md:p-6 md:pt-16 lg:p-6 lg:pt-4",
        collapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ item, active, collapsed, nested = false, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; nested?: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
        nested && "py-2 text-[13px]",
        active ? "bg-white text-primary shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center"><Icon name={item.icon} className="text-[20px] transition-transform group-hover:scale-110" /></span>
      {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
      {collapsed && active && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-secondary" />}
    </Link>
  );
}
