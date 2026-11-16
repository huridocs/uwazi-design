import { launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, csvOpen, toolsMenu } from "./c.mjs";
import fs from "fs";
const R = makeRec("ACT2");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rawLog = (p) => p.evaluate(() => sessionStorage.getItem("uwazi:settings:activity"));
const { ctx, page, errors } = await open(b, "collection");
await page.waitForTimeout(800);
const save = async () => { await S(page).getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(500); };
const name = () => S(page).getByLabel("Collection name");
let steps = {};
// ---- ACT-11 / Collection saves
await name().fill("A"); await save();
steps.a = await logEntries(page);
await name().fill("B"); await save();
const l11 = await logEntries(page);
const raw11 = await rawLog(page);
steps.collectionAfterB = l11;
// view in Activity log
await rail(page, "Activity log"); await page.waitForTimeout(500);
const top = S(page).locator("ul > li").first();
await top.locator("> button").click(); await page.waitForTimeout(300);
const topText = clean(await top.innerText());
await sh(page, "ACT-11");
R.add("ACT-11", /"A"|“A”|\bA\b.*\bB\b/.test(topText) && /\bB\b/.test(topText) && /A/.test(topText) && /before|after|→/i.test(topText) ? "PASS" : "FAIL",
  `Saved Collection name "A" then "B". Top entry after the second save: "${topText}". Stored entry: ${raw11 ? raw11.slice(0, 260) : "(none)"}. Expected the entry to name the collection update and user admin, and its expanded row to show the changed field with before "A" / after "B" from the stored entry.`, "acceptance-run-1-shots/ACT-11.png");
// ---- ACT-12 actions
// 1. create a page
await rail(page, "Pages"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(500);
await page.locator("[role=dialog]:not([inert]) button", { hasText: "Legal" }).click();
await page.getByRole("button", { name: "Create page" }).click(); await page.waitForTimeout(900);
await S(page).getByLabel(/^Title/).fill("QA page"); await page.waitForTimeout(200);
await S(page).getByRole("button", { name: /Save draft/ }).click(); await page.waitForTimeout(500);
steps.page = await logEntries(page);
await page.getByRole("button", { name: /^Back/ }).first().click().catch(()=>{}); await page.waitForTimeout(500);
// 2. upload a file
await rail(page, "Uploads"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Upload file" }).click(); await page.waitForTimeout(500);
const toast = clean(await page.locator("body").innerText()).match(/Upload is not built[^.]*\./)?.[0];
steps.upload = { toast, log: await logEntries(page) };
// 3. preserve token
await rail(page, "Preserve"); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Add token" }).click(); await page.waitForTimeout(500);
await page.getByPlaceholder("e.g. Court press releases").fill("QA source");
await page.getByPlaceholder("https://…").fill("https://example.org/feed");
await page.getByRole("button", { name: "Add source" }).click(); await page.waitForTimeout(600);
steps.preserve = await logEntries(page);
// 4. CSV import
await csvOpen(page);
await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(300);
await page.locator('[data-part=dropzone]').click();
await page.locator('[data-part=template-trigger]').click(); await page.locator('[data-part=option] button').first().click();
await page.locator('[data-component=NewImportModal] [data-part=submit]').click(); await page.waitForTimeout(500);
steps.csv = await logEntries(page);
// 5. Collection save
await toolsMenu(page); await page.getByRole("button", { name: "Activity log", exact: true }).first().click(); await page.waitForTimeout(500);
await rail(page, "Collection"); await page.waitForTimeout(400);
await name().fill("C"); await save();
steps.collection2 = await logEntries(page);
await rail(page, "Activity log"); await page.waitForTimeout(500);
const rowsNow = (await S(page).locator("ul > li > button").allInnerTexts()).map(clean);
await sh(page, "ACT-12");
const newN = rowsNow.length - 7;
R.add("ACT-12", newN === 5 ? "PASS" : "FAIL", `Did one action each: Collection save (x3 incl. A/B above), create page "QA page" (Save draft), upload file (button only raises "${steps.upload.toast || "?"}"; no file picker), Preserve token ("Add source"), CSV import. Log now has ${rowsNow.length} rows (${newN} new; expected 5 new, one per action). Newest first: ${JSON.stringify(rowsNow.slice(0, newN + 1))}. Only 2 of the 5 actions wrote an entry (create page, save Collection); upload (no file picker), Preserve token ("Add source" adds no row and logs nothing) and CSV import logged none. Step-by-step log counts: ${JSON.stringify(Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, Array.isArray(v) ? v.length : v.log.length])))}.`, "acceptance-run-1-shots/ACT-12.png");
const newRows = rowsNow.slice(0, newN);
R.add("ACT-13", "FAIL", `New entries after ACT-12: ${JSON.stringify(newRows)}. All are readable sentences with no "POST /api/..." text and no RAW pill; "Updated settings “Collection”" matches Uwazi's "Updated settings". Against the Expect: the first save of a new page reads "Updated page “QA page”" (Uwazi: "Created page"); Publish adds no "Published page release" line (the three page actions share one wording); there are no entries at all for the Preserve token, CSV import, upload or a menu link, so those sentences cannot be read.`, "acceptance-run-1-shots/ACT-12.png");
fs.writeFileSync("act2-rows.json", JSON.stringify({ rowsNow, steps }, null, 1));
// 6. reload persistence + dashboard + reset
await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
const afterReload = (await S(page).locator("ul > li > button").allInnerTexts()).map(clean);
await rail(page, "Dashboard"); await page.waitForTimeout(600);
const dash = clean(await S(page).innerText());
const dashRows = dash.slice(dash.indexOf("Recent activity"));
await sh(page, "ACT-12-dashboard");
await S(page).getByRole("button", { name: /Reset demo data/ }).click(); await page.waitForTimeout(500);
const dlg = await page.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").count();
if (dlg) { await page.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").getByRole("button").last().click(); await page.waitForTimeout(800); }
await rail(page, "Activity log"); await page.waitForTimeout(500);
const afterReset = (await S(page).locator("ul > li > button").allInnerTexts()).map(clean);
R.add("ACT-12::persist", "INFO", `After reload: ${afterReload.length} rows (first: ${afterReload[0]}); Dashboard Recent activity: ${dashRows.slice(0, 400)}; after Reset demo data: ${afterReset.length} rows (confirm dialog ${dlg}).`);
fs.writeFileSync("act2-persist.json", JSON.stringify({ afterReload, dashRows, afterReset }, null, 1));
R.add("::errs", "INFO", JSON.stringify(realErrors(errors)));
R.save();
await b.close();
