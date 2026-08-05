import { pdfjs } from "react-pdf";
import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import "./pdfWorker";

/** How the page is FRAMED inside the thumbnail.
 *
 *  Without one, the whole page is fitted to `width` — the honest picture of a
 *  document, and at a 36px list thumb that is all it can ever be.
 *
 *  With one, the thumbnail stops being a picture of a whole page and becomes a
 *  READABLE FRAGMENT of it: the page is rendered `zoom`× larger than fit-to-
 *  width and cropped to a window of `aspect`, centred horizontally and pinned to
 *  where the page's ink actually starts. A card's sheet gets ~189×97 CSS px; a
 *  full A4 squeezed into that renders body text about 3px tall, which no amount
 *  of resolution rescues. */
export interface ThumbFrame {
  /** The crop window's aspect (w/h), in CSS px — the sheet box it has to fill. */
  aspect: number;
  /** How much larger than fit-to-width to render the page. */
  zoom: number;
}

/** Page one of a PDF, rasterised once and cached as an image.
 *
 *  Deliberately NOT react-pdf's <Document>/<Page> per card. A thumbnail is a
 *  picture, not a live document: a grid would otherwise hold dozens of open
 *  PDFDocumentProxies (each with worker-side state) to show one page each, and
 *  every sample court case points at one of only two stand-in judgments — so the
 *  same file would be parsed over and over.
 *
 *  Rasterise once per (url, width, frame), cache the data URL: fifty cards
 *  sharing two PDFs cost two renders, and scrolling back is instant.
 *
 *  Note pdf.js drives rendering off requestAnimationFrame, so nothing here
 *  resolves while the tab is HIDDEN — which is exactly when you don't want the
 *  work anyway. Thumbnails appear when the tab is looked at. */
const cache = new Map<string, Promise<string | null>>();

export function pdfThumb(url: string, width: number, frame?: ThumbFrame): Promise<string | null> {
  // The key carries EVERYTHING that changes the bitmap. It used to be (url,
  // width) alone; a frame that rendered at a different scale or crop under the
  // same key would hand every later caller the first caller's picture — and the
  // fifty cards sharing two judgments are exactly the case this cache exists for.
  const key = frame
    ? `${url}@${width}@z${frame.zoom}@a${frame.aspect.toFixed(2)}`
    : `${url}@${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = render(url, width, frame).catch((err) => {
    // A thumbnail must never take the page down. Warn, though: a silent null is
    // indistinguishable from "this document has no preview".
    console.warn("[pdfThumb] failed", url, err);
    return null;
  });
  cache.set(key, p);
  return p;
}

/** Rasterise at device resolution — a thumbnail rendered at CSS pixels looks
 *  soft on any retina screen. Capped at 2: past that the file grows for detail
 *  nobody can see at this size. */
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

async function render(url: string, width: number, frame?: ThumbFrame): Promise<string | null> {
  const doc = await pdfjs.getDocument(url).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const ratio = dpr();

    if (!frame) {
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      return paint(page, viewport, Math.ceil(viewport.width), Math.ceil(viewport.height));
    }

    const scale = (width / base.width) * frame.zoom * ratio;
    const full = page.getViewport({ scale });
    const cropW = Math.round(width * ratio);
    const cropH = Math.round((width / frame.aspect) * ratio);

    // Where the page's own text begins. A judgment opens on 12% of blank top
    // margin, another on 19% — pinning the crop to the sheet's top edge at any
    // zoom worth having would frame that margin and little else, which is worse
    // than the whole page it replaced. Measured, not guessed, because the number
    // is different per document.
    const ink = await inkStart(page, base);
    const padY = cropH * 0.07;
    const offsetY = -clamp(ink * full.height - padY, 0, Math.max(0, full.height - cropH));
    // Centred, not left-aligned: a judgment's masthead is centred on the page,
    // and the crop is narrower than the page at any zoom above 1.
    const offsetX = -Math.max(0, (full.width - cropW) / 2);

    return paint(page, page.getViewport({ scale, offsetX, offsetY }), cropW, cropH);
  } finally {
    // Free the worker's copy of the document; we only ever wanted one page.
    doc.destroy();
  }
}

async function paint(
  page: PDFPageProxy,
  viewport: PageViewport,
  w: number,
  h: number,
): Promise<string | null> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  await page.render({ canvasContext: ctx, viewport }).promise;
  // 0.9, not the 0.82 a photo would take: at this size the subject IS small
  // text, and JPEG spends its error budget exactly on the high-contrast edges
  // that make letterforms.
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** The fraction of the page height above its first ink, found on a ~96px probe
 *  render — a few thousand pixels to scan, next to nothing beside the real one.
 *  Only the middle of the column band is read: a page number or a marginal rule
 *  at the very top isn't the masthead, and shouldn't drag the crop up to it. */
async function inkStart(page: PDFPageProxy, base: { width: number }): Promise<number> {
  const viewport = page.getViewport({ scale: 96 / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Past 60% down there's no masthead to find — a page that empty reads better
  // from its top edge than from wherever its one stray mark happens to be.
  const depth = Math.ceil(canvas.height * 0.6);
  const { data } = ctx.getImageData(0, 0, canvas.width, depth);
  const x0 = Math.floor(canvas.width * 0.2);
  const x1 = Math.ceil(canvas.width * 0.8);
  for (let y = 0; y < depth; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[(y * canvas.width + x) * 4] < 160) return y / canvas.height;
    }
  }
  return 0;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
