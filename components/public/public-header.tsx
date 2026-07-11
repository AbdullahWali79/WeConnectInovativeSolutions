"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Icon } from "@/components/icon";
import { useBranding } from "@/components/branding-provider";

type NavItem = {
  href: string;
  path: string;
  label: string;
};

type NavCategory = {
  label: string;
  items: NavItem[];
};

const navCategories: NavCategory[] = [
  {
    label: "Company",
    items: [
      { href: "/#overview", path: "/", label: "Overview" },
      { href: "/products", path: "/products", label: "Products" },
      { href: "/team", path: "/team", label: "Team" },
      { href: "/contact", path: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/internships", path: "/internships", label: "Internships" },
      { href: "/courses", path: "/courses", label: "Courses" },
      { href: "/trainees", path: "/trainees", label: "Trainees" },
      { href: "/completed-students", path: "/completed-students", label: "Completed Students" },
    ],
  },
  {
    label: "Research Consultancy",
    items: [{ href: "/research-consultancy", path: "/research-consultancy", label: "Research Consultancy" }],
  },
  {
    label: "Community",
    items: [
      { href: "/mous", path: "/mous", label: "Partners" },
      { href: "/news", path: "/news", label: "News" },
      { href: "/blogs", path: "/blogs", label: "Blogs" },
    ],
  },
];

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname ?? "";
  const branding = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const logoControls = useAnimationControls();

  // Mobile sub-menu toggle state
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const logoSrc = branding.settings.logo_url && branding.settings.logo_url.trim() ? branding.settings.logo_url : "/logo.jpeg";

  useEffect(() => {
    setMenuOpen(false);
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 36);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  function handleNavigate(path: string) {
    setMenuOpen(false);
    if (currentPath !== path) {
      setPendingPath(path);
    }
  }

  function handleLogoClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    void logoControls.start({
      rotate: [0, 360],
      scale: [1, 1.14, 0.96, 1.06, 1],
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
    });
    handleNavigate("/");
    window.setTimeout(() => {
      router.push("/#overview");
    }, 180);
  }

  function toggleMobileCategory(label: string) {
    setOpenMobileCategory(openMobileCategory === label ? null : label);
  }

  return (
    <header className={`public-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className={`public-header-progress ${pendingPath ? "is-visible" : ""}`} />
      <div className="public-header-shell">
        <Link href="/#overview" className="public-header-logo" aria-label="WeConnect-Innovation home" onClick={handleLogoClick}>
          <span className="public-header-logo-mark">
            <motion.span
              className="absolute inset-0 block"
              animate={logoControls}
            >
              <Image
                src={logoSrc}
                alt=""
                fill
                className="object-contain object-center p-1.5"
                priority
                unoptimized
              />
            </motion.span>
          </span>
        </Link>

        <nav className="public-header-nav" aria-label="Primary navigation">
          {navCategories.map((cat) => {
            const isActiveCategory = cat.items.some((item) => currentPath === item.path);
            
            return (
              <div key={cat.label} className="group relative">
                <button className={`public-header-link flex items-center gap-1 ${isActiveCategory ? "font-bold" : ""}`} style={isActiveCategory ? { color: "var(--wc-on-bg)" } : undefined}>
                  {cat.label} <Icon name="expand_more" className="text-[16px] transition-transform group-hover:rotate-180" />
                </button>
                {/* Invisible bridge (pt-2) to prevent hover loss */}
                <div className="absolute left-0 top-full hidden w-56 flex-col pt-2 group-hover:flex z-50">
                  <div className="flex flex-col rounded-xl p-2 shadow-xl backdrop-blur-md" style={{ border: "1px solid color-mix(in srgb, var(--wc-surface-lowest) 10%, transparent)", backgroundColor: "var(--wc-surface)" }}>
                    {cat.items.map((item) => {
                      const active = currentPath === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.href}
                          prefetch
                          onClick={() => handleNavigate(item.path)}
                          className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                            active ? "" : ""
                          } ${pendingPath === item.path ? "opacity-50" : ""}`}
                          style={
                            active
                              ? { backgroundColor: "color-mix(in srgb, var(--wc-secondary) 10%, transparent)", color: "var(--wc-secondary)" }
                              : { color: "var(--wc-on-surface-variant)" }
                          }
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="public-header-actions">
          <Link href="/testimonials" prefetch onClick={() => handleNavigate("/testimonials")} className="public-header-feedback public-header-feedback-action">
            Feedbacks
          </Link>
          <Link href="/login" prefetch onClick={() => handleNavigate("/login")} className="public-header-login">
            Login
          </Link>
          <Link href="/apply" prefetch onClick={() => handleNavigate("/apply")} className="public-header-cta">
            Apply Now
          </Link>
        </div>

        <button
          type="button"
          className="public-header-menu-button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="public-mobile-menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Icon name={menuOpen ? "close" : "menu"} className="public-header-menu-icon" />
        </button>
      </div>

      <div className={`public-mobile-backdrop ${menuOpen ? "is-open" : ""}`} onClick={() => setMenuOpen(false)} />
      <div id="public-mobile-menu" className={`public-mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <nav className="public-mobile-nav" aria-label="Mobile navigation">
          {navCategories.map((cat) => {
            const isExpanded = openMobileCategory === cat.label;
            return (
              <div key={cat.label} className="flex flex-col">
                <button 
                  onClick={() => toggleMobileCategory(cat.label)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-bold"
                  style={{ color: "var(--wc-on-surface)" }}
                >
                  {cat.label}
                  <Icon name={isExpanded ? "expand_less" : "expand_more"} />
                </button>
                {isExpanded && (
                  <div className="mb-2 ml-4 flex flex-col gap-1 border-l-2 pl-2" style={{ borderColor: "color-mix(in srgb, var(--wc-primary) 12%, var(--wc-surface-lowest))" }}>
                    {cat.items.map((item) => {
                      const active = currentPath === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.href}
                          prefetch
                          onClick={() => handleNavigate(item.path)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pendingPath === item.path ? "opacity-50" : ""}`}
                          style={
                            active
                              ? { backgroundColor: "color-mix(in srgb, var(--wc-primary) 10%, var(--wc-surface-lowest))", color: "var(--wc-primary)" }
                              : { color: "var(--wc-on-surface-variant)" }
                          }
                        >
                          <span>{item.label}</span>
                          {active && <Icon name="arrow_forward" className="text-[16px]" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            href="/testimonials"
            prefetch
            onClick={() => handleNavigate("/testimonials")}
            className={`public-mobile-link ${currentPath.startsWith("/feedback") || currentPath.startsWith("/testimonials") ? "is-active" : ""} ${pendingPath === "/testimonials" ? "is-pending" : ""}`}
          >
            <span>Feedbacks</span>
            <Icon name="reviews" className="public-mobile-link-icon" />
          </Link>
        </nav>

        <div className="public-mobile-actions">
          <Link href="/login" prefetch onClick={() => handleNavigate("/login")} className="public-mobile-login">
            Login
          </Link>
          <Link href="/apply" prefetch onClick={() => handleNavigate("/apply")} className="public-mobile-cta">
            Apply Now
          </Link>
        </div>
      </div>
    </header>
  );
}
