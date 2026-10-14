import type { Language } from "../atoms/language";

/* The noun a distinct-count rollup counts: "3 countries" from the inherited
   column's label "Country". Only a one-word label is pluralised, by a small
   rule set per language and an explicit irregular map; anything else (a
   phrase like "Fecha de nacimiento", a word the rules can't take safely, or
   Arabic) reads as values: "3 values". */

/** Singular → plural, lowercase, where the rules below would be wrong. */
const IRREGULAR: Partial<Record<Language, Record<string, string>>> = {
  EN: { person: "people", child: "children", woman: "women", man: "men" },
  ES: { país: "países", región: "regiones", nación: "naciones", religión: "religiones", jurisdicción: "jurisdicciones" },
  FR: { œil: "yeux", travail: "travaux" },
};

const WORD: Record<Exclude<Language, "AR">, RegExp> = {
  EN: /^[a-z]+$/,
  ES: /^[a-záéíóúüñ]+$/,
  FR: /^[a-zàâæçéèêëîïôœùûüÿ]+$/,
};

/** The plural of a lowercase word, or null where the language's rules can't be
 *  trusted with it. */
function pluralOf(word: string, lang: Language): string | null {
  const irregular = IRREGULAR[lang]?.[word];
  if (irregular) return irregular;
  if (lang === "EN") {
    if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
    return `${word}s`;
  }
  if (lang === "ES") {
    // An accent can move or drop in the plural (región → regiones): only the
    // map handles those.
    if (/[áéíóú]/.test(word)) return null;
    if (/[aeiou]$/.test(word)) return `${word}s`;
    if (/z$/.test(word)) return `${word.slice(0, -1)}ces`;
    if (/[lrndj]$/.test(word)) return `${word}es`;
    return null;
  }
  if (lang === "FR") {
    if (/[sxz]$/.test(word)) return word;
    if (/(eau|au|eu)$/.test(word)) return `${word}x`;
    if (/al$/.test(word)) return null;
    return `${word}s`;
  }
  return null;
}

/** "3 countries" / "1 country", or null when the label can't be counted. */
export function countedNoun(label: string | undefined, n: number, lang: Language): string | null {
  if (!label) return null;
  const word = label.trim().toLocaleLowerCase();
  // A label that stays in its own language whatever the UI's (CEJIL's "País")
  // is counted in it when one of the irregular maps knows the word.
  if (lang === "AR" || !WORD[lang].test(word) || IRREGULAR[lang]?.[word] === undefined) {
    for (const other of ["ES", "FR", "EN"] as const) {
      const plural = other === lang ? undefined : IRREGULAR[other]?.[word];
      if (plural) return new Intl.PluralRules(other.toLowerCase()).select(n) === "one" ? `${n} ${word}` : `${n} ${plural}`;
    }
  }
  if (lang === "AR" || !WORD[lang].test(word)) return null;
  if (new Intl.PluralRules(lang.toLowerCase()).select(n) === "one") return `${n} ${word}`;
  const plural = pluralOf(word, lang);
  return plural ? `${n} ${plural}` : null;
}

const VALUES: Record<Language, { one: string; other: string }> = {
  EN: { one: "value", other: "values" },
  ES: { one: "valor", other: "valores" },
  FR: { one: "valeur", other: "valeurs" },
  // The chip's words are English where the language isn't handled.
  AR: { one: "value", other: "values" },
};

/** The chip and its tooltip for a distinct count over `records` inherited
 *  values: "3 countries", "3 different countries across 5 records". */
export function distinctRollup(n: number, records: number, label: string | undefined, lang: Language): { text: string; title: string } {
  const pl = (count: number) => new Intl.PluralRules(lang === "AR" ? "en" : lang.toLowerCase()).select(count) === "one";
  const named = countedNoun(label, n, lang);
  const text = named ?? `${n} ${VALUES[lang][pl(n) ? "one" : "other"]}`;
  switch (lang) {
    case "ES":
      // "diferentes" agrees with either gender in the plural.
      return { text, title: `${text}${pl(n) ? "" : " diferentes"} en ${records} ${pl(records) ? "registro" : "registros"}` };
    case "FR":
      // An adjective would need the noun's gender, which a label doesn't carry:
      // the count of values says it instead.
      return {
        text,
        title: named
          ? `${text} sur ${records} ${pl(records) ? "fiche" : "fiches"}`
          : `${text}${pl(n) ? "" : " différentes"} sur ${records} ${pl(records) ? "fiche" : "fiches"}`,
      };
    default:
      return {
        text,
        title: `${pl(n) ? text : `${n} different ${text.slice(String(n).length + 1)}`} across ${records} ${pl(records) ? "record" : "records"}`,
      };
  }
}
