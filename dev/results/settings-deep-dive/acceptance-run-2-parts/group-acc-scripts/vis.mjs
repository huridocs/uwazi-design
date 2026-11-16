// Visual + X-07 (axe) + X-08 (pill contrast) sweep: light and dark, desktop 1280 and phone 390.
// Pages: Account, Account password dialog, Users list, User editor, Users delete dialog, Groups tab, Group editor, Navigation rail.
import { launch, open, S, shot, dialogs, axeSrc } from "./lib.mjs";
import { watch, mk, hscroll } from "./rec.mjs";
const { rec, save } = mk("vis");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const NAV = 'nav[aria-label="Settings navigation"]';
const DLG = '[role=dialog]:not([inert] *)';
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const el = [...document.querySelectorAll(sel)].pop(); if (!el) return ["(no element " + sel + ")"]; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`); }, sel); };
// Contrast of every small badge-like element (pill/badge/status) under a root: text colour against the composited background.
const badges = (p, rootSel) => p.evaluate((rootSel) => {
  const root = [...document.querySelectorAll(rootSel)].pop(); if (!root) return null;
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const norm = (c) => { cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = (c) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const out = [];
  root.querySelectorAll("span").forEach((el) => {
    const t = (el.textContent || "").trim(); if (!t || t.length > 28 || el.childElementCount > 1) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.height > 34) return;
    const bg = norm(cs.backgroundColor); if (bg[3] < 0.5 || el.closest("footer")) return; // only spans that paint their own chip (pills, badges, status)
    if (parseFloat(cs.borderTopLeftRadius) <= 0) return;
    const layers = []; let n = el.parentElement; while (n) { const c = norm(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; n = n.parentElement; }
    let base = [255, 255, 255]; for (let i = layers.length - 1; i >= 0; i--) { const l = layers[i]; base = base.map((v, k) => l[k] * l[3] + v * (1 - l[3])); }
    const fill = bg.slice(0, 3).map((v, k) => v * bg[3] + base[k] * (1 - bg[3]));
    const fg = norm(cs.color); const f = fg.slice(0, 3).map((v, k) => v * fg[3] + fill[k] * (1 - fg[3]));
    const L1 = lum(f), L2 = lum(fill); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    out.push(`${t.slice(0, 18)}:${ratio.toFixed(2)}`);
  });
  return out;
}, rootSel);
const low = (arr) => (arr || []).filter(x => parseFloat(x.split(":").pop()) < 4.5);
const setTheme = async (p, theme) => { await p.evaluate((t) => { document.documentElement.classList.toggle("dark", t === "dark"); }, theme); await p.waitForTimeout(300); };
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const tapOrClick = (loc, mobile) => mobile ? loc.tap() : loc.click();

const results = []; // {combo, page, axe, low, hs}
for (const vp of ["desktop", "mobile"]) {
  for (const theme of ["light", "dark"]) {
    const mobile = vp === "mobile"; const combo = `${mobile ? "390" : "1280"}-${theme}`;
    const mkPage = async (section) => { const r = await open(b, section, vp); await setTheme(r.page, theme); return r; };
    const record = async (name, p, extra = {}) => {
      const sel = extra.sel || '[data-testid="settings-content"]';
      const ax = await axeOn(p, sel);
      const bd = await badges(p, extra.badgeSel || sel);
      const hs = await hscroll(p);
      await shot(p, `X-07-${name}-${combo}`);
      results.push({ combo, name, ax, bd, hs: hs.doc });
    };
    // Account
    { const r = await mkPage("account"); const p = r.page;
      await record("account", p);
      await p.locator("#account-email").fill("v@x.org");
      await tapOrClick(p.getByRole("button", { name: "Update", exact: true }), mobile); await p.waitForTimeout(500);
      await record("account-password-dialog", p, { sel: DLG });
      await r.ctx.close(); }
    // Users list, editor, delete dialog, groups, group editor
    { const r = await mkPage("users"); const p = r.page;
      await record("users", p);
      await tapOrClick(rowOf(p, "mlopez"), mobile); await p.waitForTimeout(500);
      await record("user-editor", p);
      await tapOrClick(S(p).getByRole("button", { name: "Back" }), mobile); await p.waitForTimeout(400);
      // delete dialog from the row delete (visible on touch, on hover otherwise)
      await rowOf(p, "afarah").getByRole("button", { name: "Delete afarah" }).click({ force: true }); await p.waitForTimeout(400);
      await record("users-delete-dialog", p, { sel: DLG });
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      await tapOrClick(p.getByRole("tab", { name: /Groups/ }), mobile); await p.waitForTimeout(400);
      await record("groups", p);
      await tapOrClick(rowOf(p, "Research"), mobile); await p.waitForTimeout(500);
      await record("group-editor", p);
      await r.ctx.close(); }
    // Navigation rail
    { const r = await mkPage("account"); const p = r.page;
      if (mobile) { await p.getByRole("button", { name: /Back/ }).first().tap(); await p.waitForTimeout(500); }
      await record("rail", p, { sel: NAV });
      await r.ctx.close(); }
  }
}
// Report rows
const byName = {};
for (const r of results) (byName[r.name] ||= []).push(r);
for (const [name, rs] of Object.entries(byName)) {
  const bad = rs.flatMap(r => r.ax.filter(x => /serious|critical/.test(x)).map(x => `${r.combo}: ${x}`));
  const lows = rs.flatMap(r => low(r.bd).map(x => `${r.combo}: ${x}`));
  const hs = rs.filter(r => r.hs > 0).map(r => `${r.combo} overflow ${r.hs}px`);
  const all = rs.flatMap(r => r.ax.filter(x => !/serious|critical/.test(x)).map(x => `${r.combo}: ${x}`));
  rec(`VIS-${name}`, bad.length || lows.length || hs.length ? "FAIL" : "PASS", `axe serious/critical=${JSON.stringify(bad)}; minor axe=${JSON.stringify(all)}; badge/pill contrast below 4.5:1=${JSON.stringify(lows)}; horizontal overflow=${JSON.stringify(hs)}; badges measured per combo=${JSON.stringify(rs.map(r => r.combo + ":" + (r.bd ? r.bd.length : "n/a")))}`, `X-07-${name}-1280-light.png`);
}
rec("VIS-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
