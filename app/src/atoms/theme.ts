import { atom } from "jotai";

/** The user's stored preference. "auto" follows the OS `prefers-color-scheme`. */
export type Theme = "light" | "dark" | "auto";

/** The concrete theme actually painted — "auto" resolves to one of these. */
export type ResolvedTheme = "light" | "dark";

// The toggle is a plain light ↔ dark switch; a previously-stored "auto" is
// coerced to "light" so the (retired) monitor icon never shows. `auto` stays in
// the type / resolveTheme in case a dedicated control wants it back later.
export const themeAtom = atom<Theme>(
  (typeof window !== "undefined" && localStorage.getItem("theme")) === "dark" ? "dark" : "light"
);

/** Read the current OS colour-scheme preference. */
export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

/** Collapse a stored preference into the theme to paint. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "auto") return systemPrefersDark() ? "dark" : "light";
  return theme;
}
