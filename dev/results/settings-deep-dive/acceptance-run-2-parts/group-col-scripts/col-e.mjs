import { launch, open, S, shot, rail, dialogs, notifTitles } from "./lib.mjs";
import { toSettings, save, bodyText, added, clean, storedCol, field, toggleRow, isOn } from "./common.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("col-e");
const b = await launch();
const rt = async (p) => { await rail(p, "Menu"); await p.waitForTimeout(350); await rail(p, "Collection"); await p.waitForTimeout(450); };
const reload = async (p) => { await p.reload(); await p.waitForTimeout(1500); };
const saved = async (p, before) => (await added(p, before)).some((t) => /^Settings updated/.test(t));

await run(r, "COL-14", async () => {
  const { page } = await open(b, "collection");
  const f = field(page, "Custom landing page");
  const inp = S(page).locator("#landing-page");
  const addon = await f.innerText();
  const ph = await inp.getAttribute("placeholder");
  const txt = (await f.innerText()).replace(/\n+/g, " ");
  const checks = {
    addon: /https:\/\/yourdomain/.test(addon),
    start: /The landing page is the first page that visitors see when they come to your collection\./.test(txt),
    page: /A page: \/page\/dicxg0oagy3xgr7ixef80k9/.test(txt), filtered: /A filtered view in Uwazi: \/library\/\?searchTerm=test/.test(txt), entity: /An entity: \/entity\/9htbkgpkyy7j5rk9/.test(txt),
    doc: /A document: \/entity\/4y9i99fadjp833di/.test(txt), noDocPath: !/\/document\//.test(txt),
    end: /Important: You must use relative URLs\./.test(txt),
  };
  await shot(page, "COL-14");
  r.add("COL-14", pf(Object.values(checks).every(Boolean) && !ph), `addon text present=${checks.addon}; placeholder=${ph}; help starts with quoted sentence=${checks.start}; lists A page/A filtered view in Uwazi/An entity/A document=${checks.page && checks.filtered && checks.entity && checks.doc}; document example reads "/entity/4y9i99fadjp833di" and no "/document/"=${checks.doc && checks.noDocPath}; contains "Important: You must use relative URLs."=${checks.end}`, "COL-14");
  await page.context().close();
});

await run(r, "COL-15", async () => {
  const { page } = await open(b, "collection");
  const inp = S(page).locator("#landing-page");
  const out = []; let ok = true;
  const attempt = async (v) => {
    const before = await notifTitles(page);
    await inp.fill(v); await save(page);
    const ok1 = await saved(page, before);
    const msg = (await field(page, "Custom landing page").innerText()).replace(/\n+/g, " ");
    return { ok1, msg };
  };
  for (const v of ["library", "https://yoursite.com/landing", "/document/4y9i99fadjp833di"]) {
    const { ok1, msg } = await attempt(v);
    const st = (await storedCol(page))?.landing ?? "";
    // visible message naming accepted forms: text that is not in the static help
    const named = /\/page\//.test(msg) && /\/entity\//.test(msg) && /\/library/.test(msg);
    const err = await field(page, "Custom landing page").evaluate((e) => !!e.querySelector("[role=alert],[data-part=message],.text-seal-label"));
    const good = !ok1 && st === "" && err;
    ok = ok && good;
    out.push(`"${v}": saved=${ok1}, stored "${st}", error message element=${err}`);
    if (v === "library") await shot(page, "COL-15-rejected");
  }
  const msgText = await field(page, "Custom landing page").evaluate((e) => [...e.querySelectorAll("[role=alert],[data-part=message],.text-seal-label")].map((x) => x.textContent.trim()).join(" / "));
  out.push(`message text "${msgText}"`);
  ok = ok && /\/page\//.test(msgText) && /\/entity\//.test(msgText) && /\/library/.test(msgText);
  for (const v of ["/page/dicxg0oagy3xgr7ixef80k9", "/library/?searchTerm=test", "/entity/9htbkgpkyy7j5rk9"]) {
    const { ok1 } = await attempt(v);
    await rt(page);
    const a = await S(page).locator("#landing-page").inputValue();
    await reload(page);
    const c = await S(page).locator("#landing-page").inputValue();
    const good = ok1 && a === v && c === v;
    ok = ok && good;
    out.push(`"${v}": saved=${ok1}, after rail trip "${a}", after reload "${c}"`);
  }
  const { ok1 } = await attempt("");
  const st = (await storedCol(page))?.landing ?? "";
  ok = ok && ok1 && st === "";
  out.push(`empty: saved=${ok1}, stored "${st}"`);
  r.add("COL-15", pf(ok), out.join("; "), "COL-15-rejected");
  await page.context().close();
});

const toggleCheck = async (id, label, key, help) => run(r, id, async () => {
  const { page } = await open(b, "collection");
  const lab = await toggleRow(page, label).innerText();
  const seed = await isOn(page, label);
  await toggleRow(page, label).click(); await page.waitForTimeout(150);
  const before = await notifTitles(page);
  await save(page);
  const st = (await storedCol(page))[key];
  await rt(page);
  const a = await isOn(page, label);
  await reload(page);
  const c = await isOn(page, label);
  const helpOk = help.every((h) => lab.replace(/\n+/g, " ").includes(h));
  const keys = Object.keys(await storedCol(page));
  return { page, lab, seed, st, a, c, helpOk, keys };
});

await run(r, "COL-16", async () => {
  const { page } = await open(b, "collection");
  const label = "Public instance";
  const text = (await toggleRow(page, label).innerText()).replace(/\n+/g, " ");
  const seed = await isOn(page, label);
  await toggleRow(page, label).click(); await save(page);
  const st = (await storedCol(page));
  await rt(page); const a = await isOn(page, label);
  await page.reload(); await page.waitForTimeout(1500); const c = await isOn(page, label);
  await toggleRow(page, label).click(); await save(page);
  const off = await isOn(page, label); const stOff = (await storedCol(page)).publicInstance;
  const good = text === "Public instance Check to make this instance public (non-logged in users can see public documents and entities)" && !seed && st.publicInstance === true && !("private" in st) && a && c && !off && stOff === false;
  r.add("COL-16", pf(good), `label+help "${text}"; seed on=${seed}; after On+Save stored publicInstance=${st.publicInstance} (keys with "private": ${Object.keys(st).filter((k) => /private/i.test(k)).length}); after rail trip on=${a}; after reload on=${c}; after Off+Save on=${off}, stored ${stOff}`);
  await page.context().close();
});

for (const [id, label, key, help] of [
  ["COL-17", "Hide restricted relationships from public", "hideRestrictedRelationships", "By default, relationships pointing to restricted entities are visible to anonymous users but not linked. When enabled, these relationships are completely hidden, preventing public users from knowing restricted content exists."],
  ["COL-18", "Show cookie policy", "cookiePolicy", "When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted."],
]) await run(r, id, async () => {
  const { page, errors } = await open(b, "collection");
  const text = (await toggleRow(page, label).innerText()).replace(/\n+/g, " ");
  const seed = await isOn(page, label);
  await toggleRow(page, label).click(); await save(page);
  const st = (await storedCol(page))[key];
  await rt(page); const a = await isOn(page, label);
  await page.reload(); await page.waitForTimeout(1500); const c = await isOn(page, label);
  const popup = (await dialogs(page)).length;
  const good = text === `${label} ${help}` && !seed && st === true && a && c && !popup;
  r.add(id, pf(good), `label+help "${text.slice(0, 220)}"; seed on=${seed}; stored ${key}=${st}; after rail trip on=${a}; after reload on=${c}; dialogs open ${popup}`);
  await page.context().close();
});

await run(r, "COL-19", async () => {
  const { page } = await open(b, "collection");
  const railLabel = () => page.locator('nav[aria-label="Settings navigation"] button').allInnerTexts().then((t) => t.map((x) => x.trim()).filter((x) => /^Global CSS/.test(x)));
  const r0 = await railLabel();
  const text = (await toggleRow(page, "Global JS").innerText()).replace(/\n+/g, " ");
  await toggleRow(page, "Global JS").click(); await save(page);
  const r1 = await railLabel();
  await rt(page); const a = await isOn(page, "Global JS");
  await page.reload(); await page.waitForTimeout(1500); const c = await isOn(page, "Global JS");
  const r2 = await railLabel();
  await toggleRow(page, "Global JS").click(); await save(page);
  const r3 = await railLabel();
  const needs = ["With great power comes great responsibility!", "This area allows you to append custom Javascript to the page.", "It could also very easily break the app. Only write code here if you know exactly what you are doing."];
  const good = JSON.stringify(r0) === '["Global CSS"]' && JSON.stringify(r1) === '["Global CSS & JS"]' && a && c && JSON.stringify(r2) === '["Global CSS & JS"]' && JSON.stringify(r3) === '["Global CSS"]' && needs.every((n) => text.includes(n));
  r.add("COL-19", pf(good), `rail label seed ${JSON.stringify(r0)}; after On+Save ${JSON.stringify(r1)}; persists after rail trip=${a}, reload=${c} (rail ${JSON.stringify(r2)}); after Off+Save ${JSON.stringify(r3)}; help text contains the three quoted sentences=${needs.every((n) => text.includes(n))}`);
  await page.context().close();
});

await run(r, "COL-20", async () => {
  const { page, errors } = await open(b, "collection");
  const mat = '{"id":"1","url":"https://m.example.org"}';
  await S(page).locator("#google-analytics").fill("G-TEST123");
  await S(page).locator("#matomo-analytics").fill(mat);
  await save(page);
  await rt(page);
  const a = [await S(page).locator("#google-analytics").inputValue(), await S(page).locator("#matomo-analytics").inputValue()];
  await reload(page);
  const c = [await S(page).locator("#google-analytics").inputValue(), await S(page).locator("#matomo-analytics").inputValue()];
  const help = await bodyText(page);
  const scripts = await page.evaluate(() => [...document.querySelectorAll("script")].filter((s) => /G-TEST123|googletagmanager|matomo|m\.example\.org/.test(s.src + s.textContent)).length);
  const errs = noise(errors);
  const good = a[0] === "G-TEST123" && a[1] === mat && c[0] === "G-TEST123" && c[1] === mat && help.includes("If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo.") && !scripts && !errs.length;
  r.add("COL-20", pf(good), `after rail trip ${JSON.stringify(a)}; after reload ${JSON.stringify(c)}; card help present=${help.includes("If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo.")}; analytics scripts in DOM ${scripts}; console errors ${JSON.stringify(errs)}`);
  await page.context().close();
});

await run(r, "COL-21", async () => {
  const { page, errors } = await open(b, "collection");
  await S(page).locator("#sending-email").fill("noreply@example.org");
  await S(page).locator("#receiving-email").fill("contact@example.org");
  await S(page).locator("#public-form-destination").fill("https://other.example.org");
  await save(page); await rt(page);
  const read = async () => [await S(page).locator("#sending-email").inputValue(), await S(page).locator("#receiving-email").inputValue(), await S(page).locator("#public-form-destination").inputValue()];
  const a = await read(); await reload(page); const c = await read();
  const labels = await S(page).locator("label").allInnerTexts();
  const labelOk = ["Sending email", "Contact form email", "Public Form submit URL"].every((l) => labels.some((x) => x.trim() === l));
  const tx = await bodyText(page);
  const helps = ["This is the email address that will appear as the sender when an email is sent from your Uwazi collection to registered users.", "If you have a contact form, this is the email address that will receive the form's submissions.", "Learn how to add and configure a contact form on a webpage.", "If you have configured a public form and would like a different Uwazi collection to receive the submissions, enter its URL here."].map((h) => tx.includes(h));
  const link = await S(page).getByRole("link", { name: "Learn how to add and configure a contact form on a webpage." }).count();
  const want = ["noreply@example.org", "contact@example.org", "https://other.example.org"];
  r.add("COL-21", pf(JSON.stringify(a) === JSON.stringify(want) && JSON.stringify(c) === JSON.stringify(want) && labelOk && helps.every(Boolean) && link === 1), `labels exact=${labelOk}; after rail trip ${JSON.stringify(a)}; after reload ${JSON.stringify(c)}; help texts present ${JSON.stringify(helps)}; link count ${link}`);
  await page.context().close();
});

await run(r, "COL-22", async () => {
  const { page } = await open(b, "collection");
  const out = []; let ok = true;
  const sub = async (sel, v, label) => {
    const before = await notifTitles(page);
    await S(page).locator(sel).fill(v); await save(page);
    const sv = await saved(page, before);
    const err = await field(page, label).evaluate((e) => [...e.querySelectorAll(".text-seal-label,[role=alert],[data-part=message]")].map((x) => x.textContent.trim()).join(" / "));
    return { sv, err };
  };
  const a = await sub("#sending-email", "not-an-email", "Sending email");
  out.push(`Sending "not-an-email": saved=${a.sv}, message "${a.err}"`); ok = ok && !a.sv && !!a.err;
  await shot(page, "COL-22");
  await S(page).locator("#sending-email").fill("");
  const b2 = await sub("#receiving-email", "not-an-email", "Contact form email");
  out.push(`Contact "not-an-email": saved=${b2.sv}, message "${b2.err}"`); ok = ok && !b2.sv && !!b2.err;
  await S(page).locator("#receiving-email").fill("");
  const cleanDisabled = await S(page).getByRole("button", { name: "Save", exact: true }).isDisabled();
  const noErr = !(await S(page).locator(".text-seal-label").count());
  out.push(`both cleared again: Save disabled (clean)=${cleanDisabled}, error messages left=${!noErr}`); ok = ok && cleanDisabled && noErr;
  await S(page).locator("#sending-email").fill("a@b.co"); await S(page).locator("#receiving-email").fill("c@d.org");
  const b4 = await notifTitles(page); await save(page); const s4 = await saved(page, b4);
  out.push(`valid a@b.co + c@d.org: saved=${s4}`); ok = ok && s4;
  await S(page).locator("#sending-email").fill(""); await S(page).locator("#receiving-email").fill("");
  const before = await notifTitles(page); await save(page);
  const e = await saved(page, before); const st = await storedCol(page);
  out.push(`both cleared then Save: saved=${e}, stored "${st.senderEmail}" / "${st.contactEmail}"`); ok = ok && e && st.senderEmail === "" && st.contactEmail === "";
  const v = await sub("#sending-email", "a@b.co", "Sending email");
  out.push(`valid a@b.co: saved=${v.sv}, message "${v.err}"`); ok = ok && v.sv && !v.err;
  r.add("COL-22", pf(ok), out.join("; "), "COL-22");
  await page.context().close();
});

const mapProvOpts = async (p) => { await S(p).locator("#map-provider").click(); await p.waitForTimeout(250); const o = (await p.getByRole("option").allInnerTexts()).map((x) => x.trim()); await p.keyboard.press("Escape"); await p.waitForTimeout(200); return o; };
await run(r, "COL-23", async () => {
  const { page } = await open(b, "collection");
  const shown = (await S(page).locator("#map-provider").innerText()).trim();
  const opts = await mapProvOpts(page);
  const pick = async (l) => { await S(page).locator("#map-provider").click(); await page.waitForTimeout(250); await page.getByRole("option", { name: l, exact: true }).click(); await page.waitForTimeout(200); };
  await pick("Google"); await save(page);
  await page.reload(); await page.waitForTimeout(1500);
  const g = (await S(page).locator("#map-provider").innerText()).trim();
  await pick("Mapbox"); await save(page);
  const st = (await storedCol(page)).mapProvider;
  const ids = await page.evaluate(() => [document.getElementById("map-provider") && 1, document.getElementById("default-view") && 1].length && ["map-provider", "default-view"].map((i) => document.querySelectorAll("#" + i).length));
  const help = (await bodyText(page)).includes("An API key is required to use Mapbox or Google Maps.");
  r.add("COL-23", pf(shown === "Mapbox" && opts.join() === "Mapbox,Google" && g === "Google" && st === "mapbox" && JSON.stringify(ids) === "[1,1]" && help), `unset shows "${shown}"; options ${JSON.stringify(opts)}; after Google+Save+reload "${g}"; after Mapbox+Save stored "${st}"; element counts for #map-provider/#default-view ${JSON.stringify(ids)}; help present=${help}`);
  await page.context().close();
});

await run(r, "COL-24", async () => {
  const { page } = await open(b, "collection");
  const out = []; let ok = true;
  const before = await notifTitles(page);
  await S(page).locator("#map-key").fill("bad key!"); await save(page);
  const sv = await saved(page, before);
  const foc = await page.evaluate(() => document.activeElement?.id);
  const msg = await field(page, "Map API key").evaluate((e) => [...e.querySelectorAll(".text-seal-label,[role=alert],[data-part=message]")].map((x) => x.textContent.trim()).join(" / "));
  await shot(page, "COL-24");
  out.push(`"bad key!": saved=${sv}, focus on "${foc}", message "${msg}"`);
  ok = ok && !sv && foc === "map-key" && /letters|digit|dot|underscore|character/i.test(msg);
  const b2 = await notifTitles(page);
  await S(page).locator("#map-key").fill("pk.abc_123"); await save(page);
  const s2 = await saved(page, b2); const st = (await storedCol(page)).mapApiKey;
  await reload(page); const rl = await S(page).locator("#map-key").inputValue();
  out.push(`"pk.abc_123": saved=${s2}, stored "${st}", after reload "${rl}"`); ok = ok && s2 && st === "pk.abc_123" && rl === "pk.abc_123";
  const b3 = await notifTitles(page);
  await S(page).locator("#map-key").fill(""); await save(page);
  const s3 = await saved(page, b3); out.push(`empty: saved=${s3}`); ok = ok && s3;
  r.add("COL-24", pf(ok), out.join("; "), "COL-24");
  await page.context().close();
});

await run(r, "COL-25", async () => {
  const { page } = await open(b, "collection");
  const box = () => field(page, "Map Layers");
  const pills = () => page.locator('[aria-label^="Remove "]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label").replace("Remove ", "")));
  const seed = await pills();
  await page.getByRole("button", { name: "Add map layer" }).click(); await page.waitForTimeout(250);
  const opts = (await page.locator('fieldset[aria-label="Map layers"] label').allInnerTexts()).map((x) => x.trim());
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const popClosed = (await page.locator('fieldset[aria-label="Map layers"]').count()) === 0;
  const steps = [];
  await page.getByRole("button", { name: "Remove Streets" }).click(); steps.push(await pills());
  await page.getByRole("button", { name: "Remove Hybrid" }).click(); steps.push(await pills());
  const lastDisabled = await page.getByRole("button", { name: "Remove Satellite" }).isDisabled();
  const msg = (await box().innerText()).includes("Map layers cannot be empty");
  const noOpt = !(await box().innerText()).includes("No options");
  await shot(page, "COL-25");
  await page.getByRole("button", { name: "Add map layer" }).click(); await page.waitForTimeout(250);
  await page.locator('fieldset[aria-label="Map layers"] label').filter({ hasText: "Dark" }).click(); await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  const after = await pills();
  await save(page);
  await reload(page);
  const rl = await pills();
  const help = (await box().innerText()).includes("Here you can configure the map layers that will be available in the maps.") && !(await box().innerText()).includes("Map layers description");
  const good = JSON.stringify(opts) === '["Dark","Streets","Satellite","Hybrid"]' && JSON.stringify(seed) === '["Streets","Hybrid","Satellite"]' && lastDisabled && msg && noOpt && JSON.stringify(rl) === '["Satellite","Dark"]' && help && popClosed;
  r.add("COL-25", pf(good), `popover options ${JSON.stringify(opts)} (Escape closes popover=${popClosed}); seed pills ${JSON.stringify(seed)}; after removing Streets ${JSON.stringify(steps[0])}, Hybrid ${JSON.stringify(steps[1])}; last pill's remove disabled=${lastDisabled}; "Map layers cannot be empty" visible=${msg}; "No options" absent=${noOpt}; after adding Dark ${JSON.stringify(after)}; after Save+reload ${JSON.stringify(rl)}; help text ok=${help}`, "COL-25");
  await page.context().close();
});

const mapBox = (p) => p.locator("[data-component=MapPointPicker]");
const clickMap = async (p, fx, fy) => { await mapBox(p).scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const bb = await mapBox(p).boundingBox(); await p.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy); await p.waitForTimeout(250); };
const ll = async (p) => [await S(p).locator("#map-latitude").inputValue(), await S(p).locator("#map-longitude").inputValue()];
await run(r, "COL-26", async () => {
  const { page } = await open(b, "collection");
  const marker0 = await mapBox(page).locator("circle").count();
  await clickMap(page, 0.75, 0.25);
  const marker1 = await mapBox(page).locator("circle").count();
  const [lat, lon] = await ll(page);
  const expLon = ((0.75 * 800 - 400) / 127) * (180 / Math.PI), expLat = ((200 - 0.25 * 400) / 127) * (180 / Math.PI);
  const near = Math.abs(+lat - expLat) < 1 && Math.abs(+lon - expLon) < 1;
  await S(page).locator("#map-latitude").fill("91"); const l91 = await S(page).locator("#map-latitude").inputValue();
  await S(page).locator("#map-longitude").fill("-181"); const l181 = await S(page).locator("#map-longitude").inputValue();
  await S(page).locator("#map-latitude").fill("12.5"); await S(page).locator("#map-longitude").fill("-70.25");
  await save(page); await reload(page);
  const rl = await ll(page); const mk = await mapBox(page).locator("circle").count();
  await shot(page, "COL-26");
  // X clears both
  await S(page).getByRole("button", { name: /Clear latitude and longitude/ }).click(); await page.waitForTimeout(200);
  const cleared = await ll(page);
  await S(page).locator("#map-latitude").fill("5"); await S(page).locator("#map-longitude").fill("6");
  await S(page).getByRole("button", { name: /Clear longitude and latitude/ }).click(); await page.waitForTimeout(200);
  const cleared2 = await ll(page);
  const good = marker0 === 0 && marker1 === 1 && near && l91 === "90" && l181 === "-180" && rl[0] === "12.5" && rl[1] === "-70.25" && mk === 1 && cleared.join() === "," && cleared2.join() === ",";
  r.add("COL-26", pf(good), `markers before ${marker0}, after click ${marker1}; click at 75%/25% gave lat ${lat}, lon ${lon} (expected about ${expLat.toFixed(1)}, ${expLon.toFixed(1)}); typed 91 -> "${l91}", -181 -> "${l181}"; saved 12.5/-70.25 then reload inputs ${JSON.stringify(rl)}, markers ${mk}; X on latitude clears both -> ${JSON.stringify(cleared)}; X on longitude clears both -> ${JSON.stringify(cleared2)}`, "COL-26");
  await page.context().close();
});

await run(r, "COL-27", async () => {
  const { page } = await open(b, "collection");
  await S(page).locator("#map-latitude").fill("0"); await S(page).locator("#map-longitude").fill("0");
  const before = await notifTitles(page);
  await save(page); const s1 = await saved(page, before);
  const st1 = (await storedCol(page)).mapStartingPoint;
  await rt(page);
  const back = await ll(page); const mk = await mapBox(page).locator("circle").count();
  await S(page).locator("#map-latitude").fill("0"); await S(page).locator("#map-longitude").fill("10");
  const b2 = await notifTitles(page); await save(page); const s2 = await saved(page, b2);
  const st2 = (await storedCol(page)).mapStartingPoint;
  // half-filled
  await S(page).locator("#map-longitude").fill("");
  await S(page).locator("#map-latitude").fill("7");
  const b3 = await notifTitles(page); await save(page); const s3 = await saved(page, b3);
  const kept = await ll(page);
  const msg = await S(page).locator("#map-longitude").evaluate((e) => e.closest("[data-component=SettingsField]").innerText.replace(/\n+/g, " "));
  const msgLat = await S(page).locator("#map-latitude").evaluate((e) => e.closest("[data-component=SettingsField]").innerText.replace(/\n+/g, " "));
  await shot(page, "COL-27");
  const good = s1 && JSON.stringify(st1) === '{"lat":0,"lon":0}' && back.join() === "0,0" && mk === 1 && s2 && JSON.stringify(st2) === '{"lat":0,"lon":10}' && !s3 && kept.join() === "7," && /Enter|both|required|longitude/i.test(msg + msgLat);
  r.add("COL-27", pf(good), `0/0: saved=${s1}, stored ${JSON.stringify(st1)}, after rail trip inputs ${JSON.stringify(back)} marker ${mk}; 0/10: saved=${s2}, stored ${JSON.stringify(st2)}; half-filled (lat 7, lon empty): saved=${s3}, inputs kept ${JSON.stringify(kept)}, messages "${msg}" / "${msgLat}"`, "COL-27");
  await page.context().close();
});

r.save();
await b.close();
