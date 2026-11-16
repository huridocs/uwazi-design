import { watch, launch, open, S, rows, wait, shot, init, rec, realErrors, toSettingsItem, axeOn, noScrollX, dialogs, notifTitles, beaconTexts, activityRows, rail, devArm, devReturn, DIR } from "./common.mjs";
init("upl3");
const b = await launch();
const F = (n) => DIR + "files/" + n;
const norm = (t) => t.replace(/\s+/g, " ").trim();
const listView = async (p) => { await S(p).getByRole("radio", { name: "List" }).check({ force: true }).catch(async () => { await S(p).getByRole("button", { name: "List" }).click(); }); await p.waitForTimeout(300); };
const rowNames = (p) => S(p).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && t.toLowerCase() !== "name"));
const openImport = async (p) => { await S(p).getByRole("button", { name: "Import asset" }).first().click(); await p.waitForTimeout(500); return p.locator("[role=dialog]").filter({ hasText: "Import asset" }).last(); };
const newBeacon = async (p, before) => (await beaconTexts(p)).filter((t) => !before.includes(t) && !/Running/.test(t));
const deleteDlg = (p) => p.locator("[data-component=ConfirmDelete]");
const dtext = async (p) => norm(await deleteDlg(p).innerText());
const delBtn = (p, n) => S(p).getByRole("button", { name: "Delete " + n });
const confirmDelete = (p) => deleteDlg(p).getByRole("button", { name: "Delete", exact: true }).click();
const footerText = (p) => S(p).locator("footer").innerText().then(norm);
async function setRefs(page, html, css) {
  await rail(page, "Pages"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Edit Methodology" }).click(); await wait(page, 1500);
  const title = await S(page).getByRole("textbox", { name: "Title" }).inputValue();
  await S(page).getByRole("tab", { name: "HTML" }).click(); await wait(page, 400);
  await page.locator("textarea").first().fill(html); await wait(page, 300);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 700);
  await S(page).getByRole("button", { name: "Publish", exact: true }).click().catch(() => {}); await wait(page, 500);
  await page.getByRole("button", { name: "Back" }).click(); await wait(page, 500);
  await rail(page, "Global CSS"); await wait(page, 500);
  await S(page).locator("textarea").first().fill(css); await wait(page, 200);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 600);
  await rail(page, "Uploads"); await wait(page, 500);
  return title;
}

// ---------- UPL-11 + X-01 delete persistence + X-04 delete
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const before = await beaconTexts(page);
  await delBtn(page, "style-guide.pdf").click(); await wait(page, 400);
  const d = await dtext(page);
  await shot(page, "UPL-11");
  await deleteDlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const kept = (await rowNames(page)).length;
  await delBtn(page, "style-guide.pdf").click(); await wait(page, 300);
  await confirmDelete(page); await wait(page, 500);
  const after = await rowNames(page);
  const notes = await newBeacon(page, before);
  await page.reload({ waitUntil: "load" }); await wait(page, 1500); await listView(page);
  const afterReload = await rowNames(page);
  rec("UPL-11", /Do you want to delete the following items\?/.test(d) && /style-guide\.pdf/.test(d) && /Nothing else changes/.test(d) && kept === 4 && !after.includes("style-guide.pdf") && notes.some((t) => /Deleted custom file/.test(t)) && !afterReload.includes("style-guide.pdf") ? "PASS" : "FAIL", `dialog "${d}"; Cancel kept ${kept} rows; confirm -> ${JSON.stringify(after)}; new Beacon ${JSON.stringify(notes)}; after reload ${JSON.stringify(afterReload)}`, "UPL-11");
  rec("X-04-delete", notes.filter((t) => /Deleted custom file/.test(t)).length === 1 ? "PASS" : "FAIL", `delete adds exactly one "Deleted custom file" entry: ${JSON.stringify(notes)}`, "UPL-11");
  rec("X-01-delete", !afterReload.includes("style-guide.pdf") ? "PASS" : "FAIL", `deleted style-guide.pdf stays removed after reload: ${JSON.stringify(afterReload)}`, "UPL-11");
  await page.context().close();
}
// ---------- UPL-12, UPL-13, X-05, X-12
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const title = await setRefs(page, '<h1>M</h1><img id="cb" src="/assets/cover-banner.jpg" alt="cb">', "@font-face { font-family: B; src: url(/assets/Inter-brand.woff2); }");
  mon.skip();
  await delBtn(page, "cover-banner.jpg").click(); await wait(page, 400);
  const d1 = await dtext(page); await shot(page, "UPL-12");
  await deleteDlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  await delBtn(page, "Inter-brand.woff2").click(); await wait(page, 400);
  const d2 = await dtext(page);
  await deleteDlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  await delBtn(page, "logo-iachr.svg").click(); await wait(page, 400);
  const d3 = await dtext(page);
  await deleteDlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const ok12 = title === "Methodology" && /cover-banner\.jpg Used in Methodology/.test(d1) && /Inter-brand\.woff2 Used in Global CSS/.test(d2) && !/Used in/.test(d3) && /(point to a missing file|missing file)/.test(d1) && /Nothing references these files\. Nothing else changes\./.test(d3);
  // after allowed delete, preview shows missing image
  await delBtn(page, "cover-banner.jpg").click(); await wait(page, 300); await confirmDelete(page); await wait(page, 500);
  await rail(page, "Pages"); await wait(page, 500);
  await S(page).getByRole("button", { name: "Edit Methodology" }).click(); await wait(page, 2500);
  const img = await page.frameLocator("iframe").first().locator("body").evaluate(async () => { await new Promise((r) => setTimeout(r, 800)); return [...document.images].map((i) => [i.getAttribute("src"), i.naturalWidth, i.complete]); }).catch((e) => "ERR " + e.message.slice(0, 80));
  const alive = await S(page).getByRole("textbox", { name: "Title" }).count();
  await shot(page, "UPL-12-preview");
  rec("UPL-12", ok12 && alive === 1 && Array.isArray(img) && img.every((i) => i[1] === 0) ? "PASS" : "FAIL", `Methodology HTML saved with /assets/cover-banner.jpg and Global CSS with /assets/Inter-brand.woff2 (page "${title}"). Delete cover-banner.jpg dialog: "${d1}"; Inter-brand.woff2: "${d2}"; unreferenced logo-iachr.svg: "${d3}". After the allowed delete the Methodology preview images (src, naturalWidth, complete) ${JSON.stringify(img)}; editor alive=${alive === 1}`, "UPL-12");
  await page.context().close();
}
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  await setRefs(page, '<h1>M</h1><img id="cb" src="/assets/cover-banner.jpg" alt="cb">', "@font-face { font-family: B; src: url(/assets/Inter-brand.woff2); }");
  mon.skip();
  const sel = (n) => S(page).locator(`input[aria-label="Select ${n}"]`);
  const idle = await footerText(page);
  // header checkbox
  await S(page).locator('input[aria-label="Select all"]').check(); await wait(page, 200);
  const allSel = await footerText(page);
  await S(page).locator('input[aria-label="Select all"]').uncheck(); await wait(page, 200);
  await sel("cover-banner.jpg").check(); await sel("logo-iachr.svg").check(); await wait(page, 200);
  const sl = () => page.evaluate(() => { const f = document.querySelector("[data-testid=settings-content] footer"); const s = [...f.querySelectorAll("*")].find((e) => /^Selected \d+ of \d+$/.test(e.textContent.trim()) && !e.childElementCount); return { text: s?.textContent.trim(), w: s ? Math.round(s.getBoundingClientRect().width) : null, buttons: [...f.querySelectorAll("button")].map((x) => x.textContent.trim()), h: Math.round(f.getBoundingClientRect().height), bg: getComputedStyle(f).backgroundColor }; });
  const two = await sl();
  await sel("Inter-brand.woff2").check(); const three = await sl(); await sel("Inter-brand.woff2").uncheck();
  await shot(page, "UPL-13");
  await S(page).getByRole("button", { name: /Clear/ }).click(); await wait(page, 200);
  const cleared = await footerText(page);
  await sel("cover-banner.jpg").check(); await sel("logo-iachr.svg").check(); await wait(page, 200);
  const before = await beaconTexts(page);
  await S(page).locator("footer").getByRole("button", { name: "Delete" }).click(); await wait(page, 400);
  const dd = await dtext(page);
  await shot(page, "UPL-13-dialog");
  await confirmDelete(page); await wait(page, 600);
  const remaining = await rowNames(page); const notes = await newBeacon(page, before);
  const after = await footerText(page);
  rec("UPL-13", /Import asset/.test(idle) && two.text === "Selected 2 of 4" && !two.buttons.includes("Import asset") && two.buttons.includes("Delete") && three.w === two.w && /cover-banner\.jpg Used in Methodology/.test(dd) && /logo-iachr\.svg/.test(dd) && !remaining.includes("cover-banner.jpg") && !remaining.includes("logo-iachr.svg") && notes.some((t) => /Deleted custom file/.test(t)) && /Import asset/.test(cleared) && /Import asset/.test(after) ? "PASS" : "FAIL", `idle footer "${idle}"; Select all -> "${allSel}"; two ticked: ${JSON.stringify(two)} (3 ticked slot width ${three.w}); after Clear footer "${cleared}"; delete dialog "${dd}"; remaining ${JSON.stringify(remaining)}; Beacon ${JSON.stringify(notes)}; footer after delete "${after}"`, "UPL-13");
  rec("X-12", two.text === "Selected 2 of 4" && two.w === three.w && /Import asset/.test(cleared) && two.h === 48 ? "PASS" : "FAIL", `selection slot "${two.text}" width ${two.w}px with 2 ticked and ${three.w}px with 3; footer height ${two.h}px; bg ${two.bg}; lead action "Import asset" restored after Clear: ${/Import asset/.test(cleared)}`, "UPL-13");
  rec("X-05", /Used in Methodology/.test(dd) && /missing file/.test(dd) ? "PASS" : "FAIL", `delete of a referenced file lists what uses it ("Used in Methodology") and states the effect: "${dd}"; unreferenced files say "Nothing references these files. Nothing else changes." (UPL-12)`, "UPL-13-dialog");
  await page.context().close();
}
// ---------- UPL-14 + X-10
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  await S(page).locator('input[aria-label="Select all"]').check(); await S(page).locator("footer").getByRole("button", { name: "Delete" }).click(); await wait(page, 300); await confirmDelete(page); await wait(page, 600);
  const t = norm(await S(page).innerText());
  const acts = await S(page).getByRole("button", { name: "Import asset" }).count();
  await shot(page, "UPL-14");
  const dlg = await openImport(page); await dlg.locator("input[type=file]").first().setInputFiles([F("small.txt")]); await dlg.getByRole("button", { name: "Add" }).click(); await wait(page, 3000);
  const added = await rowNames(page);
  await S(page).getByRole("textbox", { name: /Search uploads/ }).fill("zzz"); await wait(page, 300);
  const t2 = norm(await S(page).innerText());
  const clearBtns = await S(page).getByRole("button", { name: /Clear/ }).allInnerTexts();
  await shot(page, "UPL-14-nomatch");
  rec("UPL-14", /No uploads yet/.test(t) && /Upload images, fonts or files to use in pages and custom CSS\./.test(t) && acts >= 1 && added.includes("small.txt") && /No uploads match “zzz”/.test(t2) && clearBtns.length > 0 ? "PASS" : "FAIL", `empty: "${t}" (Import asset buttons ${acts}); after adding a file rows ${JSON.stringify(added)}; search "zzz": "${t2}" with clear controls ${JSON.stringify(clearBtns)}`, "UPL-14");
  rec("X-10", /No uploads yet/.test(t) && /Upload images, fonts or files/.test(t) && acts >= 1 && !/Nothing here yet/.test(t) ? "PASS" : "FAIL", `all four files deleted: title "No uploads yet", hint present, "Import asset" action present (${acts}); not the generic "Nothing here yet."`, "UPL-14");
  await page.context().close();
}
await b.close();
