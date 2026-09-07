import type { Language } from "../atoms/language";

/** Machine translation, mocked.
 *
 *  There is no translation service behind this prototype, and the deliverable
 *  is the FLOW — a value arriving in a field the user didn't type into, marked
 *  as machine-written until a human touches it. So this resolves in three
 *  steps, best first:
 *
 *  1. An authored title for the target language, if the caller has one. The
 *     Velásquez judgment carries real EN/ES/FR/AR titles (`data/document.ts`),
 *     so the demo path returns genuine translations rather than a stand-in.
 *  2. A phrase swap over the vocabulary the corpus actually repeats — CEJIL
 *     titles are case names, hearing labels and resolution headers, a few
 *     hundred rows deep on maybe a dozen distinct nouns.
 *  3. The source verbatim. Better an honest echo than invented words: the row
 *     still carries the machine-translated marker, which is the thing being
 *     designed.
 *
 *  Do not grow step 2 into a translation engine. If real translation is ever
 *  wanted, it replaces this whole file with a call. */

/** source term (lower-case) → per-language rendering. */
const GLOSSARY: { en: string; ES?: string; FR?: string; EN?: string }[] = [
  { en: "case", ES: "caso", FR: "affaire" },
  { en: "caso", EN: "case", FR: "affaire" },
  { en: "judgment", ES: "sentencia", FR: "arrêt" },
  { en: "sentencia", EN: "judgment", FR: "arrêt" },
  { en: "hearing", ES: "audiencia", FR: "audience" },
  { en: "audiencia", EN: "hearing", FR: "audience" },
  { en: "resolution", ES: "resolución", FR: "résolution" },
  { en: "resolución", EN: "resolution", FR: "résolution" },
  { en: "report", ES: "informe", FR: "rapport" },
  { en: "informe", EN: "report", FR: "rapport" },
  { en: "court", ES: "corte", FR: "cour" },
  { en: "corte", EN: "court", FR: "cour" },
  { en: "order", ES: "orden", FR: "ordonnance" },
  { en: "measure", ES: "medida", FR: "mesure" },
  { en: "medida", EN: "measure", FR: "mesure" },
  { en: "provisional", ES: "provisional", FR: "provisoire" },
  { en: "session", ES: "sesión", FR: "session" },
  { en: "sesión", EN: "session", FR: "session" },
  { en: "president", ES: "presidenta", FR: "présidente" },
  { en: "of", ES: "de", FR: "de" },
  { en: "the", ES: "la", FR: "la" },
];

function swap(text: string, to: Language): string {
  if (to === "AR") return text; // no transliteration worth faking
  return text.replace(/[\p{L}\p{M}]+/gu, (word) => {
    const hit = GLOSSARY.find((g) => g.en === word.toLowerCase());
    const out = hit?.[to as "ES" | "FR" | "EN"];
    if (!out) return word;
    // Keep the source's capitalisation — these are titles.
    return word[0] === word[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out;
  });
}

export function mockTranslate(
  source: string,
  to: Language,
  authored?: Partial<Record<Language, string>>,
): string {
  const real = authored?.[to]?.trim();
  if (real) return real;
  const swapped = swap(source, to);
  return swapped.trim() || source;
}

/** Display names, in the UI's own language — the picker in the issue
 *  screenshot reads "Spanish", not "Español". */
export const LANGUAGE_NAMES: Record<Language, string> = {
  EN: "English",
  ES: "Spanish",
  FR: "French",
  AR: "Arabic",
};

/** Arabic is the one RTL reading direction in the set; a title typed into an
 *  LTR box renders its punctuation on the wrong end. */
export const languageDir = (lang: Language): "rtl" | "ltr" => (lang === "AR" ? "rtl" : "ltr");
