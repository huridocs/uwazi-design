/** Thumbnail crop and blank-check decisions, with no browser dependencies.
 *
 *  `pdfThumb.ts` owns the canvases and pdf.js; this module owns where the crop
 *  lands and whether the result is worth showing. It is separate so
 *  `app/scripts/check-thumbs.ts` can import it and run against the corpus
 *  headlessly: pdf.js does not resolve a render in a hidden tab. */

export interface ThumbFrame {
  /** The crop window's aspect (w/h), in CSS px — the sheet box it has to fill. */
  aspect: number;
  /** How much larger than fit-to-width to render the page. */
  zoom: number;
  /** Air above the masthead, as a fraction of the crop's height. Defaults to
   *  `TOP_AIR`; `check-thumbs --pad` sets it so treatments can be compared
   *  without editing the constant. */
  pad?: number;
}

/** Anything darker than this counts as ink. Well above the JPEG noise floor,
 *  well below the lightest text any of these documents set. */
const INK = 160;

/** How far down a page we look before concluding there's no masthead to find. */
const SCAN_DEPTH = 0.6;

/** Fraction of page height above the first inked row of a probe bitmap (RGBA,
 *  row-major). Only the middle 60% of the width is scanned so page numbers, margin
 *  rules and scan edges are ignored. Returns 0 when nothing is found. */
export function inkStart(pixels: Uint8ClampedArray, w: number, h: number): number {
  const depth = Math.ceil(h * SCAN_DEPTH);
  const x0 = Math.floor(w * 0.2);
  const x1 = Math.ceil(w * 0.8);
  for (let y = 0; y < depth; y++) {
    for (let x = x0; x < x1; x++) {
      if (pixels[(y * w + x) * 4] < INK) return y / h;
    }
  }
  return 0;
}

/** Air above the masthead, as a fraction of the crop's height. Added on top of
 *  the measured ink position because the PDFs in `public/cejil-docs` open on 8.8%
 *  to 35.2% of blank margin. At 0.12 dense mastheads still sit tight against the
 *  crop's top edge; at 0.22 the judgment date drops off the bottom on tightly set pages.
 *  `npm run check:thumbs` reports the air it produces. */
const TOP_AIR = 0.16;

export interface Geometry {
  scale: number;
  cropW: number;
  cropH: number;
  offsetX: number;
  offsetY: number;
}

/** Where the framed crop sits on the page: just above the first ink plus
 *  `TOP_AIR`, centred horizontally. `ink` is clamped so a page whose only ink is
 *  near the bottom still frames a full slab of page rather than blank paper. */
export function thumbGeometry(opts: {
  pageW: number;
  pageH: number;
  width: number;
  dpr: number;
  frame: ThumbFrame;
  ink: number;
}): Geometry {
  const { pageW, pageH, width, dpr, frame, ink } = opts;
  const scale = (width / pageW) * frame.zoom * dpr;
  const fullW = pageW * scale;
  const fullH = pageH * scale;
  const cropW = Math.round(width * dpr);
  const cropH = Math.round((width / frame.aspect) * dpr);
  const padY = cropH * (frame.pad ?? TOP_AIR);
  const offsetY = -clamp(ink * fullH - padY, 0, Math.max(0, fullH - cropH));
  const offsetX = -Math.max(0, (fullW - cropW) / 2);
  return { scale, cropW, cropH, offsetX, offsetY };
}

/** Fraction of a rendered thumbnail that is ink, 0–1 (RGBA, row-major). A crop
 *  of empty paper looks the same as a failed render, so this is the blank check. */
export function inkCoverage(pixels: Uint8ClampedArray, w: number, h: number): number {
  let dark = 0;
  for (let i = 0; i < w * h; i++) {
    if (pixels[i * 4] < INK) dark++;
  }
  return dark / (w * h);
}

/** Below this a thumbnail is treated as blank. In the corpus a masthead crop is
 *  ~1–4% ink, a whole page ~3–8%, and a blank crop under 0.1%. */
export const MIN_INK = 0.004;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
