import fs from "fs";
import { launch, open, shot, S, rows, title, dialogs, notifTitles, logEntries, axe, OUT } from "./lib.mjs";
export { launch, open, shot, S, rows, title, dialogs, notifTitles, logEntries, axe, OUT };

// ---- result recording ----
export function recorder(file) {
  const res = [];
  const rec = (id, result, evidence = "", shotName = "") => {
    res.push({ id, result, evidence: String(evidence).replace(/\|/g, "\\|").replace(/\n/g, " "), shot: shotName });
    console.log(result, "|", id, "|", String(evidence).slice(0, 400));
  };
  const save = () => fs.writeFileSync(file, JSON.stringify(res, null, 1));
  return { res, rec, save };
}
export const sh = (p, name) => shot(p, `group-lng-${name}`).then(() => `group-lng-${name}.png`);

export const dark = (p) => p.evaluate(() => document.documentElement.classList.add("dark"));
export const light = (p) => p.evaluate(() => document.documentElement.classList.remove("dark"));

// ---- app helpers ----
export const logo = (p) => p.locator("button[data-part=logo]");
export const beacon = (p) => p.evaluate(() => [...document.querySelectorAll("button")].filter(b => /^Notifications/.test(b.getAttribute("aria-label") || "")).map(b => b.getAttribute("aria-label") + "|" + b.innerText.replace(/\n/g, " ")));
// Entries mentioning the given text (tasks and notifications are <article>s)
export const notifMatch = async (p, re) => (await notifTitles(p)).filter(t => re.test(t));
export const section = async (p, name) => { await p.locator('nav[aria-label="Settings navigation"] button', { hasText: name }).first().click(); await p.waitForTimeout(500); };

/** Arm the Dev panel's "Fail next request" and return to Settings in the same page session. */
export async function backToSettings(p, rail = "Languages") {
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(250);
  await p.getByRole("button", { name: /System settings/ }).click(); await p.waitForTimeout(600);
  await p.locator('nav[aria-label="Settings navigation"] button', { hasText: rail }).first().click(); await p.waitForTimeout(500);
}
export async function arm(p, scopeLabel, reason = "Injected failure for QA.", rail = "Languages") {
  await logo(p).click();
  await p.waitForTimeout(700);
  const dp = p.locator("[data-component=DevPanel]").first();
  await dp.scrollIntoViewIfNeeded();
  await dp.getByRole("combobox", { name: "Failure scope" }).click().catch(async () => { await dp.getByLabel("Failure scope").click(); });
  await p.waitForTimeout(200);
  await p.getByRole("option", { name: scopeLabel, exact: true }).click();
  await dp.getByLabel("Failure reason").fill(reason);
  await dp.getByRole("button", { name: "Arm", exact: true }).click();
  await p.waitForTimeout(200);
  const status = await dp.locator("[role=status]").first().innerText();
  await p.getByRole("button", { name: /Return to app/ }).click();
  await p.waitForTimeout(700);
  await backToSettings(p, rail);
  return status;
}

// WCAG contrast of an element's text on its effective background (composited up the tree)
export const contrast = (p, selector, textMatch) => p.evaluate(([sel, tm]) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => { const a = f[3]; return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const els = [...document.querySelectorAll(sel)].filter(e => !e.closest("[inert]") && e.getBoundingClientRect().width > 0 && (!tm || new RegExp(tm).test(e.textContent.trim())));
  return els.slice(0, 6).map(e => {
    const fg0 = rgba(getComputedStyle(e).color);
    let bg = [255, 255, 255, 1]; const chain = []; for (let n = e; n; n = n.parentElement) chain.push(n);
    chain.reverse(); let acc = rgba(getComputedStyle(document.documentElement).backgroundColor); if (acc[3] === 0) acc = [255, 255, 255, 1];
    for (const n of chain) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) acc = over(c, acc); }
    const fg = over(fg0, acc);
    const L1 = lum(fg), L2 = lum(acc); const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return `${e.textContent.trim().slice(0, 24)}=${r.toFixed(2)}`;
  });
}, [selector, textMatch]);

export async function axeSerious(p, scopeSel) {
  await p.evaluate(fs.readFileSync("/Users/juanmnl/Developer/huridocs/uwazi_app/app/node_modules/axe-core/axe.min.js", "utf8"));
  return p.evaluate(async (sel) => {
    const root = document.querySelector(sel) || document.body;
    const r = await window.axe.run(root, { resultTypes: ["violations"] });
    return r.violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`);
  }, scopeSel || '[data-testid="settings-content"]');
}
export const hasHScroll = (p) => p.evaluate(() => { const s = document.querySelector('[data-testid="settings-content"]'); const w = document.documentElement; return { page: w.scrollWidth > w.clientWidth + 1, pane: s ? s.scrollWidth > s.clientWidth + 1 : null, sw: s?.scrollWidth, cw: s?.clientWidth }; });

/** Phone context: Playwright's mobile emulation leaves the app's `--kb` (useKeyboardInset)
 *  at innerHeight - visualViewport.height of the first paint (1189px here), which collapses every
 *  full-screen dialog to zero height. A 1px viewport nudge makes visualViewport fire `resize`. */
export async function openPhone(browser, section, opts = {}) {
  const r = await open(browser, section, "mobile", opts);
  const kb0 = await r.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--kb"));
  await r.page.setViewportSize({ width: 390, height: 843 });
  await r.page.waitForTimeout(150);
  await r.page.setViewportSize({ width: 390, height: 844 });
  await r.page.waitForTimeout(300);
  r.kb0 = kb0;
  r.kb1 = await r.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--kb"));
  return r;
}
