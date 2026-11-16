import { S, wait, strip, shot, rail, dlg, openAdd, pickType, pickOpt, saveBtn, propNames, rowPills, openEditor, propRows, notifTitles, logEntries } from "./ted-common.mjs";
import { toSettingsTemplates, openTemplate, saveTemplate, addProp, createEntity } from "./ent.mjs";
export * from "./ted-common.mjs";
export { toSettingsTemplates, openTemplate, saveTemplate, addProp, createEntity };
export const toLibrary = async (p, tpl) => {
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await wait(p, 1500);
  if (tpl) { const cb = p.getByRole("checkbox", { name: tpl, exact: true }).first(); if (await cb.count()) { if (!(await cb.isChecked())) await cb.check(); } await wait(p, 800); }
};
export const guardFor = (rec, only) => async (id, fn) => { if (only && !only.includes(id)) return; try { await fn(); } catch (e) { console.error(e.stack.split("\n").slice(0, 4).join(" / ").slice(0, 500)); rec(id, "FAIL", "Script error while driving: " + String(e.message).split("\n")[0].slice(0, 300)); } };
export const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
export const colorsOf = (loc) => loc.evaluate((e) => { const s = new Set(); for (const x of [e, ...e.querySelectorAll("*")]) { const c = getComputedStyle(x); s.add(c.backgroundColor); s.add(c.color); s.add(c.borderTopColor); s.add(c.fill); } return [...s]; });
export const facetTitles = (p) => p.locator("[data-component=LibraryFilters] [data-part=title]").allInnerTexts().then((a) => a.map(strip));
export const cardsText = (p) => p.locator("[data-component=EntityCard]").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
export const cardLabels = (p, nth = 0) => p.locator("[data-component=EntityCard]").nth(nth).evaluate((e) => [...e.querySelectorAll("*")].filter((x) => x.childElementCount === 0 && /uppercase/.test(x.className + getComputedStyle(x).textTransform) && x.textContent.trim()).map((x) => x.textContent.trim()));
export const openDisplay = async (p) => { await p.getByRole("button", { name: "Display options" }).click(); await wait(p, 350); };
export const menuText = (p) => p.evaluate(() => [...document.querySelectorAll("[role=menu]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.replace(/\n+/g, " | ")).join(" ## "));
export const setView = async (p, v) => { await p.getByRole("button", { name: /^View: / }).click(); await wait(p, 250); await p.locator("[role=option],[role=menuitem]").filter({ hasText: new RegExp("^" + v + "$") }).first().click(); await wait(p, 700); };
export const reopenSettings = async (p, tpl) => { await toSettingsTemplates(p); if (tpl) await openTemplate(p, tpl); };
export const metaTab = async (p) => { await p.getByRole("tab", { name: /^Metadata/ }).click(); await wait(p, 600); };
export const openEntityEdit = async (p, cardIdx = 0) => { await p.locator("[data-component=EntityCard]").nth(cardIdx).click(); await wait(p, 900); await metaTab(p); await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 900); };
export const labelsIn = (p, sel = "label") => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => !e.closest("[inert]") && e.getBoundingClientRect().width > 0).map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean), sel);
import { BASE } from "./lib.mjs";
/** Phone 390x844 with touch, WITHOUT Chromium's isMobile emulation: under isMobile the app's `--kb` (useKeyboardInset: innerHeight - visualViewport.height) is stuck at 1189px from load, which pads every bottom-anchored dialog down to zero height (see TED-33). */
export async function openPhone(browser, section, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
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
  return { ctx, page, errors };
}
export const openEditorPhone = async (b, name = "Court Case") => {
  const c = await openPhone(b, "templates"); await c.page.waitForTimeout(700);
  await S(c.page).getByText(name, { exact: true }).first().tap(); await c.page.waitForTimeout(600);
  return c;
};
