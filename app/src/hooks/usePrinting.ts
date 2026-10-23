import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/** Whether the page is being printed (or saved as PDF).
 *
 *  For what CSS cannot do in print: a list that renders only the chips that fit
 *  its fold has to render the rest before the page is laid out for paper.
 *  `beforeprint` comes first and the update is flushed inside it, so the printed
 *  layout already has them; the print media query covers a print that sends no
 *  event. `afterprint` puts the screen state back. */
let printing = false;
const listeners = new Set<() => void>();

function setPrinting(next: boolean) {
  if (printing === next) return;
  printing = next;
  flushSync(() => listeners.forEach((l) => l()));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeprint", () => setPrinting(true));
  window.addEventListener("afterprint", () => setPrinting(false));
  window.matchMedia("print").addEventListener("change", (e) => setPrinting(e.matches));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePrinting(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => printing,
    () => false,
  );
}
