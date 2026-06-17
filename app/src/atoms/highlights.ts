import { atom } from "jotai";
import type { NormRect } from "./selection";

/** A standalone text highlight — a marked passage with no relationship/target.
 *  Created from the document selection menu's Highlighter button. Unlike a
 *  reference highlight (which only paints while its row is active), a standalone
 *  highlight is always visible on its document. Scoped to the document entity it
 *  was drawn on so it doesn't bleed across focal entities. */
export interface Highlight {
  id: string;
  /** The document entity this highlight belongs to (the focused entity). */
  entityId: string;
  text: string;
  page: number;
  /** Exact per-line page-relative rects (from the selection Range), so the
   *  highlight paints the real selected geometry — not a line-break guess. */
  rects: NormRect[];
  color: string;
  createdAt: string;
}

export const highlightsAtom = atom<Highlight[]>([]);

/** Calm highlighter tint — a warm amber that reads as "marked", distinct from
 *  the entity-coloured reference highlights. */
export const HIGHLIGHT_COLOR = "#E0A93B";
