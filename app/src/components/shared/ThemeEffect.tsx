import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { themeAtom, resolveTheme, type Theme } from "../../atoms/theme";

/** Paint the theme: swap `:root.dark`, remember the preference, and follow the
 *  OS while in auto.
 *
 *  It is a LEAF, mounted beside the app rather than inside it, because the
 *  theme is a document-level fact and nothing in React needs to re-render when
 *  it changes — the whole design system is CSS variables. Read from `App`, the
 *  toggle re-rendered every view under it (the CEJIL library grid, the entity
 *  view, the graph) to produce markup identical to what was already there. */
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
 *  Half the surfaces animate their colours and half don't — `body` fades its
 *  background over 0.2s, a button fades its own, a card swaps instantly — so a
 *  theme change used to arrive as a wash of mismatched surfaces rather than one
 *  change. `theme-switching` turns transitions off, the swap is flushed under
 *  it, and the class comes off on the next frame: everything lands together and
 *  every hover / focus transition is back before the user can reach one.
 *
 *  The rAF is paired with a timeout because rAF does not fire in a background
 *  tab — without the fallback the app could sit there with transitions off. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
  void root.offsetHeight; // flush the swap while transitions are off
  // Two frames, not one: taking the class off re-invalidates style for every
  // element (~40ms on the entity view's 11k nodes), and a single rAF runs
  // BEFORE that frame paints — so the cleanup would delay the theme landing by
  // its own cost. After the paint it costs the user nothing. Re-enabling
  // transitions can't start one: the values already changed under the
  // suppression, so there is nothing left to interpolate.
  const clear = () => root.classList.remove("theme-switching");
  requestAnimationFrame(() => requestAnimationFrame(clear));
  window.setTimeout(clear, 250); // rAF never fires in a background tab
}

/** Paint the stored theme BEFORE React's first render, so a dark-mode reader
 *  doesn't get a frame of light while the app mounts. */
export function primeTheme() {
  document.documentElement.classList.toggle(
    "dark",
    localStorage.getItem("theme") === "dark",
  );
}
