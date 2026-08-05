/* eslint-disable no-console */
/**
 * "Best Artworks of All Time" sampler — a CAPPED second corpus, for IMAGES.
 *
 * WHY: every dataset we have is documents. CEJIL gives us PDFs and page text;
 * nothing exercises the Library's thumbnail card with real pictures, and real
 * paintings come in portrait, landscape and square — aspect ratios the card has
 * never been laid out against. This samples a public Uwazi instance
 * (https://best-artworks.uwazi.io, 8,498 entities, templates Artist + Artwork)
 * for a bounded set of artworks plus the artists they point at.
 *
 * It is deliberately NOT part of data/cejil: separate namespace
 * (src/data/artworks), separate image directory (public/artwork-images).
 *
 * COURTESY — this is someone's live server. Serial, delayed between every
 * request, capped by artwork count AND by bytes, skips anything already on
 * disk, aborts on 429/5xx rather than pressing on. The same rules as
 * recover-cejil-docs.cjs, for the same reason.
 *
 *   node app/scripts/sample-artworks.cjs
 *   ARTWORKS_LIMIT=10 ARTWORKS_DELAY_MS=2000 node app/scripts/sample-artworks.cjs
 *
 * Env:
 *   ARTWORKS_LIMIT      artworks to sample (default 60) — THE CAP
 *   ARTWORKS_DELAY_MS   pause between requests (default 1200)
 *   ARTWORKS_BUDGET_MB  ceiling on downloaded image bytes (default 12)
 *   ARTWORKS_PER_ARTIST max artworks from any one artist (default 3)
 *
 * TWO TRAPS, both handled here:
 *  1. `/api/attachments/download?...` answers 301. Node's fetch follows
 *     redirects by default, but a client that doesn't gets an ~87-byte text
 *     body instead of a JPEG, which then "succeeds" and writes garbage. Every
 *     download is checked for the JPEG magic (FF D8 FF) before it is kept.
 *  2. Intrinsic dimensions aren't in the API. They are parsed out of the JPEG's
 *     own SOF marker here, so the seed carries REAL width/height — the whole
 *     point being to test the card against aspect ratios it hasn't seen.
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO, "src/data/artworks");
const IMG_DIR = path.join(REPO, "public/artwork-images");
const HOST = "https://best-artworks.uwazi.io";
const LIMIT = Number(process.env.ARTWORKS_LIMIT || 60);
const DELAY_MS = Number(process.env.ARTWORKS_DELAY_MS || 1200);
const BUDGET = Number(process.env.ARTWORKS_BUDGET_MB || 12) * 1024 * 1024;
const UA = "uwazi-design-prototype/1.0 (capped sampling pilot)";
const ARTWORK_TPL = "5f7813b8090de615c47b7683";
// The API returns entities grouped by artist, so a straight read of the first
// LIMIT rows is a handful of painters over and over — useless for a corpus whose
// entire purpose is VARIETY. Cap the run of any one artist and keep paging.
const PER_ARTIST = Number(process.env.ARTWORKS_PER_ARTIST || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class BackOff extends Error {}

async function get(url, as) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (res.status === 429 || res.status >= 500) throw new BackOff(`${res.status} from ${url}`);
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, body: as === "buffer" ? Buffer.from(await res.arrayBuffer()) : await res.json() };
}

/** Width/height straight out of the JPEG's SOF segment — no image library.
 *  Returns null for anything that isn't a JPEG we can read. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const marker = buf[off + 1];
    // SOF0-3, SOF5-7, SOF9-11, SOF13-15 carry the frame header. C4/C8/CC are
    // Huffman/JPG-extension/arithmetic tables, not frames.
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const len = buf.readUInt16BE(off + 2);
    if (isSOF) return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
    off += 2 + len;
  }
  return null;
}

const aspectOf = (w, h) => {
  const r = w / h;
  if (r > 1.05) return "landscape";
  if (r < 0.95) return "portrait";
  return "square";
};

const first = (m, key) => (m?.[key]?.[0]?.value ?? null);
/** A `link` property's value is `{label, url}`, not a string — reading it with
 *  `first()` puts an object where the seed's type says string, which only shows
 *  up at tsc time. */
const linkOf = (m, key) => {
  const v = m?.[key]?.[0]?.value;
  return typeof v === "string" ? v : (v?.url ?? null);
};
const labels = (m, key) => (m?.[key] ?? []).map((v) => v.label ?? String(v.value)).filter(Boolean);
const esc = (s) => JSON.stringify(s ?? null);

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const artworks = [];
  const artistIds = new Set();
  const perArtist = new Map();
  let spent = 0;
  let requests = 0;
  let skipped = 0;

  try {
    // ── page through /api/search until we have LIMIT usable artworks ────────
    //
    // Paging is `from`, NOT `page`/`offset` — both of those answer 400 on this
    // instance. Checked against the live API rather than assumed from the
    // shape of other Uwazi endpoints.
    const PAGE = 30;
    let from = 0;
    while (artworks.length < LIMIT && from < 1200) {
      if (requests) await sleep(DELAY_MS);
      requests++;
      const res = await get(`${HOST}/api/search?limit=${PAGE}&from=${from}`);
      from += PAGE;
      if (!res.ok) { console.warn(`  search from=${from - PAGE}: ${res.status}`); skipped++; continue; }
      const rows = res.body.rows || [];
      if (!rows.length) break;

      for (const r of rows) {
        if (artworks.length >= LIMIT || spent >= BUDGET) break;
        if (String(r.template) !== ARTWORK_TPL) continue;
        const url = first(r.metadata, "image");
        const att = (r.attachments || [])[0];
        if (!url || !att?.filename) continue;
        const byArtist = first(r.metadata, "artist");
        const seenForArtist = perArtist.get(String(byArtist)) || 0;
        if (byArtist && seenForArtist >= PER_ARTIST) continue;

        const dest = path.join(IMG_DIR, att.filename);
        let buf;
        if (fs.existsSync(dest)) {
          buf = fs.readFileSync(dest);
        } else {
          await sleep(DELAY_MS);
          requests++;
          const img = await get(`${HOST}${url}`, "buffer");
          if (!img.ok) { console.warn(`  ${att.filename}: ${img.status}`); skipped++; continue; }
          buf = img.body;
          // Trap 1: an unfollowed 301 yields a tiny text body that is not a JPEG.
          if (buf.length < 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) {
            console.warn(`  ${att.filename}: not a JPEG (${buf.length}B) — redirect not followed?`);
            skipped++;
            continue;
          }
          if (spent + buf.length > BUDGET) {
            console.log(`  budget ${(BUDGET / 1048576).toFixed(0)}MB reached — stopping`);
            spent = BUDGET;
            break;
          }
          fs.writeFileSync(dest, buf);
        }

        const dim = jpegSize(buf);
        if (!dim) { console.warn(`  ${att.filename}: unreadable dimensions`); skipped++; continue; }
        spent += buf.length;

        const artistId = first(r.metadata, "artist");
        if (artistId) {
          artistIds.add(String(artistId));
          perArtist.set(String(artistId), seenForArtist + 1);
        }
        artworks.push({
          id: r.sharedId,
          title: r.title,
          artistId: artistId ? String(artistId) : null,
          artistName: (r.metadata?.artist?.[0]?.label) ?? null,
          genres: labels(r.metadata, "genres"),
          nationalities: labels(r.metadata, "nationalities"),
          datasetNumber: first(r.metadata, "dataset_number"),
          image: {
            file: att.filename,
            originalName: att.originalname ?? att.filename,
            bytes: buf.length,
            width: dim.width,
            height: dim.height,
            aspect: aspectOf(dim.width, dim.height),
          },
        });
        console.log(
          `  [${artworks.length}/${LIMIT}] ${r.title} — ${dim.width}×${dim.height} ${aspectOf(dim.width, dim.height)} ${(buf.length / 1024).toFixed(0)}KB`,
        );
      }
    }

    // ── the artists those artworks point at ────────────────────────────────
    var artists = [];
    for (const sid of artistIds) {
      await sleep(DELAY_MS);
      requests++;
      const res = await get(`${HOST}/api/entities?sharedId=${encodeURIComponent(sid)}`);
      if (!res.ok) { skipped++; continue; }
      const row = (res.body.rows || [])[0];
      if (!row) { skipped++; continue; }
      artists.push({
        id: row.sharedId,
        name: row.title,
        bornYear: first(row.metadata, "year_of_birth"),
        diedYear: first(row.metadata, "year_of_death"),
        genres: labels(row.metadata, "genres"),
        nationalities: labels(row.metadata, "nationalities"),
        wikipedia: linkOf(row.metadata, "wikipedia"),
        paintings: first(row.metadata, "number_of_paintings"),
      });
    }
  } catch (e) {
    if (!(e instanceof BackOff)) throw e;
    console.warn(`\nBACKING OFF: ${e.message} — keeping what was sampled.`);
    if (typeof artists === "undefined") artists = [];
  }

  if (!artworks.length) { console.log("Nothing sampled."); return; }

  // ── emit the seed ───────────────────────────────────────────────────────
  const banner =
    "// AUTO-GENERATED by scripts/sample-artworks.cjs from https://best-artworks.uwazi.io\n" +
    "// (public Uwazi instance, CC-licensed 'Best Artworks of All Time' dataset).\n" +
    "// A CAPPED sample for exercising image cards against real aspect ratios.\n" +
    "// Do not edit by hand — re-run the script.\n";

  fs.writeFileSync(
    path.join(OUT_DIR, "types.ts"),
    banner +
      `
/** Intrinsic geometry of a sampled painting, read from the JPEG itself. */
export interface ArtworkImage {
  /** File under public/artwork-images. */
  file: string;
  originalName: string;
  bytes: number;
  width: number;
  height: number;
  /** Derived from the real dimensions — the reason this corpus exists. */
  aspect: "portrait" | "landscape" | "square";
}

export interface Artwork {
  id: string;
  title: string;
  artistId: string | null;
  artistName: string | null;
  genres: string[];
  nationalities: string[];
  datasetNumber: number | null;
  image: ArtworkImage;
}

export interface ArtworkArtist {
  id: string;
  name: string;
  bornYear: number | null;
  diedYear: number | null;
  genres: string[];
  nationalities: string[];
  wikipedia: string | null;
  paintings: number | null;
}
`,
  );

  const byAspect = artworks.reduce((a, w) => ((a[w.image.aspect] = (a[w.image.aspect] || 0) + 1), a), {});
  const totalBytes = artworks.reduce((a, w) => a + w.image.bytes, 0);

  fs.writeFileSync(
    path.join(OUT_DIR, "artworks.ts"),
    banner +
      `import type { Artwork, ArtworkArtist } from "./types";\n\n` +
      `/** Public path prefix for the sampled images. */\n` +
      `export const ARTWORK_IMAGE_BASE = "/artwork-images";\n\n` +
      `export const artworks: Artwork[] = ${JSON.stringify(artworks, null, 1)};\n\n` +
      `export const artworkArtists: ArtworkArtist[] = ${JSON.stringify(artists, null, 1)};\n\n` +
      `/** Shape of the sample, so a consumer can assert coverage rather than hope. */\n` +
      `export const artworkStats = ${JSON.stringify(
        {
          artworks: artworks.length,
          artists: artists.length,
          byAspect,
          imageBytes: totalBytes,
          widest: Math.max(...artworks.map((w) => w.image.width / w.image.height)),
          tallest: Math.min(...artworks.map((w) => w.image.width / w.image.height)),
        },
        null,
        1,
      )} as const;\n`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, "index.ts"),
    banner + `export * from "./types";\nexport * from "./artworks";\n`,
  );

  const mb = (b) => (b / 1048576).toFixed(2);
  const sizes = artworks.map((w) => w.image.bytes).sort((a, b) => a - b);
  console.log(`\nSampled ${artworks.length} artworks + ${artists.length} artists · ${requests} requests · ${skipped} skipped`);
  console.log("ASPECT MIX:", JSON.stringify(byAspect));
  console.log(`IMAGE BYTES: total ${mb(totalBytes)}MB · mean ${(totalBytes / artworks.length / 1024).toFixed(0)}KB · median ${(sizes[Math.floor(sizes.length / 2)] / 1024).toFixed(0)}KB · max ${(sizes[sizes.length - 1] / 1024).toFixed(0)}KB`);
  console.log(`SEED: ${(fs.statSync(path.join(OUT_DIR, "artworks.ts")).size / 1024).toFixed(0)}KB of TS`);
}

main().catch((e) => { console.error(e); process.exit(1); });
