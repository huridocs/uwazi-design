import { useEffect } from "react";

/** The on-screen keyboard's height, published as `--kb` on `:root` (M13).
 *
 *  A phone keyboard shrinks the VISUAL viewport, not the layout one, so fixed
 *  layers anchored to the bottom (sheets, full-screen dialogs, Bert) stay where
 *  they were and the field being typed into can end up under the keyboard.
 *  `visualViewport` says how much of the layout viewport is covered; bottom-
 *  anchored layers pad by `var(--kb, 0px)`, and a focused field is scrolled
 *  into view inside its own scroller once the keyboard is up. `--kb` is 0 on
 *  desktop and wherever `visualViewport` is missing, so nothing moves there. */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let last = -1;
    const update = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (kb === last) return;
      last = kb;
      root.style.setProperty("--kb", `${kb}px`);
      if (kb === 0) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, select, [contenteditable]")) {
        // After the layers have re-laid out with the new padding.
        requestAnimationFrame(() => el.scrollIntoView({ block: "nearest" }));
      }
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
    };
  }, []);
}
