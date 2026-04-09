import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { breakpointAtom, type Breakpoint } from "../atoms/viewport";

const computeBreakpoint = (): Breakpoint => {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(min-width: 1024px)").matches) return "desktop";
  if (window.matchMedia("(min-width: 768px)").matches) return "tablet";
  return "mobile";
};

/** Mount once at the app root to keep breakpointAtom in sync with viewport. */
export function useBreakpointSync() {
  const setBreakpoint = useSetAtom(breakpointAtom);

  useEffect(() => {
    setBreakpoint(computeBreakpoint());

    const tabletMql = window.matchMedia("(min-width: 768px)");
    const desktopMql = window.matchMedia("(min-width: 1024px)");

    const update = () => setBreakpoint(computeBreakpoint());

    tabletMql.addEventListener("change", update);
    desktopMql.addEventListener("change", update);
    return () => {
      tabletMql.removeEventListener("change", update);
      desktopMql.removeEventListener("change", update);
    };
  }, [setBreakpoint]);
}
