/* A block's style: every control is a step on a scale, never a free value.
 * Stored on the block as data ({ pad: "L", bg: "warm" }); an absent key is
 * the block's default. The renderer turns it into data attributes and classes
 * (render/Site.tsx, render/parts.tsx, index.css); the export turns it into
 * page CSS (export/uwazi.ts). */
import type { BlockType, ImageRef, L10n, Lang } from "./config";

export type Step = "S" | "M" | "L" | "XL";
export type Width = "narrow" | "text" | "wide" | "full";
export type Background = "paper" | "warm" | "vellum" | "tint" | "image";
export type Device = "desktop" | "tablet" | "phone";

export interface BlockStyle {
  /** Space above and below the section. M is today's spacing. */
  pad?: Step;
  /** Space between a list's or a grid's items. M is today's spacing. */
  gap?: Step;
  /** How wide the content runs. Wide is today's width. */
  width?: Width;
  bg?: Background;
  /** With bg "image": the picture, and how strongly it is darkened for text. */
  bgImage?: ImageRef;
  overlay?: "soft" | "strong";
  align?: "start" | "center";
  /** Grid and list blocks: columns from tablet width up. */
  cols?: 2 | 3 | 4;
  /** Blocks that show pictures. */
  shape?: "square" | "portrait" | "landscape";
  /** Heading one step smaller or larger than the block's own. */
  heading?: -1 | 1;
  /** A short line above the heading. */
  eyebrow?: L10n;
  /** Shown only in these languages / on these devices; absent = everywhere. */
  langs?: Lang[];
  devices?: Device[];
}

export type StyleControl = "pad" | "gap" | "width" | "bg" | "align" | "cols" | "shape" | "heading" | "eyebrow" | "visibility";

const SECTION: StyleControl[] = ["pad", "width", "bg", "align", "heading", "eyebrow", "visibility"];
const GRID: StyleControl[] = [...SECTION, "gap", "cols"];
const PICTURES: StyleControl[] = [...GRID, "shape"];

/** Which controls a block offers. A control a block cannot show is not
 *  offered, rather than offered and ignored. */
export const STYLE_CAPS: Record<BlockType, StyleControl[]> = {
  hero: ["pad", "align", "heading", "eyebrow", "visibility"],
  search: ["pad", "width", "bg", "align", "visibility"],
  facets: [...SECTION, "gap"],
  stats: GRID,
  statusBar: SECTION,
  entityList: PICTURES,
  featured: PICTURES,
  topics: [...SECTION, "gap"],
  map: ["pad", "width", "bg", "heading", "eyebrow", "visibility"],
  chart: SECTION,
  timeline: [...SECTION, "gap"],
  index: SECTION,
  gallery: PICTURES,
  collections: PICTURES,
  table: SECTION,
  text: SECTION,
  quote: SECTION,
  asks: GRID,
  cta: SECTION,
  share: SECTION,
  contact: SECTION,
  results: ["pad", "width", "bg", "visibility"],
  entityHeader: ["pad", "align", "heading", "visibility"],
  entityFields: GRID,
  entitySummary: SECTION,
  entityHistory: SECTION,
  entityConnections: [...SECTION, "gap"],
  entityDownload: SECTION,
  entityCitation: SECTION,
};

/** True when the block has any style of its own. */
export function isStyled(s: BlockStyle | undefined): boolean {
  return !!s && Object.values(s).some((v) => v !== undefined && !(Array.isArray(v) && v.length === 0));
}

/** Drop keys at their default so the stored style stays sparse. */
export function clean(s: BlockStyle): BlockStyle | undefined {
  const out: BlockStyle = {};
  for (const [k, v] of Object.entries(s) as [keyof BlockStyle, unknown][]) {
    if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
    if ((k === "pad" || k === "gap") && v === "M") continue;
    if (k === "width" && v === "wide") continue;
    if (k === "bg" && v === "paper") continue;
    if (k === "align" && v === "start") continue;
    (out as Record<string, unknown>)[k] = v;
  }
  if (out.bg !== "image") {
    delete out.bgImage;
    delete out.overlay;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Is the block shown in this language? */
export const shownIn = (s: BlockStyle | undefined, lang: Lang) => !s?.langs?.length || s.langs.includes(lang);

/** The scales, in rem, shared by the renderer's CSS and the export. */
export const PAD_REM: Record<Step, [number, number]> = { S: [1.25, 1.5], M: [2, 2.5], L: [3, 4], XL: [4, 6] };
export const GAP_REM: Record<Step, number> = { S: 0.5, M: 1, L: 1.5, XL: 2.25 };
export const WIDTH_REM: Record<Width, number | null> = { narrow: 40, text: 52, wide: 68, full: null };
export const SHAPE_RATIO = { square: "1 / 1", portrait: "3 / 4", landscape: "4 / 3" } as const;
