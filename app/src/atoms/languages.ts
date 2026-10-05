import { atom, type useStore } from "jotai";
import { seedLanguages, type SettingsLanguage } from "../data/settings";
import { cejilSettingsLanguages } from "../data/cejil/settingsAdapt";
import type { Corpus } from "../data/entityChanges";
import { createSettingsCollection, hasId, registerSettingsReset } from "./settingsCollection";
import { tasksAtom, toastsAtom } from "./notifications";
import { appendActivityAtom } from "./activityLog";
import { SETTINGS_NOTICES } from "../data/settingsNotices";

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

/** Make `key` the corpus's only default. */
export const setDefaultLanguageAtom = atom(null, (get, set, { key, corpus }: { key: string; corpus: Corpus }) => {
  for (const l of get(languages.listOfAtom(corpus)))
    if (l.default !== (l.key === key)) set(languages.patchAtom, { id: l.id, patch: { default: l.key === key }, corpus });
});

/* ── Catalog ──────────────────────────────────────────────────────────── */

export interface CatalogLanguage {
  key: string;
  label: string;
  localizedLabel: string;
  ltr: boolean;
}

/** The languages the Install dialog offers, alphabetical by English name.
 *  Uwazi's list is about 186; these 32 cover the demo. */
export const LANGUAGE_CATALOG: CatalogLanguage[] = (
  [
    ["ar", "Arabic", "العربية", false],
    ["my", "Burmese", "မြန်မာ", true],
    ["zh", "Chinese", "中文", true],
    ["cs", "Czech", "Čeština", true],
    ["da", "Danish", "Dansk", true],
    ["nl", "Dutch", "Nederlands", true],
    ["en", "English", "English", true],
    ["fi", "Finnish", "Suomi", true],
    ["fr", "French", "Français", true],
    ["de", "German", "Deutsch", true],
    ["el", "Greek", "Ελληνικά", true],
    ["he", "Hebrew", "עברית", false],
    ["hi", "Hindi", "हिन्दी", true],
    ["hu", "Hungarian", "Magyar", true],
    ["id", "Indonesian", "Bahasa Indonesia", true],
    ["it", "Italian", "Italiano", true],
    ["ja", "Japanese", "日本語", true],
    ["ko", "Korean", "한국어", true],
    ["no", "Norwegian", "Norsk", true],
    ["fa", "Persian", "فارسی", false],
    ["pl", "Polish", "Polski", true],
    ["pt", "Portuguese", "Português", true],
    ["ro", "Romanian", "Română", true],
    ["ru", "Russian", "Русский", true],
    ["es", "Spanish", "Español", true],
    ["sw", "Swahili", "Kiswahili", true],
    ["sv", "Swedish", "Svenska", true],
    ["th", "Thai", "ภาษาไทย", true],
    ["tr", "Turkish", "Türkçe", true],
    ["uk", "Ukrainian", "Українська", true],
    ["ur", "Urdu", "اردو", false],
    ["vi", "Vietnamese", "Tiếng Việt", true],
  ] as const
).map(([key, label, localizedLabel, ltr]) => ({ key, label, localizedLabel, ltr }));

/** Languages Uwazi ships predefined interface translations for
 *  (`contents/ui-translations/*.csv`): they can be Reset. */
export const PREDEFINED_TRANSLATIONS = new Set(["ar", "el", "en", "es", "fr", "ko", "my", "ru", "th", "tr", "uk"]);

/* ── Install and uninstall ────────────────────────────────────────────────
   Uwazi installs in a background job and reports the end over a socket. The
   mock runs a timer against the jotai store, so leaving the page does not
   stop it, and each install is its own Beacon task. Unlike Uwazi, a failed
   install always ends: the task goes and the row keeps a failed state with
   Retry. */

export type InstallStatus = { status: "installing" } | { status: "failed"; reason: string };

/** Per `corpus:key`. Not stored: a reload ends every mock job. */
export const languageInstallStateAtom = atom<Record<string, InstallStatus>>({});
registerSettingsReset((set) => set(languageInstallStateAtom, {}));
export const installKey = (corpus: Corpus, key: string) => `${corpus}:${key}`;

let failNext = false;
/** Make the next install fail, to see the failed state. In the console:
 *  `__failNextLanguageInstall()`. */
export function failNextLanguageInstall() {
  failNext = true;
}
if (typeof window !== "undefined")
  (window as unknown as { __failNextLanguageInstall: () => void }).__failNextLanguageInstall = failNextLanguageInstall;

type Store = ReturnType<typeof useStore>;
let seq = 0;
const INSTALL_MS = 3000;
const UNINSTALL_MS = 1500;

const names = (ls: { label: string }[]) =>
  ls.length <= 2 ? ls.map((l) => l.label).join(" and ") : `${ls.slice(0, -1).map((l) => l.label).join(", ")} and ${ls[ls.length - 1].label}`;

function setStates(store: Store, corpus: Corpus, keys: string[], state: InstallStatus | null) {
  store.set(languageInstallStateAtom, (prev) => {
    const next = { ...prev };
    for (const k of keys) {
      if (state) next[installKey(corpus, k)] = state;
      else delete next[installKey(corpus, k)];
    }
    return next;
  });
}

/** Install catalog languages: rows appear at once marked Installing, one
 *  Beacon task runs, then the marks clear and the task's completion says
 *  "Languages installed successfully". A language already installed is
 *  skipped; with none left nothing runs. */
export function installLanguages(store: Store, corpus: Corpus, picked: CatalogLanguage[]) {
  const installed = new Set(store.get(languages.listOfAtom(corpus)).map((l) => l.key));
  const fresh = picked.filter((c) => !installed.has(c.key) || store.get(languageInstallStateAtom)[installKey(corpus, c.key)]?.status === "failed");
  if (!fresh.length) return;
  for (const c of fresh)
    if (!installed.has(c.key))
      store.set(languages.restoreAtom, {
        record: { id: c.key, key: c.key, label: c.label, localizedLabel: c.localizedLabel, ltr: c.ltr, default: false, translationsCount: 0 },
        corpus,
      });
  const keys = fresh.map((c) => c.key);
  setStates(store, corpus, keys, { status: "installing" });
  const fails = failNext;
  failNext = false;
  const id = `language-install-${Date.now().toString(36)}-${++seq}`;
  store.set(tasksAtom, (prev) => [
    ...prev,
    {
      id,
      label: "Installing languages",
      detail: names(fresh),
      current: 0,
      total: 1,
      driven: true,
      done: { title: SETTINGS_NOTICES.languagesInstalled, detail: names(fresh) },
    },
  ]);
  setTimeout(() => {
    // Cancelled from the Beacon, or the demo data reset: nothing to finish.
    if (!store.get(tasksAtom).some((t) => t.id === id)) {
      setStates(store, corpus, keys, null);
      return;
    }
    if (fails) {
      const reason = "The server stopped while copying the collection's entities.";
      store.set(tasksAtom, (prev) => prev.filter((t) => t.id !== id));
      setStates(store, corpus, keys, { status: "failed", reason });
      store.set(toastsAtom, (prev) => [
        ...prev,
        { id: `${id}-error`, type: "error", message: SETTINGS_NOTICES.error, detail: `Installing ${names(fresh)} failed. ${reason}` },
      ]);
      return;
    }
    setStates(store, corpus, keys, null);
    store.set(tasksAtom, (prev) => prev.map((t) => (t.id === id ? { ...t, current: t.total } : t)));
    for (const c of fresh)
      store.set(appendActivityAtom, {
        method: "CREATE",
        summary: `Installed language “${c.label}”`,
        domain: "language",
        targetId: c.key,
        scope: corpus,
      });
  }, INSTALL_MS);
}

/** Uninstall: the row goes at once; a Beacon task "Uninstalling language"
 *  ends with "Language uninstalled successfully". */
export function uninstallLanguage(store: Store, corpus: Corpus, lang: LanguageRecord) {
  store.set(languages.deleteAtom, { id: lang.id, corpus });
  setStates(store, corpus, [lang.key], null);
  store.set(appendActivityAtom, {
    method: "DELETE",
    summary: `Uninstalled language “${lang.label}”`,
    domain: "language",
    targetId: lang.key,
    scope: corpus,
  });
  const id = `language-uninstall-${Date.now().toString(36)}-${++seq}`;
  store.set(tasksAtom, (prev) => [
    ...prev,
    {
      id,
      label: "Uninstalling language",
      detail: lang.label,
      current: 0,
      total: 1,
      driven: true,
      done: { title: SETTINGS_NOTICES.languageUninstalled, detail: lang.label },
    },
  ]);
  setTimeout(() => store.set(tasksAtom, (prev) => prev.map((t) => (t.id === id ? { ...t, current: t.total } : t))), UNINSTALL_MS);
}
