import { atom } from "jotai";

export type Language = "EN" | "ES" | "FR" | "AR";

export const languageAtom = atom<Language>("EN");
