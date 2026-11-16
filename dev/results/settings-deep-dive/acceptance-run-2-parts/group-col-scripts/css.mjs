import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries, axe } from "./lib.mjs";
import { crumb, switchTo } from "./h.mjs";
import { toSettings, save, bodyText, added, clean, devArm, resetDemo, toggleRow, dark, light, heads, addedHeads } from "./common.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("css");
const b = await launch();
const railLabels = (p) => p.locator('nav[aria-label="Settings navigation"] button').allInnerTexts().then((t) => t.map((x) => x.trim()).filter((x) => /^Global CSS/.test(x)));
const tabs = (p) => S(p).getByRole("tab").allInnerTexts().then((t) => t.map((x) => x.trim()));
const area = (p, name) => S(p).locator("textarea");
const css = (p) => S(p).locator("textarea");
const setFlag = async (p, on) => { await rail(p, "Collection"); await p.waitForTimeout(450); const cur = await toggleRow(p, "Global JS").locator("input[type=checkbox],[role=checkbox]").first().evaluate((e) => (e.tagName === "INPUT" ? e.checked : e.getAttribute("aria-checked") === "true")); if (cur !== on) { await toggleRow(p, "Global JS").click(); await save(p); } };
const gotoCss = async (p) => { await p.locator('nav[aria-label="Settings navigation"] button', { hasText: /^Global CSS/ }).first().click(); await p.waitForTimeout(500); };
const tab = async (p, n) => { await S(p).getByRole("tab", { name: n }).click(); await p.waitForTimeout(250); };
const dlgInfo = async (p) => { const d = await dialogs(p); const t = d.length ? await p.locator('[data-component=ConfirmDialog] [role=dialog]').first().innerText().catch(() => "") : ""; return { d, t: t.replace(/\n+/g, " / ") }; };
const SV = (p) => S(p).getByRole("button", { name: "Save", exact: true });
const confirmBtn = (p, n) => p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: n });

await run(r, "CSS-01", async () => {
  const { page, errors } = await open(b, "customisation");
  const rl = await railLabels(page); const title = await S(page).locator("h2").first().textContent();
  const tb = await tabs(page); const labels = (await S(page).locator("label").allInnerTexts()).map((x) => x.trim());
  const areas = await S(page).locator("textarea").count();
  const aria = await S(page).locator("textarea").first().getAttribute("aria-label");
  const jsEditor = tb.includes("JS") || tb.includes("Custom JS");
  await shot(page, "CSS-01");
  const ok = JSON.stringify(rl) === '["Global CSS"]' && title === "Global CSS" && tb.length === 0 && areas === 1 && !jsEditor && labels.includes("Custom CSS");
  r.add("CSS-01", pf(ok), `Global JS off (seed): rail label ${JSON.stringify(rl)}; page title "${title}"; tabs ${JSON.stringify(tb)}; <label> elements ${JSON.stringify(labels)}; textarea count ${areas} (aria-label "${aria}"); JS tab present=${jsEditor}`, "CSS-01");
  await page.context().close();
});

await run(r, "CSS-02", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true);
  const rl = await railLabels(page); await gotoCss(page);
  const title = await S(page).locator("h2").first().textContent(); const tb = await tabs(page);
  await shot(page, "CSS-02");
  r.add("CSS-02", pf(JSON.stringify(rl) === '["Global CSS & JS"]' && title === "Global CSS & JS" && JSON.stringify(tb) === '["Custom CSS","Custom JS"]'), `Global JS on and saved: rail ${JSON.stringify(rl)}; title "${title}"; tabs ${JSON.stringify(tb)} (expected "Custom CSS" and "Custom JS")`, "CSS-02");
  await page.context().close();
});

await run(r, "CSS-03", async () => {
  const { page } = await open(b, "customisation");
  const ta = css(page).first();
  const name = await ta.getAttribute("aria-label");
  const labels = (await S(page).locator("label").allInnerTexts()).map((x) => x.trim());
  const seed = await ta.inputValue();
  const ff = await ta.evaluate((e) => [getComputedStyle(e).fontFamily, getComputedStyle(e).direction]);
  await ta.fill(""); await ta.pressSequentially("body { color: red; }"); const v = await ta.inputValue();
  await ta.fill("a {"); await page.waitForTimeout(300);
  const err = await S(page).locator('[role=alert],.text-seal-label,[aria-invalid=true]').count();
  const saveEnabled = !(await SV(page).isDisabled());
  const lc = await S(page).locator("span").filter({ hasText: /\d+ lines?/ }).first().innerText().catch(() => "");
  await shot(page, "CSS-03");
  r.add("CSS-03", pf(name === "Custom CSS" && labels.includes("Custom CSS") && seed.length > 0 && v === "body { color: red; }" && !err && saveEnabled && /mono/i.test(ff[0]) && ff[1] === "ltr"), `accessible name "${name}" (expected "Custom CSS"); visible <label> ${JSON.stringify(labels)}; prefilled seed ${seed.length} chars ("${seed.slice(0, 40).replace(/\n/g, " ")}"); typed text kept "${v}"; font "${ff[0].slice(0, 40)}", dir ${ff[1]}; invalid CSS "a {" shows errors=${err}, Save enabled=${saveEnabled}; line counter "${lc}"`, "CSS-03");
  await page.context().close();
});

await run(r, "CSS-04", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page);
  await tab(page, /JS/);
  const jsName = await css(page).first().getAttribute("aria-label");
  await css(page).first().fill("window.__x = 1;");
  const warn = (await bodyText(page)).match(/Scripts run on every public page[^|]*/);
  await tab(page, /CSS/); await css(page).first().fill("p{margin:0}");
  await tab(page, /JS/); const js1 = await css(page).first().inputValue();
  await tab(page, /CSS/); const css1 = await css(page).first().inputValue();
  const mounted = await S(page).locator("textarea").count();
  await shot(page, "CSS-04");
  r.add("CSS-04", pf(jsName === "Custom JS" && js1 === "window.__x = 1;" && css1 === "p{margin:0}" && !warn), `JS editor accessible name "${jsName}" (expected "Custom JS"); unsaved JS kept after tab switches "${js1}"; unsaved CSS kept "${css1}"; textareas in DOM ${mounted} (both mounted expected 2); warning text on JS tab: ${warn ? '"' + warn[0].trim() + '"' : "none"} (expected none)`, "CSS-04");
  await page.context().close();
});

await run(r, "CSS-05", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page);
  const ta = css(page).first();
  const jsBefore = await (async () => { await tab(page, /JS/); const v = await css(page).first().inputValue(); await tab(page, /CSS/); return v; })();
  const clean0 = await SV(page).isDisabled();
  const v0 = await ta.inputValue();
  await ta.fill(v0 + "x"); const dirty1 = !(await SV(page).isDisabled());
  await ta.fill(v0); const backClean = await SV(page).isDisabled();
  await ta.fill(v0 + "\n/* z */"); await SV(page).click(); await page.waitForTimeout(400);
  const afterSave = await SV(page).isDisabled();
  const jsAfter = await (async () => { await tab(page, /JS/); const v = await css(page).first().inputValue(); return v; })();
  const place = await SV(page).evaluate((e) => { const f = e.parentElement.getBoundingClientRect(); const b = e.getBoundingClientRect(); return [Math.round(b.right), Math.round(f.right), getComputedStyle(e).backgroundColor]; });
  r.add("CSS-05", pf(clean0 && dirty1 && afterSave && jsBefore === jsAfter), `Save disabled when clean=${clean0}; enabled after one character=${dirty1}; after deleting it Save disabled=${backClean}; after a new edit + Save disabled=${afterSave}; JS text unchanged when only CSS edited=${jsBefore === jsAfter} (${jsAfter.length} chars); Save right edge ${place[0]} vs footer ${place[1]}, colour ${place[2]}`);
  r.add("X-03", pf(afterSave && dirty1), `after Save the button is disabled=${afterSave}; editing again enables it=${dirty1}`);
  await page.context().close();
});

await run(r, "CSS-06", async () => {
  const { page } = await open(b, "customisation");
  const seed = await css(page).first().inputValue();
  await css(page).first().fill("a{color:red}"); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(400); await gotoCss(page);
  const a = await css(page).first().inputValue();
  await page.reload(); await page.waitForTimeout(1500);
  const c = await css(page).first().inputValue();
  await resetDemo(page); await gotoCss(page);
  const d = await css(page).first().inputValue();
  r.add("CSS-06", pf(a === "a{color:red}" && c === "a{color:red}" && d === seed), `after rail round trip "${a}"; after reload "${c}"; after Dashboard > Reset demo data the text is the seed again=${d === seed} (${d.length} chars)`);
  r.add("X-01", pf(a === "a{color:red}" && c === "a{color:red}" && d === seed), `saved CSS survives rail round trip and reload; Reset demo data restores the seed`);
  await page.context().close();
});

await run(r, "CSS-07", async () => {
  const { page } = await open(b, "customisation");
  await css(page).first().fill("a{color:blue}"); await save(page);
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const d1 = await dialogs(page);
  await gotoCss(page); await css(page).first().fill("a{color:green}");
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const d2 = await dialogs(page);
  r.add("CSS-07", pf(!d1.length && d2.some((x) => /Discard changes/.test(x))), `rail click right after Save: dialogs ${JSON.stringify(d1)}; after a new edit: dialogs ${JSON.stringify(d2)}`);
  await page.context().close();
});

await run(r, "CSS-08", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page);
  await tab(page, /JS/); await css(page).first().fill("// js-only edit");
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const i1 = await dlgInfo(page);
  await confirmBtn(page, "Cancel").click(); await page.waitForTimeout(300);
  const still = (await S(page).locator("h2").first().textContent()) === "Global CSS & JS" && (await css(page).first().inputValue()) === "// js-only edit";
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const i2 = await dlgInfo(page);
  await confirmBtn(page, "Discard changes").click(); await page.waitForTimeout(600);
  await gotoCss(page); await tab(page, /JS/);
  const back = await css(page).first().inputValue();
  // CSS-only edit
  await tab(page, /CSS/); await css(page).first().fill("/* css only */");
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const i3 = await dlgInfo(page);
  const good = i1.d.some((x) => /Discard changes\?/.test(x)) && /You have unsaved changes\. Do you want to continue\?/.test(i1.t) && /Cancel/.test(i1.t) && still && i2.d.length === 1 && back !== "// js-only edit" && i3.d.length === 1;
  r.add("CSS-08", pf(good), `JS-only edit, rail click: dialogs ${JSON.stringify(i1.d)} text "${i1.t}"; Cancel keeps page and text=${still}; second rail click dialogs ${JSON.stringify(i2.d)}; after Discard changes returning shows JS "${back}" (edit gone=${back !== "// js-only edit"}); CSS-only edit rail click dialogs ${JSON.stringify(i3.d)}`);
  r.add("X-02", pf(good), `see CSS-08 for rail; navbar and data source switch below`, "");
  // additional X-02 triggers on the CSS-only dirty state
  await confirmBtn(page, "Cancel").click(); await page.waitForTimeout(300);
  await page.locator("button[data-part=library]").click(); await page.waitForTimeout(500);
  const dn = await dialogs(page); await confirmBtn(page, "Cancel").click().catch(() => {}); await page.waitForTimeout(300);
  await S(page).getByRole("button", { name: "Back to settings" }).click().catch(() => {}); await page.waitForTimeout(400);
  const dbk = await dialogs(page); if (dbk.length) await confirmBtn(page, "Cancel").click(); await page.waitForTimeout(300);
  await crumb(page).click(); await page.waitForTimeout(250);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await page.waitForTimeout(700);
  const dds = await dialogs(page); if (dds.length) await confirmBtn(page, "Cancel").click(); await page.waitForTimeout(300);
  const extra = { navbar: dn, back: dbk, dataSource: dds };
  const exOk = [dn, dds].every((x) => x.some((y) => /Discard changes/.test(y)));
  const last = r.rows.pop(); // replace the X-02 placeholder
  r.add("X-02", pf(good && exOk), `rail (dialog "Discard changes?" with the quoted body, Cancel keeps text, Discard changes drops the edit): ${good}; navbar Library link dialogs ${JSON.stringify(dn)}; data source switch dialogs ${JSON.stringify(dds)}; clean page rail click opened no dialog (CSS-07)`);
  await page.context().close();
});

await run(r, "CSS-09", async () => {
  const { page } = await open(b, "customisation");
  const before = await heads(page);
  await css(page).first().fill("a{color:red}"); await save(page);
  const add = await addedHeads(page, before);
  const full = (await notifTitles(page)).filter((t) => /^Saved successfully/.test(t));
  const status = await devArm(page, "Save", "Quota exceeded", "Global CSS");
  const b2 = await heads(page);
  await css(page).first().fill("a{color:blue}"); await save(page);
  const add2 = await addedHeads(page, b2);
  const kept = await css(page).first().inputValue(); const dirty = !(await SV(page).isDisabled());
  await shot(page, "CSS-09-fail");
  const failOk = add2.length === 1 && /^An error occurred/.test(add2[0]);
  r.add("CSS-09", pf(add.length === 1 && add[0] === "Saved successfully." && failOk), `Save adds ${JSON.stringify(add)} (entry text "${full[0]}"; expected exactly one entry titled "Saved successfully." with the period: ok); failure path (Dev panel "Fail next request" armed to Save, then a Save): new entries ${JSON.stringify(add2)} (expected one "An error occurred" with detail; the save went through instead)`, "CSS-09-fail");
  r.add("X-04", pf(add.length === 1 && add2.length === 1 && /^An error occurred/.test(add2[0]) && kept === "a{color:blue}" && dirty), `success ${JSON.stringify(add)}; ${status}; the next Save after arming "Save" failure: new entries ${JSON.stringify(add2)}, the save went through (edit stored, Save disabled=${!dirty}); expected exactly one "An error occurred" entry and the edit kept`, "CSS-09-fail");
  await page.context().close();
});

const frameInfo = async (page, tag) => {
  await page.waitForTimeout(1200);
  const out = [];
  for (const f of page.frames()) { if (f === page.mainFrame()) continue; try { out.push(await f.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].map((s) => s.textContent).filter((t) => /__ran|JS ran/.test(t)).length, hasCss: [...document.querySelectorAll("style")].some((s) => /rgb\(255, 0, 0\)/.test(s.textContent)) }))); } catch (e) { out.push({ err: e.message.slice(0, 80) }); } }
  return out;
};
const viewPage = async (p) => { await rail(p, "Pages"); await p.waitForTimeout(500); await S(p).getByRole("button", { name: "View About this collection" }).click(); await p.waitForTimeout(900); };
const editPage = async (p) => { await rail(p, "Pages"); await p.waitForTimeout(500); await S(p).getByRole("button", { name: "Edit About this collection" }).click(); await p.waitForTimeout(1500); };

await run(r, "CSS-10", async () => {
  const { page } = await open(b, "customisation");
  await css(page).first().fill("body { background: rgb(255, 0, 0); }"); await save(page);
  await viewPage(page); const pub = await frameInfo(page, "pub"); await shot(page, "CSS-10-public");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await editPage(page); const ed = await frameInfo(page, "ed"); await shot(page, "CSS-10-editor");
  await gotoCss(page).catch(() => {});
  await page.getByRole("button", { name: /Discard|Cancel/ }).first().click().catch(() => {});
  await rail(page, "Global CSS"); await page.waitForTimeout(500);
  const dl = await dialogs(page); if (dl.length) await confirmBtn(page, "Discard changes").click(); await page.waitForTimeout(500);
  await gotoCss(page); await css(page).first().fill(""); await save(page);
  await viewPage(page); const pub2 = await frameInfo(page, "pub2");
  const red = (a) => a.length && a.every((x) => x.bg === "rgb(255, 0, 0)");
  r.add("CSS-10", pf(red(pub) && red(ed) && pub2.length && !pub2.some((x) => x.bg === "rgb(255, 0, 0)")), `public preview iframe body background ${JSON.stringify(pub.map((x) => x.bg))}; Pages editor preview iframe ${JSON.stringify(ed.map((x) => x.bg))}; after emptying the CSS and saving: public preview ${JSON.stringify(pub2.map((x) => x.bg))}`, "CSS-10-public");
  await page.context().close();
});

await run(r, "CSS-11", async () => {
  const { page } = await open(b, "customisation");
  const bg0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const nav0 = await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=settings-content]")).backgroundColor);
  await css(page).first().fill("body { background: rgb(255, 0, 0); } a { color: rgb(1,2,3); }"); await save(page);
  await page.reload(); await page.waitForTimeout(1500);
  const chk = () => page.evaluate(() => ({ styles: [...document.querySelectorAll("style,link[rel=stylesheet]")].filter((s) => /rgb\(255, 0, 0\)|rgb\(1,2,3\)/.test(s.textContent || "")).length, bg: getComputedStyle(document.body).backgroundColor, pane: getComputedStyle(document.querySelector("[data-testid=settings-content]") || document.body).backgroundColor }));
  const s1 = await chk();
  await page.locator("button[data-part=library]").click(); await page.waitForTimeout(1500);
  const s2 = await page.evaluate(() => ({ styles: [...document.querySelectorAll("style")].filter((s) => /rgb\(255, 0, 0\)/.test(s.textContent || "")).length, bg: getComputedStyle(document.body).backgroundColor, a: getComputedStyle(document.querySelector("a, button")).color }));
  r.add("CSS-11", pf(!s1.styles && !s2.styles && s1.bg === bg0 && s2.bg === bg0), `admin body background before ${bg0}, Settings after saving+reload ${s1.bg} (pane ${nav0} -> ${s1.pane}), Library ${s2.bg}; <style> elements carrying the saved text: Settings ${s1.styles}, Library ${s2.styles}`);
  await page.context().close();
});

await run(r, "CSS-12", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page); await tab(page, /JS/);
  await css(page).first().fill("window.__ran = true; document.title = 'JS ran'"); await save(page);
  const title0 = await page.title();
  await page.reload(); await page.waitForTimeout(1500);
  const main = await page.evaluate(() => ({ ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].filter((s) => /__ran|JS ran/.test(s.textContent)).length }));
  await tab(page, /JS/).catch(() => {}); const shown = await css(page).first().inputValue();
  await viewPage(page); const pub = await frameInfo(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await editPage(page); const ed = await frameInfo(page);
  const srcdocs = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => /__ran|JS ran/.test(f.getAttribute("srcdoc") || "")));
  const ok = main.ran === "undefined" && main.title === title0 && !main.scripts && /__ran/.test(shown) && [...pub, ...ed].every((x) => x.ran === "undefined" && !x.scripts && x.title !== "JS ran") && !srcdocs.some(Boolean);
  r.add("CSS-12", pf(ok), `after reload in the admin: window.__ran ${main.ran}, title "${main.title}" (before "${title0}"), script elements with the text ${main.scripts}; JS text still shown on the page=${/__ran/.test(shown)}; public preview iframes ${JSON.stringify(pub.map((x) => [x.ran, x.title, x.scripts]))}; editor preview iframes ${JSON.stringify(ed.map((x) => [x.ran, x.title, x.scripts]))}; srcdoc contains JS text ${JSON.stringify(srcdocs)}`);
  await page.context().close();
});

await run(r, "CSS-13", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page); await tab(page, /JS/);
  await css(page).first().fill("// keep"); await save(page);
  await setFlag(page, false);
  const rl = await railLabels(page); await gotoCss(page);
  const tb = await tabs(page); const title = await S(page).locator("h2").first().textContent();
  await setFlag(page, true); await gotoCss(page); await tab(page, /JS/);
  const back = await css(page).first().inputValue();
  r.add("CSS-13", pf(JSON.stringify(rl) === '["Global CSS"]' && tb.length === 0 && back === "// keep"), `flag off: rail ${JSON.stringify(rl)}, title "${title}", tabs ${JSON.stringify(tb)} (expected no JS tab); flag on again: JS text "${back}"`);
  await page.context().close();
});

await run(r, "CSS-14", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, true); await gotoCss(page);
  await css(page).first().fill("a{}\n/* ZZMARKER-1 */\nb{}"); await save(page);
  await tab(page, /JS/); await css(page).first().fill("// ZZMARKER-2\nvar x;"); await save(page);
  await rail(page, "Activity log"); await page.waitForTimeout(700);
  const text = await bodyText(page);
  const log = await logEntries(page);
  const entries = log.filter((l) => /custom|css|js/i.test(l));
  await shot(page, "CSS-14");
  const good = /Updated custom CSS/.test(text) && /Updated custom JS/.test(text) && !/ZZMARKER/.test(text) && !log.join().includes("ZZMARKER");
  r.add("CSS-14", pf(good), `Activity log page shows "Updated custom CSS"=${/Updated custom CSS/.test(text)}, "Updated custom JS"=${/Updated custom JS/.test(text)}; marker text on page/log=${/ZZMARKER/.test(text) || log.join().includes("ZZMARKER")}; stored entries ${JSON.stringify(entries)}`, "CSS-14");
  r.add("X-09", pf(entries.length >= 2 && entries.every((e) => /\[admin\]$/.test(e))), `each Save added an Activity log entry with the acting user: ${JSON.stringify(entries.slice(-2))} (wording differs from CSS-14's "Updated custom CSS"/"Updated custom JS", see CSS-14)`, "CSS-14");
  await page.context().close();
});

await run(r, "CSS-15", async () => {
  const { page } = await open(b, "customisation");
  await setFlag(page, false); await gotoCss(page);
  const g = await page.evaluate(() => window.__gutter());
  const edge = await page.evaluate(() => { const ta = document.querySelector("[data-testid=settings-content] textarea"); const box = ta.closest(".flex").getBoundingClientRect(); const h2 = document.querySelector("[data-testid=settings-content] h2").getBoundingClientRect(); return [Math.round(box.left), Math.round(h2.left)]; });
  const f1 = await css(page).first().evaluate((e) => [getComputedStyle(e).fontSize, getComputedStyle(e).fontFamily]);
  await editPage(page);
  await page.getByRole("tab", { name: "CSS", exact: true }).click(); await page.waitForTimeout(700);
  const ed = await page.evaluate(() => [...document.querySelectorAll("textarea,.cm-content,[contenteditable=true],[role=textbox]")].filter((e) => e.getBoundingClientRect().height > 50).slice(0, 3).map((e) => [e.tagName, getComputedStyle(e).fontSize, getComputedStyle(e).fontFamily.slice(0, 60)]));
  await shot(page, "CSS-15");
  const same = ed.length && ed.every((x) => x[1] === f1[0] && x[2].split(",")[0] === f1[1].split(",")[0]);
  r.add("CSS-15", pf(g.pass && edge[0] === edge[1] && same), `__gutter pass=${g.pass} (${JSON.stringify(g.starts)}); code box left ${edge[0]} vs title left ${edge[1]}; CSS page code font ${f1[0]} / ${f1[1].slice(0, 50)}; Pages editor code areas ${JSON.stringify(ed)}`, "CSS-15");
  await page.context().close();
});

await run(r, "CSS-16", async () => {
  const { page, errors } = await open(b, "collection", "mobile");
  await toggleRow(page, "Global JS").click(); await save(page);
  await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(600);
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: /^Global CSS/ }).first().click(); await page.waitForTimeout(700);
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  const tb = await S(page).getByRole("tab").evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(b.top), Math.round(b.right)]; }));
  const oneRow = tb.length >= 2 && new Set(tb.map((x) => x[1])).size === 1 && tb.every((x) => x[2] <= 390);
  const ta = S(page).locator("textarea").first();
  const h = await ta.evaluate((e) => Math.round(e.getBoundingClientRect().height));
  await ta.tap(); await page.keyboard.type("x{}"); const typed = await ta.inputValue();
  const sv = await SV(page).boundingBox();
  const inView = sv && sv.y >= 0 && sv.y + sv.height <= 844;
  await shot(page, "CSS-16");
  await page.keyboard.press("Escape");
  // phone dirty guard through the back chevron
  await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(500);
  const dBack = await dialogs(page);
  await shot(page, "CSS-16-discard");
  await SV(page).click().catch(() => {}); await page.waitForTimeout(300);
  const row = r.rows.find((x) => x.id === "X-02");
  if (row) { row.evidence += `; phone back chevron with an edit: dialogs ${JSON.stringify(dBack)}`; if (!dBack.some((x) => /Discard changes/.test(x))) row.result = "FAIL"; }
  const ok = sw[0] <= sw[1] && oneRow && h >= 320 && /x\{\}/.test(typed) && inView;
  r.add("CSS-16", pf(ok), `390px: scrollWidth ${sw[0]} vs ${sw[1]}; tabs ${JSON.stringify(tb)} on one row=${oneRow}; code area height ${h}px (min 320); touch typing -> "${typed.slice(-6)}"; Save in view=${inView}; console errors ${JSON.stringify(noise(errors))}`, "CSS-16");
  r.add("X-06", pf(ok && dBack.some((x) => /Discard changes/.test(x))), `Global CSS & JS at 390x844 touch: no horizontal scroll, tabs on one row, code area ${h}px high, Save reachable; back chevron guarded by dialog ${JSON.stringify(dBack)}`, "CSS-16");
  await page.context().close();
});

// X-07 / dark look
const cssAxe = async (vp, dk) => {
  const { page, errors } = await open(b, vp === "mobile" ? "collection" : "customisation", vp);
  if (vp === "mobile") { await toggleRow(page, "Global JS").click(); await save(page); await page.getByRole("button", { name: "Back to settings" }).click(); await page.waitForTimeout(500); await page.locator('nav[aria-label="Settings navigation"] button', { hasText: /^Global CSS/ }).first().click(); await page.waitForTimeout(600); }
  if (dk) await dark(page); await page.waitForTimeout(400);
  const res = {};
  res.css = await axe(page);
  await S(page).getByRole("tab").nth(1).click(); await page.waitForTimeout(300);
  res.js = await axe(page);
  await S(page).locator("textarea").first().fill("// dirty");
  await S(page).getByRole("button", { name: "Reset" }).click(); await page.waitForTimeout(500);
  res.reset = await dialogs(page);
  await page.evaluate(async () => { const el = document.querySelector("[data-component=ConfirmDelete]"); if (!el) { window.__d = ["no dialog"]; return; } const r = await window.axe.run(el, { resultTypes: ["violations"] }); window.__d = r.violations.map((v) => v.id + " (" + v.impact + ") x" + v.nodes.length + " " + v.nodes.slice(0,1).map((n) => n.target.join(" ").slice(0,80)).join()); });
  res.resetAxe = await page.evaluate(() => window.__d);
  res.resetTrap = await (async () => { const out = []; for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); out.push(await page.evaluate(() => !!document.activeElement.closest("[data-component=ConfirmDelete]"))); } return out.every(Boolean); })();
  await shot(page, `X-07-css-${vp}-${dk ? "dark" : "light"}-reset`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  res.afterEsc = await dialogs(page);
  res.focus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await shot(page, `CSS-${vp}-${dk ? "dark" : "light"}`);
  res.errors = noise(errors);
  await page.context().close();
  return res;
};
const allCss = {};
for (const vp of ["desktop", "mobile"]) for (const dk of [false, true]) await run(r, "X-07", async () => { allCss[`${vp}-${dk ? "dark" : "light"}`] = await cssAxe(vp, dk); });
{
  const ser = (a) => (a || []).filter((x) => /\((serious|critical)\)/.test(x));
  const bad = Object.values(allCss).filter((v) => ser(v.css).length || ser(v.js).length || ser(v.resetAxe).length || !v.resetTrap || v.afterEsc.length || v.errors.length || !v.reset.length);
  const ev = Object.entries(allCss).map(([k, v]) => `${k}: CSS tab ${JSON.stringify(v.css)}; JS tab ${JSON.stringify(v.js)}; Reset dialog ${JSON.stringify(v.reset)} axe ${JSON.stringify(v.resetAxe)}, focus trapped=${v.resetTrap}, Escape closes it (left ${JSON.stringify(v.afterEsc)}), focus returns to "${v.focus}"; console errors ${JSON.stringify(v.errors)}`).join(" || ");
  r.add("X-07", Object.keys(allCss).length === 4 && !bad.length ? "PASS" : "FAIL", ev, "X-07-css-desktop-dark-reset");
}
r.add("X-08", "N/A", "Not in Global CSS & JS's Applies line (no status pills or badges on the page); dark mode checked by axe in X-07 and screenshots CSS-desktop-dark / CSS-mobile-dark");

r.save();
await b.close();
