import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries } from "./lib.mjs";
import { switchTo, crumb } from "./h.mjs";
import { toSettings, save, devArm, resetDemo, added, clean, bodyText } from "./common.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("col-a");
const b = await launch();
const NAME = (p) => S(p).getByLabel("Collection Name");

await run(r, "COL-01", async () => {
  const { page, errors } = await open(b, "collection");
  const h2 = await S(page).locator("h2").first().textContent();
  const h3 = await S(page).locator("h3").allTextContents();
  const t = await bodyText(page);
  const idx = (s) => t.indexOf(s);
  const order = ["Collection Name", "Custom Favicon", "Default View", "Default date format", "Custom landing page", "Public instance", "Hide restricted relationships from public", "Show cookie policy", "Global JS"].map(idx);
  const sorted = order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1]));
  const absent = ["Services", "Theme and branding", "Non-latin", "Whitelisted templates", "captcha"].filter((s) => new RegExp(s, "i").test(t));
  const w = await S(page).locator("[data-component=SettingsForm]").first().evaluate((e) => e.getBoundingClientRect().width);
  const ph = await S(page).locator("[placeholder]").count();
  const g = await page.evaluate(() => window.__gutter());
  await shot(page, "COL-01");
  const ok = h2 === "Collection" && h3.join("|") === "General|Analytics|Forms and email configuration|Map" && sorted && !absent.length && w <= 640 && !ph && g.pass;
  r.add("COL-01", pf(ok), `title "${h2}"; cards ${JSON.stringify(h3)}; General field order ok=${sorted} (${order.join(",")}); forbidden present: [${absent}]; form width ${w}px (max 640); placeholders ${ph}; __gutter pass=${g.pass}`, "COL-01");
  await page.context().close();
});

let seedName;
await run(r, "COL-02", async () => {
  const { page, errors } = await open(b, "collection");
  seedName = await NAME(page).inputValue();
  await NAME(page).fill("Test Archive"); await save(page);
  const a = await NAME(page).inputValue();
  await rail(page, "Menu"); await page.waitForTimeout(400); await rail(page, "Collection"); await page.waitForTimeout(500);
  const v2 = await NAME(page).inputValue();
  await page.reload(); await page.waitForTimeout(1500);
  const v3 = await NAME(page).inputValue();
  const ph = await NAME(page).getAttribute("placeholder");
  const lab = await S(page).locator("label", { hasText: /^Collection Name$/ }).count();
  const ok = a === "Test Archive" && v2 === "Test Archive" && v3 === "Test Archive" && !ph && lab === 1 && seedName.length > 0;
  r.add("COL-02", pf(ok), `seed name "${seedName}"; after Save "${a}"; after rail round trip "${v2}"; after reload "${v3}"; placeholder=${ph}; visible label "Collection Name" count=${lab}`);
  // X-01 reset
  await resetDemo(page); await rail(page, "Collection"); await page.waitForTimeout(500);
  const v4 = await NAME(page).inputValue();
  r.add("X-01", pf(ok && v4 === seedName), `Collection Name "Test Archive" survived Save, rail round trip and tab reload; after Dashboard > Reset demo data it reads "${v4}" (seed "${seedName}")`);
  await page.context().close();
});

await run(r, "COL-03", async () => {
  const { page } = await open(b, "collection");
  const before = await notifTitles(page);
  const inp = NAME(page);
  const bc0 = await inp.evaluate((e) => getComputedStyle(e).borderColor);
  const lab0 = S(page).locator("label", { hasText: /^Collection Name$/ });
  const lc0 = await lab0.evaluate((e) => getComputedStyle(e).color);
  await inp.fill(""); await save(page);
  const focused = await page.evaluate(() => document.activeElement?.id);
  const bc1 = await inp.evaluate((e) => getComputedStyle(e).borderColor);
  const lab = S(page).locator("label", { hasText: /^Collection Name$/ });
  const msgCol = await S(page).getByText("Enter a name for the collection.").evaluate((e) => getComputedStyle(e).color).catch(() => "?");
  await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(200);
  const bc1b = await inp.evaluate((e) => getComputedStyle(e).borderColor);
  const lc1 = await lab.evaluate((e) => getComputedStyle(e).color);
  const fieldBox = S(page).locator("[data-component=SettingsField]").first();
  const msg = await fieldBox.innerText();
  const stored = await page.evaluate(() => Object.entries(sessionStorage).filter(([k]) => /collection/i.test(k)).map(([k, v]) => v.slice(0, 80)));
  const na = (await added(page, before)).length;
  const logN = (await logEntries(page)).length;
  await shot(page, "COL-03");
  await inp.fill("Fixed name"); await page.waitForTimeout(250);
  const msgAfter = await fieldBox.innerText();
  await save(page);
  const saved = await inp.inputValue();
  const bad = await S(page).getByRole("button", { name: "Save", exact: true }).isDisabled();
  const ok = bc1b !== bc0 && lc1 !== lc0 && /required|empty|enter/i.test(msg) && focused === "collection-name" && na === 0 && logN === 0 && msgAfter.replace(/Collection Name/i, "").trim() === "" && bad;
  r.add("COL-03", pf(ok), `after Save with empty name: border ${bc0} -> ${bc1} (focused) / ${bc1b} (blurred); label colour ${lc0} -> ${lc1}; message colour ${msgCol}; message under field "${msg.replace(/\n/g, " / ")}"; focused id "${focused}"; new notifications ${na}; activity entries ${logN}; after typing message "${msgAfter.replace(/\n/g, " / ")}"; then Save worked (Save disabled again=${bad}, value "${saved}")`, "COL-03");
  await page.context().close();
});

await run(r, "COL-04", async () => {
  const { page } = await open(b, "collection");
  await NAME(page).fill("Test Archive"); await save(page);
  const crumbTxt = await crumb(page).getAttribute("aria-label");
  const title = await page.title();
  await switchTo(page, "CEJIL");
  const landed = await page.evaluate(() => sessionStorage.getItem("uwazi:appView"));
  const cejilCrumb = await crumb(page).getAttribute("aria-label");
  await toSettings(page, "Collection");
  const cejil = await NAME(page).inputValue();
  await switchTo(page, "Sample");
  await toSettings(page, "Collection");
  const back = await NAME(page).inputValue();
  await page.evaluate(() => sessionStorage.setItem("uwazi:appView", JSON.stringify("login")));
  await page.reload(); await page.waitForTimeout(1500);
  const login = (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 300);
  await shot(page, "COL-04-login");
  const ok = /Test Archive/.test(crumbTxt) && /Test Archive/.test(login) && cejil !== "Test Archive" && back === "Test Archive";
  r.add("COL-04", pf(ok), `crumb "${crumbTxt}"; window title "${title}"; CEJIL name "${cejil}" (crumb "${cejilCrumb}"); back on Sample "${back}" (switching the data source landed on view ${landed}); login screen text has "Test Archive": ${/Test Archive/.test(login)} ("${login.slice(0, 120)}")`, "COL-04-login");
  // X-13 corpus scope
  r.add("X-13", pf(cejil !== "Test Archive" && back === "Test Archive" && cejilCrumb !== crumbTxt), `Sample name "Test Archive", CEJIL "${cejil}", back on Sample "${back}": Collection content follows the data source`);
  await page.context().close();
});

// X-02 / X-03 / X-04 / X-09 / COL-28 / COL-29 / COL-31
await run(r, "COL-28", async () => {
  const { page, errors } = await open(b, "collection");
  const sv = S(page).getByRole("button", { name: "Save", exact: true });
  const dc = S(page).getByRole("button", { name: "Discard changes" });
  const clean0 = [await dc.isDisabled(), await sv.isDisabled()];
  const seed = await NAME(page).inputValue();
  await NAME(page).fill("Zed");
  const dirty = [await dc.isDisabled(), await sv.isDisabled()];
  await dc.click(); await page.waitForTimeout(300);
  const restored = await NAME(page).inputValue();
  const afterD = [await dc.isDisabled(), await sv.isDisabled()];
  const dlgs = await dialogs(page);
  await NAME(page).fill("Zed2"); await save(page);
  const afterS = [await dc.isDisabled(), await sv.isDisabled()];
  const green = await sv.evaluate((e) => getComputedStyle(e).backgroundColor);
  await shot(page, "COL-28");
  const ok = clean0.every(Boolean) && dirty.every((x) => !x) && restored === seed && afterD.every(Boolean) && afterS.every(Boolean) && !dlgs.length;
  r.add("COL-28", pf(ok), `clean [discard,save disabled]=${clean0}; dirty=${dirty}; after Discard value "${restored}" (seed "${seed}") disabled=${afterD}, dialogs ${JSON.stringify(dlgs)}; after Save disabled=${afterS}; Save bg ${green}`, "COL-28");
  r.add("X-03", pf(afterS.every(Boolean)), `after a successful Save both footer buttons are disabled=${afterS}`);
  // re-enable on edit and rail click dialog
  await NAME(page).fill("Zed3");
  const reen = !(await sv.isDisabled());
  await rail(page, "Menu"); await page.waitForTimeout(400);
  r.add("X-03b", pf(reen), `editing again re-enables Save=${reen}`);
  // X-02: dirty guard by rail
  const d1 = await dialogs(page);
  const txt = d1.length ? await page.locator('[data-component=ConfirmDialog] [role=dialog]').first().innerText().catch(() => "") : "";
  await shot(page, "X-02-rail");
  const parts = [];
  parts.push(`rail click: dialogs ${JSON.stringify(d1)} text "${txt.replace(/\n/g, " / ")}"`);
  // cancel keeps
  const cancelBtn = page.getByRole("button", { name: "Cancel", exact: true }).last();
  let okAll = d1.some((x) => /Discard changes/.test(x)) && /You have unsaved changes\. Do you want to continue\?/.test(txt);
  if (d1.length) { await page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300); }
  const stillOn = (await S(page).locator("h2").first().textContent()) === "Collection" && (await NAME(page).inputValue()) === "Zed3";
  parts.push(`Cancel keeps page+edit=${stillOn}`);
  okAll = okAll && stillOn;
  // navbar link: Library
  await page.locator("button[data-part=library]").click(); await page.waitForTimeout(500);
  const d2 = await dialogs(page); parts.push(`navbar Library: dialogs ${JSON.stringify(d2)}`);
  okAll = okAll && d2.some((x) => /Discard changes/.test(x));
  if (d2.length) await page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(300);
  // data source switch
  await crumb(page).click(); await page.waitForTimeout(250);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await page.waitForTimeout(800);
  const d3 = await dialogs(page); parts.push(`data source switch: dialogs ${JSON.stringify(d3)}`);
  okAll = okAll && d3.some((x) => /Discard changes/.test(x));
  if (d3.length) await page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(300);
  // Discard changes navigates
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const dd = page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Discard changes" });
  if (await dd.count()) await dd.click();
  await page.waitForTimeout(500);
  await rail(page, "Collection"); await page.waitForTimeout(500);
  const back = await NAME(page).inputValue();
  parts.push(`after Discard changes and return the name is "${back}" (edit gone=${back === "Zed2"})`);
  okAll = okAll && back === "Zed2";
  // clean: no dialog
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const d4 = await dialogs(page); parts.push(`clean rail click: dialogs ${JSON.stringify(d4)}`);
  okAll = okAll && !d4.length;
  r.add("X-02", pf(okAll), parts.join("; "), "X-02-rail");
  await page.context().close();
});

await run(r, "COL-29", async () => {
  const { page, errors } = await open(b, "collection");
  const before = await notifTitles(page);
  await NAME(page).fill("Two cards A");
  await S(page).locator("#google-analytics").fill("G-1");
  await save(page);
  const add1 = clean(await added(page, before));
  const log = await logEntries(page);
  const lastSaved = await S(page).innerText().then((t) => (t.match(/Saved [^\n]*/) || [""])[0]);
  const footer = await page.locator("[data-component=SettingsContent] footer, footer").last().innerText().catch(() => "");
  // fail half
  const status = await devArm(page, "Save", "Disk full", "Collection");
  const before2 = await notifTitles(page);
  await NAME(page).fill("Two cards B"); await save(page);
  const add2 = clean(await added(page, before2));
  const kept = await NAME(page).inputValue();
  const stillDirty = !(await S(page).getByRole("button", { name: "Save", exact: true }).isDisabled());
  await shot(page, "X-04-fail");
  const failOk = add2.length === 1 && /^An error occurred/.test(add2[0]) && /Disk full/.test(add2[0]);
  r.add("COL-29", pf(add1.length === 1 && add1[0] === "Settings updated" && failOk), `after saving two fields in different cards: new notifications ${JSON.stringify(add1)} (expected exactly one "Settings updated"); failure path (Dev panel "Fail next request" armed to Save, then a Save): new notifications ${JSON.stringify(add2)} (expected one "An error occurred"; the save went through instead)`);
  r.add("X-04", pf(add1.length === 1 && add1[0] === "Settings updated" && add2.length === 1 && /^An error occurred/.test(add2[0]) && /Disk full/.test(add2[0]) && kept === "Two cards B" && stillDirty), `success: ${JSON.stringify(add1)}; dev panel (${status}); failure Save: new notifications ${JSON.stringify(add2)}; edit kept "${kept}", still dirty=${stillDirty}`, "X-04-fail");
  r.add("X-09", pf(log.some((l) => /collection|settings/i.test(l) && /admin/.test(l))), `activity store after Save: ${JSON.stringify(log.slice(-3))}`);
  await page.context().close();
});

await run(r, "COL-31", async () => {
  const { page } = await open(b, "collection");
  const lsl = page.locator("[data-part=last-saved]");
  const h0 = await lsl.first().evaluate((e) => e.getBoundingClientRect().height).catch(() => null);
  const footBox0 = await page.locator("[data-testid=settings-content]").evaluate((e) => { const f = e.querySelector("footer") || e.lastElementChild; return f.getBoundingClientRect().height; });
  const t0 = await lsl.first().innerText().catch(() => "(none)");
  await NAME(page).fill("Saved line test"); await save(page);
  const t1 = await lsl.first().innerText().catch(() => "(none)");
  const h1 = await lsl.first().evaluate((e) => e.getBoundingClientRect().height).catch(() => null);
  const footBox1 = await page.locator("[data-testid=settings-content]").evaluate((e) => { const f = e.querySelector("footer") || e.lastElementChild; return f.getBoundingClientRect().height; });
  await shot(page, "COL-31");
  r.add("COL-31", pf(/^Saved .+ by admin/.test(t1) && footBox0 === footBox1), `before Save line "${t0}" (h ${h0}); after Save "${t1}" (h ${h1}); footer height ${footBox0} -> ${footBox1}`, "COL-31");
  await page.context().close();
});

r.save();
await b.close();
