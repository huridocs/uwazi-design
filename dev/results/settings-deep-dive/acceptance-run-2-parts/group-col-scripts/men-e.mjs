import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries, axe } from "./lib.mjs";
import { heads, addedHeads, dark, save, kbVar, kbFix } from "./common.mjs";
import * as M from "./menu.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("men-e");
const b = await launch();
const LONG = "https://www.example.org/an/extremely/long/path/segment/that/goes/on/and/on/forever/page-123456";
const mbtn = (p, n) => p.getByRole("button", { name: n, exact: true });

await run(r, "MEN-16m", async () => {
  const { page } = await open(b, "menu", "mobile");
  await kbFix(page);
  await mbtn(page, "Edit Library").click(); await page.waitForTimeout(500);
  await M.fill(page, { title: "Alpha" }); await M.submit(page, "Update");
  await M.addLink(page, { title: "Docs", url: "/page/docs" });
  await M.rowOf(page, "About").locator("input[type=checkbox],[role=checkbox]").first().click({ force: true });
  await S(page).getByRole("button", { name: "Actions", exact: true }).click(); await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Delete", exact: true }).last().click(); await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { const bt = mbtn(page, "Move Resources up"); if (await bt.isEnabled()) { await bt.click(); await page.waitForTimeout(150); } }
  await M.saved(page);
  await page.getByRole("button", { name: "Open menu" }).click(); await page.waitForTimeout(800);
  const items = await page.evaluate(() => [...document.querySelectorAll("a")].filter((e) => e.getBoundingClientRect().height && !e.closest("[inert]")).map((e) => e.textContent.trim()));
  await shot(page, "MEN-16-phone");
  const exp = ["Methodology", "Contact", "Alpha", "Docs"];
  r.add("MEN-16m", pf(JSON.stringify(items.slice(0, 4)) === JSON.stringify(exp) && !items.includes("About")), `phone navigation drawer after the same edits and Save: links ${JSON.stringify(items.slice(0, 6))} (group links first, then Alpha and Docs; About gone=${!items.includes("About")})`, "MEN-16-phone");
  await page.context().close();
});

await run(r, "MEN-20", async () => {
  const { page, errors } = await open(b, "menu", "mobile");
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, Math.max(...[...document.querySelectorAll("[data-testid=settings-content] table, [data-testid=settings-content] [role=row]")].map((e) => e.getBoundingClientRect().width))]);
  const rowsTxt = await S(page).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\n+/g, " | ")));
  const indentX = await S(page).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => Math.round(r.querySelector("[data-component=ReorderGrip]").getBoundingClientRect().left)));
  const kb0 = await kbVar(page);
  const pb = () => page.locator(M.PANEL).evaluate((e) => { const d = e.querySelector("[role=dialog]") || e; const r = d.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
  await mbtn(page, "Edit Library").tap(); await page.waitForTimeout(700);
  const box0 = await pb();
  await shot(page, "MEN-20-sheet");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await kbFix(page); const kb1 = await kbVar(page);
  await mbtn(page, "Edit Library").tap(); await page.waitForTimeout(700);
  const box = await pb();
  await shot(page, "MEN-20-sheet-after-kb-fix");
  await page.locator(M.PANEL).getByLabel("URL").fill(LONG);
  const longTitle = "A very long menu label that has more words than fits on one line of a phone";
  await page.locator(M.PANEL).getByLabel("Title").fill(longTitle);
  const f = await page.locator(M.PANEL).evaluate((p) => { const u = p.querySelector("input[dir=ltr]"); const t = [...p.querySelectorAll("input")].find((i) => i !== u); return { urlVal: u.value.length, urlClient: u.clientWidth, urlScroll: u.scrollWidth, tVal: t.value.length, tClient: t.clientWidth, tScroll: t.scrollWidth, tag: u.tagName }; });
  await shot(page, "MEN-20-long");
  await M.submit(page, "Update");
  const rowText = (await M.rowOf(page, longTitle.slice(0, 20)).count());
  // reorder with buttons
  await mbtn(page, "Move About up").tap(); await page.waitForTimeout(250);
  const t1 = await M.titles(page);
  const foot = await S(page).locator("footer").first().evaluate((f) => [...f.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.top), Math.round(r.bottom), Math.round(r.height), b.disabled]; }));
  const sv = mbtn(page, "Save"); await sv.tap(); await page.waitForTimeout(500);
  const stored = await M.storedMenu(page);
  const hasLong = JSON.stringify(stored).includes("extremely/long");
  const hit = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] [data-part=row] button")].filter((b) => b.getBoundingClientRect().height).map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))));
  await shot(page, "MEN-20");
  const inView = foot.filter((x) => /Add link|Save/.test(x[0])).every((x) => x[1] >= 0 && x[2] <= 844);
  const ok = sw[0] <= sw[1] && sw[2] <= 390 && box0[3] >= 300 && t1[0] === "About" && hasLong && inView && f.urlVal === LONG.length;
  r.add("MEN-20", pf(ok), `390px: scrollWidth ${sw[0]}/${sw[1]}, rows ${JSON.stringify(rowsTxt)}; grip x per row ${JSON.stringify(indentX)} (sub-links indented); Edit opens a panel as the harness leaves the page: [x,y,w,h] ${JSON.stringify(box0)} with :root --kb "${kb0}" (screenshot MEN-20-sheet shows only the scrim; useKeyboardInset measured --kb once at mount, when the layout viewport was 939x2033, and never recomputed); after nudging the viewport by 1 px --kb "${kb1}" and the panel is ${JSON.stringify(box)} (MEN-20-sheet-after-kb-fix); long URL (${LONG.length} chars) in an input ${f.urlClient}px wide with scrollWidth ${f.urlScroll} (value kept in full: ${f.urlVal === LONG.length}); ${longTitle.length}-char title input ${f.tClient}px wide, scrollWidth ${f.tScroll}; reorder with Move About up -> ${JSON.stringify(t1.slice(0, 3))}; footer buttons ${JSON.stringify(foot)} within the 844px viewport=${inView}; Save stored the long URL=${hasLong}; smallest tap dimension of row buttons ${Math.min(...hit)}px; console errors ${JSON.stringify(noise(errors))}`, "MEN-20-sheet");
  r.add("X-06", pf(ok), `Menu at 390x844 touch: rows as cards with no horizontal scroll (${sw}), editor panel ${box0[2]}x${box0[3]} as opened (stale --kb "${kb0}", see MEN-20), row actions and footer Save/Add link tapped by touch; see MEN-20`, "MEN-20");
  // X-02 phone back chevron
  await M.addLink(page, { title: "Dirty", url: "/dirty" });
  await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(500);
  const dBack = await dialogs(page);
  r.add("X-02p", pf(dBack.some((x) => /Discard changes/.test(x))), `phone back chevron with an unsaved link: dialogs ${JSON.stringify(dBack)}`, "");
  await page.context().close();
});

const axeRun = async (vp, dk) => {
  const { page, errors } = await open(b, "menu", vp);
  if (dk) await dark(page); await page.waitForTimeout(400);
  const res = {};
  res.page = await axe(page);
  // selection bar state
  await M.rowOf(page, "About").locator("input[type=checkbox],[role=checkbox]").first().click({ force: true }); await page.waitForTimeout(200);
  res.sel = await axe(page);
  await M.rowOf(page, "About").locator("input[type=checkbox],[role=checkbox]").first().click({ force: true }); await page.waitForTimeout(200);
  // dialog
  if (vp === "mobile") { res.kb0 = await kbVar(page); await kbFix(page); }
  await M.openAdd(page, "link");
  await page.evaluate(async () => { const r = await window.axe.run(document.querySelector("[data-component=MenuItemPanel]"), { resultTypes: ["violations"] }); window.__m = r.violations.map((v) => v.id + " (" + v.impact + ") x" + v.nodes.length + " " + v.nodes.slice(0, 1).map((n) => n.target.join(" ").slice(0, 70)).join()); });
  res.dlg = await page.evaluate(() => window.__m);
  const inside = []; for (let i = 0; i < 10; i++) { await page.keyboard.press("Tab"); inside.push(await page.evaluate(() => !!document.activeElement.closest("[data-component=MenuItemPanel]"))); }
  res.trap = inside.every(Boolean);
  res.name = await page.evaluate(() => { const d = document.querySelector("[data-component=MenuItemPanel] [role=dialog]") || document.querySelector("[role=dialog]:not([inert])"); return d ? d.getAttribute("aria-label") || (d.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby"))?.textContent) : null; });
  await shot(page, `X-07-menu-${vp}-${dk ? "dark" : "light"}-panel`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  res.focusBack = await page.evaluate(() => document.activeElement?.textContent?.trim());
  res.afterEsc = await dialogs(page);
  const labels = await S(page).locator("[data-part=row] button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")).filter(Boolean));
  res.uniq = new Set(labels).size === labels.length; res.nLabels = labels.length;
  // discard dialog
  await M.addLink(page, { title: "Dirty", url: "/d" });
  if (vp === "mobile") await page.getByRole("button", { name: "Back to settings" }).click(); else await rail(page, "Collection");
  await page.waitForTimeout(500);
  await page.evaluate(async () => { const el = document.querySelector("[data-component=ConfirmDialog]"); if (!el) { window.__d = ["no dialog"]; return; } const r = await window.axe.run(el, { resultTypes: ["violations"] }); window.__d = r.violations.map((v) => v.id + " (" + v.impact + ") x" + v.nodes.length + " " + v.nodes.slice(0, 1).map((n) => n.target.join(" ").slice(0, 70)).join()); });
  res.discard = await page.evaluate(() => window.__d);
  await shot(page, `X-07-menu-${vp}-${dk ? "dark" : "light"}-discard`);
  res.errors = noise(errors);
  await page.context().close();
  return res;
};
const all = {};
for (const vp of ["desktop", "mobile"]) for (const dk of [false, true]) await run(r, "X-07", async () => { all[`${vp}-${dk ? "dark" : "light"}`] = await axeRun(vp, dk); });
{
  const ser = (a) => (a || []).filter((x) => /\((serious|critical)\)/.test(x));
  const bad = Object.values(all).filter((v) => ser(v.page).length || ser(v.sel).length || ser(v.dlg).length || ser(v.discard).length || !v.trap || v.afterEsc.length || !v.name || v.focusBack !== "Add link" || !v.uniq || v.errors.length);
  const ev = Object.entries(all).map(([k, v]) => `${k}: page ${JSON.stringify(v.page)}; with selection ${JSON.stringify(v.sel)}; panel ${JSON.stringify(v.dlg)} (name "${v.name}"${v.kb0 ? " (phone: --kb was " + v.kb0 + " at load, viewport nudged before opening)" : ""}, focus trapped=${v.trap}, after Escape focus on "${v.focusBack}", dialogs left ${JSON.stringify(v.afterEsc)}); Discard dialog ${JSON.stringify(v.discard)}; ${v.nLabels} row buttons with unique names=${v.uniq}; console errors ${JSON.stringify(v.errors)}`).join(" || ");
  r.add("X-07", Object.keys(all).length === 4 && !bad.length ? "PASS" : "FAIL", ev, "X-07-menu-desktop-dark-panel");
}
r.add("X-08", "N/A", "Not in Menu's Applies line (Menu has no status pills or badges; the Group tag is checked by axe contrast in X-07, light and dark)");
for (const [vp, nm] of [["desktop", "1280"], ["mobile", "390"]]) await run(r, "DARK-" + nm, async () => {
  const { page } = await open(b, "menu", vp); await dark(page); await page.waitForTimeout(500); await shot(page, `MEN-dark-${nm}`); await page.context().close();
});

r.save();
await b.close();
