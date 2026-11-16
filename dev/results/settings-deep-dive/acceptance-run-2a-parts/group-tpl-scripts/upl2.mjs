import { watch, launch, open, S, rows, wait, shot, init, rec, realErrors, toSettingsItem, axeOn, noScrollX, dialogs, notifTitles, beaconTexts, activityRows, rail, devArm, devReturn, DIR } from "./common.mjs";
init("upl2");
const b = await launch();
const F = (n) => DIR + "files/" + n;
const norm = (t) => t.replace(/\s+/g, " ").trim();
const listView = async (p) => { await S(p).getByRole("radio", { name: "List" }).check({ force: true }).catch(async () => { await S(p).getByRole("button", { name: "List" }).click(); }); await p.waitForTimeout(300); };
const rowNames = (p) => S(p).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && t.toLowerCase() !== "name"));
const rowUrls = (p) => S(p).locator("[role=row] [data-column=url]").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && t.toLowerCase() !== "url"));
const openImport = async (p) => { await S(p).getByRole("button", { name: "Import asset" }).first().click(); await p.waitForTimeout(500); return p.locator("[role=dialog]").filter({ hasText: "Import asset" }).last(); };
const chosen = (dlg) => dlg.locator("[data-part=chosen] li").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const newBeacon = async (p, before) => (await beaconTexts(p)).filter((t) => !before.includes(t) && !/Running/.test(t));
const deleteDlg = (p) => p.locator("[data-component=ConfirmDelete]");
const dtext = async (p) => norm(await deleteDlg(p).innerText());
// Methodology + Global CSS references
async function setRefs(page, html, css) {
  await rail(page, "Pages"); await wait(page, 600);
  await S(page).locator("[role=row]").nth(2).click(); await wait(page, 1500);
  const title = await S(page).getByRole("textbox", { name: "Page title" }).inputValue();
  await page.locator("textarea").first().fill(html); await wait(page, 300);
  await page.getByRole("button", { name: /Save draft/ }).click(); await wait(page, 700);
  await page.getByRole("button", { name: "Back" }).click(); await wait(page, 500);
  await rail(page, "Global CSS & JS"); await wait(page, 500);
  await S(page).locator("textarea").first().fill(css); await wait(page, 200);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 600);
  await rail(page, "Uploads"); await wait(page, 500);
  return title;
}

// ---------- UPL-04, UPL-05, X-01 persistence, X-04 success
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const before = await beaconTexts(page);
  const dlg = await openImport(page);
  const txt0 = norm(await dlg.innerText());
  const addDisabled = await dlg.getByRole("button", { name: "Add" }).evaluate((e) => e.disabled || e.getAttribute("aria-disabled") === "true");
  const multi = await dlg.locator("input[type=file]").first().evaluate((e) => ({ multiple: e.multiple }));
  await shot(page, "UPL-04-modal");
  await dlg.locator("input[type=file]").first().setInputFiles([F("qa.png"), F("a.txt")]); await wait(page, 300);
  const c1 = await chosen(dlg);
  await dlg.getByRole("button", { name: "Remove a.txt" }).click(); await wait(page, 200);
  const c2 = await chosen(dlg);
  await dlg.locator("input[type=file]").first().setInputFiles([F("qa-two.png")]); await wait(page, 300);
  const c3 = await chosen(dlg);
  await shot(page, "UPL-04-chosen");
  await dlg.getByRole("button", { name: "Add" }).click(); await wait(page, 500);
  const closed = (await page.locator("[role=dialog]").filter({ hasText: "Import asset" }).count()) === 0;
  await wait(page, 3500);
  const names = await rowNames(page); const urls = await rowUrls(page);
  const thumbs = await S(page).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => /qa/.test(r.innerText)).map((r) => [r.innerText.split("\n").find((x) => /qa/.test(x)), r.querySelector("img") ? r.querySelector("img").naturalWidth : 0]));
  const notes = await newBeacon(page, before);
  await shot(page, "UPL-04-after-add");
  await rail(page, "Account"); await wait(page, 300); await rail(page, "Uploads"); await wait(page, 500); await listView(page);
  const afterNav = await rowNames(page);
  await page.reload({ waitUntil: "load" }); await wait(page, 1500); await listView(page);
  const afterReload = await rowNames(page);
  // cancel path
  const d2 = await openImport(page);
  await d2.locator("input[type=file]").first().setInputFiles([F("small.txt")]); await wait(page, 300);
  await d2.getByRole("button", { name: "Cancel" }).click(); await wait(page, 500); await wait(page, 1500);
  const afterCancel = await rowNames(page);
  const d3 = await openImport(page); const reopened = await chosen(d3); await d3.getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const okAdd = closed && names.includes("qa.png") && names.includes("qa-two.png") && !names.includes("a.txt") && urls.includes("/assets/qa.png") && urls.includes("/assets/qa-two.png") && thumbs.every((t) => t[1] > 0);
  rec("UPL-04", /Import asset/.test(txt0) && /Cancel/.test(txt0) && /Add/.test(txt0) && addDisabled && multi.multiple && c1.length === 2 && c2.length === 1 && c3.length === 2 && okAdd && afterNav.includes("qa.png") && afterReload.includes("qa.png") && !afterCancel.includes("small.txt") && reopened.length === 0 ? "PASS" : "FAIL", `modal text "${txt0.slice(0, 160)}"; Add disabled with no file=${addDisabled}; input multiple=${multi.multiple}; chosen ${JSON.stringify(c1)} -> after remove ${JSON.stringify(c2)} -> after choosing again ${JSON.stringify(c3)}; after Add modal closed=${closed}; rows ${JSON.stringify(names)}, URLs ${JSON.stringify(urls.filter((u) => /qa/.test(u)))}, image thumbnails (name,naturalWidth) ${JSON.stringify(thumbs)}; after rail nav ${afterNav.includes("qa.png")}, after reload ${afterReload.includes("qa.png")}; Cancel path: small.txt added=${afterCancel.includes("small.txt")}, reopened modal shows ${reopened.length} files`, "UPL-04-after-add");
  rec("X-01", afterNav.includes("qa.png") && afterReload.includes("qa.png") ? "PASS" : "FAIL", `uploaded qa.png and qa-two.png: present after rail navigation (${afterNav.includes("qa.png")}) and reload (${afterReload.includes("qa.png")}); Reset demo data restores the four seed files (checked in UPL-16 context)`, "UPL-04-after-add");
  rec("X-04", notes.some((t) => /Uploaded custom file/.test(t)) ? "PASS" : "FAIL", `success half: new Beacon entries after Add of 2 files ${JSON.stringify(notes)} (UPL-09 "File updated" and UPL-11 "Deleted custom file" in their rows); failure half below (X-04-fail)`, "UPL-04-after-add");
  await page.context().close();
}
// ---------- UPL-05 drag and drop
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const mk = (name, type) => page.evaluateHandle(([name, type]) => { const dt = new DataTransfer(); dt.items.add(new File(["x".repeat(20)], name, { type })); return dt; }, [name, type]);
  const dt = await mk("drop.png", "image/png");
  const area = S(page).locator("[data-part=drop-area]");
  await area.dispatchEvent("dragenter", { dataTransfer: dt }); await area.dispatchEvent("dragover", { dataTransfer: dt }); await wait(page, 300);
  const target = await S(page).locator("[data-part=drop-target]").count();
  const targetText = target ? norm(await S(page).locator("[data-part=drop-target]").innerText()) : "";
  await shot(page, "UPL-05");
  await area.dispatchEvent("drop", { dataTransfer: dt }); await wait(page, 3000);
  const afterDrop = await rowNames(page);
  const gone = await S(page).locator("[data-part=drop-target]").count();
  // drop on the modal
  const dlg = await openImport(page);
  const dt2 = await mk("drop2.txt", "text/plain");
  const dz = dlg.locator("input[type=file]").first().locator("xpath=ancestor::*[self::label or self::div][1]");
  const dropEl = dlg.locator("[data-component=Dropzone]").first();
  const dzTarget = (await dropEl.count()) ? dropEl : dz;
  await dzTarget.dispatchEvent("dragover", { dataTransfer: dt2 }); await dzTarget.dispatchEvent("drop", { dataTransfer: dt2 }); await wait(page, 400);
  const c = await chosen(dlg);
  await shot(page, "UPL-05-modal");
  await dlg.getByRole("button", { name: "Cancel" }).click();
  rec("UPL-05", target === 1 && afterDrop.includes("drop.png") && gone === 0 && c.some((x) => /drop2\.txt/.test(x)) ? "PASS" : "FAIL", `dragover on the page shows a drop target (${target}: "${targetText}"); after drop rows include drop.png=${afterDrop.includes("drop.png")} (${JSON.stringify(afterDrop)}); target cleared=${gone === 0}; drop on the open modal lists ${JSON.stringify(c)}`, "UPL-05");
  await page.context().close();
}
// ---------- UPL-06: three 1 MB files, progress, leave during upload
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const before = await beaconTexts(page);
  const dlg = await openImport(page);
  await dlg.locator("input[type=file]").first().setInputFiles([F("m1.bin"), F("m2.bin"), F("m3.bin")]); await wait(page, 300);
  await dlg.getByRole("button", { name: "Add" }).click();
  const lines = []; const timeline = []; let last = "";
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const tasks = await page.evaluate(() => [...document.querySelectorAll("article")].map((a) => a.innerText.replace(/\s+/g, " ")).filter((t) => /Uploading\.\.\. /.test(t)));
    const cnt = (await rowNames(page)).filter((n) => /^m\d\.bin$/.test(n)).length;
    const key = tasks.join("|") + "#" + cnt;
    if (key !== last) { timeline.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${tasks[0] ? tasks[0].slice(0, 80) : "(no task)"} rows=${cnt}`); last = key; }
    for (const t of tasks) lines.push(t);
    if (cnt === 3 && !tasks.length) break;
    await page.waitForTimeout(200);
  }
  const mVals = [...new Set(lines.map((l) => (l.match(/\((\d+) remaining files\)/) || [])[1]))].filter(Boolean);
  const fmtOk = lines.some((l) => /Uploading\.\.\. m\d\.bin \d+% \(\d+ remaining files\)/.test(l));
  const notes = await newBeacon(page, before);
  const single = notes.filter((t) => /Uploaded custom file/.test(t));
  const running = await page.evaluate(() => [...document.querySelectorAll("article")].filter((a) => /Uploading\.\.\./.test(a.innerText)).length);
  await shot(page, "UPL-06");
  const descending = mVals.map(Number).every((v, i, a) => i === 0 || a[i - 1] > v);
  rec("UPL-06", fmtOk && mVals.join(",") === "2,1,0" && descending && single.length === 1 && running === 0 ? "PASS" : "FAIL", `task lines seen (M values in order) ${JSON.stringify(mVals)}; format "Uploading... <file> N% (M remaining files)" matched=${fmtOk}; timeline ${JSON.stringify(timeline)}; at the end running upload tasks ${running}; new Beacon notifications ${JSON.stringify(notes)}`, "UPL-06");
  // leave during upload
  const dlg2 = await openImport(page);
  await dlg2.locator("input[type=file]").first().setInputFiles([F("qa.png"), F("a.txt"), F("b.txt")]); await wait(page, 200);
  await dlg2.getByRole("button", { name: "Add" }).click(); await wait(page, 700);
  const n0 = (await rowNames(page)).length;
  await rail(page, "Account"); await wait(page, 500);
  const dlgs = await dialogs(page);
  await wait(page, 5000);
  await rail(page, "Uploads"); await wait(page, 600); await listView(page);
  const after = await rowNames(page);
  rec("UPL-06-leave", dlgs.length === 0 && ["qa.png", "a.txt", "b.txt"].every((n) => after.includes(n)) ? "PASS" : "FAIL", `rail click to Account during the upload showed dialogs ${JSON.stringify(dlgs)}; rows before leaving ${n0}; after returning rows ${JSON.stringify(after)}`, "");
  await page.context().close();
}
// ---------- UPL-07 oversize
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const before = await beaconTexts(page);
  const dlg = await openImport(page);
  await dlg.locator("input[type=file]").first().setInputFiles([F("big.bin"), F("small.txt")]); await wait(page, 300);
  await dlg.getByRole("button", { name: "Add" }).click(); await wait(page, 4500);
  const notes = await newBeacon(page, before); const names = await rowNames(page);
  await shot(page, "UPL-07");
  const err = notes.find((t) => /An error occurred/.test(t)) || "";
  rec("UPL-07", names.includes("small.txt") && !names.includes("big.bin") && /big\.bin/.test(err) && /2 MB/.test(err) && notes.some((t) => /Uploaded custom file/.test(t)) ? "PASS" : "FAIL", `rows ${JSON.stringify(names)}; new Beacon entries ${JSON.stringify(notes)}`, "UPL-07");
  // X-04 failure half: arm Import or Upload
  const st = await devArm(page, "Import or Upload", "Storage is full."); await devReturn(page, "Uploads"); await listView(page);
  const b2 = await beaconTexts(page);
  const dl2 = await openImport(page);
  await dl2.locator("input[type=file]").first().setInputFiles([F("b.txt")]); await dl2.getByRole("button", { name: "Add" }).click(); await wait(page, 3000);
  const n2 = await newBeacon(page, b2); const names2 = await rowNames(page);
  const running = await page.evaluate(() => [...document.querySelectorAll("article")].filter((a) => /Uploading\.\.\./.test(a.innerText)).length);
  await shot(page, "X-04-fail-upload");
  const errs = n2.filter((t) => /An error occurred/.test(t));
  rec("X-04-fail", st.startsWith("Armed") && errs.length === 1 && /Storage is full/.test(errs[0]) && !names2.includes("b.txt") && running === 0 && n2.length === 1 ? "PASS" : "FAIL", `armed "${st}"; Add of b.txt -> new Beacon entries ${JSON.stringify(n2)}; b.txt row added=${names2.includes("b.txt")}; running upload tasks ${running}`, "X-04-fail-upload");
  await page.context().close();
}
await b.close();
