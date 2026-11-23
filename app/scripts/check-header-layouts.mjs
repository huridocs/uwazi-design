import { chromium } from "playwright";
import { readFileSync } from "node:fs";
/** Header layout check (Settings › Theme and branding): the four app bar
 *  layouts in light and dark at 1360 and 900 wide, plus the Library and an
 *  entity view under Two rows and Compact, RTL, the phone bar, Discard, and
 *  the theme file round trip. Fails on overlapping or clipped bar controls, a
 *  logo off the bar's centre in Centred, a Compact control under 32px, a bar
 *  whose height is not `--spacing-navbar`, content that does not start at
 *  the bar's bottom edge, horizontal page scroll, or an axe violation.
 *  Usage: PORT=1432 node scripts/check-header-layouts.mjs <screenshot-dir> */
const BASE = `http://localhost:${process.env.PORT || 5173}/`;
const out = process.argv[2];
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const LAYOUTS = ["standard", "centred", "two-rows", "compact"];
// PW_EXECUTABLE: a Chromium already on the machine, when this Playwright's own build is not installed.
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
let fails = 0;
const fail = (where, what) => { fails++; console.log(`FAIL ${where}: ${what}`); };

const open = async (width, theme, height = 800) => {
  const ctx = await b.newContext({ viewport: { width, height }, acceptDownloads: true });
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.waitForSelector('[data-component="Navbar"]');
  await p.waitForTimeout(900);
  return { ctx, p };
};
const openThemePage = async (p) => {
  await p.click('[data-part="settings-trigger"]');
  await p.getByText("System settings", { exact: true }).first().click();
  await p.locator('[data-component="SettingsNav"]').getByText("Theme and branding", { exact: true }).click();
  await p.waitForSelector('[data-part="header-layouts"]');
};
const choose = async (p, layout) => {
  await p.click(`[data-part="header-layouts"] [data-layout="${layout}"]`);
  await p.waitForTimeout(250);
};
const save = async (p) => { await p.getByRole("button", { name: "Save theme" }).click(); await p.waitForTimeout(300); };

const probe = (layout) => {
  const bar = document.querySelector('[data-component="Navbar"]');
  const br = bar.getBoundingClientRect();
  const issues = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; };
  const ctls = [...bar.querySelectorAll("button,a,[data-part='current-entity']")].filter(vis).filter((e) => !e.closest('[role="listbox"],[data-part$="-menu"],[inert],[role="dialog"],[aria-hidden="true"]'));
  const name = (e) => (e.getAttribute("aria-label") || e.dataset.part || e.textContent || e.tagName).trim().slice(0, 28);
  const rects = ctls.map((e) => ({ e, r: e.getBoundingClientRect(), n: name(e) }));
  for (const a of rects) {
    if (a.r.left < br.left + 11 || a.r.right > br.right - 11) issues.push(`outside the gutter: ${a.n} [${Math.round(a.r.left)}..${Math.round(a.r.right)}]`);
    if (a.r.top < br.top || a.r.bottom > br.bottom) issues.push(`outside the bar: ${a.n}`);
    for (const c of rects) if (a !== c && !a.e.contains(c.e) && !c.e.contains(a.e)) {
      const ox = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), oy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
      if (ox > 1 && oy > 1 && a.n < c.n) issues.push(`overlap: ${a.n} × ${c.n}`);
    }
    if (layout === "compact" && (a.r.height < 32 || a.r.width < 32)) issues.push(`under 32px: ${a.n} ${Math.round(a.r.width)}×${Math.round(a.r.height)}`);
  }
  const token = parseFloat(getComputedStyle(bar).getPropertyValue("--spacing-navbar")) || null;
  const probeEl = document.createElement("div"); probeEl.style.cssText = "position:absolute;height:var(--spacing-navbar)"; document.body.appendChild(probeEl);
  const tokenPx = probeEl.getBoundingClientRect().height; probeEl.remove();
  if (Math.abs(br.height - tokenPx) > 0.5) issues.push(`bar ${br.height}px, --spacing-navbar ${tokenPx}px`);
  if (bar.dataset.layout !== layout) issues.push(`draws ${bar.dataset.layout}`);
  if (layout === "centred") {
    const l = bar.querySelector('[data-part="logo"]').getBoundingClientRect();
    const off = (l.left + l.right) / 2 - (br.left + br.right) / 2;
    if (Math.abs(off) > 1) issues.push(`logo ${off.toFixed(1)}px off centre`);
  }
  // What follows the bar starts at its bottom edge.
  const next = [...bar.parentElement.children].filter((e) => e !== bar && vis(e) && getComputedStyle(e).position !== "fixed")[0];
  if (next && Math.abs(next.getBoundingClientRect().top - br.bottom) > 0.5) issues.push(`content starts at ${next.getBoundingClientRect().top}, bar ends at ${br.bottom}`);
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("page scrolls horizontally");
  if (document.documentElement.scrollHeight > innerHeight + 1) issues.push("page scrolls vertically");
  // Keyboard order follows the visual order (reading order per row).
  const rtl = document.documentElement.dir === "rtl" || getComputedStyle(bar).direction === "rtl";
  const rows = rects.map((x) => ({ n: x.n, row: Math.round((x.r.top + x.r.bottom) / 2 / 24), x: rtl ? -x.r.right : x.r.left }));
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], c = rows[i];
    if (c.row < a.row || (c.row === a.row && c.x < a.x - 1)) issues.push(`tab order: ${c.n} after ${a.n}`);
  }
  return { h: br.height, issues, order: rects.map((x) => x.n).join(" | ") };
};
const check = async (p, where, layout, { axe = true, scope = null } = {}) => {
  const r = await p.evaluate(probe, layout);
  for (const i of r.issues) fail(where, i);
  if (axe) {
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async (sel) => (await window.axe.run(sel ? document.querySelector(sel) : document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(" ")}`), scope);
    for (const x of v) fail(where, `axe ${x}`);
  }
  console.log(`${where}: bar ${r.h}px${r.issues.length ? "" : " ok"}`);
  return r;
};

/* 1. The four layouts, live preview on the theme page. */
for (const theme of ["light", "dark"]) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  for (const layout of LAYOUTS) {
    await choose(p, layout);
    const where = `${theme} ${w} ${layout}`;
    await check(p, where, layout);
    await p.screenshot({ path: `${out}/header-${theme}-${layout}-${w}.png` });
  }
  await ctx.close();
}

/* 2. Height propagation: the Library and an entity view, saved layout. */
for (const theme of ["light", "dark"]) for (const layout of ["two-rows", "compact", "centred"]) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  await choose(p, layout);
  await save(p);
  await p.click('[data-component="Navbar"] [data-part="library"]');
  await p.waitForTimeout(1200);
  await check(p, `${theme} ${w} ${layout} library`, layout);
  if (w === 1360 && layout !== "centred") await p.screenshot({ path: `${out}/header-${theme}-${layout}-library.png` });
  // The drawer preview, then the entity view.
  await p.locator('[data-component="EntityCard"] [data-part="primary-action"]').first().click({ position: { x: 6, y: 6 } });
  await p.waitForTimeout(500);
  await check(p, `${theme} ${w} ${layout} library+drawer`, layout, { axe: false });
  await p.getByRole("button", { name: "View entity" }).first().click();
  await p.waitForTimeout(1500);
  await check(p, `${theme} ${w} ${layout} entity`, layout);
  if (w === 1360 && layout !== "centred") await p.screenshot({ path: `${out}/header-${theme}-${layout}-entity.png` });
  if (theme === "light" && w === 1360 && layout === "two-rows") {
    // Live translate: its strip sits under the taller bar.
    await p.click('[data-part="settings-trigger"]');
    await p.click('[data-part="live-translate"]');
    await p.waitForTimeout(300);
    const strip = await p.evaluate(() => {
      const s = document.querySelector('[data-component="LiveTranslateStrip"]').getBoundingClientRect();
      const n = document.querySelector('[data-component="Navbar"]').getBoundingClientRect();
      return { top: s.top, bar: n.bottom };
    });
    if (Math.abs(strip.top - strip.bar) > 0.5) fail("live translate", `strip at ${strip.top}, bar ends at ${strip.bar}`);
    await check(p, "light 1360 two-rows live translate", layout, { axe: false });
    await p.screenshot({ path: `${out}/header-light-two-rows-live-translate.png` });
  }
  await ctx.close();
}

/* 3. RTL mirrors. */
{
  const { ctx, p } = await open(1360, "light");
  await openThemePage(p);
  await p.click('[data-part="settings-trigger"]');
  await p.getByText("Test RTL layout").first().click();
  await p.waitForTimeout(400);
  for (const layout of LAYOUTS) {
    await choose(p, layout);
    await check(p, `rtl ${layout}`, layout);
    await p.screenshot({ path: `${out}/header-rtl-${layout}.png`, clip: { x: 0, y: 0, width: 1360, height: 200 } });
  }
  await ctx.close();
}

/* 4. Discard reverts; the phone keeps its bar; the theme file. */
{
  const { ctx, p } = await open(1360, "light");
  await openThemePage(p);
  await choose(p, "compact");
  await p.getByRole("button", { name: "Discard changes" }).click();
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => document.querySelector('[data-component="Navbar"]').dataset.layout);
  if (after !== "standard") fail("discard", `bar draws ${after}`);
  console.log(`discard: ${after}`);

  await choose(p, "two-rows");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export theme instance file" }).click()]);
  const file = readFileSync(await dl.path(), "utf8");
  if (!/^  "__headerLayout": "two-rows",$/m.test(file)) fail("export", "no __headerLayout line");
  console.log(`export: ${file.split("\n").slice(0, 6).join(" ")}`);
  // A file from Uwazi has no such line: it loads as Standard.
  const uwazi = file.replace(/^  "__headerLayout".*\n/m, "");
  await p.setInputFiles('input[type="file"]', { name: "theme-instance.json", mimeType: "application/json", buffer: Buffer.from(uwazi) });
  await p.waitForTimeout(400);
  let now = await p.evaluate(() => document.querySelector('[data-component="Navbar"]').dataset.layout);
  if (now !== "standard") fail("import without the key", `bar draws ${now}`);
  await p.setInputFiles('input[type="file"]', { name: "theme-instance.json", mimeType: "application/json", buffer: Buffer.from(file.replace("two-rows", "centred")) });
  await p.waitForTimeout(400);
  now = await p.evaluate(() => document.querySelector('[data-component="Navbar"]').dataset.layout);
  if (now !== "centred") fail("import with the key", `bar draws ${now}`);
  console.log(`import: without the key standard, with it ${now}`);
  // The header's colours reach every row: a dark bar under Two rows.
  const themed = JSON.parse(file.replace(/("(?:\\.|[^"\\])*")|#[^\n]*/g, (_m, q) => q ?? ""));
  themed.light.header = { "--color-theme-chrome-app-bar": "#1F2A44" };
  await p.setInputFiles('input[type="file"]', { name: "theme-instance.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(themed)) });
  await p.waitForTimeout(400);
  const grounds = await p.evaluate(() => {
    const n = document.querySelector('[data-component="Navbar"]');
    return { layout: n.dataset.layout, bar: getComputedStyle(n).backgroundColor, divider: getComputedStyle(n.querySelector('[data-part="primary-nav"]')).borderTopColor, edge: getComputedStyle(n).borderBottomColor };
  });
  if (grounds.layout !== "two-rows" || grounds.bar !== "rgb(31, 42, 68)" || grounds.divider !== grounds.edge) fail("themed bar", JSON.stringify(grounds));
  // axe on the bar only: a simple-mode import re-derives the page's tertiary
  // text (Uwazi's rule), which is the page's matter, not the bar's.
  await check(p, "light 1360 two-rows dark bar", "two-rows", { scope: '[data-component="Navbar"]' });
  await p.screenshot({ path: `${out}/header-light-two-rows-dark-bar.png` });
  await p.setInputFiles('input[type="file"]', { name: "theme-instance.json", mimeType: "application/json", buffer: Buffer.from(file.replace("two-rows", "centred")) });
  await p.waitForTimeout(400);
  // A preset keeps the layout.
  await p.locator('[data-part="presets"] button').nth(1).click();
  await p.waitForTimeout(300);
  now = await p.evaluate(() => document.querySelector('[data-component="Navbar"]').dataset.layout);
  if (now !== "centred") fail("preset", `bar draws ${now} after choosing a preset`);
  await p.screenshot({ path: `${out}/header-light-centred-legacy-preset.png` });

  await choose(p, "two-rows");
  await save(p);
  await p.setViewportSize({ width: 390, height: 800 });
  await p.waitForTimeout(600);
  const phone = await p.evaluate(() => { const n = document.querySelector('[data-component="Navbar"]'); return { layout: n.dataset.layout, h: n.getBoundingClientRect().height, attr: document.documentElement.dataset.headerLayout ?? null }; });
  if (phone.layout !== "standard" || phone.h !== 52 || phone.attr) fail("phone", JSON.stringify(phone));
  console.log(`phone: ${JSON.stringify(phone)}`);
  await p.screenshot({ path: `${out}/header-phone-two-rows-saved.png` });
  await ctx.close();
}

await b.close();
console.log(fails ? `${fails} failure(s)` : "all header layout checks pass");
process.exit(fails ? 1 : 0);
