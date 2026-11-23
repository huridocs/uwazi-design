import { accessibleForeground, checkContrast, fillForWhiteText, INK, inkFor, mixHex, sameHex } from "./color";
import {
  appliedTheme,
  getPresetId,
  HEADER_ACCENT_KEY,
  HEADER_CHROME_VAR_KEYS,
  PRESET_DEFINITIONS,
  resolvedChrome,
  SETTINGS_CHROME_VAR_KEYS,
  storedChrome,
  THEME_MODES,
  type ResolvedThemeVars,
  type ThemeMode,
  type ThemeVars,
} from "./model";

/** A theme as CSS over the prototype's tokens (`tokens.css`).
 *
 *  One stylesheet holds both modes, so the light/dark switch needs no script:
 *  each block is scoped to the mode it belongs to. The whole sheet is
 *  `@media screen`, because a printed page is paper whatever the theme.
 *
 *  Uwazi key                          token(s) here
 *  accent-primary                     --accent-primary (the commit button: `bg-action`)
 *  accent-supporting                  --accent-blue (carbon)
 *  accent-emphasis                    --accent-seal, --danger (seal)
 *  bg-primary / -surface / -muted     --bg-primary / --bg-surface / --bg-muted
 *  text-primary … -muted              --text-primary … --text-muted
 *  border-primary                     --border-primary
 *  success / warning                  --success / --warning
 *  (derived) bg-warm, bg-selected, border-soft, the tints, highlights, shadows
 *  chrome-app-bar…                    the same tokens, scoped to the Navbar
 *  chrome-settings-rail…              the same tokens, scoped to SettingsNav
 *
 *  The default preset with nothing changed is `tokens.css` itself, so it
 *  writes nothing. */

/** A selector that matches only in `mode`, above `tokens.css`'s own
 *  `:root` and `:root.dark` whatever the order the sheets load in. */
const SCOPE: Record<ThemeMode, string> = {
  light: ":root:not(.dark)",
  dark: ":root:root.dark",
};

const block = (selector: string, vars: Record<string, string>) =>
  `  ${selector} {\n${Object.entries(vars)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join("\n")}\n  }`;

/** The built-in wordmark is black artwork: inverted where text is light. */
const logoFilter = (text: string) => (inkFor(text) === INK ? "invert(1)" : "none");

function rootVars(r: ResolvedThemeVars): Record<string, string> {
  const surface = r["--color-theme-bg-surface"];
  const page = r["--color-theme-bg-primary"];
  const text = r["--color-theme-text-primary"];
  const border = r["--color-theme-border-primary"];
  const soft = r["--color-theme-border-soft"];
  const seal = r["--color-theme-accent-emphasis"];
  const action = r["--color-theme-accent-primary"];
  return {
    "--bg-primary": page,
    "--bg-surface": surface,
    "--bg-warm": r["--color-theme-bg-warm"],
    "--bg-muted": r["--color-theme-bg-muted"],
    "--bg-placeholder": mixHex(surface, page, 0.3),
    "--border-placeholder": mixHex(surface, text, 0.03),
    "--bg-overlay": r["--color-theme-bg-overlay"],
    "--bg-selected": r["--color-theme-bg-selected"],
    "--text-primary": text,
    "--text-secondary": r["--color-theme-text-secondary"],
    "--text-tertiary": r["--color-theme-text-tertiary"],
    "--text-muted": r["--color-theme-text-muted"],
    "--border-primary": border,
    "--border-soft": soft,
    "--border-primary-64": `${border}A3`,
    "--border-soft-64": `${soft}A3`,
    "--accent-blue": r["--color-theme-accent-supporting"],
    "--accent-seal": seal,
    "--accent-primary": action,
    "--action-primary-fg": accessibleForeground(action, surface),
    "--accent-blue-tint": r["--color-theme-accent-supporting-tint"],
    "--accent-seal-tint": r["--color-theme-accent-emphasis-tint"],
    "--accent-seal-fill": fillForWhiteText(seal),
    "--success": r["--color-theme-success"],
    "--success-light": r["--color-theme-success-light"],
    "--warning": r["--color-theme-warning"],
    "--warning-light": r["--color-theme-warning-light"],
    "--danger": seal,
    "--danger-light": r["--color-theme-accent-emphasis-tint"],
    "--highlight-yellow": r["--color-theme-highlight-yellow"],
    "--highlight-yellow-active": r["--color-theme-highlight-yellow-active"],
    "--highlight-blue": r["--color-theme-highlight-blue"],
    "--shadow-sm": r["--color-theme-shadow-sm"],
    "--shadow-md": r["--color-theme-shadow-md"],
    "--shadow-lg": r["--color-theme-shadow-lg"],
    "--shadow-xl": r["--color-theme-shadow-xl"],
    "--logo-filter": logoFilter(text),
    // `bg-parchment` is the selected state and the ground behind panes. Where
    // the page is the surface's own colour (Legacy Uwazi: white on white) it
    // would vanish, so it takes the selected tint, as Uwazi's parchment role does.
    ...(sameHex(page, surface) ? { "--color-parchment": r["--color-theme-bg-selected"] } : {}),
  };
}

/** Text on a chrome ground: the page's ink when it reads there, else ink or
 *  white, with the quieter steps mixed toward the ground. */
const chromeText = (ground: string, fg: string) => ({
  "--text-primary": fg,
  "--text-secondary": mixHex(fg, ground, 0.12),
  "--text-tertiary": mixHex(fg, ground, 0.26),
  "--text-muted": mixHex(fg, ground, 0.42),
  "--action-primary": fg,
  "--action-primary-fg": ground,
});

/** Tailwind's colour utilities read `--color-*`, which `index.css` defines on
 *  `:root` from the tokens. A custom property that holds a `var()` is
 *  resolved where it is declared, so a token changed on an element below the
 *  root would not reach them: a scoped block declares these again. */
const RESCOPE: Record<string, string> = {
  "--color-paper": "var(--bg-surface)",
  "--color-warm": "var(--bg-warm)",
  "--color-parchment": "var(--bg-primary)",
  "--color-vellum": "var(--bg-muted)",
  "--color-selected": "var(--bg-selected)",
  "--color-ink": "var(--text-primary)",
  "--color-ink-secondary": "var(--text-secondary)",
  "--color-ink-tertiary": "var(--text-tertiary)",
  "--color-ink-muted": "var(--text-muted)",
  "--color-border": "var(--border-primary)",
  "--color-border-soft": "var(--border-soft)",
  "--color-action": "var(--action-primary)",
  "--color-on-action": "var(--action-primary-fg)",
};

function modeCss(vars: ThemeVars, mode: ThemeMode): string[] {
  const out: string[] = [];
  const presetId = getPresetId(vars);
  const resolved = appliedTheme(vars, mode);
  if (resolved !== PRESET_DEFINITIONS.default.modes[mode]) out.push(block(SCOPE[mode], rootVars(resolved)));

  const stored = storedChrome(vars, mode);
  const chrome = resolvedChrome(vars, mode);
  if (HEADER_CHROME_VAR_KEYS.some((k) => stored[k])) {
    const bar = chrome["--color-theme-chrome-app-bar"];
    const fg = chrome["--color-theme-chrome-app-bar-fg"];
    const active = chrome["--color-theme-chrome-app-bar-active"];
    const separator = chrome["--color-theme-chrome-app-bar-separator"];
    out.push(
      block(`${SCOPE[mode]} [data-component="Navbar"]`, {
        "--bg-surface": bar,
        "--bg-warm": chrome["--color-theme-chrome-app-bar-hover"],
        "--bg-primary": active,
        "--bg-muted": active,
        "--bg-selected": active,
        "--border-primary": separator,
        "--border-soft": separator,
        ...chromeText(bar, fg),
        "--logo-filter": logoFilter(fg),
        "--header-accent": chrome[HEADER_ACCENT_KEY],
        ...RESCOPE,
      }),
    );
  }
  if (presetId === "legacy" || SETTINGS_CHROME_VAR_KEYS.some((k) => stored[k])) {
    const rail = chrome["--color-theme-chrome-settings-rail-bg"];
    const text = resolved["--color-theme-text-primary"];
    out.push(
      block(`${SCOPE[mode]} [data-component="SettingsNav"]`, {
        "--bg-surface": rail,
        "--bg-warm": chrome["--color-theme-chrome-settings-nav-item-active-bg"],
        // The page's text stays unless it stops reading on the new ground.
        ...(checkContrast(rail, text).passesAA ? {} : chromeText(rail, inkFor(rail))),
        ...RESCOPE,
      }),
    );
  }
  return out;
}

/** The stylesheet for a theme; "" for the untouched default. */
export function themeCss(vars: ThemeVars | undefined): string {
  if (!vars) return "";
  const blocks = THEME_MODES.flatMap((mode) => modeCss(vars, mode));
  return blocks.length ? `@media screen {\n${blocks.join("\n")}\n}\n` : "";
}
