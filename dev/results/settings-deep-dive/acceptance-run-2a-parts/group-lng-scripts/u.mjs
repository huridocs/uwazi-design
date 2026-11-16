import { S, rows, notifTitles } from "./lib.mjs";
export const squash = (t) => (t || "").replace(/\s+/g, " ").trim();
export const modalTxt = (p) => p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText).join(" || ").replace(/\s+/g, " "));
export const dlg = (p) => p.locator("[role=dialog]:not([inert] *)").last();
const SEED = /Uploading document batch|Processing PDFs|Some fields could not be validated|A new version of Uwazi|Entity saved successfully|Failed to save entity|Batch import completed|Storage usage above|Scheduled export failed/;
export const beacon = async (p) => (await notifTitles(p)).map(squash).filter((t) => !SEED.test(t));
export const newBeacon = async (p, before) => { const now = await beacon(p); const b = [...before]; return now.filter((t) => { const i = b.indexOf(t); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
export const lngRows = async (p) => (await rows(p)).slice(1);
export const goto = async (p, item) => { await p.locator('nav[aria-label="Settings navigation"] button', { hasText: item }).first().click(); await p.waitForTimeout(500); };
export async function installLang(p, names, wait = 3800) {
  await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await p.waitForTimeout(300);
  const d = p.locator("[role=dialog]:not([inert] *)").last();
  for (const n of names) await d.locator("[data-part=language]").filter({ hasText: n }).first().click();
  await d.getByRole("button", { name: /^Install \(\d+\)/ }).click(); await p.waitForTimeout(300);
  if (wait) await p.waitForTimeout(wait);
}
export const rowOf = (p, name) => S(p).locator("[data-part=row]").filter({ hasText: name }).first();
export const menuOf = async (p, name) => { await p.getByRole("button", { name: `Actions for ${name}` }).click(); await p.waitForTimeout(250); return p.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].map((e) => ({ t: e.innerText.trim(), dis: e.disabled || e.getAttribute("aria-disabled") === "true" }))); };
export const activity = (p) => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("uwazi:settings:activity") || "[]").map((e) => `${e.method} ${e.summary} [${e.user}]`); } catch { return ["ERR"]; } });
export const langCount = async (p) => { await goto(p, "Dashboard"); const t = squash(await S(p).innerText()); const m = t.match(/LANGUAGES (\d+)/); return m ? +m[1] : null; };
export const openCtx = async (p, name) => { await goto(p, "Translations"); if (await p.locator("[data-component=TranslationEditor]").count()) { await p.locator("[data-component=TranslationEditor]").getByRole("button", { name: /Translations|back/i }).first().click(); await p.waitForTimeout(400); } await p.locator("[data-part=row]").filter({ hasText: name }).first().click(); await p.waitForTimeout(600); };
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const cell = (p, key, lang) => p.getByLabel(new RegExp("^" + esc(key) + " in " + lang + "(,|$)")).first();
export const saveEd = async (p) => { await p.getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
export const cdlg = (p) => p.locator("[data-component=ConfirmDialog] [role=dialog], [data-component=ConfirmDelete] [role=dialog]").last();
// Contrast of an element's text against its effective background, in the current theme.
export const contrastOf = (p, sel) => p.evaluate((q) => {
  const el = document.querySelector(q); if (!el) return null;
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const paint = (c, back) => { cx.globalCompositeOperation = "source-over"; cx.fillStyle = back; cx.fillRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const rgba = (c) => { const W = paint(c, "#fff"), B = paint(c, "#000"); const a = 1 - (W[0] - B[0] + W[1] - B[1] + W[2] - B[2]) / (3 * 255); if (a <= 0.004) return [0, 0, 0, 0]; return [B[0] / a, B[1] / a, B[2] / a, Math.min(1, a)]; };
  const layers = []; let n = el;
  while (n) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0.004) { layers.push(c); if (c[3] > 0.99) break; } n = n.parentElement; }
  let base = layers.length && layers[layers.length - 1][3] > 0.99 ? layers.pop().slice(0, 3) : [255, 255, 255];
  for (const l of layers.reverse()) base = base.map((v, i) => l[i] * l[3] + v * (1 - l[3]));
  const fg = rgba(getComputedStyle(el).color);
  const f = fg.slice(0, 3).map((v, i) => v * fg[3] + base[i] * (1 - fg[3]));
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const L1 = lum(f), L2 = lum(base); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2);
}, sel);
