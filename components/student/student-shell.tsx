"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Profile } from "@/lib/supabase/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import Image from "next/image";
import { brandingToCssVars } from "@/lib/branding-settings";
import type { BrandingSettingsSnapshot } from "@/lib/supabase/types";
import { useBranding } from "@/components/branding-provider";

const nav = [
  { href: "/student", label: "My Tasks", icon: "assignment" },
  { href: "/student/courses", label: "My Courses", icon: "school" },
  { href: "/student/syllabus", label: "Syllabus", icon: "menu_book" },
  { href: "/student/client-hunting", label: "Client Hunting", icon: "manage_search" },
  { href: "/student/social-media", label: "Social Media", icon: "share" },
  { href: "/student/projects", label: "Projects", icon: "folder_special" },
  { href: "/student/progress", label: "My Progress", icon: "monitoring" },
  { href: "/student/profile", label: "My Profile", icon: "person" },
  { href: "/student/helping-videos", label: "Helping Videos", icon: "smart_display" },
];

export function StudentShell({ profile, branding, children }: { profile: Profile | null; branding?: BrandingSettingsSnapshot; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const brandingContext = useBranding();
  const activeBranding = branding ?? brandingContext.settings;
  const activeBrandingStyle = brandingToCssVars(activeBranding);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("student-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("student-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const toggleSidebar = useCallback(() => setCollapsed((current) => !current), []);

  return (
    <div className="min-h-screen bg-background text-on-background lg:flex" style={activeBrandingStyle}>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close student menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label="Open student menu"
        onClick={() => {
          setCollapsed(false);
          setMobileOpen(true);
        }}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg lg:hidden"
      >
        <Icon name="menu" className="text-xl" />
      </button>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 288 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className={cn(
          "fixed left-0 top-0 z-50 h-[100dvh] border-r border-white/10 bg-primary text-white transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className={cn("relative flex h-[76px] shrink-0 items-center px-4", collapsed ? "justify-center" : "gap-3")}>
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="student-expanded-logo"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/15">
                    <Image src={activeBranding.logo_url ?? "/logo.jpeg"} alt="WeConnect logo" fill className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-lg font-bold">Student Hub</span>
                    <p className="truncate text-xs text-blue-100">WeConnect-Inovation Learning</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="student-collapsed-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/15"
                >
                  <Image src={activeBranding.logo_url ?? "/logo.jpeg"} alt="WeConnect logo" fill className="object-cover" unoptimized />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              aria-label={collapsed ? "Expand student sidebar" : "Collapse student sidebar"}
              title={collapsed ? "Expand menu" : "Collapse menu"}
              onClick={toggleSidebar}
              className="absolute -right-3 top-6 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-primary text-blue-100 shadow-md transition hover:bg-primary-container hover:text-white lg:flex"
            >
              <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <Icon name="chevron_left" className="text-lg" />
              </motion.span>
            </button>

            <button
              type="button"
              aria-label="Close student menu"
              onClick={() => setMobileOpen(false)}
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 lg:hidden"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
              return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  active ? "bg-white text-primary shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <Icon name={item.icon} className="text-[21px] transition-transform group-hover:scale-110" />
                </span>
                {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                {collapsed && active && <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-secondary" />}
              </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 px-3 py-3">
            <Link
              href="/student/tasks?addTask=1"
              title={collapsed ? "Add Task" : undefined}
              onClick={() => {
                setMobileOpen(false);
                window.dispatchEvent(new Event("open-add-task"));
              }}
              className={cn(
                "mb-3 flex items-center rounded-lg bg-secondary-container font-bold text-on-secondary-fixed transition hover:brightness-105",
                collapsed ? "h-11 w-11 justify-center" : "w-full justify-center gap-2 px-3 py-3",
              )}
            >
              <Icon name="add_task" className="text-xl" />
              {!collapsed && "Add Task"}
            </Link>

            {!collapsed ? (
              <div className="rounded-xl bg-white/10 p-4">
                <p className="truncate text-sm font-bold">{profile?.full_name ?? "Student"}</p>
                <p className="truncate text-xs text-blue-100">{profile?.email}</p>
                <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
                  <Icon name="logout" className="text-lg" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 text-white transition hover:bg-white/10"
              >
                <Icon name="logout" className="text-xl" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <main
        className={cn(
          "min-w-0 flex-1 p-5 pt-16 transition-[margin] duration-300 md:p-8 md:pt-16 lg:p-10 lg:pt-10",
          collapsed ? "lg:ml-20" : "lg:ml-72",
        )}
      >
        {children}
      </main>
    </div>
  );
}
