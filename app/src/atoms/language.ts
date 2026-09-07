import { atom } from "jotai";

export type Language = "EN" | "ES" | "FR" | "AR";

/** Every language the collection carries, in picker order. One list: the
 *  header picker and the per-field multi-language control must not disagree
 *  about what "the other languages" are. */
export const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

export const languageAtom = atom<Language>("EN");
