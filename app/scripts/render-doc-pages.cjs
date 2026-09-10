/* Rasterise pages of the REAL CEJIL filings into card-sized JPEGs.
 *
 *  Why this exists: a case's exhibit, in the world this prototype is about, is
 *  a scanned or typeset filing — not a painting. The seed used the artwork
 *  corpus because it was the only image set in the repo, and a Goya print on a
 *  human-rights case reads as a gallery, not as evidence. We already ship 33
 *  real filings; a page of one IS the picture.
 *
 *  BUILD TIME, not render time, and the difference matters. A live `pdfThumb`
 *  would make these a different KIND of object: the multi-image fallback names a
 *  FILE that a reader can then open, and the lightbox draws a real asset at its
 *  own resolution. A page rendered on the fly has neither a filename nor a
 *  resolution of its own. So: JPEGs on disk, with a generated manifest carrying
 *  the dimensions, which is the same shape every other seeded asset has.
 *
 *  THREE KINDS OF PAGE, because 33 identical cover sheets would be its own kind
 *  of lie:
 *    - page 1      — the masthead: court, case name, date. Says WHICH filing.
 *    - a mid page  — running body text with a page number.
 *    - the last    — the bench's signature page, sparse and centred.
 *  At a card's 144px band, top-anchored, those three read as three different
 *  documents rather than one repeated.
 *
 *    node scripts/render-doc-pages.cjs
 *
 *  Needs `pdftoppm` (poppler). Writes `public/doc-pages/*.jpg` and
 *  `src/data/docPages.ts`. Re-runnable: it clears the output directory first, so
 *  the committed set is always exactly what this script produces.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const APP = path.join(__dirname, "..");
const DOCS = path.join(APP, "public/cejil-docs");
const OUT = path.join(APP, "public/doc-pages");
const MANIFEST = path.join(APP, "src/data/docPages.ts");

/** How many filings to draw from. Eight × three pages is 24 images — enough
 *  that a grid of seeded cards does not repeat, and a small fraction of the
 *  artwork set's weight. */
const DOC_COUNT = 8;
/** Rasterised at 150 DPI ≈ 1240px wide for a letter page. The card draws it at
 *  ~352 and the record at ~350; the extra is for the LIGHTBOX, which shows an
 *  asset at its own resolution and would otherwise show a card-sized blur. */
const DPI = 110;

/** The first row of INK on a rendered page, in pixels from the top.
 *
 *  A filing's page 1 has a deep top margin, and the card's band is a 2:1 crop
 *  anchored to the TOP — so an untrimmed page rendered exactly what a top-anchor
 *  is supposed to avoid: blank paper. The masthead was there, an inch down,
 *  outside the crop.
 *
 *  So the asset starts where the document does. A grey PGM at the same DPI is a
 *  raw byte grid Node can read without an image library — no dependency, and the
 *  offset maps 1:1 onto the final render. Scans the middle 60% of the width, so
 *  a page number or a margin rule does not count as the start of the text. */
function firstInkRow(file, page, dpi) {
  const tmp = path.join(OUT, "__probe");
  execFileSync("pdftoppm", ["-gray", "-r", String(dpi), "-f", String(page), "-l", String(page), file, tmp]);
  const written = fs.readdirSync(OUT).find((f) => f.startsWith("__probe"));
  if (!written) return 0;
  const buf = fs.readFileSync(path.join(OUT, written));
  fs.unlinkSync(path.join(OUT, written));
  // PGM: "P5\n<w> <h>\n<max>\n<bytes>"
  let i = 0;
  const tok = () => {
    while (buf[i] === 32 || buf[i] === 10 || buf[i] === 13 || buf[i] === 9) i++;
    const start = i;
    while (i < buf.length && buf[i] !== 32 && buf[i] !== 10 && buf[i] !== 13 && buf[i] !== 9) i++;
    return buf.toString("ascii", start, i);
  };
  if (tok() !== "P5") return 0;
  const w = Number(tok());
  const h = Number(tok());
  tok(); // maxval
  i++; // single whitespace before the raster
  const x0 = Math.floor(w * 0.2);
  const x1 = Math.ceil(w * 0.8);
  for (let y = 0; y < h; y++) {
    const row = i + y * w;
    for (let x = x0; x < x1; x++) {
      if (buf[row + x] < 160) return { y, h };
    }
  }
  return { y: 0, h };
}

function pageCount(file) {
  try {
    const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
    const m = info.match(/^Pages:\s+(\d+)/m);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

/** JPEG dimensions, straight from the SOF marker — no image library needed for
 *  the one number the manifest has to carry. */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry the size.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`no SOF marker in ${file}`);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const pdfs = fs
  .readdirSync(DOCS)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .sort()
  .slice(0, DOC_COUNT);

const entries = [];
for (const pdf of pdfs) {
  const file = path.join(DOCS, pdf);
  const total = pageCount(file);
  if (!total) continue;
  const stem = pdf.replace(/\.pdf$/i, "").slice(0, 12);
  const picks = [
    { page: 1, kind: "cover" },
    { page: Math.min(total, Math.max(2, Math.round(total / 2))), kind: "body" },
    { page: total, kind: "signatures" },
  ];
  for (const { page, kind } of picks) {
    const prefix = path.join(OUT, `${stem}-${kind}`);
    // Trim to the first line of text, less a small breathing margin, so a
    // top-anchored crop opens on the masthead rather than on the margin above it.
    const ink = firstInkRow(file, page, DPI);
    const top = Math.max(0, ink.y - Math.round(DPI * 0.12));
    execFileSync("pdftoppm", [
      "-jpeg",
      "-jpegopt", "quality=72",
      "-r", String(DPI),
      "-f", String(page),
      "-l", String(page),
      ...(top > 0 ? ["-y", String(top), "-H", String(ink.h - top)] : []),
      file,
      prefix,
    ]);
    // pdftoppm appends the page number with a width that follows the doc's
    // page count — find whatever it actually wrote.
    const written = fs
      .readdirSync(OUT)
      .find((f) => f.startsWith(`${stem}-${kind}-`) && f.endsWith(".jpg"));
    if (!written) continue;
    const finalName = `${stem}-${kind}.jpg`;
    fs.renameSync(path.join(OUT, written), path.join(OUT, finalName));
    const { width, height } = jpegSize(path.join(OUT, finalName));
    entries.push({
      file: finalName,
      // The name a reader would see for this page of this filing — what the
      // card's fallback row prints and the lightbox confirms.
      originalName: `${stem}_p${page}.jpg`,
      kind,
      page,
      width,
      height,
      aspect: width / height > 1.05 ? "landscape" : width / height < 0.95 ? "portrait" : "square",
    });
  }
}

const bytes = entries.reduce((n, e) => n + fs.statSync(path.join(OUT, e.file)).size, 0);

fs.writeFileSync(
  MANIFEST,
  `// AUTO-GENERATED by scripts/render-doc-pages.cjs. Do not edit by hand.
// ${entries.length} pages from ${pdfs.length} real CEJIL filings, ${(bytes / 1048576).toFixed(1)}MB in public/doc-pages.
export interface DocPageAsset {
  file: string;
  originalName: string;
  kind: "cover" | "body" | "signatures";
  page: number;
  width: number;
  height: number;
  aspect: "portrait" | "landscape" | "square";
}

export const DOC_PAGE_BASE = "doc-pages";

export const docPageAssets: DocPageAsset[] = ${JSON.stringify(entries, null, 2)};
`,
);

console.log(
  `${entries.length} pages from ${pdfs.length} filings → public/doc-pages (${(bytes / 1048576).toFixed(2)}MB)`,
);
