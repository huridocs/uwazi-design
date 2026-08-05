/** The thumbnail's DECISIONS, with nothing browser-shaped in them.
 *
 *  `pdfThumb.ts` owns the canvases and pdf.js; this owns where the crop lands
 *  and whether what came out is worth showing. Split out so it can be exercised
 *  headlessly: pdf.js won't resolve a render in a hidden tab, which is exactly
 *  the state browser automation leaves a tab in, so the only honest way to check
 *  these numbers against the real corpus is off the browser entirely.
 *  `app/scripts/check-thumbs.ts` imports THIS module — not a copy of it — so the
 *  check can't drift from what ships. */

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

/** The fraction of page height above its first inked row, read off a probe
 *  bitmap (RGBA, row-major).
 *
 *  Only the middle of the column band is scanned: a page number, a margin rule
 *  or a scan's black edge isn't the masthead and shouldn't drag the crop up to
 *  it. Returns 0 when nothing is found — a page that empty reads better from its
 *  top edge than from wherever its one stray mark happens to be. */
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

/** Air above the masthead, as a fraction of the crop's height.
 *
 *  This is a framing judgment, not a tolerance. At 0.07 the first line of type
 *  sat almost on the crop's top edge and the thumbnail read as a scan clipped at
 *  the letterhead — the page looked cut, not composed. A title block wants a
 *  margin above it the way it has one on paper, so the eye reads "the top of a
 *  document" rather than "a document with its top missing".
 *
 *  Chosen against every PDF in `public/cejil-docs`, not one. They open on
 *  anywhere from 8.8% to 35.2% of blank margin (median 12.5%, n=39), which is
 *  why this rides on TOP of the measured ink position instead of replacing it:
 *  a fixed offset would be right for the median document and wrong for both
 *  ends. Swept at 0.07 / 0.12 / 0.16 / 0.22 over the whole set — 0.12 still
 *  reads tight on the denser mastheads, and by 0.22 the crop is pushing the
 *  judgment date off the bottom of the tighter-set ones, which costs more than
 *  the air buys. `npm run check:thumbs` reports the air it produces. */
const TOP_AIR = 0.16;

export interface Geometry {
  scale: number;
  cropW: number;
  cropH: number;
  offsetX: number;
  offsetY: number;
}

/** Where the framed crop sits on the page.
 *
 *  The crop is pinned just above the page's first ink rather than to the sheet's
 *  top edge — judgments open on 8.8–35.2% of blank margin, so a zoomed top crop
 *  frames white paper — and then `TOP_AIR` puts a deliberate margin back above
 *  it. It is centred horizontally because a masthead is centred.
 *
 *  `ink` is clamped so the window always lands on a real slab of page: pinning
 *  to ink that starts near the BOTTOM of a page (a cover sheet with one line
 *  low down) would otherwise frame the blank paper above it just as badly. */
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

/** How much of a rendered thumbnail is actually ink, 0–1 (RGBA, row-major).
 *
 *  This is the blank-card test. A framed crop that lands on empty paper is
 *  indistinguishable from a failed render and from the placeholder behind it —
 *  all three are a white rectangle — so the only way to tell "we drew a page"
 *  from "we drew nothing" is to look at the pixels. */
export function inkCoverage(pixels: Uint8ClampedArray, w: number, h: number): number {
  let dark = 0;
  for (let i = 0; i < w * h; i++) {
    if (pixels[i * 4] < INK) dark++;
  }
  return dark / (w * h);
}

/** Below this, a thumbnail has nothing on it worth showing — it reads as a card
 *  that failed to load. Calibrated against the corpus: a masthead crop runs
 *  ~1–4% ink, a whole fitted page ~3–8%, and a blank crop is under a tenth of a
 *  percent. */
export const MIN_INK = 0.004;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
