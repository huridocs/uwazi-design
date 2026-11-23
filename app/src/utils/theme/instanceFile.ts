import { isValidHex, normalizeHex } from "./color";
import { HEADER_LAYOUT_KEY, headerLayoutFrom, headerLayoutOf, withHeaderLayout, type HeaderLayout } from "./headerLayout";
import { recomputeSimpleFromAnchors, settingsColorsFromRail, themeVarsForExport, type StockPresetId } from "./derivation";
import {
  appliedTheme,
  CHROME_OVERRIDE_VAR_KEYS,
  fillChromeImportDefaults,
  resolvedChrome,
  SEMANTIC_VAR_KEYS,
  THEME_EDITOR_MODE_KEY,
  THEME_PRESET_KEY,
  THEME_SIMPLE_BASE_KEY,
  themeKeyHint,
  themeStorageKey,
  type ChromeOverrideVarKey,
  type SemanticVarKey,
  type ThemeMode,
  type ThemePresetId,
  type ThemeVars,
} from "./model";

/** The "theme instance file": a theme as JSON, grouped by what it colours,
 *  each line followed by a `#` note. The format is huridocs/uwazi's
 *  (`themeInstanceExport.ts`, `themeInstanceImport.ts`), so a file written by
 *  either is read by the other.
 *
 *  One line is the prototype's own: `"__headerLayout"`, at the top level
 *  beside `id`. Uwazi's import reads `id`, `editorMode`, `assetPreset`,
 *  `light`, `dark` and `chrome` from the top level and nothing else
 *  (`parseThemeInstanceImportJson`, PR 10039 at 5d4014dc), so it skips the
 *  line; a key inside `light` or `dark` would be refused there as an unknown
 *  colour. A file without the line, which is every file from Uwazi, loads
 *  as Standard. */

const GROUPS: { name: string; keys: readonly string[] }[] = [
  { name: "header", keys: CHROME_OVERRIDE_VAR_KEYS.slice(0, 5) },
  {
    name: "actions",
    keys: [
      "--color-theme-accent-primary",
      "--color-theme-accent-supporting",
      "--color-theme-accent-emphasis",
      "--color-theme-success",
      "--color-theme-warning",
    ],
  },
  {
    name: "page",
    keys: [
      "--color-theme-bg-primary",
      "--color-theme-bg-surface",
      "--color-theme-bg-muted",
      "--color-theme-border-primary",
    ],
  },
  {
    name: "text",
    keys: [
      "--color-theme-text-primary",
      "--color-theme-text-secondary",
      "--color-theme-text-tertiary",
      "--color-theme-text-muted",
    ],
  },
  { name: "settings", keys: CHROME_OVERRIDE_VAR_KEYS.slice(5) },
];

const modeBlock = (vars: ThemeVars, mode: ThemeMode): string => {
  const colors: Record<string, string> = { ...appliedTheme(vars, mode), ...resolvedChrome(vars, mode) };
  return GROUPS.map((group, gi) => {
    const lines = group.keys
      .map((key, i) => `      "${key}": "${colors[key]}"${i === group.keys.length - 1 ? "" : ","} # ${themeKeyHint(key)}`)
      .join("\n");
    return `    "${group.name}": {\n${lines}\n    }${gi === GROUPS.length - 1 ? "" : ","}`;
  }).join("\n");
};

const stock = (value: string | undefined): StockPresetId | undefined =>
  value === "legacy" || value === "default" ? value : undefined;

/** The file's text for a theme. */
export function buildThemeInstanceExport(vars: ThemeVars, assetPreset?: StockPresetId): string {
  const source = themeVarsForExport(vars);
  const id = stock(source[THEME_SIMPLE_BASE_KEY]) ?? stock(source[THEME_PRESET_KEY]) ?? (assetPreset === "legacy" ? "legacy" : "custom");
  const editorMode = source[THEME_EDITOR_MODE_KEY] === "advanced" ? "advanced" : "simple";
  const assetLine = assetPreset ? `,\n  "assetPreset": "${assetPreset}"` : "";
  const layoutLine = `,\n  "${HEADER_LAYOUT_KEY}": "${headerLayoutOf(source)}"`;
  return `{
  "id": "${id}",
  "editorMode": "${editorMode}"${assetLine}${layoutLine},
  "light": {
${modeBlock(source, "light")}
  },
  "dark": {
${modeBlock(source, "dark")}
  }
}
`;
}

export const THEME_INSTANCE_FILENAME = "theme-instance.json";

export function downloadThemeInstance(contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = THEME_INSTANCE_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}

/* ── Import ─────────────────────────────────────────────────────────────── */

export interface ThemeInstanceImport {
  /** `light:<key>` / `dark:<key>` colours read from the file. */
  flat: Record<string, string>;
  editorMode: "simple" | "advanced";
  presetId?: ThemePresetId;
  assetPreset?: StockPresetId;
  /** Standard when the file does not say. */
  headerLayout: HeaderLayout;
}

/** Uwazi's four refusals. */
export type ThemeImportError = "invalid file" | "invalid hex color" | "unknown semantic key" | "empty theme";

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const semanticKey = (key: string) => SEMANTIC_VAR_KEYS.find((k) => k === key);
const chromeKey = (key: string) => CHROME_OVERRIDE_VAR_KEYS.find((k) => k === key);

/** Colours may sit at any depth under a mode, so the groups are optional. */
function readColors(
  node: unknown,
  semantic: Partial<Record<SemanticVarKey, string>>,
  chrome: Partial<Record<ChromeOverrideVarKey, string>>,
): ThemeImportError | undefined {
  if (!isRecord(node)) return "invalid file";
  const entries = Object.entries(node);
  if (entries.some(([, v]) => typeof v !== "string" && !isRecord(v))) return "invalid file";
  const hexes = entries.filter((e): e is [string, string] => typeof e[1] === "string");
  if (hexes.some(([, v]) => !isValidHex(normalizeHex(v.trim())))) return "invalid hex color";
  if (hexes.some(([k]) => !semanticKey(k) && !chromeKey(k))) return "unknown semantic key";
  for (const [key, value] of hexes) {
    const hex = normalizeHex(value.trim()).toUpperCase();
    const s = semanticKey(key);
    const c = chromeKey(key);
    if (s) semantic[s] = hex;
    if (c) chrome[c] = hex;
  }
  for (const [, value] of entries) {
    if (!isRecord(value)) continue;
    const nested = readColors(value, semantic, chrome);
    if (nested) return nested;
  }
  return undefined;
}

function absorbMode(node: unknown, mode: ThemeMode, flat: Record<string, string>): ThemeImportError | undefined {
  if (node === undefined) return undefined;
  const semantic: Partial<Record<SemanticVarKey, string>> = {};
  const chrome: Partial<Record<ChromeOverrideVarKey, string>> = {};
  const error = readColors(node, semantic, chrome);
  if (error) return error;
  for (const key of SEMANTIC_VAR_KEYS) if (semantic[key]) flat[themeStorageKey(mode, key)] = semantic[key]!;
  const filled = { ...fillChromeImportDefaults(chrome) };
  const rail = filled["--color-theme-chrome-settings-rail-bg"];
  const active = "--color-theme-chrome-settings-nav-item-active-bg";
  if (rail && !filled[active]) filled[active] = settingsColorsFromRail({}, mode, rail)[themeStorageKey(mode, active)];
  for (const key of CHROME_OVERRIDE_VAR_KEYS) if (filled[key]) flat[themeStorageKey(mode, key)] = filled[key]!;
  return undefined;
}

/** `#` to the end of a line is a note, outside a string. */
const stripHashComments = (text: string) =>
  text.replace(/("(?:\\.|[^"\\])*")|#[^\n]*/g, (_m, quoted: string | undefined) => quoted ?? "");

export function parseThemeInstanceImportText(text: string): ThemeInstanceImport | { error: ThemeImportError } {
  let raw: unknown;
  try {
    raw = JSON.parse(stripHashComments(text));
  } catch {
    return { error: "invalid file" };
  }
  if (!isRecord(raw)) return { error: "invalid file" };
  const flat: Record<string, string> = {};
  const chrome = isRecord(raw.chrome) ? raw.chrome : undefined;
  const error =
    absorbMode(raw.light, "light", flat) ??
    absorbMode(raw.dark, "dark", flat) ??
    absorbMode(chrome?.light, "light", flat) ??
    absorbMode(chrome?.dark, "dark", flat);
  if (error) return { error };
  if (Object.keys(flat).length === 0) return { error: "empty theme" };
  const id = raw.id;
  return {
    flat,
    editorMode: raw.editorMode === "advanced" ? "advanced" : "simple",
    presetId: id === "legacy" || id === "default" || id === "custom" ? id : undefined,
    assetPreset: stock(typeof raw.assetPreset === "string" ? raw.assetPreset : undefined),
    headerLayout: headerLayoutFrom(raw[HEADER_LAYOUT_KEY]),
  };
}

/** The stock preset an imported theme derives from. */
export const simpleBaseFromFile = (presetId: ThemePresetId | undefined, assetPreset?: StockPresetId): StockPresetId =>
  presetId === "legacy" || presetId === "default" ? presetId : assetPreset === "legacy" ? "legacy" : "default";

const SIMPLE_DERIVED = ["--color-theme-bg-muted", "--color-theme-text-secondary", "--color-theme-text-tertiary", "--color-theme-text-muted"];

/** An imported theme is always Custom. In simple mode the derived colours
 *  are recomputed from the file's anchors, as an edit would. */
export function themeVarsFromInstanceImport(file: ThemeInstanceImport): ThemeVars {
  return withHeaderLayout(importedColors(file), file.headerLayout);
}

function importedColors(file: ThemeInstanceImport): ThemeVars {
  const basePreset = simpleBaseFromFile(file.presetId, file.assetPreset);
  const base: ThemeVars = {
    [THEME_PRESET_KEY]: "custom",
    ...file.flat,
    [THEME_EDITOR_MODE_KEY]: file.editorMode,
    [THEME_SIMPLE_BASE_KEY]: basePreset,
  };
  if (file.editorMode !== "simple") return base;
  const kept = Object.fromEntries(Object.entries(file.flat).filter(([key]) => !SIMPLE_DERIVED.some((d) => key.endsWith(d))));
  return { ...recomputeSimpleFromAnchors(base, basePreset), ...kept };
}
