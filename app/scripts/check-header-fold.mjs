import { chromium } from "playwright";
/** Header fold check: the Library masthead and the entity header (MainTabs, DocMeta)
 *  at six widths, drawer default and dragged wide, query on and off, LTR and RTL.
 *  Fails on overlapping controls, a control outside its host, a search input under
 *  88px, horizontal page scroll, or a control that moves when a query is typed.
 *  Usage: PORT=1431 node scripts/check-header-fold.mjs <screenshot-dir> [tag] [widths] */
const BASE = `http://localhost:${process.env.PORT || 5173}/`;
const out = process.argv[2], tag = process.argv[3] || "after";
const widths = (process.argv[4] || "1440,1024,900,768,600,390").split(",").map(Number);
const b = await chromium.launch();
let fails = 0;
const probe = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return { missing: true };
  const rr = root.getBoundingClientRect();
  const cs = getComputedStyle(root);
  const inner = { l: rr.left + parseFloat(cs.paddingLeft), r: rr.right - parseFloat(cs.paddingRight) };
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !e.closest('[aria-hidden="true"],[data-part="probe"]'); };
  const leaves = [...root.querySelectorAll('button,input,[data-part="readout"],[role="tab"]')].filter(vis).filter((e) => !e.parentElement.closest('button,[role="tab"]'));
  const name = (e) => (e.getAttribute("aria-label") || e.dataset.part || e.textContent || e.tagName).trim().slice(0, 24);
  const issues = [];
  const rects = leaves.map((e) => ({ e, r: e.getBoundingClientRect(), n: name(e) }));
  for (const a of rects) {
    if (a.r.left < inner.l - 1 || a.r.right > inner.r + 1) issues.push(`outside host: ${a.n} [${Math.round(a.r.left)}..${Math.round(a.r.right)}] host [${Math.round(inner.l)}..${Math.round(inner.r)}]`);
    for (const c of rects) if (a !== c && !a.e.contains(c.e) && !c.e.contains(a.e)) {
      const ox = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), oy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
      if (ox > 1 && oy > 1 && a.n < c.n) issues.push(`overlap: ${a.n} × ${c.n} (${Math.round(ox)}×${Math.round(oy)})`);
    }
  }
  const input = root.querySelector("input");
  if (input && vis(input)) { const w = input.getBoundingClientRect().width; if (w < 88) issues.push(`input ${Math.round(w)}px wide`); }
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("page scrolls horizontally");
  return { h: Math.round(rr.height), xs: rects.filter((x) => x.e.tagName !== "INPUT" && x.e.dataset.part !== "readout" && !/Clear/.test(x.n)).map((x) => `${x.n}@${Math.round(x.r.left)}`).join(" "), tier: root.dataset.tier, issues };
};
for (const dir of ["ltr", "rtl"]) for (const w of widths) for (const drawer of w >= 768 ? ["default", "wide"] : ["none"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.waitForTimeout(1300);
  await p.evaluate((d) => (document.documentElement.dir = d), dir);
  if (drawer === "wide") { const h = p.locator('[aria-label="Resize panel"]').first(); const bb = await h.boundingBox(); if (bb) { await p.mouse.move(bb.x + bb.width / 2, bb.y + 200); await p.mouse.down(); await p.mouse.move(dir === "rtl" ? w - 40 : 40, bb.y + 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300); } }
  const label = `${dir} ${w} drawer=${drawer}`;
  const report = (what, r) => { if (r.missing) { console.log(label, what, "MISSING"); fails++; return; } if (r.issues.length) { fails += r.issues.length; console.log(label, what, `tier=${r.tier ?? "-"}`, "\n   " + r.issues.join("\n   ")); } };
  const off = await p.evaluate(probe, '[data-part="masthead"]'); report("library", off);
  await p.locator('input[aria-label="Search entities"]').fill("velasquez rodriguez"); await p.waitForTimeout(1600);
  await p.mouse.click(w / 2, 600); await p.waitForTimeout(300);
  const on = await p.evaluate(probe, '[data-part="masthead"]'); report("library+query", on);
  const norm = (s) => s.replace(/Cards|Results/g, "V").replace(/Date added|Relevance/g, "S");
  if (!off.missing && !on.missing && (off.h !== on.h || norm(off.xs) !== norm(on.xs))) { fails++; console.log(label, "SHIFT on query:", off.h, "→", on.h, "\n   ", off.xs, "\n   ", on.xs); }
  if (dir === "ltr" || w === 1024 || w === 390) await p.screenshot({ path: `${out}/${tag}-lib-${dir}-${w}-${drawer}.png`, clip: { x: 0, y: 0, width: w, height: 240 } });
  // entity
  await p.locator('[aria-label="Clear search text"]').click().catch(() => {});
  await p.goto(BASE); await p.waitForTimeout(1200);
  await p.evaluate((d) => (document.documentElement.dir = d), dir);
  const open = p.getByRole("button", { name: "Open", exact: true }).first();
  if (w < 768) { await p.locator("li button").first().click().catch(() => {}); await p.waitForTimeout(800); }
  const target = (await open.count()) ? open : p.getByRole("button", { name: /View entity/ }).first();
  await target.click({ timeout: 3000 }).catch(() => console.log(label, "could not open entity"));
  await p.waitForTimeout(1800);
  for (const sel of ['[data-component="MainTabs"]', '[data-component="DocMeta"]']) report("entity " + sel, await p.evaluate(probe, sel));
  await p.screenshot({ path: `${out}/${tag}-ent-${dir}-${w}-${drawer}.png`, clip: { x: 0, y: 0, width: w, height: 240 } });
  await ctx.close();
}
await b.close();
console.log("FAILS", fails);
process.exitCode = fails ? 1 : 0;
