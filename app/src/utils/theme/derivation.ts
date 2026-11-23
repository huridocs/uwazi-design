import { HEADER_LAYOUT_KEY } from "./headerLayout";
import {
  checkContrast,
  colorPaletteFromHex,
  colorsByContrast,
  INK,
  inkFor,
  isValidHex,
  mixHex,
  sameHex,
  WHITE,
} from "./color";
import {
  appliedTheme,
  getPresetId,
  HEADER_CHROME_VAR_KEYS,
  PRESET_DEFINITIONS,
  SEMANTIC_VAR_KEYS,
  THEME_EDITOR_MODE_KEY,
  THEME_MODES,
  THEME_PRESET_KEY,
  THEME_SIMPLE_BASE_KEY,
  themeStorageKey,
  type ChromeOverrideVarKey,
  type EditableThemeVars,
  type SemanticVarKey,
  type ThemeMode,
  type ThemePresetId,
  type ThemeVars,
} from "./model";

/** What one colour edit does to the rest of a theme, after huridocs/uwazi
 *  `themeSimpleDerivation.ts`, `headerColorSuggestions.ts`,
 *  `relatedColorSuggestions.ts` and `themePresetBackup.ts`. Pure: theme in,
 *  theme out. */

/* ── Simple mode ────────────────────────────────────────────────────────── */

/** The seven colours simple mode asks for; the other six follow from them. */
export const SIMPLE_SEMANTIC_ANCHOR_KEYS = [
  "--color-theme-accent-primary",
  "--color-theme-accent-supporting",
  "--color-theme-accent-emphasis",
  "--color-theme-bg-primary",
  "--color-theme-bg-surface",
  "--color-theme-text-primary",
  "--color-theme-border-primary",
] as const satisfies readonly SemanticVarKey[];
export type SimpleAnchorKey = (typeof SIMPLE_SEMANTIC_ANCHOR_KEYS)[number];

export type StockPresetId = "default" | "legacy";

/** The stock preset a theme's simple mode starts from. */
export function simpleBasePreset(
  selected: ThemePresetId,
  assetPreset: StockPresetId | undefined,
  storedBase?: string,
): StockPresetId {
  if (selected === "legacy" || selected === "default") return selected;
  if (storedBase === "legacy" || storedBase === "default") return storedBase;
  return assetPreset === "legacy" ? "legacy" : "default";
}

export const deriveBgMuted = (surface: string, primary: string) =>
  sameHex(surface, primary) ? mixHex(surface, "#64748B", 0.07) : mixHex(surface, primary, 0.42);

export const deriveTextStep = (text: string, surface: string, weight: number) => mixHex(text, surface, weight);

const textSteps = (text: string, surface: string) => ({
  "--color-theme-text-secondary": deriveTextStep(text, surface, 0.22),
  "--color-theme-text-tertiary": deriveTextStep(text, surface, 0.42),
  "--color-theme-text-muted": deriveTextStep(text, surface, 0.62),
});

function buildSimpleModeSemantics(
  base: StockPresetId,
  mode: ThemeMode,
  anchors: Record<SimpleAnchorKey, string>,
): EditableThemeVars {
  const merged: EditableThemeVars = { ...PRESET_DEFINITIONS[base].sourceModes[mode], ...anchors };
  const surface = merged["--color-theme-bg-surface"];
  return {
    ...merged,
    "--color-theme-bg-muted": deriveBgMuted(surface, merged["--color-theme-bg-primary"]),
    ...textSteps(merged["--color-theme-text-primary"], surface),
  };
}

const anchorsOf = (
  vars: ThemeVars,
  mode: ThemeMode,
  base: StockPresetId,
  patch: Partial<Record<SimpleAnchorKey, string>> = {},
) => {
  const resolved = appliedTheme({ ...vars, [THEME_PRESET_KEY]: base }, mode);
  return Object.fromEntries(
    SIMPLE_SEMANTIC_ANCHOR_KEYS.map((k) => [k, patch[k] ?? vars[themeStorageKey(mode, k)] ?? resolved[k]]),
  ) as Record<SimpleAnchorKey, string>;
};

const writeSemantics = (next: ThemeVars, mode: ThemeMode, semantics: EditableThemeVars) => {
  for (const key of SEMANTIC_VAR_KEYS) next[themeStorageKey(mode, key)] = semantics[key];
};

/** Switch to simple mode: both modes' six derived colours are recomputed
 *  from their anchors. */
export function recomputeSimpleFromAnchors(vars: ThemeVars, base: StockPresetId): ThemeVars {
  const next: ThemeVars = { ...vars, [THEME_EDITOR_MODE_KEY]: "simple", [THEME_SIMPLE_BASE_KEY]: base };
  for (const mode of THEME_MODES) writeSemantics(next, mode, buildSimpleModeSemantics(base, mode, anchorsOf(vars, mode, base)));
  return next;
}

/** One simple-mode edit: the anchor changes and `mode`'s derived colours follow. */
export function applySimpleAnchors(
  vars: ThemeVars,
  mode: ThemeMode,
  base: StockPresetId,
  patch: Partial<Record<SimpleAnchorKey, string>>,
): ThemeVars {
  const next: ThemeVars = { ...vars, [THEME_EDITOR_MODE_KEY]: "simple", [THEME_SIMPLE_BASE_KEY]: base };
  writeSemantics(next, mode, buildSimpleModeSemantics(base, mode, anchorsOf(vars, mode, base, patch)));
  return next;
}

/* ── The header bar and its companions ──────────────────────────────────── */

const fillForText = (bar: string, text: string, weight: number) => {
  const toward = text === INK ? WHITE : INK;
  const tint = mixHex(bar, toward, weight);
  return checkContrast(tint, text).passesAA ? tint : toward;
};

const headerCompanions = (bar: string, text: string): Partial<Record<ChromeOverrideVarKey, string>> => ({
  "--color-theme-chrome-app-bar-fg": text,
  "--color-theme-chrome-app-bar-hover": fillForText(bar, text, 0.7),
  "--color-theme-chrome-app-bar-active": fillForText(bar, text, 0.85),
  "--color-theme-chrome-app-bar-separator": mixHex(bar, text, 0.28),
});

/** Set (or, with no hex, reset) the header bar: its text, hover, active and
 *  divider are proposed from it and replace what was stored. */
export function headerColorsFromBar(vars: ThemeVars, mode: ThemeMode, hex: string | undefined): ThemeVars {
  const next: ThemeVars = { ...vars };
  const proposed = hex ? headerCompanions(hex, inkFor(hex)) : {};
  for (const key of HEADER_CHROME_VAR_KEYS) {
    const stored = themeStorageKey(mode, key);
    const value = key === "--color-theme-chrome-app-bar" ? hex : proposed[key];
    if (value) next[stored] = value;
    else delete next[stored];
  }
  return next;
}

export const simpleChromeFromBar = (vars: ThemeVars, mode: ThemeMode, hex: string | undefined): ThemeVars => ({
  ...headerColorsFromBar(vars, mode, hex),
  [THEME_EDITOR_MODE_KEY]: "simple",
});

/** The swatches a header colour's picker offers: those that keep the header
 *  text readable, the proposed one first. */
export function headerPickerColors({
  key,
  displayValue,
  colorOptions,
  bar,
  text,
}: {
  key: ChromeOverrideVarKey;
  displayValue: string;
  colorOptions: string[];
  bar: string;
  text: string;
}): string[] {
  const palette = [
    ...(Object.values(headerCompanions(bar, inkFor(bar))) as string[]),
    ...colorPaletteFromHex(displayValue),
    ...colorOptions,
    INK,
    WHITE,
  ];
  const textOnBar = key === "--color-theme-chrome-app-bar-fg" || key === "--color-theme-chrome-app-bar-separator";
  const passes = (swatch: string) => checkContrast(textOnBar ? bar : swatch, textOnBar ? swatch : text).passesAA;
  const ordered = colorsByContrast(palette, textOnBar ? bar : text, !textOnBar);
  const compatible = ordered.filter(passes);
  const shown = compatible.length ? compatible : ordered.slice(0, 1);
  const proposed = key === "--color-theme-chrome-app-bar-fg" ? inkFor(bar) : headerCompanions(bar, text)[key];
  const suggestion = proposed && passes(proposed) ? proposed.toUpperCase() : shown[0];
  if (!suggestion) return shown;
  return [suggestion, ...shown.filter((s) => !sameHex(s, suggestion))];
}

/* ── Page, surface and text edits carry their companions ────────────────── */

interface ColorContext {
  page: string;
  surface: string;
  text: string;
}

const write = (vars: ThemeVars, mode: ThemeMode, values: Record<string, string>): ThemeVars => {
  const next = { ...vars };
  for (const [key, value] of Object.entries(values)) next[themeStorageKey(mode, key)] = value;
  return next;
};

const surfaceForPage = (page: string, text: string) => mixHex(page, text === INK ? WHITE : INK, 0.14);

/** Editing the page, the surface or the main text moves the colours that
 *  must stay readable with it. Any other key returns undefined: it is stored
 *  alone. */
export function semanticColorsFromEdit(
  vars: ThemeVars,
  mode: ThemeMode,
  key: SemanticVarKey,
  hex: string,
  context: ColorContext,
): ThemeVars | undefined {
  if (key === "--color-theme-bg-primary") {
    const text = inkFor(hex);
    const surface = surfaceForPage(hex, text);
    return write(vars, mode, {
      "--color-theme-bg-primary": hex,
      "--color-theme-text-primary": text,
      "--color-theme-bg-surface": surface,
      "--color-theme-bg-muted": deriveBgMuted(surface, hex),
      "--color-theme-border-primary": mixHex(surface, text, 0.22),
      ...textSteps(text, surface),
    });
  }
  if (key === "--color-theme-bg-surface") {
    const text = checkContrast(hex, context.text).passesAA ? context.text : inkFor(hex);
    return write(vars, mode, {
      "--color-theme-bg-surface": hex,
      "--color-theme-text-primary": text,
      "--color-theme-bg-muted": deriveBgMuted(hex, context.page),
      "--color-theme-border-primary": mixHex(hex, text, 0.22),
      ...textSteps(text, hex),
    });
  }
  if (key === "--color-theme-text-primary")
    return write(vars, mode, { "--color-theme-text-primary": hex, ...textSteps(hex, context.surface) });
  return undefined;
}

const activeFill = (rail: string, text: string) => {
  const toward = text === INK ? WHITE : INK;
  const tint = mixHex(rail, toward, 0.7);
  return checkContrast(tint, text).passesAA ? tint : toward;
};

/** Set the Settings sidebar: its active item's fill follows. */
export const settingsColorsFromRail = (vars: ThemeVars, mode: ThemeMode, hex: string): ThemeVars =>
  write(vars, mode, {
    "--color-theme-chrome-settings-rail-bg": hex,
    "--color-theme-chrome-settings-nav-item-active-bg": activeFill(hex, inkFor(hex)),
  });

export interface PickerSpec {
  suggestion: string;
  against: string;
  swatchIsBackground: boolean;
}

const TEXT_STEP_WEIGHT: Record<string, number> = {
  "--color-theme-text-secondary": 0.22,
  "--color-theme-text-tertiary": 0.42,
  "--color-theme-text-muted": 0.62,
};

/** For a colour that is read against another: the value Uwazi proposes and
 *  what it must contrast with. Undefined for a free colour (the accents). */
export function relatedPickerSpec(key: string, current: ColorContext & { rail: string }): PickerSpec | undefined {
  if (key === "--color-theme-text-primary")
    return { suggestion: inkFor(current.page), against: current.page, swatchIsBackground: false };
  const weight = TEXT_STEP_WEIGHT[key];
  if (weight !== undefined)
    return {
      suggestion: deriveTextStep(current.text, current.surface, weight),
      against: current.surface,
      swatchIsBackground: false,
    };
  if (key === "--color-theme-bg-surface") {
    const text = inkFor(current.page);
    return { suggestion: surfaceForPage(current.page, text), against: text, swatchIsBackground: true };
  }
  if (key === "--color-theme-bg-muted")
    return { suggestion: deriveBgMuted(current.surface, current.page), against: current.text, swatchIsBackground: true };
  if (key === "--color-theme-border-primary")
    return { suggestion: mixHex(current.surface, current.text, 0.22), against: current.surface, swatchIsBackground: false };
  if (key === "--color-theme-chrome-settings-nav-item-active-bg") {
    const text = inkFor(current.rail);
    return { suggestion: activeFill(current.rail, text), against: text, swatchIsBackground: true };
  }
  return undefined;
}

/** The swatches for a `relatedPickerSpec` colour: the proposal first, then
 *  those that clear AA against its counterpart. */
export function relatedPickerColors({
  suggestion,
  against,
  swatchIsBackground,
  displayValue,
  colorOptions,
}: PickerSpec & { displayValue: string; colorOptions: string[] }): string[] {
  const palette = [suggestion, ...colorPaletteFromHex(displayValue), ...colorOptions, INK, WHITE].filter(isValidHex);
  const ordered = colorsByContrast(palette, against, swatchIsBackground);
  const passes = (swatch: string) =>
    checkContrast(swatchIsBackground ? swatch : against, swatchIsBackground ? against : swatch).passesAA;
  const compatible = ordered.filter(passes);
  const shown = compatible.length ? compatible : ordered.slice(0, 1);
  return [suggestion.toUpperCase(), ...shown.filter((s) => !sameHex(s, suggestion))];
}

/* ── Presets keep the custom theme ──────────────────────────────────────── */

const BACKUP = "backup:";
const isBackupKey = (key: string) => key.startsWith(BACKUP);

/** The custom theme as it would be restored: the backup, with any colours
 *  edited since on top. Undefined when there is no backup. */
function restoredCustom(vars: ThemeVars): Record<string, string> | undefined {
  const next: Record<string, string> = { [THEME_PRESET_KEY]: "custom" };
  let found = false;
  for (const [key, value] of Object.entries(vars)) {
    if (!value || !isBackupKey(key)) continue;
    next[key.slice(BACKUP.length)] = value;
    found = true;
  }
  if (!found) return undefined;
  for (const [key, value] of Object.entries(vars)) {
    if (!value || key === THEME_PRESET_KEY || isBackupKey(key)) continue;
    next[key] = value;
  }
  return next;
}

/** Choose a preset. Leaving Custom for a stock preset keeps the custom
 *  colours as `backup:` keys; choosing Custom again brings them back. */
export function selectThemePreset(vars: ThemeVars, presetId: ThemePresetId): ThemeVars {
  // The header layout is not a colour: it stays as it is under every preset,
  // and is never put in the backup.
  const { [HEADER_LAYOUT_KEY]: layout, [`${BACKUP}${HEADER_LAYOUT_KEY}`]: _stale, ...colors } = vars;
  const next = selectPresetColors(colors, presetId);
  return layout ? { ...next, [HEADER_LAYOUT_KEY]: layout } : next;
}

function selectPresetColors(vars: ThemeVars, presetId: ThemePresetId): ThemeVars {
  if (presetId === "custom") return restoredCustom(vars) ?? { [THEME_PRESET_KEY]: "custom" };
  const backup: Record<string, string> = {};
  const fromCustom = getPresetId(vars) === "custom";
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue;
    if (fromCustom ? key !== THEME_PRESET_KEY && !isBackupKey(key) : isBackupKey(key))
      backup[fromCustom ? `${BACKUP}${key}` : key] = value;
  }
  return { [THEME_PRESET_KEY]: presetId, ...backup };
}

/** What an export writes: the custom theme when one is kept in the backup. */
export const themeVarsForExport = (vars: ThemeVars): ThemeVars => restoredCustom(vars) ?? vars;
