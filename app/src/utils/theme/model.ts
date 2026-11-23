import { accessibleForeground, checkContrast, INK, mixHex, WHITE } from "./color";

/** The theme model of Settings › Theme and branding, after huridocs/uwazi
 *  `app/react/V2/theme/{tokens,themes,themeChromeOverrides,themeRoles}.ts`.
 *
 *  A theme is a flat record (`ThemeVars`), stored as Uwazi stores it so a
 *  theme file moves between the two:
 *    `__preset`            default | legacy | custom
 *    `__themeEditorMode`   simple | advanced
 *    `__themeSimpleBase`   the preset a custom theme's simple mode derives from
 *    `light:<key>` / `dark:<key>`   one colour, per mode
 *    `backup:<key>`        the custom theme, kept while a stock preset is chosen
 *
 *  The keys are Uwazi's (`--color-theme-*`). `themeCss.ts` maps them onto the
 *  prototype's tokens. Uwazi's "Uwazi Design" preset is this prototype's
 *  `tokens.css`, so the default theme writes no CSS at all. */

export type ThemePresetId = "default" | "legacy" | "custom";
export type ThemeMode = "light" | "dark";
export type ThemeVars = Record<string, string | undefined>;

export const THEME_MODES = ["light", "dark"] as const;
export const THEME_PRESET_KEY = "__preset";
export const THEME_EDITOR_MODE_KEY = "__themeEditorMode";
export const THEME_SIMPLE_BASE_KEY = "__themeSimpleBase";

/** The thirteen colours a theme stores per mode. */
export const SEMANTIC_VAR_KEYS = [
  "--color-theme-accent-primary",
  "--color-theme-accent-supporting",
  "--color-theme-accent-emphasis",
  "--color-theme-bg-primary",
  "--color-theme-bg-surface",
  "--color-theme-bg-muted",
  "--color-theme-success",
  "--color-theme-warning",
  "--color-theme-text-primary",
  "--color-theme-text-secondary",
  "--color-theme-text-tertiary",
  "--color-theme-text-muted",
  "--color-theme-border-primary",
] as const;
export type SemanticVarKey = (typeof SEMANTIC_VAR_KEYS)[number];
export const ACCENT_PRIMARY_KEY = "--color-theme-accent-primary" as const;

/** Uwazi's labels and hints, verbatim. */
export const SEMANTIC_VAR_LABELS: Record<SemanticVarKey, string> = {
  "--color-theme-accent-primary": "Primary action",
  "--color-theme-accent-supporting": "Supporting accent",
  "--color-theme-accent-emphasis": "Emphasis / danger background",
  "--color-theme-bg-primary": "Page background",
  "--color-theme-bg-surface": "Surface background",
  "--color-theme-bg-muted": "Muted background",
  "--color-theme-success": "Success background",
  "--color-theme-warning": "Warning background",
  "--color-theme-text-primary": "Text primary",
  "--color-theme-text-secondary": "Text secondary",
  "--color-theme-text-tertiary": "Text tertiary",
  "--color-theme-text-muted": "Text muted",
  "--color-theme-border-primary": "Border primary",
};
export const SEMANTIC_VAR_HINTS: Record<SemanticVarKey, string> = {
  "--color-theme-accent-primary": "Primary buttons and links",
  "--color-theme-accent-supporting": "Supporting accent on smaller controls",
  "--color-theme-accent-emphasis": "Danger and emphasis backgrounds",
  "--color-theme-bg-primary": "Page background",
  "--color-theme-bg-surface": "Cards and panels",
  "--color-theme-bg-muted": "Muted backgrounds",
  "--color-theme-success": "Success messages",
  "--color-theme-warning": "Warning messages",
  "--color-theme-text-primary": "Main text",
  "--color-theme-text-secondary": "Secondary text",
  "--color-theme-text-tertiary": "Tertiary text",
  "--color-theme-text-muted": "Muted text",
  "--color-theme-border-primary": "Borders and dividers",
};

export type EditableThemeVars = Record<SemanticVarKey, string>;

/** What the thirteen resolve to: themselves plus the colours derived from them. */
export type DerivedThemeKey =
  | "--color-theme-bg-warm"
  | "--color-theme-border-soft"
  | "--color-theme-bg-overlay"
  | "--color-theme-bg-selected"
  | "--color-theme-accent-supporting-tint"
  | "--color-theme-accent-emphasis-tint"
  | "--color-theme-success-light"
  | "--color-theme-warning-light"
  | "--color-theme-highlight-yellow"
  | "--color-theme-highlight-yellow-active"
  | "--color-theme-highlight-blue"
  | "--color-theme-shadow-sm"
  | "--color-theme-shadow-md"
  | "--color-theme-shadow-lg"
  | "--color-theme-shadow-xl";
export type ResolvedThemeVars = Record<SemanticVarKey | DerivedThemeKey, string>;

/** Uwazi's `resolveThemeVars`: the derived colours of an edited palette. */
export function resolveThemeVars(source: EditableThemeVars): ResolvedThemeVars {
  const bgPrimary = source["--color-theme-bg-primary"];
  const bgSurface = source["--color-theme-bg-surface"];
  const bgMuted = source["--color-theme-bg-muted"];
  const borderPrimary = source["--color-theme-border-primary"];
  const supporting = source["--color-theme-accent-supporting"];
  const warning = source["--color-theme-warning"];
  const text = source["--color-theme-text-primary"];
  const soft = `color-mix(in srgb, ${text} 5%, transparent)`;
  const medium = `color-mix(in srgb, ${text} 7%, transparent)`;
  const strong = `color-mix(in srgb, ${text} 10%, transparent)`;
  const warningTint = mixHex(warning, bgSurface, 0.82);
  return {
    ...source,
    "--color-theme-bg-warm": mixHex(bgPrimary, bgSurface, 0.72),
    "--color-theme-border-soft": mixHex(borderPrimary, bgPrimary, 0.35),
    "--color-theme-bg-overlay": `color-mix(in srgb, ${text} 45%, transparent)`,
    "--color-theme-bg-selected": mixHex(bgMuted, bgSurface, 0.35),
    "--color-theme-accent-supporting-tint": mixHex(supporting, bgSurface, 0.86),
    "--color-theme-accent-emphasis-tint": mixHex(source["--color-theme-accent-emphasis"], bgSurface, 0.88),
    "--color-theme-success-light": mixHex(source["--color-theme-success"], bgSurface, 0.86),
    "--color-theme-warning-light": warningTint,
    "--color-theme-highlight-yellow": warningTint,
    "--color-theme-highlight-yellow-active": mixHex(warning, bgSurface, 0.65),
    "--color-theme-highlight-blue": mixHex(supporting, bgSurface, 0.75),
    "--color-theme-shadow-sm": `0 1px 2px ${soft}`,
    "--color-theme-shadow-md": `0 4px 6px -1px ${medium}, 0 2px 4px -2px ${soft}`,
    "--color-theme-shadow-lg": `0 10px 15px -3px ${strong}, 0 4px 6px -4px ${soft}`,
    "--color-theme-shadow-xl": `0 20px 25px -5px ${strong}, 0 8px 10px -6px ${medium}`,
  };
}

/* ── Presets ────────────────────────────────────────────────────────────── */

/** `tokens.css`, light. */
const DEFAULT_LIGHT: EditableThemeVars = {
  "--color-theme-accent-primary": "#1A1A1A",
  "--color-theme-accent-supporting": "#00B4F0",
  "--color-theme-accent-emphasis": "#E8432A",
  "--color-theme-bg-primary": "#F5F0E8",
  "--color-theme-bg-surface": "#FFFFFF",
  "--color-theme-bg-muted": "#F5EED7",
  "--color-theme-success": "#059669",
  "--color-theme-warning": "#F59E0B",
  "--color-theme-text-primary": "#1A1A1A",
  "--color-theme-text-secondary": "#333333",
  "--color-theme-text-tertiary": "#555555",
  "--color-theme-text-muted": "#777777",
  "--color-theme-border-primary": "#EDE7DB",
};
/** `tokens.css`, `:root.dark`. */
const DEFAULT_DARK: EditableThemeVars = {
  "--color-theme-accent-primary": "#F5F0E8",
  "--color-theme-accent-supporting": "#00B4F0",
  "--color-theme-accent-emphasis": "#E8432A",
  "--color-theme-bg-primary": "#1A1A1A",
  "--color-theme-bg-surface": "#242424",
  "--color-theme-bg-muted": "#333333",
  "--color-theme-success": "#059669",
  "--color-theme-warning": "#F59E0B",
  "--color-theme-text-primary": "#F5F0E8",
  "--color-theme-text-secondary": "#D4CDB8",
  "--color-theme-text-tertiary": "#ADA79E",
  "--color-theme-text-muted": "#8A857C",
  "--color-theme-border-primary": "#514E48",
};
const DEFAULT_LIGHT_DERIVED: Record<DerivedThemeKey, string> = {
  "--color-theme-bg-warm": "#FCFAF8",
  "--color-theme-border-soft": "#E2DBC9",
  "--color-theme-bg-overlay": "#00000066",
  "--color-theme-bg-selected": "#F0EDED",
  "--color-theme-accent-supporting-tint": "#DDF3FD",
  "--color-theme-accent-emphasis-tint": "#FEE2E2",
  "--color-theme-success-light": "#D1FAE5",
  "--color-theme-warning-light": "#FEF3C7",
  "--color-theme-highlight-yellow": "#FDE68A",
  "--color-theme-highlight-yellow-active": "#FCD34D",
  "--color-theme-highlight-blue": "#BFDBFE",
  "--color-theme-shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
  "--color-theme-shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  "--color-theme-shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
  "--color-theme-shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
};
const DEFAULT_DARK_DERIVED: Record<DerivedThemeKey, string> = {
  "--color-theme-bg-warm": "#2A2A2A",
  "--color-theme-border-soft": "#5E5A53",
  "--color-theme-bg-overlay": "#000000AA",
  "--color-theme-bg-selected": "#333333",
  "--color-theme-accent-supporting-tint": "#0C3A4D",
  "--color-theme-accent-emphasis-tint": "#4A1A1A",
  "--color-theme-success-light": "#064C3A",
  "--color-theme-warning-light": "#78350F",
  "--color-theme-highlight-yellow": "#78350F",
  "--color-theme-highlight-yellow-active": "#92400E",
  "--color-theme-highlight-blue": "#1E3A5F",
  "--color-theme-shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.2)",
  "--color-theme-shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
  "--color-theme-shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.2)",
  "--color-theme-shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.25)",
};

/** Uwazi's pre-2026 look. */
const LEGACY_LIGHT: EditableThemeVars = {
  "--color-theme-accent-primary": "#2B56C1",
  "--color-theme-accent-supporting": "#2196F3",
  "--color-theme-accent-emphasis": "#D9534F",
  "--color-theme-bg-primary": "#FFFFFF",
  "--color-theme-bg-surface": "#FFFFFF",
  "--color-theme-bg-muted": "#F3F4F6",
  "--color-theme-success": "#059669",
  "--color-theme-warning": "#F59E0B",
  "--color-theme-text-primary": "#101828",
  "--color-theme-text-secondary": "#475467",
  "--color-theme-text-tertiary": "#667085",
  "--color-theme-text-muted": "#6B7280",
  "--color-theme-border-primary": "#E5E7EB",
};
const LEGACY_DARK: EditableThemeVars = {
  "--color-theme-accent-primary": "#93C5FD",
  "--color-theme-accent-supporting": "#60A5FA",
  "--color-theme-accent-emphasis": "#F87171",
  "--color-theme-bg-primary": "#111827",
  "--color-theme-bg-surface": "#1F2937",
  "--color-theme-bg-muted": "#374151",
  "--color-theme-success": "#059669",
  "--color-theme-warning": "#F59E0B",
  "--color-theme-text-primary": "#F9FAFB",
  "--color-theme-text-secondary": "#E5E7EB",
  "--color-theme-text-tertiary": "#CBD5E1",
  "--color-theme-text-muted": "#94A3B8",
  "--color-theme-border-primary": "#374151",
};
const LEGACY_LIGHT_DERIVED: Record<DerivedThemeKey, string> = {
  ...DEFAULT_LIGHT_DERIVED,
  "--color-theme-bg-warm": "#F9FAFB",
  "--color-theme-border-soft": "#E5E7EB",
  "--color-theme-bg-selected": "#F2F2F4",
  "--color-theme-accent-supporting-tint": "#DBEAFE",
  "--color-theme-highlight-yellow": "#FEF3C7",
  "--color-theme-highlight-yellow-active": "#FDE68A",
  "--color-theme-highlight-blue": "#DBEAFE",
};
const LEGACY_DARK_DERIVED: Record<DerivedThemeKey, string> = {
  ...DEFAULT_DARK_DERIVED,
  "--color-theme-bg-warm": "#243041",
  "--color-theme-border-soft": "#4B5563",
  "--color-theme-bg-selected": "#243041",
  "--color-theme-accent-supporting-tint": "#1E3A8A",
  "--color-theme-accent-emphasis-tint": "#7F1D1D",
  "--color-theme-success-light": "#14532D",
  "--color-theme-highlight-blue": "#1E3A8A",
};

export interface ThemePresetDefinition {
  id: ThemePresetId;
  label: string;
  description: string;
  sourceModes: Record<ThemeMode, EditableThemeVars>;
  modes: Record<ThemeMode, ResolvedThemeVars>;
}

const preset = (
  id: ThemePresetId,
  label: string,
  description: string,
  source: Record<ThemeMode, EditableThemeVars>,
  derived: Record<ThemeMode, Record<DerivedThemeKey, string>>,
): ThemePresetDefinition => ({
  id,
  label,
  description,
  sourceModes: source,
  modes: {
    light: { ...source.light, ...derived.light },
    dark: { ...source.dark, ...derived.dark },
  },
});

const DEFAULT_SOURCE = { light: DEFAULT_LIGHT, dark: DEFAULT_DARK };
const DEFAULT_DERIVED = { light: DEFAULT_LIGHT_DERIVED, dark: DEFAULT_DARK_DERIVED };

export const PRESET_DEFINITIONS: Record<ThemePresetId, ThemePresetDefinition> = {
  default: preset("default", "Uwazi Design", "The Uwazi light and dark colours.", DEFAULT_SOURCE, DEFAULT_DERIVED),
  legacy: preset(
    "legacy",
    "Legacy Uwazi",
    "The earlier Uwazi colours, in light and dark.",
    { light: LEGACY_LIGHT, dark: LEGACY_DARK },
    { light: LEGACY_LIGHT_DERIVED, dark: LEGACY_DARK_DERIVED },
  ),
  custom: preset("custom", "Custom", "Your own light and dark colours.", DEFAULT_SOURCE, DEFAULT_DERIVED),
};
export const NAMED_THEMES = Object.values(PRESET_DEFINITIONS);

/* ── Reading a stored theme ─────────────────────────────────────────────── */

export const themeStorageKey = (mode: ThemeMode, key: string) => `${mode}:${key}`;

export function getPresetId(vars: ThemeVars | undefined): ThemePresetId {
  const p = vars?.[THEME_PRESET_KEY];
  return p === "default" || p === "legacy" || p === "custom" ? p : "default";
}

/** The palette a theme paints in `mode`: the preset's, with each stored
 *  colour laid over it. A theme that changes nothing returns the preset's own
 *  object, so callers can tell "untouched" by identity. */
export function appliedTheme(vars: ThemeVars | undefined, mode: ThemeMode): ResolvedThemeVars {
  const presetId = getPresetId(vars);
  const source = PRESET_DEFINITIONS[presetId].sourceModes[mode];
  const base = { ...source };
  for (const key of SEMANTIC_VAR_KEYS) {
    const value = vars?.[themeStorageKey(mode, key)];
    if (value) base[key] = value;
  }
  return SEMANTIC_VAR_KEYS.some((key) => base[key] !== source[key])
    ? resolveThemeVars(base)
    : PRESET_DEFINITIONS[presetId].modes[mode];
}

/* ── Chrome: the header bar and the Settings sidebar ────────────────────── */

export const HEADER_CHROME_VAR_KEYS = [
  "--color-theme-chrome-app-bar",
  "--color-theme-chrome-app-bar-fg",
  "--color-theme-chrome-app-bar-hover",
  "--color-theme-chrome-app-bar-active",
  "--color-theme-chrome-app-bar-separator",
] as const;
export const SETTINGS_CHROME_VAR_KEYS = [
  "--color-theme-chrome-settings-rail-bg",
  "--color-theme-chrome-settings-nav-item-active-bg",
] as const;
export const CHROME_OVERRIDE_VAR_KEYS = [...HEADER_CHROME_VAR_KEYS, ...SETTINGS_CHROME_VAR_KEYS] as const;
export type ChromeOverrideVarKey = (typeof CHROME_OVERRIDE_VAR_KEYS)[number];

export const CHROME_VAR_LABELS: Record<ChromeOverrideVarKey, string> = {
  "--color-theme-chrome-app-bar": "Header bar background",
  "--color-theme-chrome-app-bar-fg": "Header bar text",
  "--color-theme-chrome-app-bar-hover": "Header bar hover background",
  "--color-theme-chrome-app-bar-active": "Header bar active background",
  "--color-theme-chrome-app-bar-separator": "Header bar divider",
  "--color-theme-chrome-settings-rail-bg": "Settings sidebar background",
  "--color-theme-chrome-settings-nav-item-active-bg": "Settings navigation active background",
};
export const CHROME_VAR_HINTS: Record<ChromeOverrideVarKey, string> = {
  "--color-theme-chrome-app-bar": "Header bar",
  "--color-theme-chrome-app-bar-fg": "Header title, language, library and settings",
  "--color-theme-chrome-app-bar-hover": "Resting fill of language, library and settings",
  "--color-theme-chrome-app-bar-active": "Current link and header button hover",
  "--color-theme-chrome-app-bar-separator": "Line under the header",
  "--color-theme-chrome-settings-rail-bg": "Settings sidebar",
  "--color-theme-chrome-settings-nav-item-active-bg": "Active settings navigation item",
};

export type ChromeVars = Record<ChromeOverrideVarKey, string>;

/** The chrome colours stored for `mode`. */
export function storedChrome(vars: ThemeVars | undefined, mode: ThemeMode): Partial<ChromeVars> {
  const out: Partial<ChromeVars> = {};
  for (const key of CHROME_OVERRIDE_VAR_KEYS) {
    const v = vars?.[themeStorageKey(mode, key)];
    if (v) out[key] = v;
  }
  return out;
}

/** The chrome a theme paints in `mode`: what the palette gives the header and
 *  the Settings sidebar (Uwazi's `getThemeRoles`), with stored colours over
 *  it. A stored bar with no stored text gets a readable one. */
export function resolvedChrome(vars: ThemeVars | undefined, mode: ThemeMode): ChromeVars {
  const resolved = appliedTheme(vars, mode);
  const legacy = getPresetId(vars) === "legacy";
  const surface = resolved["--color-theme-bg-surface"];
  const text = resolved["--color-theme-text-primary"];
  const stored = storedChrome(vars, mode);
  const merged: ChromeVars = {
    "--color-theme-chrome-app-bar": surface,
    "--color-theme-chrome-app-bar-fg": accessibleForeground(surface, text),
    "--color-theme-chrome-app-bar-hover": resolved["--color-theme-bg-warm"],
    "--color-theme-chrome-app-bar-active": resolved["--color-theme-bg-muted"],
    "--color-theme-chrome-app-bar-separator": resolved["--color-theme-border-primary"],
    "--color-theme-chrome-settings-rail-bg": legacy ? resolved["--color-theme-bg-muted"] : surface,
    "--color-theme-chrome-settings-nav-item-active-bg": legacy
      ? resolved["--color-theme-bg-selected"]
      : resolved["--color-theme-bg-warm"],
    ...stored,
  };
  const bar = stored["--color-theme-chrome-app-bar"];
  if (bar && !stored["--color-theme-chrome-app-bar-fg"])
    merged["--color-theme-chrome-app-bar-fg"] = accessibleForeground(bar, text);
  return merged;
}

/** A header read from a file that names only some of its colours: the rest
 *  follow the bar. */
export function fillChromeImportDefaults(partial: Partial<ChromeVars>): Partial<ChromeVars> {
  const bar = partial["--color-theme-chrome-app-bar"];
  if (!bar) return partial;
  const hover = partial["--color-theme-chrome-app-bar-hover"] ?? mixHex(bar, "#000000", 0.06);
  const active = partial["--color-theme-chrome-app-bar-active"] ?? mixHex(bar, "#000000", 0.1);
  const worst = (ink: string) => Math.min(...[bar, hover, active].map((bg) => checkContrast(bg, ink).ratio));
  const fg = partial["--color-theme-chrome-app-bar-fg"] ?? (worst(INK) >= worst(WHITE) ? INK : WHITE);
  return {
    ...partial,
    "--color-theme-chrome-app-bar-fg": fg,
    "--color-theme-chrome-app-bar-hover": hover,
    "--color-theme-chrome-app-bar-active": active,
    "--color-theme-chrome-app-bar-separator":
      partial["--color-theme-chrome-app-bar-separator"] ?? mixHex(bar, fg, 0.22),
  };
}

/** A label for any colour key a theme stores. */
export const themeKeyLabel = (key: string): string =>
  SEMANTIC_VAR_LABELS[key as SemanticVarKey] ?? CHROME_VAR_LABELS[key as ChromeOverrideVarKey] ?? key;
export const themeKeyHint = (key: string): string =>
  SEMANTIC_VAR_HINTS[key as SemanticVarKey] ?? CHROME_VAR_HINTS[key as ChromeOverrideVarKey] ?? "";
