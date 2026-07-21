"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { brandingToCssVars, getBrandingScopeFromPathname } from "@/lib/branding-settings";
import type { BrandingScope, BrandingSettingsSnapshot } from "@/lib/supabase/types";

type BrandingMap = Record<BrandingScope, BrandingSettingsSnapshot>;
export type LandingPalette = "logo" | "classic";

const LOGO_LANDING_SETTINGS: BrandingSettingsSnapshot = {
  id: null,
  scope: "landing",
  logo_url: null,
  background_color: "#f7fbff",
  surface_color: "#ffffff",
  primary_color: "#1246c8",
  secondary_color: "#08bfe3",
  accent_color: "#1685f8",
  updated_by: null,
  updated_at: "2026-07-21T00:00:00.000Z",
  created_at: "2026-07-21T00:00:00.000Z",
};

type BrandingContextValue = {
  scope: BrandingScope;
  settings: BrandingSettingsSnapshot;
  allSettings: BrandingMap;
  landingPalette: LandingPalette;
  setLandingPalette: (palette: LandingPalette) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyCssVars(settings: BrandingSettingsSnapshot) {
  const vars = brandingToCssVars(settings);
  const root = document.documentElement;
  const body = document.body;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value as string);
    body.style.setProperty(key, value as string);
  });
}

export function BrandingProvider({ children, initialSettings }: { children: React.ReactNode; initialSettings: BrandingMap }) {
  const pathname = usePathname();
  const scope = getBrandingScopeFromPathname(pathname);
  const settings = initialSettings[scope];
  const [landingPalette, setLandingPaletteState] = useState<LandingPalette>("logo");

  useLayoutEffect(() => {
    const savedPalette = window.localStorage.getItem("landing-palette");
    if (savedPalette === "classic" || savedPalette === "logo") {
      setLandingPaletteState(savedPalette);
    }
  }, []);

  const setLandingPalette = useCallback((palette: LandingPalette) => {
    setLandingPaletteState(palette);
    window.localStorage.setItem("landing-palette", palette);
  }, []);

  useLayoutEffect(() => {
    const appliedSettings = scope === "landing" && landingPalette === "logo" ? LOGO_LANDING_SETTINGS : settings;
    applyCssVars(appliedSettings);
    document.documentElement.dataset.brandingScope = scope;
    document.documentElement.dataset.landingPalette = scope === "landing" ? landingPalette : "";
  }, [landingPalette, scope, settings]);

  const value = useMemo(() => ({ scope, settings, allSettings: initialSettings, landingPalette, setLandingPalette }), [initialSettings, landingPalette, scope, setLandingPalette, settings]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider.");
  }

  return context;
}
