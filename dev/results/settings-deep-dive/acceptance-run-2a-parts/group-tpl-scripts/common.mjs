import fs from "fs";
import { launch, open, S, shot as _shot, rows, title, dialogs, conf, dlgText, axe, logEntries, notifTitles, rail, OUT, BASE } from "./lib.mjs";
export { launch, open, S, rows, title, dialogs, conf, dlgText, axe, logEntries, notifTitles, rail, BASE };
export const DIR = new URL(".", import.meta.url).pathname;
export const SHOTS = "acceptance-run-2a-shots";
let RES = {}; let FILE = null;
export function init(name) { FILE = `${DIR}${name}.results.json`; RES = {}; }
export const shot = async (p, id) => { await _shot(p, id); return `${SHOTS}/${id}.png`; };
let MON = null;
export const watch = (errors) => { let i = errors.length; MON = { take() { const n = realErrors(errors.slice(i)); i = errors.length; return n; }, skip() { i = errors.length; } }; return MON; };
export async function rec(id, result, evidence, shotName = "") {
  if (MON) { const e = [...new Set(MON.take().map((x) => x.replace(/\s+/g, " ").slice(0, 160)))]; if (e.length) { evidence = `${evidence} | CONSOLE during this check: ${e.join(" || ")}`; if (result === "PASS") result = "FAIL"; } }
  RES[id] = { id, result, evidence: String(evidence).replace(/\|/g, "\\|").replace(/\n/g, " "), shot: shotName ? `${SHOTS}/${shotName.replace(/^.*\//, "")}` : "" };
  console.log(result, "|", id, "|", String(evidence).slice(0, 400));
  fs.writeFileSync(FILE, JSON.stringify(RES, null, 1));
}
export const wait = (p, ms) => p.waitForTimeout(ms);
// console errors excluding baseline Jotai atomFamily warning and harness-only
export const realErrors = (errors) => errors.filter((e) => !/atomFamily is deprecated/i.test(e));
export async function toCatalog(p) { await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("catalog")); }); }
// Click the navbar logo to go to the catalog / back (in-app navigation, no reload)
export async function logoClick(p) { await p.locator('header img, nav img, [aria-label*="Uwazi" i]').first().click().catch(()=>{}); }
export async function addTemplate(p, name) {
  await S(p).getByRole("button", { name: "Add template" }).click();
  await p.waitForTimeout(400);
  await S(p).getByPlaceholder("Template name").fill(name);
  await p.waitForTimeout(200);
  await S(p).getByRole("button", { name: /^(Save|Create template)/ }).first().click();
  await p.waitForTimeout(600);
  // possible save confirm dialog
  const dlg = p.locator('[role=dialog]:not([inert] *)').getByRole("button", { name: /^Save/ });
  if (await dlg.count()) { await dlg.first().click(); await p.waitForTimeout(600); }
}
export const rowsData = (p) => S(p).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => r.querySelector("[data-column=name] .font-medium")).map((r) => ({ name: r.querySelector("[data-column=name] .font-medium")?.textContent.trim(), entities: r.querySelector("[data-column=entities]")?.innerText.trim(), def: /Default/.test(r.querySelector("[data-column=name]").innerText) })));
export const names = async (p) => (await rowsData(p)).map((r) => r.name);
export async function toSettingsItem(p, item) {
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(250);
  await p.getByRole("button", { name: /System settings/ }).click(); await p.waitForTimeout(600);
  if (item) await rail(p, item); await p.waitForTimeout(500);
}
// contrast helper evaluated in page: returns {fg,bg,ratio}
export const contrastOf = (p, selectorFn) => p.evaluate(() => {
  const toRGB = (css) => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d", { willReadFrequently: true }); x.clearRect(0,0,1,1); x.fillStyle = "#000"; x.fillStyle = css; x.fillRect(0,0,1,1); const d = x.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const bgOf = (el) => { let e = el; while (e) { const c = toRGB(getComputedStyle(e).backgroundColor); if (c[3] > 0.99) return c; if (c[3] > 0) { /* blend over parent below */ } e = e.parentElement; } return [255,255,255,1]; };
  const res = {};
  for (const [k, sel] of Object.entries(window.__sel || {})) {}
  return res;
});
export const pageContrast = (p, els) => p.evaluate((pairs) => {
  const toRGB = (css) => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d", { willReadFrequently: true }); x.clearRect(0,0,1,1); x.fillStyle = "#000"; x.fillStyle = css; x.fillRect(0,0,1,1); const d = x.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const bgOf = (el) => { let layers = []; let e = el; while (e) { const c = toRGB(getComputedStyle(e).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] > 0.99) break; e = e.parentElement; } let base = [255,255,255]; if (!layers.length || layers[layers.length-1][3] <= 0.99) base = getComputedStyle(document.documentElement).colorScheme.includes("dark") || document.documentElement.classList.contains("dark") ? [20,20,20] : [255,255,255]; for (let i = layers.length-1; i>=0; i--) { const [r,g,b,a] = layers[i]; base = [r*a+base[0]*(1-a), g*a+base[1]*(1-a), b*a+base[2]*(1-a)]; } return base; };
  return pairs.map((sel) => { const el = document.querySelector(sel); if (!el) return null; const fgc = toRGB(getComputedStyle(el).color); const bg = bgOf(el); const fg = [fgc[0]*fgc[3]+bg[0]*(1-fgc[3]), fgc[1]*fgc[3]+bg[1]*(1-fgc[3]), fgc[2]*fgc[3]+bg[2]*(1-fgc[3])]; const L1 = lum(fg), L2 = lum(bg); const r = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); return { ratio: Math.round(r*100)/100, fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(",") }; });
}, els);
export const setDark = (p, on) => p.evaluate((on) => document.documentElement.classList.toggle("dark", on), on);
// Library Type facet: {rows:[{name,count}]} 
export const libTypeFacet = (p) => p.evaluate(() => {
  const h = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Template");
  if (!h) return null;
  let card = h; while (card && card.querySelectorAll("input[type=checkbox],[role=checkbox]").length < 1) card = card.parentElement;
  const lines = (el) => (el ? el.innerText.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  const all = [...lines(card), ...lines(card.nextElementSibling)].filter((x) => x !== "Template");
  const out = [];
  for (let i = 0; i < all.length - 1; i++) if (!/^\d[\d,]*$/.test(all[i]) && /^\d[\d,]*$/.test(all[i + 1])) out.push({ name: all[i], count: all[i + 1] });
  return out;
});
export async function goLibrary(p) { await p.locator('button:has-text("Library")').first().click(); await p.waitForTimeout(2500); }
export const backToSettings = async (p, item) => { await toSettingsItem(p, item); };
export const openRow = async (p, name) => { await S(p).locator("[role=row]").filter({ has: p.getByText(name, { exact: true }) }).first().getByText(name, { exact: true }).first().click(); await p.waitForTimeout(600); };
// In an open template editor: add a relationship property targeting template `target`, then save the editor.
export async function addRelProp(p, label, target, inherit) {
  await S(p).getByRole("button", { name: "Add property" }).click(); await p.waitForTimeout(400);
  const dlg = p.locator("[role=dialog]").filter({ hasText: "New property" }).last();
  await dlg.getByRole("button", { name: /^Property type/ }).click(); await p.waitForTimeout(200);
  await p.getByRole("option", { name: "Relationship", exact: true }).click(); await p.waitForTimeout(200);
  await dlg.getByRole("textbox", { name: "Label" }).fill(label);
  await dlg.getByRole("button", { name: /^Relationship type:/ }).click(); await p.waitForTimeout(200);
  await p.locator("[role=option]:not([disabled])").first().click(); await p.waitForTimeout(200);
  await dlg.getByRole("button", { name: /^Entities:/ }).click(); await p.waitForTimeout(200);
  await p.getByRole("option", { name: target, exact: true }).click(); await p.waitForTimeout(200);
  if (inherit) {
    await dlg.getByRole("button", { name: /^Inherit property/ }).click(); await p.waitForTimeout(200);
    await p.getByRole("option", { name: inherit }).first().click(); await p.waitForTimeout(200);
  }
  await dlg.getByRole("button", { name: "Add property" }).click(); await p.waitForTimeout(400);
  await S(p).getByRole("button", { name: /^(Save|Create template)/ }).first().click(); await p.waitForTimeout(700);
  const d2 = p.locator("[role=dialog]:not([inert] *)").getByRole("button", { name: /^Save/ });
  if (await d2.count()) { await d2.first().click(); await p.waitForTimeout(700); }
}
export async function devOpen(p) { await p.locator("img.logo-img").first().click(); await p.waitForTimeout(700); }
export async function devArm(p, scope, reason) {
  await devOpen(p);
  const dp = p.locator("[data-component=DevPanel]").first();
  await dp.getByRole("button", { name: /Failure scope/ }).click(); await p.waitForTimeout(200);
  await p.getByRole("option", { name: scope, exact: true }).click(); await p.waitForTimeout(200);
  if (reason) await dp.getByRole("textbox", { name: "Failure reason" }).fill(reason);
  await dp.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(200);
  return (await dp.locator("[role=status]").first().innerText()).trim();
}
export async function devEmpty(p, label) { await devOpen(p); const dp = p.locator("[data-component=DevPanel]").first(); await dp.getByRole("button", { name: label, exact: true }).click(); await p.waitForTimeout(300); return (await dp.locator("[role=status]").last().innerText()).trim(); }
export async function devReturn(p, item) { await p.getByRole("button", { name: "Return to app" }).click(); await p.waitForTimeout(500); await toSettingsItem(p, item); if (MON) MON.skip(); }
export const activityRows = async (p) => { await toSettingsItem(p, "Activity log"); return p.locator("[data-part=log-table] tbody > tr").evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, " ").trim()).filter(Boolean)); };
export const beaconTexts = async (p) => (await notifTitles(p)).map((t) => t.replace(/\s+/g, " "));
export const tooltipText = (p) => p.evaluate(() => [...document.querySelectorAll("[role=tooltip]")].map((e) => e.innerText.trim()).join(" | "));
export const clickRowCheckbox = async (p, name) => S(p).locator(`input[aria-label="Select ${name}"]`).click();
export const tickRow = async (p, name) => { await S(p).locator(`input[aria-label="Select ${name}"]`).check(); await p.waitForTimeout(150); };
export const axeOn = async (p, selectorOrNull) => { await p.evaluate(axeSrcRef); return p.evaluate(async (sel) => { const ctx = sel ? document.querySelector(sel) : (document.querySelector('[data-testid="settings-content"]') || document.body); const r = await window.axe.run(ctx, { resultTypes: ["violations"] }); return r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ").slice(0, 80)).join(" | ")}`); }, selectorOrNull); };
import { axeSrc as axeSrcRef } from "./lib.mjs";
export const noScrollX = (p) => p.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth, pane: (() => { const e = document.querySelector("[data-testid=settings-content]"); return e ? [e.scrollWidth, e.clientWidth] : null; })() }));
export const tap = (p, loc) => loc.tap();
