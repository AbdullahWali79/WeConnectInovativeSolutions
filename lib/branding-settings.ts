import type { CSSProperties } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { BrandingScope, BrandingSettings, BrandingSettingsSnapshot } from "@/lib/supabase/types";

export const BRANDING_SCOPES: BrandingScope[] = ["landing", "admin", "student"];

export const LOGO_LANDING_SETTINGS: BrandingSettingsSnapshot = {
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

const DEFAULTS: Record<BrandingScope, BrandingSettingsSnapshot> = {
  landing: {
    id: null,
    scope: "landing",
    logo_url: null,
    background_color: "#030b1c",
    surface_color: "#061a3d",
    primary_color: "#062b7f",
    secondary_color: "#ffd24a",
    accent_color: "#ffa03a",
    updated_by: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  admin: {
    id: null,
    scope: "admin",
    logo_url: null,
    background_color: "#f8fafc",
    surface_color: "#ffffff",
    primary_color: "#0f4c81",
    secondary_color: "#0ea5a4",
    accent_color: "#22c55e",
    updated_by: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  student: {
    id: null,
    scope: "student",
    logo_url: null,
    background_color: "#f7fbff",
    surface_color: "#ffffff",
    primary_color: "#1d4ed8",
    secondary_color: "#14b8a6",
    accent_color: "#f59e0b",
    updated_by: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
};

export type BrandingSettingsInput = {
  logoUrl: string;
  backgroundColor: string;
  surfaceColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type BrandingCssVars = CSSProperties & Record<string, string>;

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const candidate = value?.trim();

  if (!candidate || !HEX_PATTERN.test(candidate)) {
    return fallback;
  }

  return candidate.startsWith("#") ? candidate.toLowerCase() : `#${candidate.toLowerCase()}`;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").slice(1);
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(hexA: string, hexB: string, weight: number) {
  const safeWeight = Math.max(0, Math.min(1, weight));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  return rgbToHex(
    a.r * (1 - safeWeight) + b.r * safeWeight,
    a.g * (1 - safeWeight) + b.g * safeWeight,
    a.b * (1 - safeWeight) + b.b * safeWeight,
  );
}

function lighten(hex: string, amount: number) {
  return mix(hex, "#ffffff", amount);
}

function darken(hex: string, amount: number) {
  return mix(hex, "#000000", amount);
}

function getReadableColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#081735" : "#ffffff";
}

export function getDefaultBrandingSettings(scope: BrandingScope): BrandingSettingsSnapshot {
  return {
    ...DEFAULTS[scope],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getDefaultBrandingSettingsMap() {
  return {
    landing: getDefaultBrandingSettings("landing"),
    admin: getDefaultBrandingSettings("admin"),
    student: getDefaultBrandingSettings("student"),
  } satisfies Record<BrandingScope, BrandingSettingsSnapshot>;
}

export function toBrandingSnapshot(row: BrandingSettings | BrandingSettingsSnapshot): BrandingSettingsSnapshot {
  return {
    id: row.id ?? null,
    scope: row.scope,
    logo_url: row.logo_url ?? null,
    background_color: normalizeHexColor(row.background_color, DEFAULTS[row.scope].background_color),
    surface_color: normalizeHexColor(row.surface_color, DEFAULTS[row.scope].surface_color),
    primary_color: normalizeHexColor(row.primary_color, DEFAULTS[row.scope].primary_color),
    secondary_color: normalizeHexColor(row.secondary_color, DEFAULTS[row.scope].secondary_color),
    accent_color: normalizeHexColor(row.accent_color, DEFAULTS[row.scope].accent_color),
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at ?? new Date().toISOString(),
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export function brandingToCssVars(settings: BrandingSettingsSnapshot): BrandingCssVars {
  const background = normalizeHexColor(settings.background_color, DEFAULTS[settings.scope].background_color);
  const surface = normalizeHexColor(settings.surface_color, DEFAULTS[settings.scope].surface_color);
  const primary = normalizeHexColor(settings.primary_color, DEFAULTS[settings.scope].primary_color);
  const secondary = normalizeHexColor(settings.secondary_color, DEFAULTS[settings.scope].secondary_color);
  const accent = normalizeHexColor(settings.accent_color, DEFAULTS[settings.scope].accent_color);
  const primaryContainer = lighten(primary, 0.16);
  const secondaryContainer = lighten(secondary, 0.16);
  const surfaceLowest = lighten(surface, 0.04);
  const surfaceLow = lighten(surface, 0.08);
  const surfaceContainer = lighten(surface, 0.14);
  const surfaceContainerHigh = lighten(surface, 0.2);
  const surfaceVariant = lighten(surface, 0.24);
  const outline = mix(background, darken(primary, 0.25), 0.55);
  const outlineVariant = mix(background, surface, 0.2);
  const inverseSurface = darken(surface, 0.82);
  const inversePrimary = lighten(primary, 0.56);
  const onBackground = getReadableColor(background);
  const onSurface = getReadableColor(surface);
  const onPrimary = getReadableColor(primary);
  const onPrimaryContainer = getReadableColor(primaryContainer);
  const onSecondary = getReadableColor(secondary);
  const onSecondaryContainer = getReadableColor(secondaryContainer);
  const error = "#ba1a1a";
  const errorContainer = "#ffdad6";

  return {
    "--wc-bg": background,
    "--wc-surface": surface,
    "--wc-surface-low": surfaceLow,
    "--wc-surface-lowest": surfaceLowest,
    "--wc-surface-container": surfaceContainer,
    "--wc-surface-container-high": surfaceContainerHigh,
    "--wc-surface-variant": surfaceVariant,
    "--wc-on-bg": onBackground,
    "--wc-on-surface": onSurface,
    "--wc-on-surface-variant": mix(onSurface, onBackground, 0.55),
    "--wc-primary": primary,
    "--wc-primary-container": primaryContainer,
    "--wc-on-primary": onPrimary,
    "--wc-on-primary-container": onPrimaryContainer,
    "--wc-secondary": accent,
    "--wc-secondary-container": secondaryContainer,
    "--wc-on-secondary": onSecondary,
    "--wc-on-secondary-container": onSecondaryContainer,
    "--wc-outline": outline,
    "--wc-outline-variant": outlineVariant,
    "--wc-error": error,
    "--wc-error-container": errorContainer,
    "--wc-inverse-surface": inverseSurface,
    "--wc-inverse-on-surface": getReadableColor(inverseSurface),
    "--wc-inverse-primary": inversePrimary,
    "--wc-brand-accent": accent,
  } as BrandingCssVars;
}

export function toBrandingInput(settings: BrandingSettingsSnapshot): BrandingSettingsInput {
  return {
    logoUrl: settings.logo_url ?? "",
    backgroundColor: settings.background_color,
    surfaceColor: settings.surface_color,
    primaryColor: settings.primary_color,
    secondaryColor: settings.secondary_color,
    accentColor: settings.accent_color,
  };
}

export function getBrandingScopeFromPathname(pathname: string | null | undefined): BrandingScope {
  if (!pathname) return "landing";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/student")) return "student";
  return "landing";
}

export async function loadBrandingSettingsMap() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("branding_settings").select("*");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as BrandingSettings[];
  const settings = getDefaultBrandingSettingsMap();

  for (const row of rows) {
    settings[row.scope] = toBrandingSnapshot(row);
  }

  return settings;
}
