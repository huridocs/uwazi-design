/* eslint-disable no-console */
/**
 * CEJIL real-document recovery — CAPPED PILOT.
 *
 * WHAT IS BROKEN
 * `public/cejil-data/files.json` was rewritten after the import: all 5,245 file
 * records point at just 6 local PDFs (6 distinct `filename`s for 5,245 distinct
 * `_id`s, and 4,583 NON-primary records carry a url, which `import-cejil.cjs`
 * never sets). The true filenames were discarded. The visible symptom is that
 * hundreds of unrelated cases quote the same page of the same judgment — see
 * `BorrowedDocLine` / CLAUDE.md for how the UI currently owns up to it.
 *
 * WHAT IS RECOVERABLE
 * The file `_id`s survived, and they are the public instance's own ids:
 *   GET /api/entities?sharedId=<sid> → rows[].documents[] with the REAL
 *   `filename`, `totalPages` and `toc` per `_id`.
 * So `_id` — not filename, not url, both of which are 1-of-6 here — is the join
 * key, and it is what this script re-keys `fullText` by.
 *
 * COURTESY — READ BEFORE RAISING THE CAP
 * summa.cejil.org is a third party's PRODUCTION server. This script fetches
 * SERIALLY with a delay between every request, caps how many entities it will
 * touch, skips anything already on disk, and ABORTS the whole run on a 429 or a
 * 5xx rather than pressing on. Do not parallelise it. Do not remove the cap to
 * "just do the corpus" — that is 5,191 documents off someone's live site.
 *
 *   node app/scripts/recover-cejil-docs.cjs
 *   CEJIL_RECOVER_LIMIT=5 CEJIL_RECOVER_DELAY_MS=2000 node app/scripts/…
 *
 * Env:
 *   CEJIL_RECOVER_LIMIT     entities to recover (default 50) — THE CAP
 *   CEJIL_RECOVER_DELAY_MS  pause between requests (default 1200)
 *
 * Writes: public/cejil-docs/<real>.pdf, and in place —
 *   files.json  only the recovered records (filename, url, totalPages, toc)
 *   fullText.json  new entries keyed by file `_id`; the 6 legacy filename-keyed
 *                  entries are LEFT ALONE, because the 5,195 records this pilot
 *                  doesn't touch still resolve through them (see profile.ts).
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO, "public/cejil-data");
const PDF_DIR = path.join(REPO, "public/cejil-docs");
const API = "https://summa.cejil.org/api";
const LIMIT = Number(process.env.CEJIL_RECOVER_LIMIT || 50);
const DELAY_MS = Number(process.env.CEJIL_RECOVER_DELAY_MS || 1200);
/** Hard ceiling on what recovery may ADD to the repo, PDF + text together.
 *  Measured: a document costs ~1MB (733KB pdf + 283KB text), so the full 5,245
 *  records would be ~5.2GB and the ~100MB the corpus is budgeted for buys ~100
 *  documents. This is the knob that keeps a "just run it" from spending all of
 *  it — the entity cap alone doesn't bound bytes, because document size varies
 *  40× (28KB to 1.3MB). */
const BUDGET_MB = Number(process.env.CEJIL_RECOVER_BUDGET_MB || 20);
const UA = "uwazi-design-prototype/1.0 (capped document-recovery pilot)";
const STANDARD_FONTS = `${path.join(REPO, "node_modules/pdfjs-dist/standard_fonts")}${path.sep}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, n), "utf8"));
const writeJson = (n, d) => fs.writeFileSync(path.join(DATA_DIR, n), JSON.stringify(d));

/** Abort the run rather than keep knocking when the server pushes back. */
class BackOff extends Error {}

async function get(url, as) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    throw new BackOff(`${res.status} from ${url} — stopping, not retrying`);
  }
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, body: as === "buffer" ? Buffer.from(await res.arrayBuffer()) : await res.json() };
}

/** Per-page plain text, extracted locally with the pdfjs that ships for react-pdf.
 *  `hasEOL` is pdfjs's own line break, so paragraphs survive for `reflow()`. */
async function extractPages(pdfjs, buf) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: false,
    isEvalSupported: false,
    // Node has no fetch base for pdfjs's bundled metrics; without this every
    // page logs a fetchStandardFontData warning. Text extraction doesn't need
    // the glyphs, but the noise buries the actual progress.
    standardFontDataUrl: STANDARD_FONTS,
  }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => (typeof it.str === "string" ? it.str + (it.hasEOL ? "\n" : "") : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    pages.push(text);
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const entities = readJson("entities.json");
  const files = readJson("files.json");
  const fullText = readJson("fullText.json");

  // Our PDF records, grouped by the entity that owns them. `_id` is the join
  // key with the public instance; `filename`/`url` in here are the corrupted
  // 1-of-6 values and are deliberately NOT used to match anything.
  const pdfsByEntity = new Map();
  for (const f of files) {
    if (!f.isPdf) continue;
    if (!pdfsByEntity.has(f.entity)) pdfsByEntity.set(f.entity, []);
    pdfsByEntity.get(f.entity).push(f);
  }

  // Pilot set: real sharedIds from entities.json that own a PDF record.
  // `primary` first (those are the documents the app features), then stable by
  // sharedId so a re-run with the same cap touches the same entities.
  const titleBySid = new Map();
  for (const e of entities) if (e.language === "es") titleBySid.set(e.sharedId, e.title);
  const candidates = [...new Set(entities.map((e) => e.sharedId))]
    .filter((sid) => pdfsByEntity.has(sid))
    .sort((a, b) => {
      const pa = pdfsByEntity.get(a).some((f) => f.primary) ? 0 : 1;
      const pb = pdfsByEntity.get(b).some((f) => f.primary) ? 0 : 1;
      return pa - pb || (a < b ? -1 : a > b ? 1 : 0);
    })
    .slice(0, LIMIT);

  console.log(`Pilot: ${candidates.length} entities (cap ${LIMIT}), ${DELAY_MS}ms between requests`);
  fs.mkdirSync(PDF_DIR, { recursive: true });

  const recovered = []; // {sid, title, fileId, filename, pages, textBytes, pdfBytes}
  let requests = 0;
  let skipped = 0;
  let spent = 0;
  const BUDGET = BUDGET_MB * 1024 * 1024;

  try {
    for (const [n, sid] of candidates.entries()) {
      if (spent >= BUDGET) {
        console.log(`Budget of ${BUDGET_MB}MB reached — stopping at ${n}/${candidates.length} entities.`);
        break;
      }
      if (requests) await sleep(DELAY_MS);
      requests++;
      const meta = await get(`${API}/entities?sharedId=${encodeURIComponent(sid)}`);
      if (!meta.ok) {
        console.warn(`  ${sid} — entity ${meta.status}, skipped`);
        skipped++;
        continue;
      }
      // Every language row lists the same documents; index by _id across rows.
      const real = new Map();
      for (const row of meta.body.rows || []) {
        for (const d of row.documents || []) if (d._id && d.filename) real.set(String(d._id), d);
      }

      for (const rec of pdfsByEntity.get(sid)) {
        const d = real.get(String(rec._id));
        if (!d) continue; // not on the public instance any more — leave the record alone
        const dest = path.join(PDF_DIR, d.filename);

        if (!fs.existsSync(dest)) {
          await sleep(DELAY_MS);
          requests++;
          const pdf = await get(`${API}/files/${encodeURIComponent(d.filename)}`, "buffer");
          if (!pdf.ok) {
            console.warn(`  ${sid} ${d.filename} — file ${pdf.status}, skipped`);
            skipped++;
            continue;
          }
          if (pdf.body.subarray(0, 4).toString() !== "%PDF") {
            console.warn(`  ${sid} ${d.filename} — not a PDF, skipped`);
            skipped++;
            continue;
          }
          fs.writeFileSync(dest, pdf.body);
        }

        const buf = fs.readFileSync(dest);
        let pages;
        try {
          pages = await extractPages(pdfjs, buf);
        } catch (e) {
          console.warn(`  ${sid} ${d.filename} — extraction failed (${e.message}), skipped`);
          skipped++;
          continue;
        }

        const textBytes = Buffer.byteLength(JSON.stringify(pages));
        if (spent + buf.length + textBytes > BUDGET) {
          console.log(`  skipping ${d.filename} — ${((buf.length + textBytes) / 1024 / 1024).toFixed(1)}MB would exceed the ${BUDGET_MB}MB budget`);
          // The PDF is on disk but unreferenced; leave the record pointing at
          // its stand-in rather than half-recover it.
          skipped++;
          continue;
        }
        spent += buf.length + textBytes;

        // fullText keyed by file _id — the only identifier this corpus keeps
        // distinct per document.
        fullText[rec._id] = pages;
        rec.filename = d.filename;
        rec.url = `/cejil-docs/${d.filename}`;
        rec.totalPages = d.totalPages || pages.length || null;
        if (d.toc && d.toc.length) {
          rec.toc = d.toc.map((t) => ({
            label: t.label,
            indentation: t.indentation || 0,
            range: t.range,
          }));
        }

        recovered.push({
          sid,
          title: titleBySid.get(sid) || sid,
          fileId: rec._id,
          filename: d.filename,
          pages: pages.length,
          textBytes,
          pdfBytes: buf.length,
        });
        console.log(
          `  [${n + 1}/${candidates.length}] ${d.filename} ← ${sid} · ${pages.length}p · ` +
            `${(buf.length / 1024).toFixed(0)}KB pdf`,
        );
      }
    }
  } catch (e) {
    if (!(e instanceof BackOff)) throw e;
    console.warn(`\nBACKING OFF: ${e.message}`);
    console.warn("Keeping what was recovered so far; re-run later to continue.");
  }

  if (!recovered.length) {
    console.log("Nothing recovered — files.json and fullText.json left untouched.");
    return;
  }

  writeJson("files.json", files);
  writeJson("fullText.json", fullText);

  // ── measured cost, for sizing the full corpus against the ~100MB budget ──
  const sum = (k) => recovered.reduce((a, r) => a + r[k], 0);
  const median = (k) => {
    const v = recovered.map((r) => r[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const docs = recovered.length;
  const CORPUS_DOCS = new Set(files.filter((f) => f.isPdf).map((f) => f._id)).size;
  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log(`\nRecovered ${docs} documents across ${new Set(recovered.map((r) => r.sid)).size} entities · ${requests} requests · ${skipped} skipped`);
  console.log("MEASURED PER DOCUMENT");
  console.log(`  pages   mean ${(sum("pages") / docs).toFixed(1)}  median ${median("pages")}`);
  console.log(`  pdf     mean ${(sum("pdfBytes") / docs / 1024).toFixed(0)}KB  median ${(median("pdfBytes") / 1024).toFixed(0)}KB  total ${mb(sum("pdfBytes"))}MB`);
  console.log(`  text    mean ${(sum("textBytes") / docs / 1024).toFixed(0)}KB  median ${(median("textBytes") / 1024).toFixed(0)}KB  total ${mb(sum("textBytes"))}MB`);
  console.log(`PROJECTED over all ${CORPUS_DOCS.toLocaleString()} PDF records`);
  console.log(`  pdf   ${mb((sum("pdfBytes") / docs) * CORPUS_DOCS)}MB`);
  console.log(`  text  ${mb((sum("textBytes") / docs) * CORPUS_DOCS)}MB`);
  console.log(`  both  ${mb(((sum("pdfBytes") + sum("textBytes")) / docs) * CORPUS_DOCS)}MB`);
  console.log("\nPilot entities (verify two of these show different passages):");
  for (const r of recovered.slice(0, 8)) console.log(`  ${r.title} → ${r.filename}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
