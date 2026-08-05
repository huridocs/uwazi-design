/* Card-thumbnail regression check — every real PDF, no visible tab required.
 *
 *  Why it exists: a blank card is invisible to every check we had. pdf.js won't
 *  resolve a render while `document.hidden` is true, which is permanently the
 *  case in an automation tab, so "open the Library and look" cannot catch this
 *  class of bug — and the failure (white sheet) is pixel-identical to the
 *  placeholder shown when nothing rendered at all. The only way to tell "we drew
 *  a page" from "we drew nothing" is to count the ink.
 *
 *  It drives the SHIPPED `pdfThumb()` — imported from the dev server, not
 *  reimplemented — inside headless Chromium, where `document.hidden` is false
 *  and rAF fires. Node + node-canvas was tried first and rejected: pdf.js drops
 *  glyphs there without a DOM (`getPathGenerator … isn't resolved yet`), which
 *  reported 18 of 39 documents blank that render perfectly well in a browser. A
 *  check that lies is worse than no check.
 *
 *    npm run check:thumbs                    # the shipped path (whole page)
 *    node scripts/check-thumbs.ts --zoom 1.4 # a framed candidate
 *    node scripts/check-thumbs.ts --zoom 1.4 --pad 0.2
 *    node scripts/check-thumbs.ts --url http://localhost:5173
 *    node scripts/check-thumbs.ts --dump  # write the bitmaps out and look at them
 *
 *  Needs the dev server up. Exits non-zero if any document lands under MIN_INK. */

import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");

const args = process.argv.slice(2);

/** The card grid's real sheet box, measured in the running Library: a 281×94
 *  frame insets to a 189.3×96.7 sheet. Checking any other size would be checking
 *  something we don't ship. */
const WIDTH = 189;
// The sheet's height. Overridable because the card's preview slot is a design
// lever too: a taller slot shows more of a fitted page, which is a different
// treatment rather than a different number.
const HEIGHT = args.includes("--height") ? Number(args[args.indexOf("--height") + 1]) : 96;

// Whole-page is what SHIPS, so it is what a bare run checks. `--zoom` renders a
// framed candidate instead — treatments live in the check, not in the app, until
// one is picked.
const zoom = args.includes("--zoom") ? Number(args[args.indexOf("--zoom") + 1]) : 0;
const pad = args.includes("--pad") ? Number(args[args.indexOf("--pad") + 1]) : undefined;
const whole = !zoom;
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:1431";
// Bitmaps go to a temp dir, never into the repo — this is a look-at-it aid.
const dump = args.includes("--dump") || args.includes("--dump-to");
const dumpDir = args.includes("--dump-to")
  ? args[args.indexOf("--dump-to") + 1]
  : join(tmpdir(), "uwazi-thumbcheck");

const dirs = [
  ["public/cejil-docs", "/cejil-docs"],
  ["public/docs", "/docs"],
] as const;
const files = dirs.flatMap(([dir, base]) =>
  readdirSync(join(APP, dir))
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => `${base}/${encodeURIComponent(f)}`),
);

const browser = await chromium.launch();
// Retina, like the machines this ships to — `pdfThumb` reads devicePixelRatio.
const page = await browser.newPage({ deviceScaleFactor: 2 });
const res = await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => null);
if (!res?.ok()) {
  console.error(`No dev server at ${url} — start it (npm run dev) or pass --url.`);
  await browser.close();
  process.exit(2);
}

console.log(
  `${whole ? "fit-whole-page (shipped)" : `framed crop, zoom ${zoom}${pad !== undefined ? ` pad ${pad}` : ""}`}` +
    ` · ${files.length} documents · ${url}\n`,
);

const results = await page.evaluate(
  async ({ files, WIDTH, HEIGHT, zoom, pad, whole, dump }) => {
    const { pdfThumb } = await import("/src/utils/pdfThumb.ts");
    const { inkCoverage } = await import("/src/utils/thumbFrame.ts");
    /** Blank rows above the first ink in the FINAL bitmap, as a fraction of its
     *  height — the air over the masthead, which is the thing being judged. */
    const topAir = (px: Uint8ClampedArray, w: number, h: number) => {
      for (let y = 0; y < h; y++) {
        for (let x = Math.floor(w * 0.2); x < Math.ceil(w * 0.8); x++) {
          if (px[(y * w + x) * 4] < 160) return y / h;
        }
      }
      return 1;
    };
    const out: { file: string; ink: number; air?: number; err?: string; data?: string }[] = [];
    for (const f of files) {
      try {
        const data = await pdfThumb(
          f,
          WIDTH,
          whole ? undefined : { aspect: WIDTH / HEIGHT, zoom, pad },
        );
        if (!data) {
          out.push({ file: f, ink: 0, err: "render returned null" });
          continue;
        }
        const img = new Image();
        img.src = data;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        out.push({
          file: f,
          ink: inkCoverage(px, c.width, c.height),
          air: topAir(px, c.width, c.height),
          data: dump ? data : undefined,
        });
      } catch (e) {
        out.push({ file: f, ink: 0, err: String((e as Error).message).slice(0, 70) });
      }
    }
    return out;
  },
  { files, WIDTH, HEIGHT, zoom, pad, whole, dump },
);

if (dump) {
  mkdirSync(dumpDir, { recursive: true });
  for (const r of results) {
    if (!r.data) continue;
    writeFileSync(
      join(dumpDir, decodeURIComponent(basename(r.file)).replace(/\.pdf$/i, ".jpg")),
      Buffer.from(r.data.split(",")[1], "base64"),
    );
  }
  console.log(`bitmaps → ${dumpDir}\n`);
}

const { MIN_INK } = await import("../src/utils/thumbFrame.ts");
const blank = results.filter((r) => r.ink < MIN_INK);
for (const r of results) {
  const bad = r.ink < MIN_INK;
  console.log(
    `${bad ? "BLANK" : "  ok "}  ${decodeURIComponent(basename(r.file)).padEnd(52)}` +
      `ink=${(r.ink * 100).toFixed(2)}%  air=${r.air === undefined ? "  —" : (r.air * 100).toFixed(1).padStart(4)}%` +
      `${r.err ? `  (${r.err})` : ""}`,
  );
}
const airs = results.map((r) => r.air).filter((a): a is number => a !== undefined && a < 1).sort((a, b) => a - b);
if (airs.length) {
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  console.log(
    `\nair above the masthead — min ${pct(airs[0])} · median ${pct(airs[airs.length >> 1])} · max ${pct(airs[airs.length - 1])}`,
  );
}
console.log(`${blank.length} of ${results.length} below ${(MIN_INK * 100).toFixed(1)}% ink`);
if (blank.length) console.log(blank.map((b) => decodeURIComponent(basename(b.file))).join(", "));

await browser.close();
process.exit(blank.length ? 1 : 0);
