import { launch, phonePickCollection, phoneOpen } from "./lib.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch({ w: 390, h: 844 });
const log = (...a) => console.log(...a);
try {
await phonePickCollection(p, /Nepal protests/);
await phoneOpen(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
await p.evaluate(() => { window.__focusLog = []; document.addEventListener("focusin", e => window.__focusLog.push("in:" + (e.target.getAttribute?.("aria-label") || e.target.tagName)), true); document.addEventListener("focusout", e => window.__focusLog.push("out:" + (e.target.getAttribute?.("aria-label") || e.target.tagName)), true); });
const chip = p.locator('[data-component="EvidenceStatus"]').nth(5);
await chip.scrollIntoViewIfNeeded(); await chip.click(); await p.waitForTimeout(900);
const info = await p.evaluate(() => {
  const card = document.querySelector('[data-component="RefEvidenceCard"]');
  const panel = card.querySelector('[role=dialog]');
  const chain = []; for (let e = panel; e; e = e.parentElement) { if (e.hasAttribute("inert") || e.getAttribute("aria-hidden") === "true") chain.push((e.getAttribute("data-component") || e.tagName) + ":" + (e.hasAttribute("inert") ? "inert" : "aria-hidden")); }
  return { panelInert: panel.hasAttribute("inert"), inertAncestors: chain, active: document.activeElement?.tagName + "|" + (document.activeElement?.getAttribute("aria-label") || ""), focusLog: window.__focusLog.slice(0, 12), activeInPanel: panel.contains(document.activeElement) };
});
log(JSON.stringify(info, null, 1));
} catch (e) { log("ERR", e.message.split("\n")[0]); }
await b.close();
