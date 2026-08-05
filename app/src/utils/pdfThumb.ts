import { pdfjs } from "react-pdf";
import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import { inkStart, thumbGeometry, type ThumbFrame } from "./thumbFrame";
import "./pdfWorker";

// One home for the framing. This file owns pdf.js and the canvases; `thumbFrame`
// owns where the crop lands and how much air sits above the masthead. They were
// two copies of the same arithmetic — same `padY`, same clamp — which is a
// silent-drift bug waiting to happen and did happen: the app ran its copy while
// the regression check imported the other.
export type { ThumbFrame };

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
      // `return await`, NOT `return`: the `finally` below destroys the document,
      // and a bare `return promise` runs it the moment this frame returns —
      // while the render is still in flight. pdf.js answers that by cancelling
      // the render, so EVERY thumbnail resolved null and every card sat on its
      // blank placeholder. The await is what keeps the document alive until the
      // pixels exist. `no-return-await` would call this redundant; it is the
      // opposite of redundant inside try/finally.
      return await paint(page, viewport, Math.ceil(viewport.width), Math.ceil(viewport.height));
    }

    // Where the page's own text begins — measured, not guessed, because the
    // number is different per document (these judgments open on anywhere from
    // 8% to 28% of blank margin). `thumbGeometry` turns it into the crop; this
    // file owns the canvases, that one owns where the crop lands.
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

/** Renders a ~96px probe of page one and hands the pixels to `inkStart` — a few
 *  thousand pixels to scan, next to nothing beside the real render. The scan
 *  itself lives in `thumbFrame` so the crop's rules are all in one place. */
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
