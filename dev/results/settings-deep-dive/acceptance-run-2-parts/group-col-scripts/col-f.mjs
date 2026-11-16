import { launch, open, S, shot, rail, dialogs, notifTitles, axe, rows } from "./lib.mjs";
import { toSettings, save, bodyText, added, clean, field, addUploads, dark, light, kbVar, kbFix } from "./common.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("col-f");
const b = await launch();
const NAME = (p) => S(p).getByLabel("Collection Name");
const MOD = "[data-component=ImagePickerModal]";

await run(r, "COL-30", async () => {
  const { page } = await open(b, "collection");
  await rail(page, "Global CSS"); await page.waitForTimeout(500);
  await S(page).getByLabel("Global CSS", { exact: true }).fill("a{color:red}");
  await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const menu0 = await rows(page);
  await rail(page, "Languages"); await page.waitForTimeout(500);
  const lang0 = await rows(page);
  await rail(page, "Collection"); await page.waitForTimeout(500);
  await NAME(page).fill("Changed only the name"); await save(page);
  await rail(page, "Global CSS"); await page.waitForTimeout(500);
  const css = await S(page).getByLabel("Global CSS", { exact: true }).inputValue();
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const menu1 = await rows(page);
  await rail(page, "Languages"); await page.waitForTimeout(500);
  const lang1 = await rows(page);
  const good = css === "a{color:red}" && JSON.stringify(menu0) === JSON.stringify(menu1) && JSON.stringify(lang0) === JSON.stringify(lang1) && menu0.length > 1 && lang0.length > 1;
  r.add("COL-30", pf(good), `Global CSS text after the Collection Save "${css}"; Menu rows before/after equal=${JSON.stringify(menu0) === JSON.stringify(menu1)} (${menu0.length} rows); Languages rows equal=${JSON.stringify(lang0) === JSON.stringify(lang1)} (${lang0.length} rows)`);
  await page.context().close();
});

await run(r, "COL-32", async () => {
  const { page } = await open(b, "collection");
  const describe = (sel) => page.evaluate((sel) => {
    const e = document.querySelector(sel); if (!e) return null;
    const ids = (e.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    return { ids: ids.length, text: ids.map((i) => document.getElementById(i)?.textContent.trim().slice(0, 70)).join(" || ") };
  }, sel);
  const landing = await describe("#landing-page");
  const gjs = await page.evaluate(() => { const row = [...document.querySelectorAll("[data-part=toggle]")].find((x) => /Global JS/.test(x.textContent)); const c = row.querySelector("input,[role=checkbox]"); const ids = (c.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean); return { ids: ids.length, name: c.getAttribute("aria-label"), text: ids.map((i) => document.getElementById(i)?.textContent.trim().slice(0, 70)).join(" || ") }; });
  const analytics = await page.evaluate(() => { const h = [...document.querySelectorAll("h3")].find((x) => x.textContent.trim() === "Analytics"); const sec = h.closest("section,[role=group],[data-component=SettingsSection]"); const ids = (sec?.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean); const hid = h.id; const inputs = [...(sec?.querySelectorAll("input") || [])].map((i) => i.getAttribute("aria-describedby")); return { secTag: sec?.tagName, secRole: sec?.getAttribute("role"), secLabel: sec?.getAttribute("aria-labelledby"), secDescribed: ids.length, descText: sec ? [...sec.querySelectorAll("p")].map((p) => p.textContent.trim().slice(0, 60)).join("|") : null, inputsDescribed: inputs }; });
  const favicon = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Choose"); const ids = (b.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean); return ids.map((i) => document.getElementById(i)?.textContent.trim().slice(0, 50)); });
  // tab sequence from the top of the form
  await NAME(page).focus();
  const seq = [];
  for (let i = 0; i < 22; i++) { await page.keyboard.press("Tab"); seq.push(await page.evaluate(() => { const e = document.activeElement; return (e.getAttribute("aria-label") || e.id || e.textContent.trim().slice(0, 24) || e.tagName); })); }
  let mapStops = 0; for (let i = 0; i < 400; i++) { const inMap = await page.evaluate(() => !!document.activeElement.closest("[data-component=MapPointPicker]")); if (inMap) mapStops++; else if (mapStops) break; await page.keyboard.press("Tab"); }
  const tooltipOnly = await S(page).locator("[title]").count();
  await shot(page, "COL-32");
  const good = landing?.ids >= 1 && /landing page/i.test(landing.text) && gjs.ids >= 1 && /great power/i.test(gjs.text) && !!gjs.name;
  r.add("COL-32", pf(good), `no "?" help buttons exist; help is text under the field. #landing-page aria-describedby -> ${landing?.ids} element(s) "${landing?.text}"; Global JS checkbox name "${gjs.name}" describedby -> "${gjs.text}"; Analytics card: ${JSON.stringify(analytics)}; favicon Choose describedby "${JSON.stringify(favicon)}"; tab order after Collection Name: ${JSON.stringify(seq)}; elements with title attr ${tooltipOnly}; observation: after "Add map layer" Tab enters the map and stops on ${mapStops} map country paths before leaving it (MapPointPicker describes itself as not focusable)`, "COL-32");
  await page.context().close();
});

const phone = async (dk) => {
  const { page, errors } = await open(b, "collection", "mobile");
  if (dk) await dark(page); await page.waitForTimeout(300);
  return { page, errors };
};
await run(r, "COL-33", async () => {
  const { page, errors } = await phone(false);
  await addUploads(page, ["fav-64x64.png"], "Collection").catch(() => {});
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.querySelector("[data-testid=settings-content]").scrollWidth, document.querySelector("[data-testid=settings-content]").clientWidth]);
  const lefts = await S(page).locator("[data-component=SettingsField]").evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))]);
  const widths = await S(page).locator("[data-component=SettingsField]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  // map tap
  const mp = page.locator("[data-component=MapPointPicker]");
  await mp.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const bb = await mp.boundingBox(); const latBox = await S(page).locator("#map-latitude").boundingBox();
  await page.touchscreen.tap(bb.x + bb.width * 0.3, bb.y + bb.height * 0.6); await page.waitForTimeout(300);
  const lat = await S(page).locator("#map-latitude").inputValue(); const lon = await S(page).locator("#map-longitude").inputValue();
  const marker = await mp.locator("circle").count();
  const below = latBox.y > bb.y + bb.height - 2;
  await shot(page, "COL-33-map");
  // favicon modal
  const kb0 = await kbVar(page);
  const panelBox = () => page.evaluate(() => { const m = document.querySelector("[data-component=ImagePickerModal] [role=dialog]"); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
  await S(page).locator('[role=group]').filter({ hasText: "Custom Favicon" }).getByRole("button", { name: /Choose|Change/ }).tap(); await page.waitForTimeout(700);
  const dlgBox0 = await panelBox();
  await shot(page, "COL-33-modal");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await kbFix(page); const kb1 = await kbVar(page);
  await S(page).locator('[role=group]').filter({ hasText: "Custom Favicon" }).getByRole("button", { name: /Choose|Change/ }).tap(); await page.waitForTimeout(700);
  const dlgBox = await panelBox();
  await shot(page, "COL-33-modal-after-kb-fix");
  const gal = await page.locator(`${MOD} [data-part=gallery] li`).count();
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  // footer: simulate keyboard by shrinking the viewport, focus an input
  await page.setViewportSize({ width: 390, height: 544 });
  await NAME(page).scrollIntoViewIfNeeded(); await NAME(page).focus(); await NAME(page).fill("Phone edit"); await page.waitForTimeout(300);
  const sv = await S(page).getByRole("button", { name: "Save", exact: true }).boundingBox();
  const dc = await S(page).getByRole("button", { name: "Discard changes" }).boundingBox();
  const inView = (bx) => bx && bx.y >= 0 && bx.y + bx.height <= 544;
  const sticky = await page.evaluate(() => { const bt = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Save"); let e = bt; while (e && getComputedStyle(e).position !== "sticky" && getComputedStyle(e).position !== "fixed" && e !== document.body) e = e.parentElement; return e && e !== document.body ? getComputedStyle(e).position : "none"; });
  await shot(page, "COL-33-footer");
  await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(500);
  const dBack = await dialogs(page);
  r.add("X-02p", pf(dBack.some((x) => /Discard changes/.test(x))), `phone back chevron with an unsaved edit: dialogs ${JSON.stringify(dBack)}`);
  const good = sw[0] <= sw[1] && sw[2] <= sw[3] && lefts.length === 1 && marker === 1 && !!lat && !!lon && below && dlgBox0 && dlgBox0[3] >= 200 && inView(sv) && inView(dc);
  r.add("COL-33", pf(good), `390px: document scrollWidth ${sw[0]} vs client ${sw[1]}, settings pane ${sw[2]}/${sw[3]}; field left edges ${JSON.stringify(lefts)} (one column), field widths ${JSON.stringify([...new Set(widths)])}; tapped map -> marker ${marker}, lat ${lat}, lon ${lon}; Latitude input below the map=${below}; favicon modal opened as the harness leaves the page: panel box [x,y,w,h] ${JSON.stringify(dlgBox0)} (expected a sheet or full screen; the screenshot COL-33-modal shows only the dimmed page); :root --kb is "${kb0}" although innerHeight equals visualViewport.height (useKeyboardInset measured it once at mount while the layout viewport was 939x2033 and never recomputed); after nudging the viewport by 1 px so the app recomputes, --kb "${kb1}" and the panel is [x,y,w,h] ${JSON.stringify(dlgBox)} showing ${gal} gallery items (COL-33-modal-after-kb-fix); with the viewport shortened to 544 px high (keyboard stand-in) and the name focused, Save in view=${inView(sv)} and Discard changes in view=${inView(dc)} (footer position ${sticky}); console errors ${JSON.stringify(noise(errors))}`, "COL-33-map");
  r.add("X-06", pf(good), `Collection at 390x844 touch: no horizontal scroll (${sw}), one column, favicon modal panel ${dlgBox0 && dlgBox0[2]}x${dlgBox0 && dlgBox0[3]} px as opened (stale --kb "${kb0}", see COL-33); map tap and Choose tap worked, footer reachable`, "COL-33-modal");
  await page.context().close();
});

// X-07 / X-08: axe + dialogs, light and dark, 1280 and 390
const axeRun = async (vp, dk) => {
  const { page, errors } = await open(b, "collection", vp);
  if (dk) await dark(page); await page.waitForTimeout(400);
  const res = {};
  res.page = await axe(page);
  if (vp === "mobile") { res.kb0 = await kbVar(page); await kbFix(page); }
  await S(page).locator('[role=group]').filter({ hasText: "Custom Favicon" }).getByRole("button", { name: "Choose" }).click(); await page.waitForTimeout(700);
  res.favicon = await axe(page);
  await page.evaluate(async () => { const r = await window.axe.run(document.querySelector("[data-component=ImagePickerModal]"), { resultTypes: ["violations"] }); window.__m = r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length} ${v.nodes.slice(0,1).map((n) => n.target.join(" ").slice(0,80)).join()}`); });
  res.faviconModal = await page.evaluate(() => window.__m);
  // focus trap
  const inside = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); inside.push(await page.evaluate(() => !!document.activeElement.closest("[data-component=ImagePickerModal]"))); }
  res.trap = inside.every(Boolean);
  const dn = await page.evaluate(() => { const d = document.querySelector("[data-component=ImagePickerModal] [role=dialog]") || document.querySelector("[role=dialog]:not([inert])"); return d ? d.getAttribute("aria-label") || (d.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby"))?.textContent) : null; });
  res.name = dn;
  res.panel = await page.evaluate(() => { const m = document.querySelector("[data-component=ImagePickerModal] [role=dialog]"); if (!m) return null; const r = m.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  await shot(page, `X-07-${vp}-${dk ? "dark" : "light"}-modal`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  res.focusBack = await page.evaluate(() => document.activeElement?.textContent?.trim());
  // discard dialog
  await NAME(page).fill("dirty");
  if (vp === "mobile") await page.getByRole("button", { name: "Back to settings" }).click(); else await rail(page, "Menu");
  await page.waitForTimeout(600);
  res.discardDlg = await dialogs(page);
  await page.evaluate(async () => { const el = document.querySelector("[data-component=ConfirmDialog]"); if (!el) { window.__d = ["no dialog"]; return; } const r = await window.axe.run(el, { resultTypes: ["violations"] }); window.__d = r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length} ${v.nodes.slice(0,1).map((n) => n.target.join(" ").slice(0,80)).join()}`); });
  res.discard = await page.evaluate(() => window.__d);
  res.discardName = await page.evaluate(() => document.querySelector("[data-component=ConfirmDialog] [role=dialog]")?.getAttribute("aria-label") || document.querySelector("[data-component=ConfirmDialog] [role=dialog]")?.getAttribute("aria-labelledby"));
  await shot(page, `X-07-${vp}-${dk ? "dark" : "light"}-discard`);
  res.errors = noise(errors);
  await page.context().close();
  return res;
};
const serious = (a) => (a || []).filter((x) => /\((serious|critical)\)/.test(x));
const all = {};
for (const vp of ["desktop", "mobile"]) for (const dk of [false, true]) {
  await run(r, "X-07", async () => { all[`${vp}-${dk ? "dark" : "light"}`] = await axeRun(vp, dk); });
}
{
  const bad = Object.entries(all).filter(([, v]) => !v.panel || v.panel[1] < 100 || serious(v.page).length || serious(v.favicon).length || serious(v.faviconModal).length || serious(v.discard).length || !v.trap || v.focusBack !== "Choose" || !v.name || v.errors.length);
  const ev = Object.entries(all).map(([k, v]) => `${k}: page ${JSON.stringify(v.page)}; with favicon modal open ${JSON.stringify(v.faviconModal)}; Discard dialog ${JSON.stringify(v.discard)} (name "${v.discardName}"); modal name "${v.name}", panel size ${JSON.stringify(v.panel)}${v.kb0 ? " (phone: --kb was " + v.kb0 + " at load, the viewport was nudged before opening)" : ""}, focus trapped over 12 Tabs=${v.trap}, focus after Escape on "${v.focusBack}", Escape left ${JSON.stringify(v.discardDlg)}; console errors ${JSON.stringify(v.errors)}`).join(" || ");
  r.add("X-07", Object.keys(all).length === 4 && !bad.length ? "PASS" : "FAIL", ev, "X-07-desktop-dark-modal");
}
r.add("X-08", "N/A", "Not in Collection's Applies line (no status pills or badges on the page; the map-layer pills are checked for contrast by axe in X-07, light and dark)");

// visual dark look
for (const [vp, nm] of [["desktop", "1280"], ["mobile", "390"]]) await run(r, "DARK-" + nm, async () => {
  const { page } = await open(b, "collection", vp); await dark(page); await page.waitForTimeout(500);
  await shot(page, `COL-dark-${nm}`);
  await page.context().close();
});

r.save();
await b.close();
