import { atom } from "jotai";

export type Theme = "light" | "dark";

export const themeAtom = atom<Theme>(
  (typeof window !== "undefined" && localStorage.getItem("theme") as Theme) || "light"
);
