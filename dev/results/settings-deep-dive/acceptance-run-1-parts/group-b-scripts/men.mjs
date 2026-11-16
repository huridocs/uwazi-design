import { launch, open, S, shot, rail, notifTitles, logEntries, axe, dialogs } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { recorder, run, pass } from "./rec.mjs";
const r = recorder("MEN");
const b = await launch();
const mine = async (p) => (await notifTitles(p)).filter((t) => !/^(Uploading document batch|Processing PDFs|Some fields could|A new version|Entity saved|Failed to save entity|Batch import|Storage usage|Scheduled export)/.test(t));
const rowTexts = (p) => S(p).locator("[role=row]").evaluateAll((e) => e.slice(1).map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const dlgTxt = (p) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").innerText().then((t) => t.replace(/\s+/g, " ")).catch(() => "");
const addLink = async (p, title, url) => {
  await S(p).getByRole("button", { name: "Add link" }).click(); await p.waitForTimeout(300);
  await S(p).getByLabel("Label").fill(title); if (url) await S(p).getByLabel("URL").fill(url);
  await S(p).getByRole("button", { name: "Add item" }).click(); await p.waitForTimeout(400);
};

await run(r, "MEN-01", async () => {
  const { page } = await open(b, "menu");
  const t = await rowTexts(page);
  const cb = await S(page).locator("[role=checkbox], input[type=checkbox]").count();
  const grips = await S(page).locator('[aria-label*="drag" i], [aria-label*="reorder" i], [data-part=grip]').count();
  const edit = await S(page).getByRole("button", { name: /^Edit /i }).count();
  const indent = await S(page).locator("[role=row]").evaluateAll((e) => e.slice(1).map((x) => Math.round(x.querySelector("span.truncate")?.getBoundingClientRect().left || 0)));
  await shot(page, "MEN-01");
  r("MEN-01", "FAIL", `Title "Menu"; flat table rows ${JSON.stringify(t)} with header LABEL/URL; selection checkboxes ${cb}, grips ${grips}; label text left offsets ${JSON.stringify(indent)} (Methodology and Contact, which follow group Resources, are not indented); rows have edit controls: ${edit} ("Edit <title>" row button; no plain "Edit" label). Expected tree with checkbox, grip, indented group children`, "MEN-01");
  r("MEN-02", "FAIL", `Footer shows only "Add link" (no "Add group") and there is no ink "Save" (list page has no Save at all; Link/Group choice is a segmented switch in the editor panel)`, "MEN-01");
  await page.context().close();
});

await run(r, "MEN-03", async () => {
  const { page } = await open(b, "menu");
  await S(page).getByRole("button", { name: "Add link" }).click(); await page.waitForTimeout(400);
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const btns = await S(page).locator("button").allInnerTexts();
  await shot(page, "MEN-03");
  const ok = /NEW LINK/.test(t) && /Using URLs/.test(t) && /Group/.test(t);
  r("MEN-03", pass(ok), `Add link opens a full editor page: "${t.slice(0, 220)}"; footer buttons ${JSON.stringify(btns.slice(-2))}. Expected panel "NEW LINK" with info band "Using URLs", fields Title, URL, Group ("No Group" first) and buttons "Add"/"Cancel". Saw field labels Label and URL, a Link/Group "Type" switch and no Group select`, "MEN-03");
  // MEN-04
  const addBtn = S(page).getByRole("button", { name: "Add item" });
  const d0 = await addBtn.isDisabled();
  await S(page).getByLabel("URL").fill("abc");
  const d1 = await addBtn.isDisabled();
  await S(page).getByLabel("URL").fill(""); await S(page).getByLabel("Label").fill("Only title");
  const d2 = await addBtn.isDisabled();
  const msgs = await S(page).locator("[role=alert], .text-seal").allInnerTexts();
  r("MEN-04", "FAIL", `Add item disabled with both empty ${d0}, with URL only ("abc") ${d1}, with title only ${d2} (an empty URL is accepted for a link); no visible message under empty required fields (${JSON.stringify(msgs)}). Expected the panel to stay open on click with a red message per empty required field`, "MEN-03");
  // MEN-15 dirty guard while editing + X-02
  await rail(page, "Collection"); await page.waitForTimeout(400);
  const d = await dlgTxt(page); const btns2 = await page.locator("[data-component=ConfirmDialog] button").allInnerTexts();
  r("MEN-15", "FAIL", `Edit with a typed Label then rail click -> dialog "${d}" buttons ${JSON.stringify(btns2)}. Expected "Discard changes?" / "You have unsaved changes. Do you want to continue?" / "Cancel" and "Discard changes". (Unsaved list-level draft cannot exist: the list has no draft or Save)`);
  r("X-02", "FAIL", `Guard works in the link editor (dialog opens on rail click while dirty) but copy differs: "${d}", buttons ${JSON.stringify(btns2)}; the list page itself has no dirty state`);
  await page.context().close();
});

await run(r, "MEN-05", async () => {
  const { page } = await open(b, "menu");
  await addLink(page, "Docs", "/page/abc");
  const t1 = await rowTexts(page);
  await S(page).getByRole("button", { name: "Add link" }).click(); await page.waitForTimeout(300);
  const groupSel = await S(page).getByLabel("Group", { exact: true }).count();
  await S(page).getByLabel("Label").fill("Ext"); await S(page).getByLabel("URL").fill("http://www.uwazi.io");
  await S(page).getByRole("button", { name: "Add item" }).click(); await page.waitForTimeout(400);
  const t2 = await rowTexts(page);
  const save = await S(page).getByRole("button", { name: "Save", exact: true }).count();
  await shot(page, "MEN-05");
  r("MEN-05", "FAIL", `Docs added at the end: ${JSON.stringify(t1.slice(-2))}; Ext added: ${JSON.stringify(t2.slice(-2))} at top level (there is no Group select in the form (count ${groupSel}), so Ext cannot go under group G); no Save button exists (count ${save}) so "not saved yet (Save enabled)" does not apply`, "MEN-05");
  // persistence (X-01)
  await rail(page, "Collection"); await page.waitForTimeout(300); await rail(page, "Menu"); await page.waitForTimeout(400);
  const t3 = await rowTexts(page);
  r("X-01", pass(t3.some((x) => x.startsWith("Docs"))), `added Docs and Ext, went to Collection and back: rows ${JSON.stringify(t3)} (the Menu list is component state; additions are lost on rail navigation, and there is no Save)`);
  const n = await mine(page);
  r("X-04", "FAIL", `Beacon after adding two links: ${JSON.stringify(n)}; expected an entry per Save/action with the page's quoted text ("Updated")`);
  const log = await logEntries(page);
  r("X-09", pass(log.some((l) => /menu|link/i.test(l))), `Activity entries after adding links: ${JSON.stringify(log)} (add/delete record with log:false)`);
  await page.context().close();
});

await run(r, "MEN-06", async () => {
  const { page } = await open(b, "menu");
  await S(page).locator("[role=row]").nth(2).click(); await page.waitForTimeout(400);
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const vals = await S(page).locator("input").evaluateAll((e) => e.map((x) => x.value));
  const btns = await S(page).locator("button").allInnerTexts();
  await shot(page, "MEN-06");
  r("MEN-06", "FAIL", `Edit on "About" opens a page titled "About" ("${t.slice(0, 150)}") with inputs ${JSON.stringify(vals)}; footer ${JSON.stringify(btns.slice(-2))}; expected "EDIT LINK" panel with Title, URL and Group pre-filled and buttons "Update"/"Cancel". No Group field so a link cannot be moved to another group`, "MEN-06");
  await page.context().close();
});

await run(r, "MEN-07", async () => {
  const { page } = await open(b, "menu");
  const addGroup = await S(page).getByRole("button", { name: "Add group" }).count();
  await S(page).getByRole("button", { name: "Add link" }).click(); await page.waitForTimeout(300);
  await S(page).getByRole("button", { name: "Group", exact: true }).click(); await page.waitForTimeout(300);
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const fields = await S(page).locator("input").count();
  await shot(page, "MEN-07");
  r("MEN-07", "FAIL", `No "Add group" footer button (count ${addGroup}); a group is made by switching Type to Group inside the Add link editor: "${t.slice(0, 200)}" (inputs ${fields}); that group form includes a "Sub-links" section with Add sub-link, not a bare Title`, "MEN-07");
  r("MEN-08", "FAIL", `Nesting rules cannot be driven as specified: the list has no drag grips and the editor has no Group select. A group's sub-links are edited inside the group's own form instead (local sample sub-links "Methodology" and "Partners" shown for any group)`);
  await page.context().close();
});

await run(r, "MEN-09", async () => {
  const { page } = await open(b, "menu");
  const grip = await S(page).locator('[aria-label*="drag" i], [aria-label*="move" i], [aria-label*="reorder" i], [draggable=true]').count();
  const updown = await S(page).getByRole("button", { name: /move (up|down)/i }).count();
  const tabs = []; for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); tabs.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText || "").slice(0, 30))); }
  r("MEN-09", "FAIL", `List rows have no grips (drag handles ${grip}) and no up/down buttons (${updown}); Tab order reaches ${JSON.stringify(tabs)}; no keyboard reorder and no Save to enable`);
  r("MEN-10", "FAIL", `List rows are not draggable (draggable elements ${grip}); no drop indicator, no reorder, no navbar order to compare`);
  await page.context().close();
});

await run(r, "MEN-11", async () => {
  const { page } = await open(b, "menu");
  const cb = await S(page).locator("[role=checkbox], input[type=checkbox]").count();
  r("MEN-11", "FAIL", `No selection checkboxes on rows (count ${cb}); no "Selected n of total" bar; "Delete" is a per-row action, so ticking A and E cannot be done`);
  r("X-12", "FAIL", `No row selection on Menu: checkboxes ${cb}; footer keeps only "Add link"`);
  await page.context().close();
});

await run(r, "MEN-12", async () => {
  const { page } = await open(b, "menu");
  await S(page).getByRole("button", { name: "Delete Resources" }).click(); await page.waitForTimeout(400);
  const d = await dlgTxt(page);
  await shot(page, "MEN-12");
  await page.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: /^Delete$/ }).click(); await page.waitForTimeout(500);
  const t = await rowTexts(page);
  const n = await mine(page);
  const undo = await page.locator("article").filter({ hasText: /removed/ }).getByRole("button", { name: /Undo/ }).count();
  r("MEN-12", "FAIL", `Deleting group Resources opens a confirmation dialog ("${d}") (expected none); after confirming rows are ${JSON.stringify(t)} (Methodology and Contact stay: the group's children were never nested under it); Beacon entries ${JSON.stringify(n)}, Undo buttons in them: ${undo}; no Save to enable`, "MEN-12");
  r("MEN-13", pass(undo > 0), `Beacon entry for the deleted group has ${undo} "Undo" buttons (expected an Undo that restores G, G1, G2); entries ${JSON.stringify(n)}`);
  r("X-05", "FAIL", `Deleting a group: dialog text "${d}" (it says "Its sub-links are removed with it." although Methodology/Contact then stay in the list); a link states "It links to <url>.", which is not a usage count`, "MEN-12");
  await page.context().close();
});

await run(r, "MEN-14", async () => {
  const { page } = await open(b, "menu");
  const sv = await S(page).getByRole("button", { name: "Save", exact: true }).count();
  const foot = (await S(page).evaluate((e) => e.parentElement.innerText)).slice(-120).replace(/\n/g, " | ");
  r("MEN-14", "FAIL", `The Menu list has no Save button (count ${sv}) and no "Saved <time> by <user>" line; footer text: "${foot}". Reorder/save/dirty-revert states cannot be driven`);
  r("X-03", "FAIL", `No footer Save on the Menu list to disable after saving (G11 asks for one footer Save); the editor closes on "Add item" instead`);
  await page.context().close();
});

await run(r, "MEN-16", async () => {
  const { page } = await open(b, "menu");
  const navBefore = (await page.locator("nav").first().innerText()).replace(/\n+/g, " | ");
  await S(page).locator("[role=row]").nth(2).click(); await page.waitForTimeout(300);
  await S(page).getByLabel("Label").fill("Alpha"); await S(page).getByRole("button", { name: /Save|Update/ }).last().click(); await page.waitForTimeout(500);
  await addLink(page, "Docs", "/page/docs").catch(() => {});
  await S(page).getByRole("button", { name: "Delete Contact" }).click(); await page.waitForTimeout(300);
  await page.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: /^Delete$/ }).click(); await page.waitForTimeout(400);
  const t = await rowTexts(page);
  await page.waitForTimeout(5000);
  const navAfter = (await page.locator("nav").first().innerText()).replace(/\n+/g, " | ");
  await shot(page, "MEN-16");
  r("MEN-16", "FAIL", `After renaming About to Alpha, adding Docs and deleting Contact the list reads ${JSON.stringify(t)}; the navbar reads "${navBefore}" before and "${navAfter}" after (it never shows menu items; hard-coded Library/Tools remain). Menu edits do not reach the navbar and there is no Save`, "MEN-16");
  await page.context().close();
});

await run(r, "MEN-17", async () => {
  const { page } = await open(b, "translations");
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const hasMenu = /Menu/.test(t);
  r("MEN-17", "FAIL", `Settings > Translations lists contexts: "${t.slice(0, 260)}"; a "Menu" context exists: ${hasMenu}. The Menu page has no Save and keeps no stored tree, so renaming A or deleting B cannot reach Translations`);
  await page.context().close();
});

await run(r, "MEN-18", async () => {
  const { page } = await open(b, "menu");
  await addLink(page, "T1", "/t1");
  const keys = await page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)).filter((k) => /menu/i.test(k)));
  const hits = await page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)).filter((k) => /tmp_/.test(sessionStorage.getItem(k) || localStorage.getItem(k) || "")));
  r("MEN-18", "FAIL", `No Menu store exists to inspect: storage keys containing "menu": ${JSON.stringify(keys)}; there is no Save, and the list is component state (ids are generated in memory as newSettingsId("m")). Expected a stored menu with unique, stable ids and none starting with tmp_`);
  await page.context().close();
});

await run(r, "MEN-19", async () => {
  const { page } = await open(b, "menu");
  for (const n of ["Library", "About", "Resources", "Methodology", "Contact"]) {
    await S(page).getByRole("button", { name: "Delete " + n }).click(); await page.waitForTimeout(250);
    await page.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: /^Delete$/ }).click(); await page.waitForTimeout(300);
  }
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  await shot(page, "MEN-19");
  const ok = /No menu links yet/.test(t) && /Add link/.test(t) && !/NO DATA AVAILABLE/i.test(t);
  r("MEN-19", pass(ok), `After deleting all five rows: "${t.slice(0, 240)}" (title naming the object, hint and "Add link" action shown). Error-state half (corrupt store key) not driveable: Menu has no store key; "Save" does not exist`, "MEN-19");
  r("X-10", pass(ok), `Empty state title "No menu links yet", hint "Add the links readers see in the collection's top navigation." and "Add link" action`, "MEN-19");
  await page.context().close();
});

await run(r, "MEN-20", async () => {
  const { page } = await open(b, "menu", "mobile");
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.querySelector("[data-testid=settings-content]").scrollWidth]);
  const tblMin = await S(page).locator("[role=table],table").evaluateAll((e) => e.map((x) => getComputedStyle(x).minWidth + "/" + Math.round(x.getBoundingClientRect().width)));
  await shot(page, "MEN-20");
  await S(page).locator("[role=row]").nth(2).click(); await page.waitForTimeout(400);
  const long = "/page/" + "very-long-segment-".repeat(4);
  await S(page).getByLabel("URL").fill(long);
  const fits = await S(page).getByLabel("URL").evaluate((e) => [e.scrollWidth, e.clientWidth, e.value.length]);
  await shot(page, "MEN-20b");
  const sv = S(page).getByRole("button", { name: /Save|Update/ }).last(); const box = await sv.boundingBox();
  const ok = sw[0] <= sw[1] && box && box.y + box.height <= 844;
  r("MEN-20", "FAIL", `phone: scrollWidth ${sw[0]}/${sw[1]} (pane ${sw[2]}), table min-width/width ${JSON.stringify(tblMin)}; Edit opens a full-screen page form; URL field with ${fits[2]} chars has scrollWidth ${fits[0]} vs clientWidth ${fits[1]} (scrolls inside; not clipped); footer Save at y=${box?.y}. Expected rows with sub-links indented and "Add link" reachable; list is a flat table (no indented sub-links)`, "MEN-20");
  r("X-06", pass(sw[0] <= sw[1]), `phone: no horizontal page scroll (${sw[0]}/${sw[1]}); rows are a table (not stacked cards) but fit; editor is single column`, "MEN-20");
  await page.context().close();
});

await run(r, "X-07", async () => {
  const { page } = await open(b, "menu");
  const v1 = await axe(page);
  await S(page).getByRole("button", { name: "Delete About" }).click(); await page.waitForTimeout(400);
  const dn = await dialogs(page); const v2 = await axe(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await S(page).getByRole("button", { name: "Add link" }).click(); await page.waitForTimeout(300);
  const v3 = await axe(page);
  const all = [...v1, ...v2, ...v3];
  r("X-07", all.some((x) => /serious|critical/.test(x)) ? "FAIL" : "PASS", `axe list: ${v1.join(" ; ") || "none"}; with delete dialog ${JSON.stringify(dn)}: ${v2.join(" ; ") || "none"}; editor: ${v3.join(" ; ") || "none"}; focus after Escape on dialog: ${focusBack}`);
  await page.context().close();
});

await run(r, "X-13", async () => {
  const { page } = await open(b, "menu");
  const s = await rowTexts(page);
  await switchTo(page, "CEJIL"); await toSettings(page, "Menu");
  const c = await rowTexts(page);
  await switchTo(page, "Sample"); await toSettings(page, "Menu");
  const s2 = await rowTexts(page);
  r("X-13", pass(JSON.stringify(s) !== JSON.stringify(c) && JSON.stringify(s) === JSON.stringify(s2)), `Sample rows ${JSON.stringify(s.map(x=>x.split(" ")[0]))}; CEJIL rows ${JSON.stringify(c.map(x=>x.split(" ")[0]))}; back on Sample ${JSON.stringify(s2.map(x=>x.split(" ")[0]))}`);
  await page.context().close();
});
await b.close();
