import { atom } from "jotai";
import { setUiLanguage, type UiLanguage } from "../utils/i18n";

/** NOT `languageAtom` (atoms/language.ts) — that is the reading language of the
 *  document (same judgment, four renditions). This is the language of the
 *  chrome around it. Conflating the two once made references "change" by
 *  language; keep them apart. */

const STORAGE_KEY = "uwazi-ui-language";

function readStored(): UiLanguage {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "es" || v === "fr") return v;
  } catch {
    // Storage unavailable — default is fine.
  }
  return "en";
}

// Prime the i18n shim before the first render so t() calls made during the
// initial pass already resolve in the persisted language.
const initial = readStored();
setUiLanguage(initial);

const baseUiLanguageAtom = atom<UiLanguage>(initial);

/** UI (chrome) language — persisted. Writing it syncs the module-level shim in
 *  utils/i18n.ts; components that render t() strings subscribe to this atom so
 *  a switch re-renders them with the new dictionary. */
export const uiLanguageAtom = atom(
  (get) => get(baseUiLanguageAtom),
  (_get, set, next: UiLanguage) => {
    set(baseUiLanguageAtom, next);
    setUiLanguage(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort.
    }
  },
);
