import { atom } from "jotai";

export type Language = "EN" | "ES" | "FR";

export const languageAtom = atom<Language>("EN");
