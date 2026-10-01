"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { getPublicSimulationCategories } from "@/app/simulations/actions";
import { motion, useAnimationControls } from "framer-motion";
import { Icon } from "@/components/icon";
import { useBranding } from "@/components/branding-provider";

import { navCategories, groupId, type NavCategory, type NavItem } from "@/lib/cms/navigation";
import { useCms } from "@/components/cms/cms-provider";
import { menuIsVisible } from "@/lib/cms/model";

function HeaderChevron({ expanded = false, className = "" }: { expanded?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`public-header-chevron ${expanded ? "is-expanded" : ""} ${className}`}
    >
      <path d="m5.25 7.5 4.75 4.75 4.75-4.75" />
    </svg>
  );
}


export function PublicHeader() {
  const { settings } = useCms();
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname ?? "";
  const branding = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const logoControls = useAnimationControls();
  const [navItems, setNavItems] = useState<NavCategory[]>(navCategories);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, success } = await getPublicSimulationCategories();
        if (success && data && data.length > 0) {
          const simulationNavItems: NavItem[] = data.map((cat: { slug: string; name: string }) => ({
            href: `/simulations#${cat.slug}`,
            path: `/simulations#${cat.slug}`,
            label: cat.name
          }));
          
          simulationNavItems.unshift({
            href: `/simulations`,
            path: `/simulations`,
            label: "All Simulations"
          });

          setNavItems((prev) => {
            const newItems = [...prev];
            const simIndex = newItems.findIndex((c) => c.label === "Simulations");
            if (simIndex !== -1) {
              newItems[simIndex] = {
                ...newItems[simIndex],
                items: simulationNavItems
              };
            }
            return newItems;
          });
        }
      } catch (err) {
        console.error("Failed to load simulation categories", err);
      }
    }
    loadCategories();
  }, []);

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

  const bottomNavItems = [
    { href: "/#overview", path: "/", label: "Home", icon: "home" },
    { href: "/#portfolio", path: "/#portfolio", label: "Work", icon: "work" },
    { href: "/contact", path: "/contact", label: "Contact", icon: "chat" },
    { href: "/apply", path: "/apply", label: "Apply", icon: "send" },
  ];

  const visible = (id: string) => menuIsVisible(id, settings);
  const label = (id: string, fallback: string) => settings.find(s => s.id === id)?.label || fallback;
  const order = (id: string) => settings.find(s => s.id === id)?.sort_order ?? 0;
  const visibleNavItems = navItems.filter(cat => visible(cat.href || groupId(cat.label))).map(cat => ({
    ...cat,
    menuId: cat.href || groupId(cat.label),
    label: label(cat.href || groupId(cat.label), cat.label),
    items: cat.items?.filter(item => visible(item.href)).map(item => ({ ...item, label: label(item.href, item.label) })).sort((a,b) => order(a.href) - order(b.href)),
  })).filter(cat => cat.href || cat.items?.length).sort((a,b) => order(a.menuId) - order(b.menuId));

  return (
    <header className={`public-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className={`public-header-progress ${pendingPath ? "is-visible" : ""}`} />
      <div className="public-header-shell">
        <Link href="/#overview" className="public-header-logo" aria-label="We Connect Innovative Solutions home" onClick={handleLogoClick}>
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
          <span className="public-header-brand-name">
            We Connect
            <small>Innovative Solutions</small>
          </span>
        </Link>

        <nav className="public-header-nav" aria-label="Primary navigation">
          {visibleNavItems.map((cat) => {
            const isActiveCategory = cat.href 
              ? currentPath === cat.path 
              : cat.items?.some((item) => currentPath === item.path);
            
            if (cat.href) {
              return (
                <Link
                  key={cat.label}
                  href={cat.href}
                  onClick={() => handleNavigate(cat.path || cat.href!)}
                  className={`public-header-link flex items-center gap-1 ${cat.path === "/research-consultancy" ? "public-header-attention" : ""} ${isActiveCategory ? "font-bold" : ""}`}
                  style={isActiveCategory ? { color: "var(--wc-on-bg)" } : undefined}
                >
                  {cat.label}
                </Link>
              );
            }

            return (
              <div key={cat.label} className="group relative">
                <button className={`public-header-link flex items-center gap-1 ${isActiveCategory ? "font-bold" : ""}`} style={isActiveCategory ? { color: "var(--wc-on-bg)" } : undefined}>
                  {cat.label} <HeaderChevron className="group-hover:rotate-180" />
                </button>
                {/* Invisible bridge (pt-2) to prevent hover loss */}
                <div className="absolute left-0 top-full hidden w-56 flex-col pt-2 group-hover:flex z-50">
                  <div className="flex flex-col rounded-xl p-2 shadow-xl backdrop-blur-md" style={{ border: "1px solid color-mix(in srgb, var(--wc-surface-lowest) 10%, transparent)", backgroundColor: "var(--wc-surface)" }}>
                    {cat.items?.map((item) => {
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
          <Link href="/login" prefetch onClick={() => handleNavigate("/login")} className="public-header-login">
            Login
          </Link>
          {visible("/contact") && <Link href="/contact" prefetch onClick={() => handleNavigate("/contact")} className="public-header-cta">
            Start a Project
          </Link>}
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
          {visibleNavItems.map((cat) => {
            if (cat.href) {
              const active = currentPath === cat.path;
              return (
                <div key={cat.label} className="flex flex-col">
                  <Link
                    href={cat.href}
                    prefetch
                    onClick={() => handleNavigate(cat.path || cat.href!)}
                    className={`public-mobile-category-button ${cat.path === "/research-consultancy" ? "public-mobile-attention" : ""}`}
                    style={active ? { color: "var(--wc-secondary)" } : undefined}
                  >
                    {cat.label}
                  </Link>
                </div>
              );
            }

            const isExpanded = openMobileCategory === cat.label;
            return (
              <div key={cat.label} className="flex flex-col">
                <button 
                  onClick={() => toggleMobileCategory(cat.label)}
                  className="public-mobile-category-button"
                >
                  {cat.label}
                  <HeaderChevron expanded={isExpanded} />
                </button>
                {isExpanded && (
                  <div className="public-mobile-submenu">
                    {cat.items?.map((item) => {
                      const active = currentPath === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.href}
                          prefetch
                          onClick={() => handleNavigate(item.path)}
                          className={`public-mobile-submenu-link ${active ? "is-active" : ""} ${pendingPath === item.path ? "opacity-50" : ""}`}
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
        </nav>

        <div className="public-mobile-actions">
          <Link href="/login" prefetch onClick={() => handleNavigate("/login")} className="public-mobile-login">
            Login
          </Link>
          {visible("/contact") && <Link href="/contact" prefetch onClick={() => handleNavigate("/contact")} className="public-mobile-cta">
            Start a Project
          </Link>}
        </div>
      </div>

      {currentPath !== "/apply" && <nav
        className={`public-bottom-nav ${scrolled ? "is-visible" : ""}`}
        aria-label="Quick mobile navigation"
      >
        <div className="public-bottom-nav-shell">
          {bottomNavItems.filter(item => visible(item.href)).map((item) => {
            const isActive = item.path === "/"
              ? currentPath === "/"
              : item.path === "/#portfolio"
                ? false
                : currentPath === item.path;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => item.path === "/#portfolio" ? setMenuOpen(false) : handleNavigate(item.path)}
                className={`public-bottom-nav-item ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon name={item.icon} className="public-bottom-nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`public-bottom-nav-item ${menuOpen ? "is-active" : ""}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close full menu" : "Open full menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
          >
            <Icon name={menuOpen ? "close" : "menu"} className="public-bottom-nav-icon" />
            <span>Menu</span>
          </button>
        </div>
      </nav>}
    </header>
  );
}
