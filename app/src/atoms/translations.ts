import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Corpus } from "../data/entityChanges";
import type { Language } from "./language";
import type { SettingsLanguage } from "../data/settings";
import { menuSettings } from "./siteMenu";
import { templatesAtom } from "./templates";
import { localizeValues, thesauriAtom } from "./thesauri";
import { relationTypesCorpus, relationTypesOfAtom } from "./relationTypes";
import { filterSettings } from "./settingsSingletons";
import { languages as languageStore } from "./languages";
import { createSettingsSingleton } from "./settingsCollection";
import { UWAZI_UI_KEYS } from "../data/uwaziUiKeys";

/** Settings › Translations, from the collection's real contexts (Uwazi's
 *  translation contexts, page-briefs.md "Translations"): the User Interface
 *  (Uwazi's first 412 System keys, `data/uwaziUiKeys.ts`),
 *  the Menu, the Filters groups, then one context per template (its name, its
 *  title label, every property label), per thesaurus (its name and every
 *  value) and per relationship type (its name).
 *
 *  A key is addressed by what it names, not by its text: a property's id, a
 *  value's id. So a label renamed in Settings keeps what was typed for it in
 *  other languages, as Uwazi moves a renamed key; a deleted property's key
 *  goes with it. Only values that differ from a key's default are stored,
 *  per corpus, for the session. */

export type ContextType = "User interface" | "Menu" | "Filters" | "Template" | "Thesaurus" | "Relationship type";

export interface ContextKey {
  /** Stable: the UI string, a property or value id, a link id. */
  id: string;
  /** The key as Uwazi shows it: the default language's text. */
  text: string;
  /** Text a language starts with where the collection already has it (the
   *  UI dictionary, a thesaurus's own translations). Otherwise the key text,
   *  which counts as untranslated. */
  defaults?: Partial<Record<string, string>>;
}

export interface TranslationContext {
  id: string;
  name: string;
  type: ContextType;
  /** Uwazi's "System translations" group (User Interface, Menu, Filters). */
  system: boolean;
  keys: ContextKey[];
}

/** A key with every installed language's current text. */
export interface TranslationRow {
  id: string;
  key: string;
  values: Record<string, string>;
}

type Stored = Record<string, Record<string, Record<string, string>>>;
const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const translationSettings = createSettingsSingleton<{ values: Stored }>({
  name: "translations",
  seedOf: () => ({ values: {} }),
  isField: {
    values: (v) =>
      isPlain(v) &&
      Object.values(v).every(
        (ctx) => isPlain(ctx) && Object.values(ctx).every((k) => isPlain(k) && Object.values(k).every((s) => typeof s === "string")),
      ),
  },
});

const LANG: Record<string, Language> = { en: "EN", es: "ES", fr: "FR", ar: "AR" };
const byText = (a: ContextKey, b: ContextKey) => a.text.localeCompare(b.text, undefined, { sensitivity: "base" });

/** One corpus's contexts, built from its stores. */
export const translationContextsAtom = atomFamily((corpus: Corpus) =>
  atom<TranslationContext[]>((get) => {
    const out: TranslationContext[] = [];
    out.push({
      id: "System",
      name: "User Interface",
      type: "User interface",
      system: true,
      // Uwazi's own System keys and its shipped translations (SD-7).
      keys: UWAZI_UI_KEYS.map((k) => ({ id: k.key, text: k.key, defaults: { es: k.es, fr: k.fr, ar: k.ar } })),
    });
    // The Menu's links and sub-links, as Settings › Menu saved them.
    const menuKeys = get(menuSettings.valueOfAtom(corpus))
      .links.flatMap((l) => [l, ...(l.sublinks ?? [])])
      .filter((l) => l.title.trim())
      .map((l) => ({ id: l.id, text: l.title }));
    if (menuKeys.length) out.push({ id: "Menu", name: "Menu", type: "Menu", system: true, keys: menuKeys.sort(byText) });
    const groups = get(filterSettings.valueOfAtom(corpus)).groups.filter((g) => g.name.trim());
    if (groups.length)
      out.push({ id: "Filters", name: "Filters", type: "Filters", system: true, keys: groups.map((g) => ({ id: g.id, text: g.name })).sort(byText) });

    for (const t of get(templatesAtom(corpus))) {
      const title = t.commonProperties.find((p) => p.name === "title");
      out.push({
        id: t.id,
        name: t.name,
        type: "Template",
        system: false,
        keys: [
          { id: "template-name", text: t.name },
          ...(title ? [{ id: title.id, text: title.label }] : []),
          ...t.properties.map((p) => ({ id: p.id, text: p.label })),
        ],
      });
    }

    for (const th of get(thesauriAtom(corpus))) {
      const localized = Object.fromEntries(
        Object.entries(LANG).map(([key, lang]) => [key, new Map(flatten(localizeValues(th.values, corpus, lang)).map((v) => [v.id, v.label]))]),
      );
      out.push({
        id: th.id,
        name: th.name,
        type: "Thesaurus",
        system: false,
        keys: [
          { id: "thesaurus-name", text: th.name },
          ...flatten(th.values).map((v) => ({
            id: v.id,
            text: v.label,
            defaults: Object.fromEntries(Object.entries(localized).map(([key, m]) => [key, m.get(v.id)])),
          })),
        ],
      });
    }

    for (const rt of get(relationTypesOfAtom(relationTypesCorpus(corpus))))
      out.push({ id: rt.id, name: rt.label, type: "Relationship type", system: false, keys: [{ id: "name", text: rt.label }] });
    return out;
  }),
);

const flatten = (values: { id: string; label: string; values?: { id: string; label: string }[] }[]) =>
  values.flatMap((v) => [{ id: v.id, label: v.label }, ...(v.values ?? [])]);

/** A key's starting text in a language: the key itself in the default
 *  language, what the collection already has elsewhere, or the key's text. */
const defaultOf = (k: ContextKey, lang: SettingsLanguage) => (lang.default ? k.text : (k.defaults?.[lang.key] ?? k.text));

/** One corpus's installed languages (Settings › Languages' store), the
 *  default first: the source column, then one column per language. */
export const installedLanguagesAtom = atomFamily((corpus: Corpus) =>
  atom((get) => {
    const list = get(languageStore.listOfAtom(corpus));
    return [...list.filter((l) => l.default), ...list.filter((l) => !l.default)];
  }),
);

/** A context's rows: each key with every installed language's text. */
export const translationRowsAtom = atomFamily((corpus: Corpus) =>
  atom((get) => {
    const stored = get(translationSettings.valueOfAtom(corpus)).values;
    const languages = get(installedLanguagesAtom(corpus));
    return (ctx: TranslationContext): TranslationRow[] =>
      ctx.keys.map((k) => ({
        id: k.id,
        key: k.text,
        values: Object.fromEntries(
          languages.map((l) => [l.key, l.default ? k.text : (stored[ctx.id]?.[k.id]?.[l.key] ?? defaultOf(k, l))]),
        ),
      }));
  }),
);

/** Save a context's rows, every language in one write: only text that
 *  differs from a key's default is kept. */
export const saveTranslationsAtom = atom(
  null,
  (get, set, { corpus, context, rows }: { corpus: Corpus; context: TranslationContext; rows: TranslationRow[] }) => {
    const languages = get(installedLanguagesAtom(corpus));
    const keys = new Map(context.keys.map((k) => [k.id, k]));
    const ctx: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      const k = keys.get(r.id);
      if (!k) continue;
      for (const l of languages) {
        if (l.default) continue;
        const v = r.values[l.key] ?? "";
        if (v !== defaultOf(k, l)) (ctx[r.id] ??= {})[l.key] = v;
      }
    }
    const prev = get(translationSettings.valueOfAtom(corpus));
    set(translationSettings.saveAtom, { corpus, value: { values: { ...prev.values, [context.id]: ctx } } });
  },
);

/** Uwazi's status rule: a value that is empty or still equals the default
 *  language's text is untranslated. */
export function isUntranslated(row: { values: Record<string, string> }, langKey: string, sourceKey: string): boolean {
  const v = (row.values[langKey] ?? "").trim();
  return !v || v === (row.values[sourceKey] ?? "").trim();
}

export interface LanguageProgress {
  key: string;
  label: string;
  done: number;
  total: number;
}

/** Translated keys per non-default language. */
export function progressOf(rows: { values: Record<string, string> }[], languages: SettingsLanguage[]): LanguageProgress[] {
  const source = languages.find((l) => l.default)?.key ?? "en";
  return languages
    .filter((l) => !l.default)
    .map((l) => ({
      key: l.key,
      label: l.label,
      total: rows.length,
      done: rows.filter((r) => !isUntranslated(r, l.key, source)).length,
    }));
}
