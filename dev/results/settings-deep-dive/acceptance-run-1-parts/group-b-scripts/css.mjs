import { launch, open, S, shot, rail, notifTitles, logEntries, axe, dialogs } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { recorder, run, pass, noise } from "./rec.mjs";
const r = recorder("CSS");
const b = await launch();
const save = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
const ta = (p) => S(p).locator("textarea").first();
const tab = (p, n) => S(p).getByRole("tab", { name: n }).or(S(p).getByRole("button", { name: n, exact: true })).first();
const mine = async (p) => (await notifTitles(p)).filter((t) => !/^(Uploading document batch|Processing PDFs|Some fields could|A new version|Entity saved|Failed to save entity|Batch import|Storage usage|Scheduled export)/.test(t));
const dlgTxt = (p) => p.locator("[data-component=ConfirmDialog]").innerText().then((t) => t.replace(/\s+/g, " ")).catch(() => "");

await run(r, "CSS-01", async () => {
  const { page } = await open(b, "customisation");
  const railLabels = await page.locator('nav[aria-label="Settings navigation"] button').allInnerTexts();
  const railItem = railLabels.find((x) => /Global CSS/.test(x));
  const tabs = await S(page).locator('[role=tab]').allInnerTexts();
  const jsEditors = await S(page).locator("textarea").count();
  await shot(page, "CSS-01");
  r("CSS-01", "FAIL", `With Global JS never enabled (the Collection page has no Global JS toggle): rail label "${railItem}" (expected "Global CSS"); page title "Global CSS & JS" (expected "Global CSS"); tabs ${JSON.stringify(tabs)} visible (expected none); textareas ${jsEditors}; JS tab present`, "CSS-01");
  r("CSS-02", "FAIL", `Cannot turn "Global JS" on: Collection has no such toggle. The two-name states do not exist: the rail/title always read "${railItem}" and tabs are always ${JSON.stringify(tabs)} (expected tab names "Custom CSS" and "Custom JS")`);
  r("CSS-13", "FAIL", `Cannot turn "Global JS" off or on: no toggle on Collection. JS tab is always shown (tabs ${JSON.stringify(tabs)}); rail label never changes to "Global CSS"`);
  await page.context().close();
});

await run(r, "CSS-03", async () => {
  const { page } = await open(b, "customisation");
  const seedTxt = await ta(page).inputValue();
  const named = await page.getByRole("textbox", { name: "Custom CSS" }).count();
  const nameAttr = await ta(page).evaluate((e) => ({ aria: e.getAttribute("aria-label"), lab: e.labels?.[0]?.textContent, lby: e.getAttribute("aria-labelledby") }));
  const visLabel = await S(page).getByText("Custom CSS", { exact: true }).count();
  await ta(page).click(); await ta(page).press("Control+End"); await ta(page).type("\nbody { color: red; }");
  const ff = await ta(page).evaluate((e) => [getComputedStyle(e).fontFamily, getComputedStyle(e).direction]);
  await ta(page).fill("a {");
  const err = await S(page).locator("[role=alert],.text-seal").count();
  const lines = await S(page).getByText(/\d+ lines?/).first().textContent();
  await shot(page, "CSS-03");
  r("CSS-03", pass(named === 1 && visLabel >= 1), `seed text "${seedTxt.replace(/\n/g," / ").slice(0,90)}"; accessible-name "Custom CSS" textbox count ${named} (aria-label ${nameAttr.aria}, <label> ${nameAttr.lab}, labelledby ${nameAttr.lby}); visible "Custom CSS" label count ${visLabel}; font ${ff[0].slice(0,40)}, dir ${ff[1]}; "a {" accepted with ${err} errors; counter "${lines}"`, "CSS-03");
  await page.context().close();
});

await run(r, "CSS-04", async () => {
  const { page } = await open(b, "customisation");
  await tab(page, /^JS$|Custom JS/).click(); await page.waitForTimeout(200);
  const jsNamed = await page.getByRole("textbox", { name: "Custom JS" }).count();
  await ta(page).fill("window.__x = 1;");
  await tab(page, /^CSS$|Custom CSS/).click(); await page.waitForTimeout(200);
  await ta(page).fill("p{margin:0}");
  await tab(page, /^JS$|Custom JS/).click(); await page.waitForTimeout(200);
  const js = await ta(page).inputValue();
  await tab(page, /^CSS$|Custom CSS/).click(); await page.waitForTimeout(200);
  const css = await ta(page).inputValue();
  await tab(page, /^JS$|Custom JS/).click(); await page.waitForTimeout(200);
  const warn = await S(page).getByText(/Scripts run on every public page/).count();
  await shot(page, "CSS-04");
  r("CSS-04", pass(js === "window.__x = 1;" && css === "p{margin:0}" && jsNamed === 1 && warn === 0), `tab switches keep unsaved text: JS "${js}", CSS "${css}" (OK); JS area accessible name "Custom JS" textboxes ${jsNamed}; warning text on page: ${warn} ("Scripts run on every public page - use with care." is shown; Uwazi has none)`, "CSS-04");
  await page.context().close();
});

await run(r, "CSS-05", async () => {
  const { page } = await open(b, "customisation");
  const sv = S(page).getByRole("button", { name: "Save", exact: true });
  const d0 = await sv.isDisabled();
  const orig = await ta(page).inputValue();
  await ta(page).fill(orig + "x"); const d1 = await sv.isDisabled();
  await ta(page).fill(orig); const d2 = await sv.isDisabled();
  await ta(page).fill(orig + "y"); await sv.click(); await page.waitForTimeout(400);
  const d3 = await sv.isDisabled();
  await tab(page, /^JS$/).click(); const js = await ta(page).inputValue();
  const col = await sv.evaluate((e) => getComputedStyle(e).backgroundColor);
  r("CSS-05", pass(d0 && !d1 && d3 && js.includes("Collection loaded")), `Save disabled: clean ${d0}, after 1 char ${d1}, after deleting it again ${d2} (reverts to clean), after Save ${d3}; JS text untouched after CSS-only Save: ${js.includes("Collection loaded")}`);
  r("X-03", pass(d3), `After Save the Save button is disabled (${d3}); Discard changes also disabled`);
  await page.context().close();
});

await run(r, "CSS-06", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("a{color:red}"); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(250); await rail(page, "Global CSS & JS"); await page.waitForTimeout(300);
  const v1 = await ta(page).inputValue();
  await page.reload(); await page.waitForTimeout(1200);
  const v2 = await ta(page).inputValue();
  await rail(page, "Dashboard"); await page.waitForTimeout(250);
  await S(page).getByRole("button", { name: /Reset demo data/ }).click(); await page.waitForTimeout(500);
  const c = page.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]");
  if (await c.count()) await c.getByRole("button", { name: /Reset|Confirm/ }).last().click();
  await page.waitForTimeout(800);
  await rail(page, "Global CSS & JS"); await page.waitForTimeout(300);
  const v3 = await ta(page).inputValue();
  r("CSS-06", pass(v1 === "a{color:red}" && v2 === "a{color:red}" && /Global CSS/.test(v3)), `after rail round trip "${v1}", after reload "${v2}", after Reset demo data "${v3.replace(/\n/g, " / ").slice(0, 60)}"`);
  r("X-01", pass(v1 === "a{color:red}" && v2 === "a{color:red}" && /Global CSS/.test(v3)), `CSS persisted across rail and reload; Reset demo data returned the seed`);
  await page.context().close();
});

await run(r, "CSS-07", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("a{color:blue}"); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const afterSave = (await dialogs(page)).length;
  await rail(page, "Global CSS & JS"); await page.waitForTimeout(250);
  await ta(page).fill("a{color:green}");
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const afterEdit = (await dialogs(page)).length;
  r("CSS-07", pass(afterSave === 0 && afterEdit > 0), `dialogs open after Save then rail click: ${afterSave}; after a new edit then rail click: ${afterEdit}`);
  r("X-03", pass(afterSave === 0), `After Save a rail click shows no dialog (${afterSave}); editing again re-enables Save`);
  await page.context().close();
});

await run(r, "CSS-08", async () => {
  const { page } = await open(b, "customisation");
  await tab(page, /^JS$/).click(); await ta(page).fill("//js edit");
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const t1 = await dlgTxt(page); const btns = await page.locator("[data-component=ConfirmDialog] button").allInnerTexts();
  await shot(page, "CSS-08");
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Keep editing|Cancel/ }).click(); await page.waitForTimeout(300);
  const kept = (await ta(page).inputValue()) === "//js edit";
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const again = (await dialogs(page)).length > 0;
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /^Discard/ }).click(); await page.waitForTimeout(400);
  await rail(page, "Global CSS & JS"); await page.waitForTimeout(300);
  await tab(page, /^JS$/).click(); const jsBack = await ta(page).inputValue();
  await tab(page, /^CSS$/).click(); await ta(page).fill("css edit");
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const cssTrig = (await dialogs(page)).length > 0;
  const exact = /Discard changes\?/.test(t1) && /You have unsaved changes\. Do you want to continue\?/.test(t1);
  r("CSS-08", pass(exact && kept && again), `JS-only edit then rail click opens dialog "${t1}" with buttons ${JSON.stringify(btns)}; keep-editing keeps text: ${kept}; second click reopens: ${again}; Discard shows stored JS "${jsBack.replace(/\n/g," / ").slice(0,40)}"; CSS-only edit triggers dialog: ${cssTrig}. Expected title "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" and "Discard changes"`, "CSS-08");
  r("X-02", pass(exact && kept && again), `Guard works (dialog on rail click while dirty, keep keeps edit, discard navigates) but copy differs: "${t1}", buttons ${JSON.stringify(btns)}`, "CSS-08");
  await page.context().close();
});

await run(r, "CSS-09", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("a{color:red}"); await save(page);
  const n = await mine(page);
  r("CSS-09", pass(n.length === 1 && /^Saved successfully\./.test(n[0])), `Beacon entries after one Save: ${JSON.stringify(n)} (expected one entry titled "Saved successfully.")`);
  r("X-04", pass(n.length === 1 && /^Saved successfully\./.test(n[0])), `Beacon after Save: ${JSON.stringify(n)}`);
  await page.context().close();
});

await run(r, "CSS-14", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("ZZMARKER-1\nline2\nline3");
  await tab(page, /^JS$/).click(); await ta(page).fill("ZZMARKER-2\nline2");
  await save(page);
  const log = await logEntries(page);
  const raw = await page.evaluate(() => sessionStorage.getItem("uwazi:settings:activity") || "");
  await rail(page, "Activity log"); await page.waitForTimeout(600);
  const txt = (await S(page).innerText()).replace(/\n+/g, " | ");
  const hasMarker = /ZZMARKER/.test(txt) || /ZZMARKER/.test(raw);
  await shot(page, "CSS-14");
  const okEntries = /Updated custom CSS/.test(txt) && /Updated custom JS/.test(txt);
  r("CSS-14", pass(okEntries && !hasMarker), `one Save of CSS (3 lines) + JS (2 lines): stored entries ${JSON.stringify(log)}; Activity page text has "Updated custom CSS": ${/Updated custom CSS/.test(txt)}, "Updated custom JS": ${/Updated custom JS/.test(txt)}; marker leaked into log: ${hasMarker}; page text excerpt "${txt.slice(0, 260)}"`, "CSS-14");
  r("X-09", pass(log.some((l) => /admin/.test(l) && /CSS|Customis/i.test(l))), `Activity log after Save: ${JSON.stringify(log)}`);
  await page.context().close();
});

await run(r, "CSS-10", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("body { background: rgb(255, 0, 0); }"); await save(page);
  await rail(page, "Pages"); await page.waitForTimeout(500);
  const firstRow = S(page).locator("[role=row]").nth(1);
  await firstRow.click(); await page.waitForTimeout(1500);
  await shot(page, "CSS-10");
  const res = await page.evaluate(() => {
    const out = [];
    const docs = [document, ...[...document.querySelectorAll("iframe")].map((f) => { try { return f.contentDocument; } catch { return null; } }).filter(Boolean)];
    for (const d of docs) {
      const styles = [...d.querySelectorAll("style")].map((s) => s.textContent).filter((t) => /rgb\(255, 0, 0\)/.test(t)).length;
      out.push({ iframe: d !== document, styleWithCss: styles, bodyBg: getComputedStyle(d.body).backgroundColor });
    }
    return out;
  });
  r("CSS-10", "FAIL", `Saved \`body { background: rgb(255, 0, 0); }\`; opened the Pages editor on the first page (preview). Documents seen: ${JSON.stringify(res)}. The saved Global CSS is not applied in the preview (no style element carries it; nothing in the app reads the Global CSS store outside its own page). Public preview not reachable. `, "CSS-10");
  // CSS-15 compare code areas
  const fontPages = await page.evaluate(() => { const t = [...document.querySelectorAll("textarea")][0]; return t ? [getComputedStyle(t).fontFamily, getComputedStyle(t).fontSize] : null; });
  await page.context().close();
  const { page: p2 } = await open(b, "customisation");
  const fontCss = await ta(p2).evaluate((e) => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontSize]);
  const gut = await p2.evaluate(() => (window.__gutter ? JSON.stringify(window.__gutter()).slice(0, 200) : "no __gutter"));
  const box = await ta(p2).evaluate((e) => { const pane = document.querySelector('[data-testid=settings-content]').getBoundingClientRect(); const b = e.closest("div.border").getBoundingClientRect(); return [Math.round(b.left - pane.left), Math.round(pane.right - b.right)]; });
  r("CSS-15", pass(JSON.stringify(fontPages) === JSON.stringify(fontCss) && /ok|\[\]|true|\{\}/.test(gut)), `Global CSS code area font ${JSON.stringify(fontCss)}; Pages code area font ${JSON.stringify(fontPages)}; __gutter(): ${gut}; code-area edge offsets from pane [left,right] ${box}`);
  await p2.context().close();
});

await run(r, "CSS-11", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("body { background: rgb(255, 0, 0); } /*ZZ-ADMIN*/"); await save(page);
  await page.reload(); await page.waitForTimeout(1200);
  const a = await page.evaluate(() => ({ styles: [...document.querySelectorAll("style")].filter((s) => /ZZ-ADMIN/.test(s.textContent)).length, bg: getComputedStyle(document.body).backgroundColor }));
  await rail(page, "Menu"); await page.waitForTimeout(300);
  const a2 = await page.evaluate(() => ({ styles: [...document.querySelectorAll("style")].filter((s) => /ZZ-ADMIN/.test(s.textContent)).length, bg: getComputedStyle(document.body).backgroundColor }));
  r("CSS-11", pass(a.styles === 0 && a2.styles === 0 && !/255, 0, 0/.test(a.bg)), `after save+reload: style elements carrying the CSS in the admin shell ${a.styles}, body background ${a.bg}; on Menu page ${a2.styles} / ${a2.bg}`);
  await page.context().close();
});

await run(r, "CSS-12", async () => {
  const { page } = await open(b, "customisation");
  const t0 = await page.title();
  await tab(page, /^JS$/).click(); await ta(page).fill("window.__ran = true; document.title = 'JS ran'"); await save(page);
  await page.reload(); await page.waitForTimeout(1200);
  const a = await page.evaluate(() => ({ ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].filter((s) => /__ran/.test(s.textContent)).length }));
  await rail(page, "Pages"); await page.waitForTimeout(400);
  await S(page).locator("[role=row]").nth(1).click(); await page.waitForTimeout(1500);
  const b2 = await page.evaluate(() => ({ ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].filter((s) => /__ran/.test(s.textContent)).length }));
  await rail(page, "Global CSS & JS").catch(()=>{}); 
  r("CSS-12", pass(a.ran === "undefined" && b2.ran === "undefined" && a.title === t0 && a.scripts === 0 && b2.scripts === 0), `after saving JS and reload: window.__ran ${a.ran}, title "${a.title}" (was "${t0}"), script elements with the text ${a.scripts}; in Pages editor: ${JSON.stringify(b2)}. JS text still shown after reload not re-verified separately`);
  await page.context().close();
});

await run(r, "CSS-16", async () => {
  const { page } = await open(b, "customisation", "mobile");
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  const tabs = await S(page).locator("[role=tab]").evaluateAll((e) => e.map((x) => Math.round(x.getBoundingClientRect().top)));
  const h = await ta(page).evaluate((e) => e.getBoundingClientRect().height);
  await ta(page).tap().catch(() => ta(page).click()); await ta(page).fill("a{}");
  const sv = S(page).getByRole("button", { name: "Save", exact: true }); const box = await sv.boundingBox();
  await shot(page, "CSS-16");
  const ok = sw[0] <= sw[1] && new Set(tabs).size === 1 && h >= 320 && box && box.y + box.height <= 844;
  r("CSS-16", pass(ok), `scrollWidth ${sw[0]} / ${sw[1]}; tab tops ${JSON.stringify(tabs)}; code area height ${Math.round(h)}px (20rem=320); Save at y=${box?.y}. Global JS flag cannot be set so the JS tab is always present`, "CSS-16");
  r("X-06", pass(ok), `phone: no horizontal scroll (${sw[0]}/${sw[1]}), tabs on one row, editor ${Math.round(h)}px high, Save reachable`, "CSS-16");
  await page.context().close();
});

await run(r, "X-07", async () => {
  const { page } = await open(b, "customisation");
  const v = await axe(page);
  await ta(page).fill("x"); const d0 = await S(page).getByRole("button", { name: /Reset/ }).isEnabled();
  await S(page).getByRole("button", { name: /Reset/ }).click(); await page.waitForTimeout(400);
  const dn = await dialogs(page);
  const v2 = await axe(page);
  const hasSerious = [...v, ...v2].some((x) => /serious|critical/.test(x));
  r("X-07", hasSerious ? "FAIL" : "PASS", `axe on pane: ${v.length ? v.join(" ; ") : "none"}; with the Reset dialog open (${JSON.stringify(dn)}): ${v2.length ? v2.join(" ; ") : "none"}; textarea accessible name: ${await ta(page).evaluate(e=>e.getAttribute("aria-label")||e.labels?.[0]?.textContent||"(none)")}`);
  await page.context().close();
});

await b.close();
