import fs from "fs";
import { open, S, shot, notifTitles } from "./lib.mjs";
export const NOISE = /atomFamily is deprecated/;
// Harness artifact: lib.mjs addInitScript reads sessionStorage in the about:blank frame ("Access is denied"); not an app error.
export const HARNESS = /Failed to read the 'sessionStorage' property/;
// Login screen: <img fetchPriority> unknown-prop warning (LoginView.tsx:53). Reported once under ACC-19, excluded from sweeps that sign in as another user.
export const LOGIN_IMG = /React does not recognize the `%s` prop on a DOM element/;
export function mk(name) {
  const out = [];
  const rec = (id, res, ev, shotName = "") => { out.push({ id, res, ev, shot: shotName }); console.log(res, "|", id, "|", ev, shotName ? "| " + shotName : ""); };
  const save = () => fs.writeFileSync(new URL(`./${name}.results.json`, import.meta.url), JSON.stringify(out, null, 1));
  return { rec, save, out };
}
export const realErrors = (errors) => errors.filter((e) => !NOISE.test(e));
export async function signInAs(browser, user, section = "account", vp = "desktop") {
  const r = await open(browser, section, vp);
  const p = r.page;
  await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("login")); });
  await p.reload(); await p.waitForTimeout(800);
  await p.locator('input[placeholder="e.g. admin"]').fill(user);
  await p.locator('input[type=password]').fill("passw0rd");
  await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); });
  await p.reload(); await p.waitForTimeout(1000);
  return r;
}
export const beacon = async (p) => { // open beacon drawer, read articles
  return notifTitles(p);
};
export const bodyText = (p) => p.locator("body").innerText();
export const lines = async (p) => (await p.locator('[data-testid="settings-content"]').innerText()).split("\n").map(s=>s.trim()).filter(Boolean);
export const delta = (a, b) => b.filter((x) => !a.includes(x));
export const newN = (before, after) => { const c = [...before]; after = after.filter(x=>!/Running|\d+%/.test(x)); return after.filter((x) => { const i = c.indexOf(x); if (i >= 0) { c.splice(i, 1); return false; } return true; }); };
export async function switchUser(p, user, section) {
  await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("login")); });
  await p.reload(); await p.waitForTimeout(800);
  await p.locator('input[placeholder="e.g. admin"]').fill(user);
  await p.locator('input[type=password]').fill("passw0rd");
  await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  await p.evaluate((s) => { sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); if (s) localStorage.setItem("uwazi:settingsSection", JSON.stringify(s)); localStorage.setItem("uwazi:settingsDrilled", "true"); }, section || null);
  await p.reload(); await p.waitForTimeout(1000);
}
// contrast ratio of an element's text against its effective background
export const contrast = (p, sel) => p.evaluate((sel) => {
  const norm = (c) => { const cv = document.createElement("canvas").getContext("2d"); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0,0,1,1); const d = cv.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const el = document.querySelector(sel); if (!el) return null;
  const fg = norm(getComputedStyle(el).color);
  let bg = [255,255,255,0]; let n = el;
  const layers = [];
  while (n) { const c = norm(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; n = n.parentElement; }
  let base = layers.length && layers[layers.length-1][3] >= 1 ? layers.pop().slice(0,3) : [255,255,255];
  while (layers.length) { const l = layers.pop(); base = base.map((v,i)=> l[i]*l[3] + v*(1-l[3])); }
  const f = fg[3] < 1 ? fg.slice(0,3).map((v,i)=>v*fg[3]+base[i]*(1-fg[3])) : fg.slice(0,3);
  const lum = (c) => { const [r,g,b] = c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*b; };
  const L1 = lum(f), L2 = lum(base); const hi = Math.max(L1,L2), lo = Math.min(L1,L2);
  return +(((hi+0.05)/(lo+0.05)).toFixed(2));
}, sel);
export const dark = async (p) => { await p.evaluate(() => document.documentElement.classList.add("dark")); await p.waitForTimeout(300); };
export const hscroll = (p) => p.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, pane: (()=>{const e=document.querySelector('[data-testid="settings-content"]'); return e? e.scrollWidth - e.clientWidth : null;})() }));
// Collect console errors/warnings from every page of every context the browser opens (baseline atomFamily warning excluded).
export function watch(browser) {
  const all = [];
  const orig = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const ctx = await orig(...a);
    ctx.on("page", (pg) => {
      pg.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !NOISE.test(m.text()) && !LOGIN_IMG.test(m.text())) all.push(m.type() + ": " + m.text().slice(0, 200)); });
      pg.on("pageerror", (e) => { if (!HARNESS.test(e.message)) all.push("pageerror: " + e.message.slice(0, 200)); });
    });
    return ctx;
  };
  return all;
}
