import { atom } from "jotai";

export type Language = "EN" | "ES" | "FR" | "AR";

/** Every language the collection carries, in picker order. One list: the
 *  header picker and the per-field multi-language control must not disagree
 *  about what "the other languages" are. */
export const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

/** What each language is CALLED, in its own language.
 *
 *  A language picker names languages the way their readers name them — that is
 *  what every one you have used does, and it is the only version a reader who
 *  does not yet read the interface's language can recognise. So Español, not
 *  Spanish; العربية, not Arabic.
 *
 *  The CODE stays the data key: `Language` is still "EN" | "ES" | "FR" | "AR",
 *  every stored value and every `metadata[lang]` lookup is unchanged, and this
 *  is only what we print. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  EN: "English",
  ES: "Español",
  FR: "Français",
  AR: "العربية",
};

/** The display name for a code, falling back to the code itself.
 *
 *  Takes a plain string on purpose: file records carry languages this app has
 *  no UI for (PT, DE, and a literal "—" for none), and a file list must print
 *  those rather than crash or blank. An unknown code is shown as it is stored —
 *  which is still the truest thing we can say about it. */
export function languageName(code: string): string {
  return LANGUAGE_NAMES[code as Language] ?? code;
}

/** Arabic is the one RTL reading direction in the set. A name or a value set in
 *  it renders its punctuation on the wrong end inside an LTR box. */
export function languageDir(code: string): "rtl" | "ltr" {
  return code === "AR" ? "rtl" : "ltr";
}

export const languageAtom = atom<Language>("EN");
