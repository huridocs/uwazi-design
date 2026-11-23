import { atom } from "jotai";
import { createSettingsSingleton } from "./settingsCollection";
import { collectionSettings } from "./settingsSingletons";
import { uploadsAtom } from "./uploads";
import { asset } from "../utils/asset";
import { themeCss } from "../utils/theme/themeCss";
import type { StockPresetId } from "../utils/theme/derivation";

/** Settings › Theme and branding: one value per corpus (Uwazi's `themeVars`
 *  and `themeAssets`, huridocs/uwazi PR 10039). Not `atoms/theme.ts`, which
 *  is the reader's own light/dark preference.
 *
 *  `vars` is the theme as Uwazi stores it (`utils/theme/model.ts`). `logo`
 *  and `favicon` name an image: "" for the default, a `builtin:` id, or the
 *  id of a file in Settings › Uploads. */
export interface ThemeSettings extends Record<string, unknown> {
  vars: Record<string, string>;
  /** The preset the logo belongs to (`themeAssets.preset`). */
  assetPreset: StockPresetId;
  logo: string;
  favicon: string;
}

const isStringRecord = (v: unknown) =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every((x) => typeof x === "string");

export const DEFAULT_THEME: ThemeSettings = { vars: {}, assetPreset: "default", logo: "", favicon: "" };

export const themeSettings = createSettingsSingleton<ThemeSettings>({
  name: "theme",
  seedOf: () => DEFAULT_THEME,
  isField: {
    vars: isStringRecord,
    assetPreset: (v) => v === "default" || v === "legacy",
  },
});

/** The theme being edited, while Settings › Theme and branding is open: the
 *  whole app paints it. The page sets it on every change and clears it when
 *  it closes, which is what reverts an unsaved theme. */
export const themeDraftAtom = atom<ThemeSettings | null>(null);

/** The theme the app paints: the draft while one is open, else the saved one. */
export const activeThemeAtom = atom((get) => get(themeDraftAtom) ?? get(themeSettings.valueAtom));

/** The stylesheet for the painted theme ("" for the untouched default). */
export const themeCssAtom = atom((get) => themeCss(get(activeThemeAtom).vars));

/* ── Brand images ───────────────────────────────────────────────────────── */

export interface BrandImage {
  id: string;
  name: string;
  src: string;
}

/** The images that ship with the prototype (Uwazi's `builtinBrandImages`).
 *  Listed first in a picker and never checked against its size rule. */
export const BUILTIN_LOGOS: BrandImage[] = [{ id: "builtin:wordmark", name: "Uwazi wordmark", src: asset("/nu-logo.svg") }];
export const BUILTIN_FAVICONS: BrandImage[] = [
  { id: "builtin:favicon", name: "Uwazi mark", src: asset("/favicon.svg") },
  { id: "builtin:icon", name: "Uwazi icon", src: asset("/icon.png") },
];
/** What "" stands for. */
export const DEFAULT_LOGO = BUILTIN_LOGOS[0];
export const DEFAULT_FAVICON = BUILTIN_FAVICONS[0];

/** Looks up an image id among the built-ins and the corpus's uploads. */
export const brandImageLookupAtom = atom((get) => {
  const uploads = get(uploadsAtom);
  return (id: string, builtins: BrandImage[]): BrandImage | undefined => {
    if (!id) return undefined;
    const builtin = builtins.find((b) => b.id === id);
    if (builtin) return builtin;
    const upload = uploads.find((u) => u.id === id);
    return upload?.src ? { id: upload.id, name: upload.name, src: upload.src } : undefined;
  };
});

/** The logo the navbar and the sign-in screens draw. `custom` is false for
 *  the built-in wordmark, which keeps its own size and its dark-mode inversion.
 *  A logo whose upload was deleted reads as the default. */
export const themeLogoAtom = atom((get) => {
  const image = get(brandImageLookupAtom)(get(activeThemeAtom).logo, BUILTIN_LOGOS);
  return image && image.id !== DEFAULT_LOGO.id ? { src: image.src, custom: true } : { src: DEFAULT_LOGO.src, custom: false };
});

/** The tab icon: the theme's favicon, else Settings › Collection's Custom
 *  Favicon, else the Uwazi mark (undefined). */
export const faviconSrcAtom = atom((get) => {
  const lookup = get(brandImageLookupAtom);
  const themed = lookup(get(activeThemeAtom).favicon, BUILTIN_FAVICONS);
  if (themed) return themed.id === DEFAULT_FAVICON.id ? undefined : themed.src;
  return lookup(get(collectionSettings.valueAtom).favicon, [])?.src;
});
