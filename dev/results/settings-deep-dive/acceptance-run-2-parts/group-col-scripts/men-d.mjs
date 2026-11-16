import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries } from "./lib.mjs";
import { switchTo, crumb } from "./h.mjs";
import { toSettings, heads, addedHeads, devArm, resetDemo, bodyText } from "./common.mjs";
import * as M from "./menu.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("men-d");
const b = await launch();
const tick = async (p, t) => { await M.rowOf(p, t).locator("input[type=checkbox],[role=checkbox]").first().click({ force: true }); await p.waitForTimeout(150); };
const upTo = async (p, t) => { for (let i = 0; i < 6; i++) { const bt = S(p).getByRole("button", { name: `Move ${t} up`, exact: true }); if (!(await bt.isEnabled())) break; await bt.click(); await p.waitForTimeout(150); } };
const del = async (p, t) => { await tick(p, t); await S(p).getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(300); };

await run(r, "MEN-16", async () => {
  const { page } = await open(b, "menu");
  const seedNav = await M.navbar(page);
  await M.edit(page, "Library"); await M.fill(page, { title: "Alpha" }); await M.submit(page, "Update");
  await M.addLink(page, { title: "Docs", url: "/page/docs" });
  await del(page, "About");
  await upTo(page, "Resources");
  const draft = await M.titles(page);
  const navDraft = await M.navbar(page);
  await M.saved(page);
  const navSaved = await M.navbar(page);
  // group opens to its links
  const anchors = () => page.evaluate(() => [...document.querySelectorAll("a")].filter((e) => e.getBoundingClientRect().height && e.getBoundingClientRect().top < 200 && !e.closest("[inert]")).map((e) => e.textContent.trim()));
  const a0 = await anchors();
  await page.locator("nav[data-part=primary-nav] button:not([data-part])", { hasText: "Resources" }).first().click(); await page.waitForTimeout(400);
  const a1 = await anchors(); const items = a1.filter((x) => !a0.includes(x));
  await shot(page, "MEN-16-desktop");
  await page.keyboard.press("Escape");
  await page.reload(); await page.waitForTimeout(1500);
  const navReload = await M.navbar(page);
  const rowsReload = await M.titles(page);
  await resetDemo(page); const navReset = await M.navbar(page);
  r.add("MEN-16", pf(JSON.stringify(draft) === '["Resources","  Methodology","  Contact","Alpha","Docs"]' && JSON.stringify(navDraft) === JSON.stringify(seedNav) && JSON.stringify(navSaved) === '["Resources","Alpha","Docs"]' && JSON.stringify(items) === '["Methodology","Contact"]' && JSON.stringify(navReload) === JSON.stringify(navSaved) && JSON.stringify(navReset) === JSON.stringify(seedNav)), `seed navbar ${JSON.stringify(seedNav)}; draft tree ${JSON.stringify(draft)}; navbar while unsaved ${JSON.stringify(navDraft)} (unchanged=${JSON.stringify(navDraft) === JSON.stringify(seedNav)}); after Save ${JSON.stringify(navSaved)}; group dropdown items ${JSON.stringify(items)}; after reload ${JSON.stringify(navReload)} (Menu rows ${JSON.stringify(rowsReload)}); after Reset demo data ${JSON.stringify(navReset)}`, "MEN-16-desktop");
  await page.context().close();
});

await run(r, "MEN-17", async () => {
  const { page } = await open(b, "translations");
  await S(page).locator("[data-part=row]").filter({ hasText: "Menu" }).first().click(); await page.waitForTimeout(800);
  const ctx0 = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input[aria-label]")].map((i) => i.getAttribute("aria-label")).filter((l) => /in Spanish/.test(l)));
  await S(page).getByLabel(/^Library in Spanish/).fill("Biblioteca");
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(500);
  await rail(page, "Menu"); await page.waitForTimeout(500);
  await M.edit(page, "Library"); await M.fill(page, { title: "Alpha" }); await M.submit(page, "Update");
  await M.addLink(page, { title: "Docs", url: "/page/docs" });
  await del(page, "About");
  // unsaved: leave and discard, context unchanged
  await rail(page, "Translations"); await page.waitForTimeout(400);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Discard changes" }).click(); await page.waitForTimeout(600);
  await S(page).locator("[data-part=row]").filter({ hasText: "Menu" }).first().click(); await page.waitForTimeout(800);
  const ctxUnsaved = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input[aria-label]")].map((i) => i.getAttribute("aria-label") + "=" + i.value).filter((l) => /in Spanish/.test(l)));
  await rail(page, "Menu"); await page.waitForTimeout(500);
  await M.edit(page, "Library"); await M.fill(page, { title: "Alpha" }); await M.submit(page, "Update");
  await M.addLink(page, { title: "Docs", url: "/page/docs" });
  await del(page, "About"); await M.saved(page);
  await rail(page, "Translations"); await page.waitForTimeout(500);
  await S(page).locator("[data-part=row]").filter({ hasText: "Menu" }).first().click(); await page.waitForTimeout(800);
  const ctxSaved = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input[aria-label]")].map((i) => i.getAttribute("aria-label") + "=" + i.value).filter((l) => /in Spanish/.test(l)));
  await shot(page, "MEN-17");
  const has = (a, k) => a.some((x) => x.startsWith(k + " in Spanish"));
  const val = (a, k) => (a.find((x) => x.startsWith(k + " in Spanish")) || "").split("=").slice(1).join("=");
  const ok = has(ctxUnsaved, "Library") && has(ctxUnsaved, "About") && !has(ctxUnsaved, "Alpha") && has(ctxSaved, "Alpha") && val(ctxSaved, "Alpha") === "Biblioteca" && !has(ctxSaved, "Library") && has(ctxSaved, "Docs") && val(ctxSaved, "Docs") === "Docs" && !has(ctxSaved, "About");
  r.add("MEN-17", pf(ok), `Menu context keys before: ${JSON.stringify(ctx0.map((x) => x.replace(" in Spanish, untranslated", "")))}; after translating Library to "Biblioteca"; with the rename/add/delete in an unsaved draft (discarded) the context still reads ${JSON.stringify(ctxUnsaved)}; after Save the Spanish inputs are ${JSON.stringify(ctxSaved)} (Alpha carries "Biblioteca"=${val(ctxSaved, "Alpha") === "Biblioteca"}, Library gone=${!has(ctxSaved, "Library")}, Docs value "${val(ctxSaved, "Docs")}", About gone=${!has(ctxSaved, "About")})`, "MEN-17");
  await page.context().close();
});

await run(r, "MEN-18", async () => {
  const { page } = await open(b, "menu");
  const ids = async () => { const m = await M.storedMenu(page); const links = (m && m.links) || []; return links.flatMap((l) => [l.id, ...((l.sublinks || []).map((s) => s.id))]); };
  const byTitle = async () => { const m = await M.storedMenu(page); const out = {}; for (const l of (m && m.links) || []) { out[l.title] = l.id; for (const s of l.sublinks || []) out[s.title] = s.id; } return out; };
  await M.addLink(page, { title: "T1", url: "/t1" }); await M.saved(page);
  const a = await byTitle();
  await del(page, "T1"); await M.addLink(page, { title: "T2", url: "/t2" }); await M.saved(page);
  const bb = await byTitle();
  await M.edit(page, "About"); await M.fill(page, { title: "About2" }); await M.submit(page, "Update");
  await upTo(page, "T2"); await M.saved(page);
  const c = await byTitle(); const all = await ids();
  const seedIds = ["Library", "About", "Resources", "Methodology", "Contact"].map((k) => bb[k]);
  const ok = !all.some((i) => /^tmp_/.test(i)) && new Set(all).size === all.length && bb["T2"] !== a["T1"] && c["About2"] === bb["About"] && c["T2"] === bb["T2"] && all.length === 6;
  r.add("MEN-18", pf(ok), `after adding T1 and Save: T1 id "${a.T1}"; after delete T1, add T2, Save: T2 id "${bb.T2}" (differs from T1's=${bb.T2 !== a.T1}); after renaming About to About2, moving T2 and Save: About2 id "${c.About2}" equals About's earlier id "${bb.About}" (${c.About2 === bb.About}), T2 id stable ${c.T2 === bb.T2}; all ids ${JSON.stringify(all)}; ids starting with tmp_: ${all.filter((i) => /^tmp_/.test(i)).length}; unique=${new Set(all).size === all.length}`);
  await page.context().close();
});

await run(r, "MEN-19", async () => {
  const { page } = await open(b, "menu");
  // delete all rows, Save, reopen
  await S(page).locator("[role=row]").first().locator("input[type=checkbox],[role=checkbox]").first().click({ force: true }); await page.waitForTimeout(200);
  await S(page).getByRole("button", { name: "Delete", exact: true }).click(); await page.waitForTimeout(300);
  await M.saved(page);
  await rail(page, "Collection"); await page.waitForTimeout(400); await rail(page, "Menu"); await page.waitForTimeout(600);
  const txt = (await bodyText(page));
  const empty = await S(page).locator("[data-component=SettingsEmptyState], [data-part=empty]").first().innerText().catch(() => "");
  const addBtn = await S(page).getByRole("button", { name: "Add link" }).count();
  await shot(page, "MEN-19-empty");
  // X-10
  r.add("X-10", pf(/No menu links yet/.test(txt) && /Add the links readers see/.test(txt) && addBtn >= 1 && !/NO DATA AVAILABLE|Nothing here yet/i.test(txt)), `after deleting every row and Save: empty state text "${empty.replace(/\n+/g, " / ")}"; "Add link" buttons ${addBtn}; generic "Nothing here yet."/"NO DATA AVAILABLE" present=${/NO DATA AVAILABLE|Nothing here yet/i.test(txt)}`, "MEN-19-empty");
  // error half 1: Fail next request -> Read
  const status = await devArm(page, "Read", "Menu store unreadable", "Dashboard");
  await rail(page, "Menu"); await page.waitForTimeout(800);
  const t1 = await bodyText(page);
  const errState1 = /didn't load|error|Retry/i.test(t1) && !/No menu links yet/.test(t1);
  const nots = (await heads(page)).filter((h) => /error/i.test(h));
  await shot(page, "MEN-19-read");
  // error half 2: corrupt the store key
  const key = await M.storedKey(page);
  await page.evaluate((k) => sessionStorage.setItem(k, "{not json"), key);
  await rail(page, "Collection"); await page.waitForTimeout(300); await rail(page, "Menu"); await page.waitForTimeout(700);
  let t2 = await bodyText(page);
  if (!/Retry/.test(t2)) { await page.reload(); await page.waitForTimeout(1500); t2 = await bodyText(page); }
  const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  const errState2 = /Retry/.test(t2);
  await shot(page, "MEN-19-corrupt");
  const emptyOk = /No menu links yet/.test(txt) && addBtn >= 1;
  r.add("MEN-19", pf(emptyOk && errState1 && errState2), `empty store: "${empty.replace(/\n+/g, " / ")}" with "Add link"=${addBtn}; Dev panel ${status} then opening Menu: error state shown=${errState1} (page text "${t1.slice(0, 160).replace(/\n+/g, " | ")}", error entries ${JSON.stringify(nots)}); invalid JSON in "${key}": error state with Retry=${errState2} ("${t2.slice(0, 140)}"), Retry buttons ${retry}`, "MEN-19-read");
  await page.context().close();
});

await run(r, "X-01", async () => {
  const { page } = await open(b, "menu");
  await M.addLink(page, { title: "Keep", url: "/keep" }); await M.saved(page);
  const a = await M.titles(page);
  await rail(page, "Collection"); await page.waitForTimeout(400); await rail(page, "Menu"); await page.waitForTimeout(500);
  const b2 = await M.titles(page);
  await page.reload(); await page.waitForTimeout(1500);
  const c = await M.titles(page);
  await resetDemo(page); await rail(page, "Menu"); await page.waitForTimeout(500);
  const d = await M.titles(page);
  r.add("X-01", pf(b2.includes("Keep") && c.includes("Keep") && !d.includes("Keep") && d.length === 5), `saved "Keep" survives rail round trip ${JSON.stringify(b2.slice(-2))}, reload ${JSON.stringify(c.slice(-2))}; after Dashboard > Reset demo data rows ${JSON.stringify(d)}`);
  await page.context().close();
});

await run(r, "X-04", async () => {
  const { page } = await open(b, "menu");
  const before = await heads(page);
  await M.addLink(page, { title: "Ok1", url: "/ok1" }); await M.saved(page);
  const add = await addedHeads(page, before);
  const status = await devArm(page, "Save", "Store is read-only", "Menu");
  const b2 = await heads(page);
  await M.addLink(page, { title: "Ok2", url: "/ok2" }); await M.saved(page);
  const add2 = await addedHeads(page, b2);
  const draft = await M.titles(page); const dirty = !(await M.saveBtn(page).isDisabled());
  const logs = await logEntries(page);
  await shot(page, "X-04-menu");
  r.add("X-04", pf(add.length === 1 && add[0] === "Updated" && add2.length === 1 && /^An error occurred/.test(add2[0]) && dirty), `success: ${JSON.stringify(add)}; ${status}; the next Save: new entries ${JSON.stringify(add2)}, Ok2 in draft ${draft.includes("Ok2")}, Save still enabled (draft kept)=${dirty} (the save went through instead: Save disabled=${!dirty})`, "X-04-menu");
  r.add("X-09", pf(logs.some((l) => /menu/i.test(l) && /admin/.test(l))), `activity store after the Save: ${JSON.stringify(logs.slice(-3))}`);
  await page.context().close();
});

await run(r, "X-13", async () => {
  const { page } = await open(b, "menu");
  const sample = await M.titles(page);
  await switchTo(page, "CEJIL"); await toSettings(page, "Menu");
  const cejil = await M.titles(page); const navC = await M.navbar(page);
  await switchTo(page, "Sample"); await toSettings(page, "Menu");
  const back = await M.titles(page);
  r.add("X-13", pf(JSON.stringify(cejil) !== JSON.stringify(sample) && JSON.stringify(back) === JSON.stringify(sample)), `Sample rows ${JSON.stringify(sample)}; CEJIL rows ${JSON.stringify(cejil)} (navbar ${JSON.stringify(navC)}); back on Sample ${JSON.stringify(back)}`);
  await page.context().close();
});

r.save();
await b.close();
