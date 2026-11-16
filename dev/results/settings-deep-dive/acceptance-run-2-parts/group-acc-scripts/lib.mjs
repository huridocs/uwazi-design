import { chromium } from "/Users/juanmnl/Developer/huridocs/uwazi_app/app/node_modules/playwright/index.mjs";
import fs from "fs";
export const BASE = "http://localhost:1438/";
export const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-2-shots";
export const axeSrc = fs.readFileSync("/Users/juanmnl/Developer/huridocs/uwazi_app/app/node_modules/axe-core/axe.min.js", "utf8");
export const SECTIONS = ["account","dashboard","users","collection","menu","pages","languages","translations","filters","templates","thesauri","relationship-types","preserve","activitylog","customisation","uploads","metadata-extraction","paragraph-extraction"];
export async function launch() { return chromium.launch(); }
export async function open(browser, section, vp = "desktop", opts = {}) {
  const ctx = await browser.newContext(vp === "mobile"
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(([s, drilled, src]) => {
    if (!sessionStorage.getItem("__qa")) {
      if (src) localStorage.setItem("uwazi:dataSource", JSON.stringify(src));
      sessionStorage.setItem("__qa", "1");
      sessionStorage.setItem("uwazi:appView", JSON.stringify("settings"));
      localStorage.setItem("uwazi:settingsSection", JSON.stringify(s));
      localStorage.setItem("uwazi:settingsDrilled", JSON.stringify(drilled));
    }
  }, [section, true, opts.source || null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  // Harness workaround (see report): on first load in emulated mobile the --kb inset can stay at a stale 1189px (the hook measures once before the layout viewport settles), which collapses every first-layer dialog to 0 height. Re-measure.
  if (vp === "mobile" && !opts.noKbFix) { page.__kbBefore = await page.evaluate(() => document.documentElement.style.getPropertyValue("--kb")); await page.evaluate(() => window.visualViewport.dispatchEvent(new Event("resize"))); }
  return { ctx, page, errors };
}
export const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
export async function axe(page) {
  await page.evaluate(axeSrc);
  return page.evaluate(async () => {
    const r = await window.axe.run(document.querySelector('[data-testid="settings-content"]') || document.body, { resultTypes: ["violations"] });
    return r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0,2).map(n=>n.target.join(" ").slice(0,70)).join(" | ")}`);
  });
}
export const S = (p) => p.locator('[data-testid="settings-content"]');
export const rows = async (p) => (await S(p).locator('[role="row"]').allTextContents()).map(t=>t.replace(/\s+/g," ").trim());
export const rail = (p, name) => p.locator('nav[aria-label="Settings navigation"] button', { hasText: name }).first().click();
export const dialogs = (p) => p.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter(e=>!e.closest('[inert]')).map(e=>e.getAttribute('aria-label')||e.querySelector('h2,h3')?.textContent||'dialog'));
export const title = (p) => S(p).locator("h2").first().textContent();
export const conf = (p, name) => p.locator('[data-component=ConfirmDelete],[data-component=ConfirmDialog]').getByRole("button", { name });
export const dlgText = async (p) => (await p.locator('[data-component=ConfirmDelete] [role=dialog],[data-component=ConfirmDialog] [role=dialog],[role=dialog]:not([inert] *)').allInnerTexts()).join(" | ").replace(/\s+/g, " ");
export const logEntries = (p) => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("uwazi:settings:activity") || "[]").map(e => `${e.method} ${e.summary} [${e.user}]`); } catch { return ["ERR"]; } });
export const notifTitles = (p) => p.locator('article').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()));
