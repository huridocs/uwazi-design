import { pdfjs } from "react-pdf";
import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import { inkStart, thumbGeometry, type ThumbFrame } from "./thumbFrame";
import "./pdfWorker";

// Framing arithmetic lives only in `thumbFrame`, which `check-thumbs` also
// imports; a copy here would drift from what the check measures.
export type { ThumbFrame };

/** Page one of a PDF, rasterised once and cached as a data URL.
 *
 *  Not react-pdf's <Document>/<Page> per card: a grid would hold dozens of open
 *  PDFDocumentProxies with worker-side state, and many cards share one PDF.
 *  Cached per (url, width, frame), so cards sharing a file cost one render.
 *  pdf.js renders off requestAnimationFrame, so nothing resolves in a hidden tab. */
const cache = new Map<string, Promise<string | null>>();
/** Where the text starts on page one (fraction of page height, from
 *  `inkStart`), per cache key, measured on the whole-page bitmap itself. */
const inks = new Map<string, number>();

/** The ink start of a whole-page thumbnail `pdfThumb(url, width)` has drawn;
 *  undefined until it has. */
export function pdfThumbInk(url: string, width: number): number | undefined {
  return inks.get(`${url}@${width}`);
}

export function pdfThumb(url: string, width: number, frame?: ThumbFrame): Promise<string | null> {
  // Cache key includes every input that changes the bitmap: url, width, and the
  // frame's zoom, aspect and pad. A missing input would return another frame's picture.
  const key = frame
    ? `${url}@${width}@z${frame.zoom}@a${frame.aspect.toFixed(2)}@p${frame.pad ?? "d"}`
    : `${url}@${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = render(url, width, frame, key).catch((err) => {
    // A failed thumbnail resolves null; warn so it is distinguishable from "no preview".
    console.warn("[pdfThumb] failed", url, err);
    // Not cached: CEJIL's cards share six PDFs, so a cached failure blanked
    // every card on that file until reload. The next mount tries again.
    cache.delete(key);
    return null;
  });
  cache.set(key, p);
  return p;
}

/** Device resolution so thumbnails are sharp on retina, capped at 2 because more
 *  detail is not visible at thumbnail size. */
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

async function render(url: string, width: number, frame: ThumbFrame | undefined, key: string): Promise<string | null> {
  const doc = await pdfjs.getDocument(url).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const ratio = dpr();

    if (!frame) {
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      // `return await`, not `return`: without it the `finally` destroys the
      // document while the render is in flight, pdf.js cancels it, and every
      // thumbnail resolves null. Do not remove it for `no-return-await`.
      return await paint(page, viewport, Math.ceil(viewport.width), Math.ceil(viewport.height), key);
    }

    // Where the page's text begins, measured per document because blank top
    // margins vary widely; `thumbGeometry` turns it into the crop.
    const ink = await probeInk(page, base);
    const g = thumbGeometry({
      pageW: base.width,
      pageH: base.height,
      width,
      dpr: ratio,
      frame,
      ink,
    });

    // `return await` for the same reason as the whole-page branch above.
    return await paint(
      page,
      page.getViewport({ scale: g.scale, offsetX: g.offsetX, offsetY: g.offsetY }),
      g.cropW,
      g.cropH,
    );
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
  /** Whole-page renders pass their cache key so the ink start is recorded. */
  inkKey?: string,
): Promise<string | null> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  await page.render({ canvasContext: ctx, viewport }).promise;
  if (inkKey) inks.set(inkKey, inkStart(ctx.getImageData(0, 0, w, h).data, w, h));
  // Quality 0.9 rather than a photo's ~0.82: the content is small text, and JPEG
  // artefacts land on high-contrast letter edges.
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** Renders a 96px-wide probe of page one and passes its pixels to `inkStart`
 *  (in `thumbFrame`, with the other crop rules). */
async function probeInk(page: PDFPageProxy, base: { width: number }): Promise<number> {
  const viewport = page.getViewport({ scale: 96 / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return inkStart(data, canvas.width, canvas.height);
}
