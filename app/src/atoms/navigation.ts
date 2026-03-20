import { atom } from "jotai";

export type AppView = "entity" | "catalog" | "import-csv";

export const appViewAtom = atom<AppView>("entity");
