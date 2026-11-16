import { launch, state, OUT } from "./lib2.mjs";
const overflow = (page) => page.evaluate(() => {
  const out = { docScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth, panes: [] };
  for (const s of ["left", "right"]) {
    const p = document.querySelector(`[data-library-pane=${s}]`); const pb = p.getBoundingClientRect(); const bad = [];
    for (const e of p.querySelectorAll("button, input, [role=tab], a, select, canvas, img")) {
      if (e.closest("[inert]") || e.closest(".invisible")) continue;
      const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
      const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (b.right > pb.right + 1 || b.left < pb.left - 1) bad.push((e.getAttribute("aria-label") || e.textContent.trim().slice(0, 18) || e.tagName) + `@${Math.round(b.left)}-${Math.round(b.right)}`);
    }
    out.panes.push({ side: s, w: Math.round(pb.width), outside: bad.slice(0, 8), hOverflow: [...p.querySelectorAll("*")].filter(e => !e.closest("[inert]") && e.scrollWidth > e.clientWidth + 1 && ["auto", "scroll"].includes(getComputedStyle(e).overflowX) && e.clientWidth > 100).map(e => (e.dataset.part || e.tagName) + ":" + e.scrollWidth + ">" + e.clientWidth).slice(0, 4) });
  }
  return out;
});

import { setView } from "./lib2.mjs";
for (const sync of [false, true]) for (const key of ["Home", "End"]) {
  const { browser, page, logs } = await launch({ sync }); page.setDefaultTimeout(10000);
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  const narrow = key === "Home" ? L : R; const side = key === "Home" ? 0 : 1; const wide = key === "Home" ? R : L;
  await narrow.getByPlaceholder(/Search title/).fill("reparaciones"); await page.keyboard.press("Enter"); await page.waitForTimeout(2000);
  await setView(page, key === "Home" ? "left" : "right", "Adv. Search"); await page.waitForTimeout(1500);
  await page.locator('[aria-label="Resize panes"]').focus(); await page.keyboard.press(key); await page.waitForTimeout(1000);
  await narrow.getByRole("button", { name: /^Page \d+, \d+ matches/ }).first().click(); await page.waitForTimeout(3500);
  let o = await overflow(page);
  console.log("sync " + (sync ? "ON " : "OFF"), key, "Document tab in 28rem pane: w=" + o.panes[side].w, "outside=" + JSON.stringify(o.panes[side].outside), "hOverflow=" + JSON.stringify(o.panes[side].hOverflow), "docScrollX=" + o.docScrollX);
  await page.screenshot({ path: OUT + "/narrow-" + key + "-document-sync-" + (sync ? "on" : "off") + ".png" });
  // wide pane also opens a PDF record
  await wide.getByPlaceholder(/Search title/).fill("reparaciones").catch(() => {}); 
  if (logs.length) console.log(logs);
  await browser.close();
}
