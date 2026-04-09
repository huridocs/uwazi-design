import { atom } from "jotai";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export const breakpointAtom = atom<Breakpoint>("desktop");
