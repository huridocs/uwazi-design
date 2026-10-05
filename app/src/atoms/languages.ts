import { atom } from "jotai";
import { seedLanguages, type SettingsLanguage } from "../data/settings";
import { cejilSettingsLanguages } from "../data/cejil/settingsAdapt";
import { createSettingsCollection, hasId } from "./settingsCollection";

/** Settings › Languages: the collection's installed languages, one store per
 *  corpus, keyed by language key. Pages and Translations read it. Per G8 the
 *  interface-language pickers in the header do not: they keep their fixed
 *  options. */
export type LanguageRecord = SettingsLanguage & { id: string };

const isLanguage = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const l = r as Partial<LanguageRecord>;
  return typeof l.key === "string" && typeof l.label === "string" && typeof l.default === "boolean";
};

const withId = (ls: SettingsLanguage[]): LanguageRecord[] => ls.map((l) => ({ ...l, id: l.key }));

export const languages = createSettingsCollection<LanguageRecord>({
  name: "languages",
  idPrefix: "lang",
  seedOf: (scope) => withId(scope === "cejil" ? cejilSettingsLanguages : seedLanguages),
  corpusScoped: true,
  isRecord: isLanguage,
});

export const languagesAtom = languages.listAtom;

/** The default language: the source for later installs and for Translations'
 *  "untranslated". */
export const defaultLanguageAtom = atom((get) => {
  const all = get(languagesAtom);
  return all.find((l) => l.default) ?? all[0];
});
