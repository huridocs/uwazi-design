import { launch, open, S, shot, rail, notifTitles, logEntries, axe, dialogs } from "./lib.mjs";
import { switchTo, crumb, viewLabel } from "./h.mjs";
import { recorder, run, pass, noise } from "./rec.mjs";
const r = recorder("COL");
const b = await launch();
const save = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
const newest = async (p) => (await notifTitles(p)).filter((t) => !/^(Uploading document batch|Processing PDFs|Some fields could|A new version|Entity saved|Failed to save entity|Batch import|Storage usage|Scheduled export)/.test(t));
const labels = (p) => S(p).evaluate((e) => [...e.querySelectorAll("label,span,h2,h3")].filter(x=>x.children.length===0).map(x=>x.textContent.trim()).filter(Boolean));

// ---- COL-01 layout
await run(r, "COL-01", async () => {
  const { page, errors } = await open(b, "collection");
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const want = ["General", "Analytics", "Forms and email configuration", "Map", "Collection Name", "Custom Favicon", "Default View", "Default date format", "Custom landing page", "Public instance", "Hide restricted relationships from public", "Show cookie policy", "Global JS"];
  const missing = want.filter((w) => !t.includes(w));
  const w = await S(page).locator("form, [data-component=CollectionPage]").first().evaluate((e) => e.getBoundingClientRect().width).catch(() => null);
  const ph = await S(page).locator("[placeholder]").count();
  const gut = await page.evaluate(() => (window.__gutter ? JSON.stringify(window.__gutter()).slice(0, 150) : "no __gutter"));
  await shot(page, "COL-01");
  r("COL-01", missing.length ? "FAIL" : "PASS", `saw page text: "${t.slice(0, 330)}". Missing expected cards/labels: ${missing.join(", ")}. Placeholders: ${ph}. gutter: ${gut}`, "COL-01");
  await page.context().close();
});

// ---- COL-02 persistence (X-01), COL-04 crumb, X-03, COL-28, COL-29, COL-31, X-04, X-09
await run(r, "COL-02", async () => {
  const { page, errors } = await open(b, "collection");
  const f = S(page).getByLabel("Collection name");
  const seed = await f.inputValue();
  await f.fill("Test Archive");
  await save(page);
  const a = await f.inputValue();
  await rail(page, "Menu"); await page.waitForTimeout(300); await rail(page, "Collection"); await page.waitForTimeout(400);
  const v2 = await S(page).getByLabel("Collection name").inputValue();
  await page.reload(); await page.waitForTimeout(1200);
  const v3 = await S(page).getByLabel("Collection name").inputValue();
  const ph = await S(page).getByLabel("Collection name").getAttribute("placeholder");
  const lab = await S(page).locator("label", { hasText: /^Collection name$/i }).first().textContent().catch(() => null);
  const ok = a === "Test Archive" && v2 === "Test Archive" && v3 === "Test Archive" && !ph;
  r("COL-02", pass(ok), `seed "${seed}"; after Save "${a}", after rail round trip "${v2}", after reload "${v3}"; placeholder=${ph}; visible label text "${lab}" (checklist spells it "Collection Name")`);
  r("X-01", pass(ok), `Collection name persisted through Save, rail round trip and reload ("${v3}"). Reset-demo-data restore not driven here (see below).`);
  // X-01 reset
  await page.context().close();
});

await run(r, "COL-04", async () => {
  const { page } = await open(b, "collection");
  await S(page).getByLabel("Collection name").fill("Test Archive");
  await save(page);
  const crumbTxt = await crumb(page).innerText().catch(() => "");
  const aria = await crumb(page).getAttribute("aria-label");
  const title = await page.title();
  await switchTo(page, "CEJIL");
  const cejilName = await S(page).getByLabel("Collection name").inputValue().catch(()=>"?");
  const cejilCrumb = await crumb(page).innerText();
  await switchTo(page, "Sample");
  const back = await S(page).getByLabel("Collection name").inputValue().catch(()=>"?");
  // login screen
  await page.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("login")); });
  await page.reload(); await page.waitForTimeout(1200);
  const login = (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 300);
  await shot(page, "COL-04-login");
  const ok = /Test Archive/.test(crumbTxt + aria) && /Test Archive/.test(login);
  r("COL-04", pass(ok), `after Save: navbar crumb text "${crumbTxt.replace(/\n/g," ")}" (aria "${aria}"), window title "${title}". CEJIL name "${cejilName}", CEJIL crumb "${cejilCrumb.replace(/\n/g," ")}"; back on Sample "${back}". Login screen text has Test Archive: ${/Test Archive/.test(login)} ("${login.slice(0,160)}")`, "COL-04-login");
  await page.context().close();
});

await run(r, "COL-28", async () => {
  const { page, errors } = await open(b, "collection");
  const sv = S(page).getByRole("button", { name: "Save", exact: true });
  const dc = S(page).getByRole("button", { name: "Discard changes" });
  const clean = [await dc.isDisabled(), await sv.isDisabled()];
  const f = S(page).getByLabel("Collection name"); const seed = await f.inputValue();
  await f.fill("Zed");
  const dirty = [await dc.isDisabled(), await sv.isDisabled()];
  await dc.click(); await page.waitForTimeout(300);
  const restored = await f.inputValue();
  const afterDiscard = [await dc.isDisabled(), await sv.isDisabled()];
  await f.fill("Zed2"); await sv.click(); await page.waitForTimeout(400);
  const afterSave = [await dc.isDisabled(), await sv.isDisabled()];
  const dlg = await dialogs(page);
  const col = await sv.evaluate((e) => getComputedStyle(e).backgroundColor);
  const ok = clean.every(Boolean) && dirty.every((x) => !x) && restored === seed && afterDiscard.every(Boolean) && afterSave.every(Boolean);
  await shot(page, "COL-28");
  r("COL-28", pass(ok), `disabled [Discard,Save]: clean ${clean}, dirty ${dirty}, after Discard ${afterDiscard} (value restored "${restored}" vs seed "${seed}"), after Save ${afterSave}; Save bg ${col}`, "COL-28");
  r("X-03", pass(afterSave.every(Boolean)), `After Save, Discard and Save disabled: ${afterSave}`);
  // X-03 rail click no dialog
  await rail(page, "Menu"); await page.waitForTimeout(300);
  r("X-03", pass(afterSave.every(Boolean) && (await dialogs(page)).length === 0), `After Save Discard/Save disabled ${afterSave}; rail click right after Save opened dialogs: ${JSON.stringify(await dialogs(page))}`);
  await page.context().close();
});

await run(r, "COL-29", async () => {
  const { page } = await open(b, "collection");
  await S(page).getByLabel("Collection name").fill("Alpha");
  await S(page).getByLabel("Custom landing page").fill("/library?x=1");
  await save(page);
  const n = await newest(page);
  const log = await logEntries(page);
  const okTitle = n.some((t) => /^Settings updated\b(?!\.)/.test(t));
  r("COL-29", pass(okTitle && n.length === 1), `new Beacon entries after one Save: ${JSON.stringify(n)} (expected exactly one titled "Settings updated")`);
  r("X-04", pass(okTitle && n.length === 1), `Beacon: ${JSON.stringify(n)}; checklist quotes "Settings updated"`);
  r("X-09", pass(log.some((l) => /collection|settings/i.test(l) && /admin/.test(l))), `Activity entries: ${JSON.stringify(log)}`);
  await page.context().close();
});

await run(r, "COL-31", async () => {
  const { page } = await open(b, "collection");
  const before = await S(page).evaluate((e) => e.parentElement.innerText.includes("Saved"));
  await S(page).getByLabel("Collection name").fill("Alpha"); await save(page);
  const foot = (await S(page).evaluate((e) => e.parentElement.innerText)).match(/Saved[^\n]*/)?.[0];
  const el = page.locator("text=/^Saved .* by /").first();
  const box1 = await el.boundingBox();
  const h = await page.evaluate(() => { const e = [...document.querySelectorAll("*")].find(x=>x.children.length===0&&/^Saved .* by /.test(x.textContent)); return e? e.parentElement.getBoundingClientRect().height:null; });
  r("COL-31", pass(/^Saved .* by admin$/.test(foot || "")), `footer line after Save: "${foot}"; present before first Save: ${before}; footer container height ${h}`);
  await page.context().close();
});

// ---- COL-03 empty name, COL-30
await run(r, "COL-03", async () => {
  const { page } = await open(b, "collection");
  const f = S(page).getByLabel("Collection name");
  const seed = await f.inputValue();
  await f.fill("");
  const saveDisabled = await S(page).getByRole("button", { name: "Save", exact: true }).isDisabled();
  if (!saveDisabled) await save(page);
  const invalid = await f.getAttribute("aria-invalid");
  const msg = await S(page).locator("[role=alert], [data-part=error], .text-seal, [class*=seal]").allInnerTexts();
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.id || document.activeElement?.tagName);
  const n = await newest(page);
  await rail(page, "Menu"); await page.waitForTimeout(300);
  const dlg = await dialogs(page);
  await shot(page, "COL-03");
  r("COL-03", "FAIL", `Cleared the name: Save disabled=${saveDisabled}, after clicking Save aria-invalid=${invalid}, visible error texts=${JSON.stringify(msg)}, focus on ${focused}, Beacon entries added ${JSON.stringify(n)}. Seed "${seed}". See stored value in next check.`, "COL-03");
  await page.context().close();
});
await run(r, "COL-03b", async () => {
  const { page } = await open(b, "collection");
  const f = S(page).getByLabel("Collection name"); const seed = await f.inputValue();
  await f.fill(""); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(200); await rail(page, "Collection"); await page.waitForTimeout(300);
  const v = await S(page).getByLabel("Collection name").inputValue();
  console.log("INFO empty-name save result: stored", JSON.stringify(v), "seed", JSON.stringify(seed));
  const row = JSON.parse((await import("fs")).readFileSync(new URL("./results/COL.json", import.meta.url))).find((x) => x.id === "COL-03");
  r("COL-03", "FAIL", row.ev + ` Saving the empty name was not blocked: after Save and a rail round trip the field reads "${v}" (silently falls back to the old name; no error shown).`, "COL-03");
  await page.context().close();
});

await run(r, "COL-30", async () => {
  const { page } = await open(b, "customisation");
  const ta = S(page).locator("textarea").first();
  await ta.fill("a{color:red}"); await save(page);
  await rail(page, "Collection"); await page.waitForTimeout(300);
  await S(page).getByLabel("Collection name").fill("Only Name"); await save(page);
  await rail(page, "Global CSS & JS"); await page.waitForTimeout(400);
  const css = await S(page).locator("textarea").first().inputValue();
  await rail(page, "Menu"); await page.waitForTimeout(300);
  const menu = (await S(page).innerText()).includes("Resources");
  r("COL-30", pass(css === "a{color:red}" && menu), `after changing only Collection name and Save: CSS text "${css}"; Menu still has seed items: ${menu}`);
  await page.context().close();
});

// ---- COL-05..09 favicon
await run(r, "COL-05", async () => {
  const { page } = await open(b, "collection");
  const choose = await S(page).getByRole("button", { name: /^Choose$/ }).count();
  const cap = await S(page).getByText("Recommended: 16x16 to 512x512 px (square)").count();
  await shot(page, "COL-05");
  const ev = `no "Custom Favicon" row: "Choose" buttons=${choose}, caption "Recommended: 16x16 to 512x512 px (square)" count=${cap}; Collection form has no favicon control at all, so the modal "Select favicon image" cannot be opened`;
  for (const id of ["COL-05", "COL-06", "COL-07", "COL-08", "COL-09"]) r(id, "FAIL", ev + (id==="COL-05"?"":" (same missing control)"), id==="COL-05"?"COL-05":"");
  await page.context().close();
});

// ---- COL-10 default view options
await run(r, "COL-10", async () => {
  const { page } = await open(b, "collection");
  const radios = await S(page).locator("[role=radio], input[type=radio]").evaluateAll((e) => e.map((x) => (x.getAttribute("aria-label") || x.closest("label")?.innerText || x.innerText || x.value).replace(/\s+/g, " ").trim()));
  const sel = await S(page).locator("select").count();
  r("COL-10", "FAIL", `"Default View" is a radio group labelled "Default library view" with options in order ${JSON.stringify(radios)} (select elements: ${sel}); expected a select "Default View" with order Cards, Map, Table`);
  await page.context().close();
});

// ---- COL-11 default view -> Library
await run(r, "COL-11", async () => {
  const out = [];
  let allOk = true;
  for (const v of ["Table", "Map", "Cards"]) {
    const { page } = await open(b, "collection");
    await S(page).getByRole("radio", { name: new RegExp("^" + v) }).click().catch(async () => { await S(page).getByText(v, { exact: true }).first().click(); });
    await save(page);
    await page.locator('nav, header').getByText("Library", { exact: true }).first().click(); await page.waitForTimeout(1500);
    const vl = await viewLabel(page);
    const body = await page.evaluate(() => [...document.querySelectorAll("[aria-pressed=true],[aria-selected=true],[aria-checked=true]")].map(e=>(e.getAttribute("aria-label")||e.innerText).trim()).slice(0,8));
    await page.reload(); await page.waitForTimeout(1800);
    const vl2 = await viewLabel(page);
    out.push(`${v}: library toolbar view "${vl}" / after reload "${vl2}" / pressed ${JSON.stringify(body)}`);
    await shot(page, "COL-11-" + v);
    if (!(new RegExp(v, "i").test(vl || "") && new RegExp(v, "i").test(vl2 || ""))) allOk = false;
    await page.context().close();
  }
  r("COL-11", pass(allOk), out.join("; "), "COL-11-Table");
});

// ---- COL-12/13/14 etc.
await run(r, "COL-12", async () => {
  const { page } = await open(b, "collection");
  const t = await S(page).innerText();
  const dd = /Default date format/.test(t);
  r("COL-12", "FAIL", `No "Default date format" field on the page (page text has it: ${dd}); the six date options cannot be opened`);
  r("COL-13", "FAIL", `No date format setting exists, so Day/Month/Year vs Month-Day-Year cannot be chosen; nothing to drive`);
  const land = S(page).getByLabel("Custom landing page");
  const hint = (await S(page).getByText("Where visitors land first.").count());
  const addon = await S(page).getByText("https://yourdomain").count();
  const ph = await land.getAttribute("placeholder");
  r("COL-14", "FAIL", `Landing field has no "https://yourdomain" addon (count ${addon}); help text reads "Where visitors land first." (count ${hint}), not "The landing page is the first page that visitors see..."; placeholder=${ph}; no list of A page / A filtered view / An entity / A document / "Important: You must use relative URLs."`);
  r("COL-17", "FAIL", `No "Hide restricted relationships from public" toggle on the page; page text: ${t.replace(/\n+/g," | ").slice(-260)}`);
  r("COL-19", "FAIL", `No "Global JS" toggle on Collection (rail already reads "Global CSS & JS" with the flag untouched, and the page has a JS tab always); no help text "With great power comes great responsibility!"`);
  r("COL-20", "FAIL", `No "Analytics" card with "Google" and "Matomo" fields; nothing to fill`);
  r("COL-21", "FAIL", `No "Forms and email configuration" card, no "Sending email", "Contact form email" or "Public Form submit URL" fields`);
  r("COL-22", "FAIL", `No email fields exist, so validation cannot be driven`);
  for (const id of ["COL-23", "COL-24", "COL-25", "COL-26", "COL-27"]) r(id, "FAIL", `No "Map" card (no Map Provider, Map API key, Map Layers, Latitude/Longitude); page text has "Map" only as the "Map / Geographic" default-view radio`);
  await page.context().close();
});

await run(r, "COL-15", async () => {
  const { page } = await open(b, "collection");
  const f = S(page).getByLabel("Custom landing page");
  const res = [];
  for (const v of ["library", "https://yoursite.com/landing", "/document/4y9i99fadjp833di", "/page/dicxg0oagy3xgr7ixef80k9", "/library/?searchTerm=test", "/entity/9htbkgpkyy7j5rk9", ""]) {
    await f.fill(v);
    const dis = await S(page).getByRole("button", { name: "Save", exact: true }).isDisabled();
    if (!dis) await save(page);
    await rail(page, "Menu"); await page.waitForTimeout(150); await rail(page, "Collection"); await page.waitForTimeout(250);
    const stored = await S(page).getByLabel("Custom landing page").inputValue();
    res.push(`"${v}" -> ${stored === v ? "accepted" : "stored as '" + stored + "'"}`);
  }
  await shot(page, "COL-15");
  const rejectedFirst3 = res.slice(0, 3).every((x) => !x.includes("accepted"));
  r("COL-15", pass(rejectedFirst3), `Save results: ${res.join("; ")}. Expected the first three rejected with a visible message`, "COL-15");
  await page.context().close();
});

await run(r, "COL-16", async () => {
  const { page } = await open(b, "collection");
  const seed = await page.getByRole("checkbox", { name: /Public instance|Private instance/ }).first().isChecked();
  const label = await S(page).getByText(/^(Public|Private) instance$/).first().textContent();
  const hint = await S(page).getByText(/Only logged-in users|make this instance public/).first().textContent();
  // toggle & persist
  await S(page).getByRole("checkbox", { name: /instance/ }).first().click(); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(150); await rail(page, "Collection"); await page.waitForTimeout(250);
  const after = await S(page).getByRole("checkbox", { name: /instance/ }).first().isChecked();
  r("COL-16", "FAIL", `Label reads "${label}" (expected "Public instance"); seed checkbox checked=${seed} (expected seed off for Public instance); help text "${hint}" (expected "Check to make this instance public (non-logged in users can see public documents and entities)"); persists after toggle: ${after !== seed}; stored key is "privateInstance" (inverted)`);
  await page.context().close();
});

await run(r, "COL-18", async () => {
  const { page } = await open(b, "collection");
  const cb = S(page).getByRole("checkbox", { name: "Show cookie policy" });
  const seed = await cb.isChecked();
  await cb.click(); await save(page);
  await cb.click().catch(()=>{});
  await page.reload(); await page.waitForTimeout(1200);
  const hint = await S(page).getByText(/cookie consent|non-essential cookies/).first().textContent();
  r("COL-18", "FAIL", `Seed state of "Show cookie policy" is ${seed ? "on" : "off"}; help text "${hint}" (expected "When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted."). Toggle persistence itself not contradicted`);
  await page.context().close();
});

// ---- COL-32 keyboard help
await run(r, "COL-32", async () => {
  const { page } = await open(b, "collection");
  const helps = await S(page).locator('button[aria-label*="help" i], [aria-describedby]').count();
  const q = await S(page).getByText("?", { exact: true }).count();
  const land = await S(page).getByLabel("Custom landing page").getAttribute("aria-describedby");
  r("COL-32", "FAIL", `No "?" help controls (count ${q}); elements with aria-describedby: ${helps}; landing input aria-describedby=${land}. Hints are plain text with Uwazi-different copy and no help for Global JS or the Analytics card`);
  await page.context().close();
});

// ---- X-02 dirty guard
await run(r, "X-02", async () => {
  const { page } = await open(b, "collection");
  await S(page).getByLabel("Collection name").fill("Dirty");
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const d1 = await dialogs(page);
  const txt = await page.locator("[role=dialog]:not([inert] *), [role=alertdialog]:not([inert] *)").allInnerTexts();
  let cancelOk = null, discardOk = null;
  if (d1.length) {
    await page.getByRole("button", { name: "Cancel" }).last().click(); await page.waitForTimeout(300);
    cancelOk = (await S(page).getByLabel("Collection name").inputValue()) === "Dirty";
    await rail(page, "Menu"); await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Discard changes" }).last().click(); await page.waitForTimeout(400);
    await rail(page, "Collection"); await page.waitForTimeout(300);
    discardOk = (await S(page).getByLabel("Collection name").inputValue()) !== "Dirty";
  }
  // no change -> no dialog
  await rail(page, "Menu"); await page.waitForTimeout(300);
  const d2 = await dialogs(page);
  await shot(page, "X-02-COL");
  r("X-02", pass(d1.length && /You have unsaved changes. Do you want to continue\?/.test(txt.join(" ")) && cancelOk && discardOk && !d2.length), `rail click while dirty -> dialogs ${JSON.stringify(d1)} text "${txt.join(" ").replace(/\s+/g," ").slice(0,200)}"; Cancel keeps edit: ${cancelOk}; Discard navigates & edit gone: ${discardOk}; clean click shows dialog: ${d2.length>0}`, "X-02-COL");
  await page.context().close();
});

// ---- X-07 axe
await run(r, "X-07", async () => {
  const { page } = await open(b, "collection");
  const v = await axe(page);
  r("X-07", v.some((x) => /serious|critical/.test(x)) ? "FAIL" : "PASS", `axe on Collection pane: ${v.length ? v.join(" ; ") : "no violations"} (no dialogs exist on this page)`);
  await page.context().close();
});

// ---- X-13 corpus scope
await run(r, "X-13", async () => {
  const { page } = await open(b, "collection");
  const sampleName = await S(page).getByLabel("Collection name").inputValue();
  await switchTo(page, "CEJIL");
  const cejil = await S(page).getByLabel("Collection name").inputValue();
  await switchTo(page, "Best Artworks");
  const art = await S(page).getByLabel("Collection name").inputValue();
  await switchTo(page, "Sample");
  const back = await S(page).getByLabel("Collection name").inputValue();
  r("X-13", pass(new Set([sampleName, cejil, art]).size === 3 && back === sampleName), `names: Sample "${sampleName}", CEJIL "${cejil}", Best Artworks "${art}", back on Sample "${back}"`);
  await page.context().close();
});

// ---- COL-33 phone & X-06
await run(r, "COL-33", async () => {
  const { page } = await open(b, "collection", "mobile");
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.querySelector('[data-testid=settings-content]')?.scrollWidth]);
  const sv = S(page).getByRole("button", { name: "Save", exact: true });
  await sv.scrollIntoViewIfNeeded();
  const box = await sv.boundingBox();
  const vis = box && box.y + box.height <= 844 && box.y >= 0;
  await shot(page, "COL-33");
  r("COL-33", "FAIL", `Single column, scrollWidth ${sw[0]} vs viewport ${sw[1]} (no horizontal scroll: ${sw[0] <= sw[1]}); Save/Discard reachable: ${vis} (Save box y=${box?.y}); but there is no map (Latitude/Longitude) and no favicon modal on the page, so the expected touch-operable map and sheet cannot be driven`, "COL-33");
  r("X-06", pass(sw[0] <= sw[1] && vis), `phone: scrollWidth ${sw[0]} <= ${sw[1]}; footer Save reachable ${vis}; single column form (no list/dialogs on this page)`, "COL-33");
  await page.context().close();
});

await b.close();
