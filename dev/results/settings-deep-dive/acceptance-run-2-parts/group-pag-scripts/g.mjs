import fs from "fs";
import { axeSrc, launch, open as libOpen, S, rows, shot, axe, dialogs, dlgText, notifTitles, logEntries, rail } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
export * from "./lib.mjs";
export * from "./h.mjs";
export * from "./dev.mjs";
const NAME = (process.argv[1] || "x").split("/").pop().replace(".mjs", "");
const OUTF = new URL("./results-" + NAME + ".jsonl", import.meta.url).pathname;
fs.writeFileSync(OUTF, "");
export const rec = (id, res, ev, sh = "") => {
  console.log(`${res} | ${id} | ${ev} | ${sh}`);
  fs.appendFileSync(OUTF, JSON.stringify({ id, res, ev, sh }) + "\n");
};
const ALLERR = [];
export async function open(browser, section, vp = "desktop", opts = {}) { const r = await libOpen(browser, section, vp, opts); ALLERR.push(r.errors); r.page.__errors = r.errors;
  // Mobile emulation artefact: useKeyboardInset measures --kb once while the layout viewport is still 2000+px tall, leaving --kb at ~1189px (every full-screen Modal collapses to 0 height). A visualViewport resize makes it recompute.
  if (vp === "mobile") await r.page.evaluate(() => window.visualViewport && window.visualViewport.dispatchEvent(new Event("resize")));
  return r; }
export const sh = async (p, name) => { await shot(p, name); return "acceptance-run-2-shots/" + name + ".png"; };
export const wait = (p, ms = 350) => p.waitForTimeout(ms);
export const clean = (s) => s.replace(/\s+/g, " ").trim();
export const real = (errs) => errs.filter((e) => !/atomFamily is deprecated/.test(e) && !/Failed to execute .postMessage. on .DOMWindow.: The target origin provided .* does not match the recipient window.s origin .'?null/.test(e));
export const strip = (t) => t.replace(/ (just now|\d+ (sec|min|hours?|days?)\w* ago).*$/, "");
export const nlist = async (p) => (await notifTitles(p)).map((t) => strip(clean(t)));
/** run a group: fresh browser; console errors for the group recorded as CONSOLE row */
export async function run(name, fn) {
  ALLERR.length = 0;
  const b = await launch();
  try { await fn(b); } catch (e) { rec(name, "FAIL", "script error: " + e.message.slice(0, 300)); }
  const flat = ALLERR.flat(); const errs = real(flat); const axeMsgs = flat.filter((e) => /postMessage/.test(e)).length;
  fs.appendFileSync(OUTF, JSON.stringify({ id: "CONSOLE@" + name, res: errs.length ? "FAIL" : "PASS", ev: errs.slice(0, 5).join(" || ") + (axeMsgs ? ` [ignored: ${axeMsgs} postMessage warning(s) raised by axe-core talking to the null-origin preview iframe; same pages without axe are clean]` : ""), sh: "" }) + "\n");
  console.log("console", name, errs.length ? "ERRORS " + errs.slice(0, 3).join(" || ") : "clean" + (axeMsgs ? ` (ignored ${axeMsgs} axe postMessage warnings)` : ""));
  await b.close();
}
export const footerBtn = (p, name) => S(p).locator("footer").getByRole("button", { name });
export const rowOf = (p, text) => S(p).locator("[data-part=row]").filter({ hasText: text }).first();
export const listRows = (p) => S(p).locator("[data-part=row]").evaluateAll((r) => r.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
export { launch, S, rows, shot, axe, dialogs, dlgText, notifTitles, logEntries, rail, switchTo, toSettings };
/** one check: fn returns [ok(true/false/"NOT DRIVEABLE"), evidence, shotName?]; a thrown error is a FAIL with the message */
export async function check(id, p, fn) {
  try {
    const [ok, ev, shotName] = await fn();
    let s = "";
    if (shotName || ok !== true) s = await sh(p, shotName || id);
    rec(id, ok === true ? "PASS" : ok === false ? "FAIL" : ok, ev, s);
  } catch (e) {
    let s = ""; try { s = await sh(p, id + "-err"); } catch {}
    rec(id, "FAIL", "script error: " + e.message.split("\n")[0].slice(0, 300), s);
  }
}
export const inTab = async (p, name) => { await S(p).getByRole("tab", { name, exact: true }).click(); await wait(p, 250); };
export const editPage = async (p, title) => { await S(p).getByRole("button", { name: `Edit ${title}` }).last().click(); await wait(p, 700); };
export const dlgLoc = (p) => p.locator("[role=dialog]:not([inert]):not([inert] *)").last();
export const newNotifs = async (p, before) => { const b = [...before]; return (await nlist(p)).filter((t) => { const i = b.indexOf(t); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };

/** axe on an element (selector) or the whole document; returns violation strings (all impacts) */
export async function axeOn(p, selector, opts = {}) {
  await p.evaluate(axeSrc);
  return p.evaluate(async ([sel, opts]) => {
    const root = sel ? document.querySelector(sel) : document;
    const r = await window.axe.run(root, { resultTypes: ["violations"] });
    return r.violations.filter((v) => ["serious","critical"].includes(v.impact) || !opts.seriousOnly).map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ").slice(0, 70)).join(" | ")}`);
  }, [selector || null, opts]);
}
export const dark = async (p, on = true) => { await p.evaluate((o) => document.documentElement.classList[o ? "add" : "remove"]("dark"), on); await p.waitForTimeout(300); };
export const hscroll = (p) => p.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, pane: (() => { const e = document.querySelector("[data-testid=settings-content]"); return e ? e.scrollWidth - e.clientWidth : null; })() }));
// Contrast of an element's text against its effective background, in the current theme.
export const contrastOf = (p, sel, nth = 0) => p.evaluate(([q, n]) => {
  const el = document.querySelectorAll(q)[n]; if (!el) return null;
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const paint = (c, back) => { cx.globalCompositeOperation = "source-over"; cx.fillStyle = back; cx.fillRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const rgba = (c) => { const W = paint(c, "#fff"), B = paint(c, "#000"); const a = 1 - (W[0] - B[0] + W[1] - B[1] + W[2] - B[2]) / (3 * 255); if (a <= 0.004) return [0, 0, 0, 0]; return [B[0] / a, B[1] / a, B[2] / a, Math.min(1, a)]; };
  const layers = []; let nn = el;
  while (nn) { const c = rgba(getComputedStyle(nn).backgroundColor); if (c[3] > 0.004) { layers.push(c); if (c[3] > 0.99) break; } nn = nn.parentElement; }
  let base = layers.length && layers[layers.length - 1][3] > 0.99 ? layers.pop().slice(0, 3) : [255, 255, 255];
  for (const l of layers.reverse()) base = base.map((v, i) => l[i] * l[3] + v * (1 - l[3]));
  const fg = rgba(getComputedStyle(el).color);
  const f = fg.slice(0, 3).map((v, i) => v * fg[3] + base[i] * (1 - fg[3]));
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const L1 = lum(f), L2 = lum(base); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2);
}, [sel, nth]);
