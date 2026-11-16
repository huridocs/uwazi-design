import { createRequire } from "node:module";
const require = createRequire("/Users/juanmnl/Developer/huridocs/uwazi_app/app/package.json");
export const { chromium } = require("playwright");
export const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/split-pane-entity-qa";
export async function launch({ sync = false, dark = false, port = 1437, layout = "split", w = 1440, h = 900, collection } = {}) {
  const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu-rasterization"] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? "dark" : "light" });
  await ctx.addInitScript(({ sync, dark, layout }) => {
    try { sessionStorage.setItem("uwazi:libraryLayout", JSON.stringify(layout)); sessionStorage.setItem("uwazi:librarySyncFilters", JSON.stringify(sync)); } catch {}
    try { if (dark) localStorage.setItem("theme", "dark"); } catch {}
  }, { sync, dark, layout });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/atomFamily/.test(m.text())) logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
  const URL = `http://localhost:${port}/`;
  await page.goto(URL); await page.waitForTimeout(3000);
  return { browser, ctx, page, logs, URL };
}
export const state = (page) => page.evaluate(() => {
  const side = (s) => { const p = document.querySelector(`[data-library-pane=${s}]`); if (!p) return null; const b = p.getBoundingClientRect(); return { entityOpen: p.hasAttribute("data-entity-open"), l: Math.round(b.left), r: Math.round(b.right), tabs: [...p.querySelectorAll('[role=tab][aria-selected=true]')].map(t => t.textContent.trim().slice(0, 20)), back: !!p.querySelector('[data-part=back]'), h: (p.querySelector('[data-part=entity-title], h1, h2')?.textContent || '').trim().slice(0, 50) }; };
  return { split: !!document.querySelector('[data-component=LibrarySplit]'), left: side("left"), right: side("right"), scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth, panels: [...document.querySelectorAll('[role=dialog][data-state=open]')].map(d => d.getAttribute('aria-label') || d.textContent.slice(0, 20)) };
});
export const sig = (page, side) => page.evaluate((s) => { const p = document.querySelector(`[data-library-pane=${s}]`); if (!p) return null; const t = p.innerText; let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return { h, len: t.length, open: p.hasAttribute("data-entity-open"), scroll: [...p.querySelectorAll("*")].filter(e => e.scrollTop > 0).map(e => Math.round(e.scrollTop)) }; }, side);
export const setView = async (page, side, name) => { await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^View: / }).click(); await page.waitForTimeout(300); await page.getByRole("option", { name: new RegExp("^" + name) }).first().click(); await page.waitForTimeout(1800); };
export const other = (s) => (s === "left" ? "right" : "left");
export const verdict = (st, side) => { const o = other(side); return { split: st.split, [side]: st[side].entityOpen, [o]: st[o].entityOpen, title: st[side].h, scrollX: st.scrollX }; };
