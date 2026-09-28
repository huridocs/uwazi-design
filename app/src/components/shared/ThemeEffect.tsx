import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { themeAtom, resolveTheme, type Theme } from "../../atoms/theme";

/** Apply the theme: swap `:root.dark`, store the preference, and follow the OS
 *  while in auto.
 *
 *  Mounted beside the app, not read from `App`: the design system is CSS
 *  variables, so nothing in React needs to re-render on a theme change, and
 *  reading it in `App` re-rendered every view for identical markup. */
export function ThemeEffect() {
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    if (theme !== "auto") return;
    // Follow OS preference live while in auto mode.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}

/** Swap the class with every transition suppressed for that one frame.
 *
 *  Some surfaces transition their colours and some don't, so without this the
 *  surfaces change at different times. `theme-switching` turns transitions off,
 *  the swap is flushed under it, and the class comes off after the paint.
 *  The timeout covers a background tab, where rAF does not fire. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
  void root.offsetHeight; // flush the swap while transitions are off
  // Two frames, not one: removing the class restyles every element (~40ms on
  // the entity view), and a single rAF runs before the paint, delaying the
  // theme by that cost. Re-enabling transitions starts none: the values have
  // already changed.
  const clear = () => root.classList.remove("theme-switching");
  requestAnimationFrame(() => requestAnimationFrame(clear));
  window.setTimeout(clear, 250); // rAF never fires in a background tab
}

/** Apply the stored theme before React's first render, so dark mode doesn't
 *  show one light frame while the app mounts. */
export function primeTheme() {
  document.documentElement.classList.toggle(
    "dark",
    localStorage.getItem("theme") === "dark",
  );
}
