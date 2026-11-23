import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Check, Download, TriangleAlert, Upload } from "lucide-react";
import { SettingsFormPage } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsButton } from "../SettingsButton";
import { SectionLabel } from "../../shared/SectionLabel";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { ColorField } from "../../shared/ColorField";
import { LastSavedLine } from "../../shared/LastSavedLine";
import {
  CHECKERBOARD,
  FAVICON_RULE,
  ImagePickerModal,
  LOGO_RULE,
  ruleRange,
  type ImageSizeRule,
  type PickableImage,
} from "../../shared/ImagePickerModal";
import { LogoAdjustModal } from "../theme/LogoAdjustModal";
import { HeaderLayoutCards } from "../theme/HeaderLayoutCards";
import {
  HEADER_HEIGHTS,
  headerHeightLabel,
  headerHeightOf,
  headerLayoutLabel,
  headerLayoutOf,
  withHeaderHeight,
  withHeaderLayout,
  type HeaderHeight,
} from "../../../utils/theme/headerLayout";
import {
  brandImageLookupAtom,
  BUILTIN_FAVICONS,
  BUILTIN_LOGOS,
  DEFAULT_FAVICON,
  DEFAULT_LOGO,
  themeDraftAtom,
  themeSettings,
  type BrandImage,
  type ThemeSettings,
} from "../../../atoms/branding";
import { themeAtom, resolveTheme } from "../../../atoms/theme";
import { uploads } from "../../../atoms/uploads";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useNotify } from "../../../hooks/useNotify";
import type { ActivityChange } from "../../../atoms/activityLog";
import { accessibleForeground, checkContrast, colorPaletteFromHex, isValidHex, sameHex, sortPaletteHexColors } from "../../../utils/theme/color";
import {
  ACCENT_PRIMARY_KEY,
  appliedTheme,
  CHROME_OVERRIDE_VAR_KEYS,
  CHROME_VAR_HINTS,
  CHROME_VAR_LABELS,
  getPresetId,
  HEADER_ACCENT_KEY,
  HEADER_CHROME_VAR_KEYS,
  NAMED_THEMES,
  PRESET_DEFINITIONS,
  resolvedChrome,
  SEMANTIC_VAR_HINTS,
  SEMANTIC_VAR_KEYS,
  SEMANTIC_VAR_LABELS,
  SETTINGS_CHROME_VAR_KEYS,
  THEME_EDITOR_MODE_KEY,
  THEME_MODES,
  THEME_SIMPLE_BASE_KEY,
  themeKeyLabel,
  themeStorageKey,
  type ChromeOverrideVarKey,
  type SemanticVarKey,
  type ThemeMode,
  type ThemePresetId,
  type ThemeVars,
} from "../../../utils/theme/model";
import {
  applySimpleAnchors,
  headerColorsFromBar,
  headerPickerColors,
  recomputeSimpleFromAnchors,
  relatedPickerColors,
  relatedPickerSpec,
  selectThemePreset,
  semanticColorsFromEdit,
  settingsColorsFromRail,
  SIMPLE_SEMANTIC_ANCHOR_KEYS,
  simpleBasePreset,
  simpleChromeFromBar,
  type SimpleAnchorKey,
} from "../../../utils/theme/derivation";
import {
  buildThemeInstanceExport,
  downloadThemeInstance,
  parseThemeInstanceImportText,
  themeVarsFromInstanceImport,
} from "../../../utils/theme/instanceFile";

/** Stored themes hold strings only. */
const clean = (vars: ThemeVars): Record<string, string> =>
  Object.fromEntries(Object.entries(vars).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""));

const BAR_KEY = "--color-theme-chrome-app-bar" as const;
const RAIL_KEY = "--color-theme-chrome-settings-rail-bg" as const;

interface ColorRow {
  key: string;
  label: string;
  hint: string;
  value: string;
  options: string[];
  suggested?: string;
  onChange: (hex: string) => void;
  onReset: () => void;
  resetDisabled: boolean;
}
interface ColorGroup {
  title: string;
  rows: ColorRow[];
}

const MODE_NAME: Record<ThemeMode, string> = { light: "light", dark: "dark" };

/** Settings › Theme and branding, after huridocs/uwazi PR 10039
 *  (`Routes/Settings/Theming`, `Components/ThemeSelector`).
 *
 *  The draft paints the whole app while the page is open (`themeDraftAtom`);
 *  Save stores it for the collection, and leaving or Discard changes puts
 *  the saved theme back. Colours are edited for the mode the app is in. */
export function ThemePage() {
  const { record, fail } = useSettingsNotify();
  const notify = useNotify();
  const stored = useAtomValue(themeSettings.valueAtom);
  const saveTheme = useSetAtom(themeSettings.saveAtom);
  const setLiveDraft = useSetAtom(themeDraftAtom);
  const createUpload = useSetAtom(uploads.createAtom);
  const lookup = useAtomValue(brandImageLookupAtom);
  const mode: ThemeMode = resolveTheme(useAtomValue(themeAtom));
  const { draft, setDraft, update, dirty, markSaved, discard } = useSettingsDraft<ThemeSettings>({
    id: "theme",
    label: "Theme and branding",
    saved: stored,
  });
  const [picking, setPicking] = useState<"logo" | "favicon" | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // The live preview: the app paints the draft until the page closes.
  useEffect(() => {
    setLiveDraft(draft);
  }, [draft, setLiveDraft]);
  useEffect(() => () => setLiveDraft(null), [setLiveDraft]);

  const vars = draft.vars as ThemeVars;
  const setVars = (next: (current: ThemeVars) => ThemeVars) => setDraft((d) => ({ ...d, vars: clean(next(d.vars)) }));

  const selectedPreset = getPresetId(vars);
  const editorMode = vars[THEME_EDITOR_MODE_KEY] === "advanced" ? "advanced" : "simple";
  const basePreset = simpleBasePreset(selectedPreset, draft.assetPreset, vars[THEME_SIMPLE_BASE_KEY]);

  const resolved = useMemo(() => appliedTheme(vars, mode), [vars, mode]);
  const chrome = useMemo(() => resolvedChrome(vars, mode), [vars, mode]);

  /* ── Edits (Uwazi's `useThemeEdits`) ──────────────────────────────────── */

  const storeVar = (key: string, next: string | undefined) =>
    setVars((current) => {
      const out = { ...current };
      if (next) out[themeStorageKey(mode, key)] = next;
      else delete out[themeStorageKey(mode, key)];
      return out;
    });

  /** The page, the surface and the main text carry their companions. */
  const updateModeVar = (key: SemanticVarKey, next: string | undefined) =>
    setVars((current) => {
      const r = appliedTheme(current, mode);
      const related =
        next &&
        semanticColorsFromEdit(current, mode, key, next, {
          page: r["--color-theme-bg-primary"],
          surface: r["--color-theme-bg-surface"],
          text: r["--color-theme-text-primary"],
        });
      if (related) return related;
      const out = { ...current };
      if (next) out[themeStorageKey(mode, key)] = next;
      else delete out[themeStorageKey(mode, key)];
      return out;
    });

  const updateChromeVar = (key: ChromeOverrideVarKey, next: string | undefined) => {
    if (key === BAR_KEY) return setVars((current) => headerColorsFromBar(current, mode, next));
    if (key === RAIL_KEY && next) return setVars((current) => settingsColorsFromRail(current, mode, next));
    storeVar(key, next);
  };

  const patchAnchors = (patch: Partial<Record<SimpleAnchorKey, string>>) =>
    setVars((current) =>
      applySimpleAnchors(current, mode, simpleBasePreset(getPresetId(current), draft.assetPreset, current[THEME_SIMPLE_BASE_KEY]), patch),
    );

  const selectPreset = (id: ThemePresetId) =>
    setDraft((d) => ({
      ...d,
      vars: clean(selectThemePreset(d.vars, id)),
      // A stock preset brings its own logo; Custom keeps the one in place.
      ...(id === "custom" ? {} : { assetPreset: id, logo: "" }),
    }));

  const importFile = async (file: File) => {
    const parsed = parseThemeInstanceImportText(await file.text());
    if ("error" in parsed) {
      fail("Theme instance file invalid", parsed.error);
      return;
    }
    const assetPreset = parsed.assetPreset ?? (parsed.presetId === "legacy" || parsed.presetId === "default" ? parsed.presetId : draft.assetPreset);
    setDraft((d) => ({
      ...d,
      vars: clean(themeVarsFromInstanceImport(parsed)),
      // A file from the other preset brings that preset's logo and favicon.
      ...(assetPreset === d.assetPreset ? {} : { assetPreset, logo: "", favicon: "" }),
    }));
    notify("Theme colors imported", "success");
  };

  /* ── Colour rows ──────────────────────────────────────────────────────── */

  const groups = useMemo<ColorGroup[]>(() => {
    /** Every colour in play, as swatches (Uwazi's `colorOptions`). */
    const colorOptions = [
      ...new Set(
        [
          ...NAMED_THEMES.flatMap((t) => THEME_MODES.flatMap((m) => SEMANTIC_VAR_KEYS.map((k) => t.modes[m][k]))),
          ...THEME_MODES.flatMap((m) => SEMANTIC_VAR_KEYS.map((k) => appliedTheme(vars, m)[k])),
          ...CHROME_OVERRIDE_VAR_KEYS.map((k) => chrome[k]),
        ]
          .filter(isValidHex)
          .map((h) => h.toUpperCase()),
      ),
    ];
    const pickerOptions = (value: string) => sortPaletteHexColors([...colorPaletteFromHex(value), ...colorOptions]);
    const context = {
      page: resolved["--color-theme-bg-primary"],
      surface: resolved["--color-theme-bg-surface"],
      text: resolved["--color-theme-text-primary"],
      rail: chrome[RAIL_KEY],
    };
    const isStored = (key: string) => !!vars[themeStorageKey(mode, key)];

    const related = (key: string, value: string) => {
      const spec = relatedPickerSpec(key, context);
      const options = spec ? relatedPickerColors({ ...spec, displayValue: value, colorOptions }) : pickerOptions(value);
      return { options, suggested: spec ? options[0] : undefined };
    };

    const headerRow = (key: (typeof HEADER_CHROME_VAR_KEYS)[number], simple: boolean): ColorRow => {
      const value = chrome[key];
      const options =
        key === BAR_KEY
          ? pickerOptions(value)
          : headerPickerColors({ key, displayValue: value, colorOptions, bar: chrome[BAR_KEY], text: chrome["--color-theme-chrome-app-bar-fg"] });
      const set = (next: string | undefined) =>
        key === BAR_KEY && simple ? setVars((c) => simpleChromeFromBar(c, mode, next)) : updateChromeVar(key, next);
      return {
        key,
        label: CHROME_VAR_LABELS[key],
        hint: CHROME_VAR_HINTS[key],
        value,
        options,
        suggested: key === BAR_KEY ? undefined : options[0],
        onChange: set,
        onReset: () => set(undefined),
        resetDisabled: !isStored(key),
      };
    };

    if (editorMode === "simple") {
      const preset = PRESET_DEFINITIONS[basePreset].sourceModes[mode];
      const anchorRow = (key: SimpleAnchorKey): ColorRow => {
        const value = resolved[key];
        const companions = key === "--color-theme-bg-primary" || key === "--color-theme-bg-surface" || key === "--color-theme-text-primary";
        return {
          key,
          label: SEMANTIC_VAR_LABELS[key],
          hint: SEMANTIC_VAR_HINTS[key],
          value,
          ...related(key, value),
          onChange: (hex) => (companions ? updateModeVar(key, hex) : patchAnchors({ [key]: hex })),
          onReset: () => patchAnchors({ [key]: preset[key] }),
          resetDisabled: sameHex(value, preset[key]),
        };
      };
      return [
        { title: "Header bar", rows: [...HEADER_CHROME_VAR_KEYS.slice(0, 3), HEADER_ACCENT_KEY].map((k) => headerRow(k, true)) },
        { title: "Actions", rows: SIMPLE_SEMANTIC_ANCHOR_KEYS.filter((k) => k.startsWith("--color-theme-accent")).map(anchorRow) },
        { title: "Page", rows: SIMPLE_SEMANTIC_ANCHOR_KEYS.filter((k) => !k.startsWith("--color-theme-accent")).map(anchorRow) },
      ];
    }

    const semanticRow = (key: SemanticVarKey): ColorRow => {
      const value = resolved[key];
      return {
        key,
        label: SEMANTIC_VAR_LABELS[key],
        hint: SEMANTIC_VAR_HINTS[key],
        value,
        ...related(key, value),
        onChange: (hex) => updateModeVar(key, hex),
        onReset: () => updateModeVar(key, undefined),
        resetDisabled: !isStored(key),
      };
    };
    const settingsRow = (key: (typeof SETTINGS_CHROME_VAR_KEYS)[number]): ColorRow => {
      const value = chrome[key];
      return {
        key,
        label: CHROME_VAR_LABELS[key],
        hint: CHROME_VAR_HINTS[key],
        value,
        ...related(key, value),
        onChange: (hex) => updateChromeVar(key, hex),
        onReset: () => updateChromeVar(key, undefined),
        resetDisabled: !isStored(key),
      };
    };
    return [
      { title: "Header bar", rows: HEADER_CHROME_VAR_KEYS.map((k) => headerRow(k, false)) },
      {
        title: "Actions",
        rows: (
          [
            "--color-theme-accent-primary",
            "--color-theme-accent-supporting",
            "--color-theme-accent-emphasis",
            "--color-theme-success",
            "--color-theme-warning",
          ] as const
        ).map(semanticRow),
      },
      {
        title: "Page",
        rows: (
          ["--color-theme-bg-primary", "--color-theme-bg-surface", "--color-theme-bg-muted", "--color-theme-border-primary"] as const
        ).map(semanticRow),
      },
      {
        title: "Text",
        rows: (
          [
            "--color-theme-text-primary",
            "--color-theme-text-secondary",
            "--color-theme-text-tertiary",
            "--color-theme-text-muted",
          ] as const
        ).map(semanticRow),
      },
      { title: "Settings sidebar", rows: SETTINGS_CHROME_VAR_KEYS.map(settingsRow) },
    ];
    // The handlers close over `mode` and the draft's setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars, mode, editorMode, basePreset, resolved, chrome]);

  /* ── Contrast (Uwazi's `ThemePreviewSection`) ─────────────────────────── */

  const failed = useMemo(() => {
    const surface = resolved["--color-theme-bg-surface"];
    const accent = resolved[ACCENT_PRIMARY_KEY];
    const fg = chrome["--color-theme-chrome-app-bar-fg"];
    return [
      { id: "header-text", label: "Header bar text", result: checkContrast(chrome[BAR_KEY], fg) },
      { id: "header-buttons", label: "Header bar hover background", result: checkContrast(chrome["--color-theme-chrome-app-bar-hover"], fg) },
      { id: "header-active", label: "Header bar active background", result: checkContrast(chrome["--color-theme-chrome-app-bar-active"], fg) },
      { id: "header-accent", label: "Header bar active link", result: checkContrast(chrome[BAR_KEY], chrome[HEADER_ACCENT_KEY]) },
      { id: "surface-primary", label: "Surface text", result: checkContrast(surface, resolved["--color-theme-text-primary"]) },
      { id: "surface-secondary", label: "Secondary text", result: checkContrast(surface, resolved["--color-theme-text-secondary"]) },
      { id: "accent-primary", label: "Primary action", result: checkContrast(accent, accessibleForeground(accent, surface)) },
    ].filter((c) => !c.result.passesAA);
  }, [resolved, chrome]);

  /* ── Brand images ─────────────────────────────────────────────────────── */

  const logo = lookup(draft.logo, BUILTIN_LOGOS) ?? DEFAULT_LOGO;
  const favicon = lookup(draft.favicon, BUILTIN_FAVICONS) ?? DEFAULT_FAVICON;
  const headerLayout = headerLayoutOf(vars);
  const headerHeight = headerHeightOf(vars);
  const barStyle: CSSProperties = { backgroundColor: chrome[BAR_KEY], borderColor: chrome["--color-theme-chrome-app-bar-separator"] };

  const pick = (image: PickableImage) => {
    // The default image is stored as "", so a later change of default follows.
    if (picking === "logo") update({ logo: image.id === DEFAULT_LOGO.id ? "" : image.id });
    if (picking === "favicon") update({ favicon: image.id === DEFAULT_FAVICON.id ? "" : image.id });
    setPicking(null);
  };

  const applyAdjusted = (image: { src: string; width: number; height: number }) => {
    const name = `theme-logo-${Date.now().toString(36)}.png`;
    // "data:image/png;base64," then four characters per three bytes.
    const size = Math.round(((image.src.length - image.src.indexOf(",") - 1) * 3) / 4);
    const id = createUpload({ value: { name, filename: name, mimetype: "image/png", kind: "image", size, ...image } });
    record({ method: "CREATE", domain: "upload", noun: "custom file", id, name, message: "Uploaded custom file", summary: `Uploaded custom file “${name}”` });
    update({ logo: id });
    setAdjusting(false);
  };

  /* ── Save ─────────────────────────────────────────────────────────────── */

  const save = () => {
    const value: ThemeSettings = { ...draft, vars: clean(draft.vars) };
    saveTheme({ value });
    markSaved(value);
    record({
      method: "UPDATE",
      domain: "theme",
      noun: "theme",
      id: "theme",
      name: "Theme and branding",
      summary: "Updated theme",
      changes: themeChanges(stored, value, (id, list) => lookup(id, list)?.name),
    });
  };

  return (
    <SettingsFormPage
      component="ThemePage"
      title="Theme and branding"
      dirty={dirty}
      onSave={save}
      saveLabel="Save theme"
      onDiscard={discard}
      footerStart={
        <span data-part="draft-note" className="max-md:hidden text-xs text-ink-tertiary truncate">
          {dirty ? "Changes stay temporary until you save the theme." : ""}
        </span>
      }
      footerStatus={<LastSavedLine domain="theme" id="theme" />}
      overlays={
        <>
          {picking && (
            <ImagePickerModal
              title={picking === "logo" ? "Select site logo image" : "Select favicon image"}
              rule={picking === "logo" ? LOGO_RULE : FAVICON_RULE}
              value={picking === "logo" ? logo.id : favicon.id}
              builtins={picking === "logo" ? BUILTIN_LOGOS : BUILTIN_FAVICONS}
              onClose={() => setPicking(null)}
              onPick={pick}
            />
          )}
          {adjusting && <LogoAdjustModal src={logo.src} barStyle={barStyle} onClose={() => setAdjusting(false)} onApply={applyAdjusted} />}
        </>
      }
    >
      <SettingsSection title="Theme presets" description="A preset sets every color for the light and the dark theme. Custom keeps your own.">
        <PresetCards vars={vars} selected={selectedPreset} onSelect={selectPreset} />
      </SettingsSection>

      <SettingsSection
        title="Header layout"
        description="How the header arranges its items on desktops and tablets. Standard is the app bar. The other three draw the collection's menu (Settings › Menu) in the bar, with the language, the Library and Settings as utilities. Phones keep their own bar and list the menu in their menu sheet."
      >
        <HeaderLayoutCards
          selected={headerLayout}
          colors={{
            bar: chrome[BAR_KEY],
            text: chrome["--color-theme-chrome-app-bar-fg"],
            separator: chrome["--color-theme-chrome-app-bar-separator"],
            page: resolved["--color-theme-bg-primary"],
          }}
          onSelect={(id) => setVars((current) => withHeaderLayout(current, id))}
        />
        {/* Header height: the bar grows; the logo and the controls keep their
            size. The note is one line at a fixed place, whatever is chosen. */}
        <div data-part="header-height" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span id="header-height-label" className="text-xs font-medium text-ink-secondary">
            Header height
          </span>
          <SegmentedControl
            ariaLabel="Header height"
            value={headerHeight}
            options={HEADER_HEIGHTS.map((h) => ({ id: h.id, label: h.label }))}
            onChange={(id) => setVars((current) => withHeaderHeight(current, id as HeaderHeight))}
            disabled={headerLayout === "compact"}
          />
          <p data-part="header-height-note" className="text-xs text-ink-tertiary" dir="auto">
            {headerLayout === "compact"
              ? "Compact has its own height, 40 px."
              : `${HEADER_HEIGHTS.find((h) => h.id === headerHeight)!.rem * 16} px bar. The logo and the controls keep their size.`}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Logo and favicon" description="The logo shows in the header and on the sign-in screens. The favicon is the browser tab's icon.">
        <SettingsFieldRow>
          <BrandImageField
            label="Theme logo"
            image={logo}
            rule={LOGO_RULE}
            isDefault={logo.id === DEFAULT_LOGO.id}
            previewStyle={barStyle}
            wide
            onChoose={() => setPicking("logo")}
            onAdjust={() => setAdjusting(true)}
            onReset={() => update({ logo: "" })}
          />
          <BrandImageField
            label="Theme favicon"
            image={favicon}
            rule={FAVICON_RULE}
            isDefault={favicon.id === DEFAULT_FAVICON.id}
            onChoose={() => setPicking("favicon")}
            onReset={() => update({ favicon: "" })}
          />
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection
        title="Colors"
        description={`These are the ${MODE_NAME[mode]} theme's colors. Switch the app to ${MODE_NAME[mode === "light" ? "dark" : "light"]} to edit the other set.`}
        action={
          <SegmentedControl
            ariaLabel="Color editor"
            value={editorMode}
            options={[
              { id: "simple", label: "Simple mode" },
              { id: "advanced", label: "Full mode" },
            ]}
            onChange={(id) =>
              setVars((current) =>
                id === "advanced"
                  ? { ...current, [THEME_EDITOR_MODE_KEY]: "advanced" }
                  : recomputeSimpleFromAnchors(current, simpleBasePreset(getPresetId(current), draft.assetPreset, current[THEME_SIMPLE_BASE_KEY])),
              )
            }
          />
        }
      >
        <ContrastStatus failed={failed} />
        {/* One line in both modes, so the first group does not move. */}
        <p className="text-xs text-ink-tertiary min-h-4">
          {editorMode === "simple" ? "Adjust a few colors; secondary text and muted backgrounds update automatically." : "Every color is set on its own."}
        </p>
        {groups.map((group) => (
          <ColorRows key={group.title} group={group} />
        ))}
      </SettingsSection>

      <SettingsSection
        title="Theme file"
        description="Save this theme's colors as a file, or load one. A theme file exported from Uwazi can be imported here, and the other way round."
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFile(file);
            }}
          />
          <SettingsButton variant="secondary" size="sm" icon={<Upload size={14} aria-hidden />} onClick={() => fileInput.current?.click()}>
            Import theme instance file
          </SettingsButton>
          <SettingsButton
            variant="secondary"
            size="sm"
            icon={<Download size={14} aria-hidden />}
            onClick={() => downloadThemeInstance(buildThemeInstanceExport(vars, draft.assetPreset))}
          >
            Export theme instance file
          </SettingsButton>
        </div>
      </SettingsSection>
    </SettingsFormPage>
  );
}

/* ── Presets ────────────────────────────────────────────────────────────── */

/** The three presets as cards: each shows its surface, text and primary
 *  action in light and in dark. Custom shows the theme being edited. */
function PresetCards({
  vars,
  selected,
  onSelect,
}: {
  vars: ThemeVars;
  selected: ThemePresetId;
  onSelect: (id: ThemePresetId) => void;
}) {
  return (
    <ul data-part="presets" className="grid grid-cols-3 gap-3">
      {NAMED_THEMES.map((theme) => {
        const on = theme.id === selected;
        return (
          <li key={theme.id} className="flex min-w-0">
            <button
              type="button"
              aria-pressed={on}
              title={theme.description}
              onClick={() => onSelect(theme.id)}
              className={`flex-1 min-w-0 flex flex-col gap-2 p-2 rounded-lg border text-start cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
                on ? "bg-parchment border-border-soft" : "bg-paper border-border hover:bg-warm"
              }`}
            >
              <span aria-hidden className="grid grid-cols-2 overflow-hidden rounded-md border border-border-soft">
                {THEME_MODES.map((m) => {
                  const colors = theme.id === "custom" ? appliedTheme(vars, m) : theme.modes[m];
                  const accent = colors[ACCENT_PRIMARY_KEY];
                  return (
                    <span key={m} className="flex flex-col gap-1 p-1.5" style={{ backgroundColor: colors["--color-theme-bg-surface"] }}>
                      <span className="h-1.5 w-8 rounded-sm opacity-40" style={{ backgroundColor: colors["--color-theme-text-primary"] }} />
                      <span className="h-5 rounded border" style={{ borderColor: accent }} />
                      <span className="h-4 rounded-sm" style={{ backgroundColor: accent }} />
                    </span>
                  );
                })}
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="sm:truncate flex-1 min-w-0 text-xs font-medium leading-tight text-ink">{theme.label}</span>
                {/* Always in the row, so the label does not move on selection. */}
                <Check size={14} aria-hidden className={`shrink-0 text-ink ${on ? "" : "invisible"}`} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Brand image field ──────────────────────────────────────────────────── */

/** Uwazi's custom upload image picker row for a theme image: the image on a
 *  checkerboard (the logo on the header's own ground), Change, Adjust logo
 *  and Reset. There is always an image: with nothing chosen it is the
 *  built-in one, and Reset goes back to it. */
function BrandImageField({
  label,
  image,
  rule,
  isDefault,
  previewStyle,
  wide = false,
  onChoose,
  onAdjust,
  onReset,
}: {
  label: string;
  image: BrandImage;
  rule: ImageSizeRule;
  isDefault: boolean;
  /** Draws the image on this ground instead of the checkerboard. */
  previewStyle?: CSSProperties;
  wide?: boolean;
  onChoose: () => void;
  onAdjust?: () => void;
  onReset: () => void;
}) {
  const labelId = useId();
  const captionId = useId();
  return (
    <div role="group" aria-labelledby={labelId} data-component="SettingsField" className="flex flex-col gap-1.5 min-w-0">
      <span id={labelId} data-part="label" className="text-xs font-medium text-ink-secondary">
        {label}
      </span>
      <span
        data-part="preview"
        style={previewStyle ?? CHECKERBOARD}
        className={`h-14 rounded-md border border-border-soft flex items-center justify-center overflow-hidden ${wide ? "w-full px-3" : "w-14 p-2"}`}
      >
        <img
          src={image.src}
          alt={`${label}: ${image.name}`}
          className={
            wide ? `${isDefault ? "logo-img h-[0.919rem]" : "max-h-7 max-w-32"} w-auto object-contain` : "max-w-full max-h-full object-contain"
          }
          // On the header's ground the wordmark follows the header's text, not the page's.
          style={wide && isDefault && previewStyle?.backgroundColor ? { filter: wordmarkFilter(String(previewStyle.backgroundColor)) } : undefined}
        />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <SettingsButton variant="secondary" size="sm" aria-describedby={captionId} onClick={onChoose}>
          Change
        </SettingsButton>
        {onAdjust && (
          <SettingsButton variant="secondary" size="sm" onClick={onAdjust}>
            Adjust logo
          </SettingsButton>
        )}
        <SettingsButton variant="ghost" size="sm" disabled={isDefault} onClick={onReset}>
          Reset
        </SettingsButton>
      </div>
      <span id={captionId} className="text-xs text-ink-tertiary">
        Recommended: {ruleRange(rule)}
      </span>
    </div>
  );
}

/** The black wordmark on `ground`: inverted when white reads better there. */
const wordmarkFilter = (ground: string) =>
  isValidHex(ground) && checkContrast(ground, "#FFFFFF").ratio > checkContrast(ground, "#1A1A1A").ratio ? "invert(1)" : "none";

/* ── Colour rows ────────────────────────────────────────────────────────── */

function ColorRows({ group }: { group: ColorGroup }) {
  return (
    <div data-part="color-group" className="flex flex-col gap-1.5">
      <SectionLabel as="h4">{group.title}</SectionLabel>
      <ul className="rounded-lg border border-border bg-paper divide-y divide-border-soft">
        {group.rows.map((row) => (
          <li key={row.key} data-theme-token-row={row.key} className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              {/* One line each from `sm` up; on a phone they wrap, so no label is cut. */}
              <p className="text-sm font-medium text-ink sm:truncate">{row.label}</p>
              <p className="text-xs text-ink-tertiary sm:truncate">{row.hint}</p>
            </div>
            <ColorField label={row.label} value={row.value} options={row.options} suggested={row.suggested} onChange={row.onChange} />
            <SettingsButton variant="ghost" size="sm" disabled={row.resetDisabled} aria-label={`Reset ${row.label}`} onClick={row.onReset}>
              Reset
            </SettingsButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Uwazi's "Accessibility checks need attention": the pairs that fall under
 *  WCAG AA (4.5:1), each with its ratio. Always mounted, one line tall when
 *  nothing fails, so the rows below it keep their place. */
function ContrastStatus({ failed }: { failed: { id: string; label: string; result: { ratio: number } }[] }) {
  return (
    <div data-part="contrast" role="status" className="min-h-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {failed.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-tertiary">
          <Check size={14} aria-hidden className="text-success" />
          Text contrast passes the accessibility checks.
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning-label">
            <TriangleAlert size={14} aria-hidden />
            Accessibility checks need attention
          </span>
          {failed.map((c) => (
            <span key={c.id} className="w-fit whitespace-nowrap rounded-md bg-warning-light px-1.5 py-0.5 text-meta font-medium text-warning-label">
              {c.label} <span dir="ltr">{c.result.ratio.toFixed(1)}:1</span>
            </span>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Activity log ───────────────────────────────────────────────────────── */

/** One change per colour that paints differently, per mode, plus the preset,
 *  the header layout, the logo and the favicon. Compared as painted, so choosing a preset lists
 *  the colours it moved. */
function themeChanges(
  before: ThemeSettings,
  after: ThemeSettings,
  nameOf: (id: string, builtins: BrandImage[]) => string | undefined,
): ActivityChange[] {
  const out: ActivityChange[] = [];
  const preset = (t: ThemeSettings) => PRESET_DEFINITIONS[getPresetId(t.vars)].label;
  if (preset(before) !== preset(after)) out.push({ field: "Preset", before: preset(before), after: preset(after) });
  const layout = (t: ThemeSettings) => headerLayoutLabel(headerLayoutOf(t.vars));
  if (layout(before) !== layout(after)) out.push({ field: "Header layout", before: layout(before), after: layout(after) });
  const height = (t: ThemeSettings) => headerHeightLabel(headerHeightOf(t.vars));
  if (height(before) !== height(after)) out.push({ field: "Header height", before: height(before), after: height(after) });
  for (const mode of THEME_MODES) {
    const painted = (t: ThemeSettings): Record<string, string> => ({ ...appliedTheme(t.vars, mode), ...resolvedChrome(t.vars, mode) });
    const a = painted(before);
    const b = painted(after);
    for (const key of [...SEMANTIC_VAR_KEYS, ...CHROME_OVERRIDE_VAR_KEYS])
      if (!sameHex(a[key], b[key])) out.push({ field: `${mode === "light" ? "Light" : "Dark"} · ${themeKeyLabel(key)}`, before: a[key], after: b[key] });
  }
  const image = (id: string, builtins: BrandImage[], fallback: BrandImage) => nameOf(id, builtins) ?? fallback.name;
  if (before.logo !== after.logo)
    out.push({ field: "Theme logo", before: image(before.logo, BUILTIN_LOGOS, DEFAULT_LOGO), after: image(after.logo, BUILTIN_LOGOS, DEFAULT_LOGO) });
  if (before.favicon !== after.favicon)
    out.push({
      field: "Theme favicon",
      before: image(before.favicon, BUILTIN_FAVICONS, DEFAULT_FAVICON),
      after: image(after.favicon, BUILTIN_FAVICONS, DEFAULT_FAVICON),
    });
  return out;
}
