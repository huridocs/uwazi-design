import { corpus, expectCard, basis, fmtDay } from "./expect.mjs";
import { scrapeCard } from "./scrape.mjs";

const LBL = { shows: "depicts", "held office at": "held_office", "response by": "responded_by", "positioned by": "geolocated_by" };
const nb = (s) => s.replace(/ /g, " ");

export async function expandAll(p) {
  const b = p.getByRole("button", { name: "Expand all" }).first();
  if ((await b.count()) && (await b.isEnabled())) { await b.click(); await p.waitForTimeout(700); }
}

async function closeAndCheckFocus(p, b, out, i, label) {
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  const gone = (await p.locator('[data-component="RefEvidenceCard"]').count()) === 0;
  const focused = await b.evaluate((el) => document.activeElement === el);
  if (!gone || !focused) out.focusFail.push({ i, label, gone, focused });
}

/** Open every evidence button in `scope`; compare each card with the JSON.
 *  aggregate: a tree leaf, expected from every reference of (target, type). */
export async function compareAll(p, corp, entityTitle, { scope = p, max = 400, esc = true, aggregate = false } = {}) {
  const C = corpus(corp);
  const ids = (C.byTitle.get(entityTitle) ?? []).map((e) => e.sharedId);
  const focusedId = ids.find((id) => C.refs.some((r) => r.from === id || r.to === id)) ?? ids[0];
  const shownDoc = C.byId.get(focusedId)?.docs?.[0];
  const btns = scope.locator('[data-component="EvidenceStatus"]');
  const n = Math.min(await btns.count(), max);
  const out = { focusedId, n, mismatches: [], checked: 0, focusFail: [], rows: [] };
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    await b.scrollIntoViewIfNeeded();
    const label = await b.getAttribute("aria-label");
    await b.click();
    await p.waitForSelector('[data-component="RefEvidenceCard"]', { timeout: 4000 });
    const got = await scrapeCard(p);
    const lines = got.text.split("\n").map((s) => s.trim()).filter(Boolean);
    const subtitle = lines[1] ?? "";
    const lab = subtitle.split(" · ")[0];
    const target = subtitle.includes(" · ") ? subtitle.split(" · ").slice(1).join(" · ") : subtitle;
    const cands = C.refs.filter((r) => (r.from === focusedId || r.to === focusedId) && C.byId.get(r.from === focusedId ? r.to : r.from)?.title === target);
    const typeIs = (r) => r.type.replace(/_/g, " ") === lab || r.type === LBL[lab];
    const stWant = /Disputed/.test(label) ? "disputed" : /Single source/.test(label) ? "single-source" : /Confirmed/.test(label) ? "confirmed" : null;
    const noteEq = (r) => JSON.stringify(got.notes) === JSON.stringify(r.note ? [r.note] : []);
    const stOk = (r) => !stWant || r.verification === stWant;
    let use;
    if (aggregate) {
      const grp = cands.filter(typeIs);
      if (!grp.length) console.log("   UNMAPPED label", lab, "target", target.slice(0, 40));
      use = grp.length ? grp : cands;
    } else {
      const gotTitles = got.sources.map((s) => s.title).sort().join("|");
      const same = cands.filter((r) => (r.sources ?? []).map((s) => C.byId.get(s).title).sort().join("|") === gotTitles);
      const ref = same.find((r) => noteEq(r) && stOk(r) && typeIs(r)) ?? same.find((r) => noteEq(r) && stOk(r)) ?? same.find((r) => typeIs(r) && stOk(r)) ?? same.find(stOk) ?? same[0];
      use = ref ? [ref] : [];
    }
    const row = { label, subtitle, refs: use.length, matched: use.length > 0 };
    if (!use.length) {
      out.mismatches.push({ label, subtitle, why: "no reference with this source set", cands: cands.length });
    } else {
      const ex = expectCard(C, use, shownDoc);
      const bad = [];
      if (got.facts !== ex.factsLine) bad.push(`facts: got "${got.facts}" want "${ex.factsLine}"`);
      if (ex.statuses.length === 1) {
        const st = nb(basis(ex.statuses[0], ex.ind));
        if (got.statusPs[0] !== st) bad.push(`basis: got ${JSON.stringify(got.statusPs[0])} want "${st}"`);
      } else if (got.statusPs.some((x) => /^(Confirmed:|Single source:|Recorded as)/.test(x))) {
        bad.push(`basis printed for ${ex.statuses.length} statuses`);
      }
      if (JSON.stringify(got.notes) !== JSON.stringify(ex.notes)) bad.push(`notes: got ${JSON.stringify(got.notes)} want ${JSON.stringify(ex.notes)}`);
      if (got.sources.length !== ex.sources.length) bad.push(`sources count ${got.sources.length} vs ${ex.sources.length}`);
      ex.sources.forEach((s, k) => {
        const gs = got.sources[k];
        if (!gs) return;
        const wantPub = `${s.pub ?? s.title}${s.ptype ? " · " + s.ptype : ""}`;
        if (gs.publisherLine !== wantPub) bad.push(`src${k} publisher: got "${gs.publisherLine}" want "${wantPub}"`);
        const wantDate = s.published !== undefined ? fmtDay(s.published, s.prec ?? "day") : s.accessed !== undefined ? `Read ${fmtDay(s.accessed)}, no publication date` : "";
        if (gs.date !== wantDate) bad.push(`src${k} date: got "${gs.date}" want "${wantDate}"`);
        if (gs.title !== s.title) bad.push(`src${k} title: got "${gs.title}" want "${s.title}"`);
        if ((gs.href ?? null) !== (s.url ?? null)) bad.push(`src${k} href: got ${gs.href} want ${s.url}`);
        if (gs.href && (gs.target !== "_blank" || !/noopener/.test(gs.rel ?? ""))) bad.push(`src${k} link not new-tab/noopener: ${gs.target} ${gs.rel}`);
        const copyOf = s.syn && s.syn.toLowerCase() !== (s.pub ?? "").toLowerCase() ? `Syndication: ${s.syn}` : "";
        if (gs.synd !== copyOf) bad.push(`src${k} syndication: got "${gs.synd}" want "${copyOf}"`);
        const wq = (ex.quotesBy.get(s.id) ?? []).map((q) => `${q.text}|${q.page ? "p." + q.page : ""}`);
        const gq = gs.quotes.map((q) => `${q.text}|${q.page}`);
        if (JSON.stringify(gq) !== JSON.stringify(wq)) bad.push(`src${k} quotes: got ${JSON.stringify(gq)} want ${JSON.stringify(wq)}`);
      });
      const wl = ex.loose.map((q) => `${q.text}|${q.page ? "p." + q.page : ""}`);
      const gl = got.loose.filter((l) => l.quote).map((l) => `${l.quote}|${l.page}`);
      if (JSON.stringify(gl) !== JSON.stringify(wl)) bad.push(`loose quotes: got ${JSON.stringify(gl)} want ${JSON.stringify(wl)}`);
      if (ex.hasAnchor !== got.loose.some((l) => l.time)) bad.push(`anchor tag: want ${ex.hasAnchor}`);
      row.bad = bad;
      if (bad.length) out.mismatches.push({ label, subtitle, refs: use.length, bad });
    }
    out.rows.push(row);
    out.checked++;
    if (esc) await closeAndCheckFocus(p, b, out, i, label);
    else await p.keyboard.press("Escape");
  }
  return out;
}
