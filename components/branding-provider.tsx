"use client";

import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { brandingToCssVars, getBrandingScopeFromPathname } from "@/lib/branding-settings";
import type { BrandingScope, BrandingSettingsSnapshot } from "@/lib/supabase/types";

type BrandingMap = Record<BrandingScope, BrandingSettingsSnapshot>;

type BrandingContextValue = {
  scope: BrandingScope;
  settings: BrandingSettingsSnapshot;
  allSettings: BrandingMap;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyCssVars(settings: BrandingSettingsSnapshot) {
  const vars = brandingToCssVars(settings);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value as string);
  });
}

export function BrandingProvider({ children, initialSettings }: { children: React.ReactNode; initialSettings: BrandingMap }) {
  const pathname = usePathname();
  const scope = getBrandingScopeFromPathname(pathname);
  const settings = initialSettings[scope];

  useLayoutEffect(() => {
    applyCssVars(settings);
    document.documentElement.dataset.brandingScope = scope;
  }, [scope, settings]);

  const value = useMemo(() => ({ scope, settings, allSettings: initialSettings }), [initialSettings, scope, settings]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider.");
  }

  return context;
}

