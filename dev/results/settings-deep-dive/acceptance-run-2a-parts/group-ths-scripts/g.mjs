import fs from "fs";
import { launch, open as libOpen, S, rows, shot, axe, dialogs, dlgText, notifTitles, logEntries, rail } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
export * from "./lib.mjs";
export * from "./h.mjs";
const OUTF = new URL("./results-" + (process.argv[1] || "x").split("/").pop().replace(".mjs","") + ".jsonl", import.meta.url).pathname;
if (!process.env.KEEP) fs.writeFileSync(OUTF, "");
const PAGE = (process.argv[1] || "").match(/\/(flt|ths|rel)/)?.[1]?.toUpperCase() || "";
export const rec = (id, res, ev, sh = "") => {
  const key = /^X-/.test(id) ? id + "@" + PAGE : id;
  console.log(`${res} | ${key} | ${ev} | ${sh}`);
  fs.appendFileSync(OUTF, JSON.stringify({ id: key, res, ev, sh }) + "\n");
};
const ALLERR = [];
export async function open(browser, section, vp = "desktop", opts = {}) { const r = await libOpen(browser, section, vp, opts); ALLERR.push(r.errors); r.page.__errors = r.errors; return r; }

export const sh = async (p, name) => { await shot(p, name); return "acceptance-run-2a-shots/" + name + ".png"; };
// real errors only: the jotai atomFamily deprecation warning prints on every load
export const realErrors = (errors) => errors.filter((e) => !/atomFamily is deprecated/.test(e));
export const wait = (p, ms = 350) => p.waitForTimeout(ms);
export const clean = (s) => s.replace(/\s+/g, " ").trim();
export const guardOpen = async (p) => (await dialogs(p)).length > 0;
export const footer = (p) => S(p).locator('[data-component=SettingsContent] >> xpath=.').first();
export const footerText = async (p) => clean(await p.evaluate(() => { const c = document.querySelector('[data-testid=settings-content]'); const f = c && (c.querySelector('footer') || [...c.querySelectorAll('div')].reverse().find(d => /Save|Add /.test(d.innerText) && d.getBoundingClientRect().bottom > innerHeight - 4)); return f ? f.innerText : ""; }));
export async function beacon(p) { return notifTitles(p); }
export async function run(name, fn) {
  ALLERR.length = 0;
  const b = await launch();
  try { await fn(b); } catch (e) { rec(name, "FAIL", "script error: " + e.message.slice(0, 300)); }
  const errs = ALLERR.flat().filter((e) => !/atomFamily is deprecated/.test(e));
  fs.appendFileSync(OUTF, JSON.stringify({ id: "CONSOLE@" + name, res: errs.length ? "FAIL" : "PASS", ev: errs.slice(0, 5).join(" || "), sh: "" }) + "\n");
  console.log("console", name, errs.length ? "ERRORS " + errs.slice(0, 3).join(" || ") : "clean");
  await b.close();
}
export { launch, S, rows, shot, axe, dialogs, dlgText, notifTitles, logEntries, rail, switchTo, toSettings };
export const nlist = async (p) => (await notifTitles(p)).map(clean);
/** notifications added since `before` (a nlist snapshot) */
export const nnew = async (p, before) => { const now = await nlist(p); return now.filter((t) => !before.includes(t) && !/ago$|ago /.test("") ).filter((t) => !before.some((b) => b.replace(/ (just now|\d+ (min|hours?|days?) ago)/, "") === t.replace(/ (just now|\d+ (min|hours?|days?) ago)/, "")) || true); };
export const strip = (t) => t.replace(/ (just now|\d+ (sec|min|hours?|days?)\w* ago).*$/, "");
export const newNotifs = async (p, before) => { const b = new Set(before.map(strip)); return (await nlist(p)).map(strip).filter((t) => !b.has(t) && !/\d+%$/.test(t) && !/items processed/.test(t)); };
export const toast = (p) => p.locator('[data-component=Toast],[role=status]').allInnerTexts();
export const hscroll = (p) => p.evaluate(() => { const c = document.querySelector('[data-testid=settings-content]'); const w = document.documentElement; return { doc: w.scrollWidth - w.clientWidth, pane: c ? c.scrollWidth - c.clientWidth : null, wide: [...(c?.querySelectorAll("*") || [])].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "fixed").length }; });
export const saveBtn = (p) => S(p).getByRole("button", { name: /^Save$/ });

export const guardBtn = (p, name) => p.locator('[data-component=ConfirmDialog],[data-component=ConfirmDelete]').getByRole("button", { name });
export const guardInfo = async (p) => p.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter(e => !e.closest("[inert]")); return d.map(e => ({ name: e.getAttribute("aria-label") || e.querySelector("h2,h3")?.textContent, text: e.innerText.replace(/\s+/g, " ").trim().slice(0, 220), buttons: [...e.querySelectorAll("button")].map(b => b.innerText.trim() || b.getAttribute("aria-label")) })); });
export const axeEl = async (p, selector) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const el = document.querySelector(sel) || document.body; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ").slice(0, 70)).join(" | ")}`); }, selector); };
export const dupNames = (p) => S(p).locator("button, [role=button], a, input, select, [role=checkbox]").evaluateAll((els) => { const m = {}; for (const e of els) { if (e.closest("[inert]") || !e.offsetParent) continue; const n = (e.getAttribute("aria-label") || e.innerText || "").trim(); if (n) m[n] = (m[n] || 0) + 1; } return Object.entries(m).filter(([, c]) => c > 1).map(([n, c]) => `${n} x${c}`); });
export const unlabelled = (p) => S(p).locator("input, select, textarea").evaluateAll((els) => els.filter((e) => !e.closest("[inert]") && e.type !== "hidden").filter((e) => !(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest("label"))).map((e) => e.outerHTML.slice(0, 80)));
import { axeSrc } from "./lib.mjs";
export const activityRows = async (b) => { const { page } = await open(b, "activitylog"); return page; };
import { BASE } from "./lib.mjs";
/** like open() but returns right after load, to watch a loading state */
export async function openFast(browser, section, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(([s, src]) => {
    if (!sessionStorage.getItem("__qa")) {
      if (src) localStorage.setItem("uwazi:dataSource", JSON.stringify(src));
      sessionStorage.setItem("__qa", "1");
      sessionStorage.setItem("uwazi:appView", JSON.stringify("settings"));
      localStorage.setItem("uwazi:settingsSection", JSON.stringify(s));
      localStorage.setItem("uwazi:settingsDrilled", JSON.stringify(true));
    }
  }, [section, opts.source || null]);
  const page = await ctx.newPage();
  const errors = []; ALLERR.push(errors);
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
  await page.goto(BASE, { waitUntil: "commit" });
  return { ctx, page, errors };
}
export const dataRows = (p) => S(p).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => !r.querySelector("[role=columnheader]")).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
export const openRow = async (p, text) => { await S(p).locator("[role=row]").filter({ hasText: text }).first().click(); await wait(p, 500); };
export const lead = (p, name) => S(p).locator("footer").getByRole("button", { name });
export const vals = (p) => S(p).locator('[aria-label="Item label"], [aria-label="Group name"]').evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") === "Group name" ? "[G]" : "") + e.value));
export const nameInput = (p) => S(p).locator("input").first();
export const commit = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create thesaurus)$/ });
export const newThes = async (p, name, items = []) => {
  await lead(p, "Add thesaurus").click(); await wait(p, 300);
  await nameInput(p).fill(name);
  for (const it of items) { await S(p).getByRole("button", { name: "Add item" }).first().click(); await wait(p, 100); await S(p).locator('[aria-label="Item label"]').last().fill(it); }
  await wait(p, 150);
};
/** From Settings: open the Relationships panel on "Hearing 3, October 2019 session" (one reference). */
export async function toPanel(p, title = "Hearing 3, October 2019 session") {
  await p.locator("button", { hasText: "Library" }).first().click(); await wait(p, 2000);
  await p.getByText(title).first().click(); await wait(p, 1000);
  await p.getByRole("button", { name: /View entity/ }).click(); await wait(p, 1500);
  await p.getByRole("tab", { name: /Relationships/ }).first().click(); await wait(p, 1000);
}
export async function panelEdit(p) { await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 500); }
/** in panel edit mode: Create relationship to `target` with type `typeLabel` */
export async function panelCreate(p, target, typeLabel) {
  await p.locator('[data-part=create]').click(); await wait(p, 500);
  await p.getByPlaceholder(/Search entities/).fill(target); await wait(p, 500);
  await p.locator('[data-part=entity]').filter({ hasText: target }).first().click(); await wait(p, 400);
  await p.locator('[data-part=relation-types]').getByText(typeLabel, { exact: true }).click(); await wait(p, 300);
  await p.locator('[data-part=confirm]').click(); await wait(p, 600);
}
export async function panelSave(p) { await p.locator('[data-part=save]').click(); await wait(p, 600); }
export const panelText = async (p) => clean(await p.locator("main, body").first().innerText());
/** contrast ratio of the first element matching `sel` in the settings pane (text colour vs the nearest opaque background) */
export const contrast = (p, sel) => p.evaluate((sel) => {
  const el = document.querySelector('[data-testid=settings-content] ' + sel);
  if (!el) return null;
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const fg = rgba(getComputedStyle(el).color);
  let bg = [255, 255, 255, 1]; const layers = [];
  for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; }
  const root = rgba(getComputedStyle(document.body).backgroundColor);
  let base = root[3] > 0 ? root : [255, 255, 255, 1];
  for (const l of layers.reverse()) base = [0, 1, 2].map((i) => l[i] * l[3] + base[i] * (1 - l[3])).concat([1]);
  const lum = (c) => { const f = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const fgb = [0, 1, 2].map((i) => fg[i] * fg[3] + base[i] * (1 - fg[3]));
  const a = lum(fgb), b = lum(base);
  return { ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, fg: fgb.map(Math.round).join(","), bg: base.slice(0, 3).map(Math.round).join(","), text: el.innerText };
}, sel);
