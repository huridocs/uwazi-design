import { launch, open, S, shot, rail, dialogs, notifTitles } from "./lib.mjs";
import { toSettings, save, addUploads, deleteUploads, added, clean, f } from "./common.mjs";
import { recorder, run, pf } from "./rec.mjs";
import fs from "fs";
const r = recorder("col-b");
const b = await launch();
const MOD = "[data-component=ImagePickerModal]";
const faviconHref = (p) => p.evaluate(() => document.querySelector('link[rel~="icon"]')?.getAttribute("href")?.slice(0, 60) ?? null);
const faviconFull = (p) => p.evaluate(() => document.querySelector('link[rel~="icon"]')?.getAttribute("href") ?? null);
const choose = async (p) => { await S(p).getByRole("button", { name: /^(Choose|Change)$/ }).click(); await p.waitForTimeout(700); };
const gallery = (p) => p.locator(`${MOD} [data-part=gallery] li`).allInnerTexts();

await run(r, "COL-05", async () => {
  const { page, errors } = await open(b, "collection");
  await addUploads(page, ["fav-64x64.png"], "Collection");
  const caption = await S(page).getByText("Recommended: 16x16 to 512x512 px (square)").count();
  const btns = await S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" }).getByRole("button").allInnerTexts();
  const iconBefore = await faviconHref(page);
  await choose(page);
  const dlg = await dialogs(page);
  const txt = (await page.locator(MOD).innerText()).replace(/\n+/g, " | ");
  const names = await gallery(page);
  const footBtns = await page.locator(MOD).getByRole("button").allInnerTexts();
  await shot(page, "COL-05");
  await page.locator(MOD).getByRole("button", { name: "Cancel", exact: true }).click(); await page.waitForTimeout(400);
  const closed1 = (await dialogs(page)).length === 0;
  const unchanged = (await S(page).getByRole("button", { name: "Choose" }).count()) === 1;
  await choose(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const closed2 = (await dialogs(page)).length === 0;
  const focusOn = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const ok = caption === 1 && btns.join() === "Choose" && dlg.includes("Select favicon image") && /Browse files to upload/.test(txt) && /or drop your files here\./.test(txt) && /Select an existing image/.test(txt) && names.some((n) => /fav-64x64\.png/.test(n)) && closed1 && unchanged && closed2 && focusOn === "Choose";
  r.add("COL-05", pf(ok), `caption count ${caption}; row buttons [${btns}]; dialog "${dlg}"; modal text "${txt}"; gallery captions ${JSON.stringify(names)}; modal buttons [${footBtns}]; Cancel closes=${closed1} (favicon unchanged=${unchanged}); Escape closes=${closed2}; focus after Escape on "${focusOn}"`, "COL-05");
  await page.context().close();
});

await run(r, "COL-06", async () => {
  const { page, errors } = await open(b, "collection");
  await addUploads(page, ["fav-64x64.png"], "Collection");
  const href0 = await faviconHref(page);
  await choose(page);
  await page.locator(`${MOD} [data-part=gallery] button`).filter({ hasText: "fav-64x64.png" }).click(); await page.waitForTimeout(500);
  const closed = (await dialogs(page)).length === 0;
  const grp = S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" });
  const btns = await grp.getByRole("button").allInnerTexts();
  const preview = await grp.locator("[data-part=preview] img").count();
  const hrefBefore = await faviconHref(page);
  await save(page);
  const hrefSaved = await faviconFull(page);
  await page.reload(); await page.waitForTimeout(1500);
  const grp2 = S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" });
  const afterReload = await grp2.locator("[data-part=preview] img").count();
  const hrefReload = await faviconHref(page);
  await shot(page, "COL-06");
  // Clear: form only; Save stores empty
  await grp2.getByRole("button", { name: "Clear" }).click(); await page.waitForTimeout(300);
  const previewAfterClear = await grp2.locator("[data-part=preview]").count();
  const hrefStillSet = await faviconHref(page);
  await save(page);
  const hrefCleared = await faviconHref(page);
  await page.reload(); await page.waitForTimeout(1500);
  const afterClearReload = await S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" }).locator("[data-part=preview]").count();
  const ok = closed && btns.join() === "Change,Clear" && preview === 1 && hrefSaved && hrefSaved !== href0 && afterReload === 1 && previewAfterClear === 0 && hrefStillSet && hrefCleared !== hrefStillSet && afterClearReload === 0;
  r.add("COL-06", pf(ok), `modal closed=${closed}; row buttons [${btns}], preview tiles ${preview}; link[rel=icon] before pick ${href0}, after pick/before Save ${hrefBefore}, after Save ${hrefSaved ? hrefSaved.slice(0, 40) + "..." : null}; after reload preview ${afterReload}, icon ${hrefReload}; Clear: preview tiles ${previewAfterClear}, icon still ${hrefStillSet && hrefStillSet.slice(0,40)}; after Save icon ${hrefCleared}; after reload preview ${afterClearReload}`, "COL-06");
  await page.context().close();
});

await run(r, "COL-07", async () => {
  const { page, errors } = await open(b, "collection");
  await rail(page, "Uploads"); await page.waitForTimeout(500);
  const seedRows = (await S(page).locator("[data-part=row]").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  await addUploads(page, ["fav-64x64.png", "wide-600x300.png", "tiny-10x10.png"], "Collection");
  await choose(page);
  await page.waitForTimeout(800);
  const names1 = (await gallery(page)).map((t) => t.trim());
  const sizes1 = await page.locator(`${MOD} [data-part=gallery] li`).evaluateAll((lis) => lis.map((li) => { const i = li.querySelector("img"); return `${li.innerText.trim()} ${i.naturalWidth}x${i.naturalHeight}`; }));
  await shot(page, "COL-07-mixed");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // only failing images: delete the 64x64 and any other fitting seed image
  await deleteUploads(page, ["fav-64x64.png", "logo-iachr.svg"], "Collection");
  await choose(page); await page.waitForTimeout(800);
  const names2 = (await gallery(page)).map((t) => t.trim());
  const txt2 = (await page.locator(MOD).innerText()).replace(/\n+/g, " | ");
  await shot(page, "COL-07-failing");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // no images at all
  const images = ["cover-banner.jpg", "wide-600x300.png", "tiny-10x10.png"];
  await deleteUploads(page, images.filter((n) => true), "Collection");
  await choose(page); await page.waitForTimeout(600);
  const txt3 = (await page.locator(MOD).innerText()).replace(/\n+/g, " | ");
  await shot(page, "COL-07-none");
  const allFit = sizes1.every((x) => { const [w, h] = x.split(" ").pop().split("x").map(Number); return w === h && w >= 16 && w <= 512; });
  const ok = allFit && names1.some((n) => /fav-64x64/.test(n)) && !names1.some((n) => /wide-600x300|tiny-10x10|cover-banner/.test(n)) && /No uploaded images fit the requirements/.test(txt2) && !/Favicon no images hint/i.test(txt3) && /no images/i.test(txt3);
  r.add("COL-07", pf(ok), `Uploads seed rows ${JSON.stringify(seedRows.map((s) => s.slice(0, 40)))}; gallery with 64x64, 600x300, 10x10 added (seed also holds a logo-iachr.svg and a cover-banner.jpg): ${JSON.stringify(sizes1)} (every listed image measured square 16-512 px: ${allFit}; 600x300, 10x10 and the jpg are not listed); with only failing images (64x64 and the seed svg deleted): gallery ${JSON.stringify(names2)}, modal text "${txt2}"; with no images in Uploads: "${txt3}"`, "COL-07-mixed");
  await page.context().close();
});

// helper: file drop via DataTransfer (a real drop event)
async function dropFile(page, path, name, type) {
  const b64 = fs.readFileSync(path).toString("base64");
  await page.evaluate(async ({ b64, name, type }) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer(); dt.items.add(new File([bin], name, { type }));
    const z = document.querySelector('[data-component=ImagePickerModal] [data-part=dropzone]');
    z.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
    z.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { b64, name, type });
  await page.waitForTimeout(700);
}
const feedback = (p) => p.locator(`${MOD} [aria-live=polite]`).innerText();

await run(r, "COL-08", async () => {
  const { page, errors } = await open(b, "collection");
  const up = page.locator(`${MOD} input[type=file]`);
  await choose(page);
  const parts = [];
  // real drop of the wide image
  await dropFile(page, f("wide-600x300.png"), "wide-600x300.png", "image/png");
  const m1 = (await feedback(page)).trim();
  const open1 = (await dialogs(page)).includes("Select favicon image");
  const gal1 = (await gallery(page)).length;
  await shot(page, "COL-08-wide");
  parts.push(`drop 600x300: "${m1}"; modal open=${open1}`);
  // input path for the other bad files
  const bad = [["big-1024x1024.png", "1024x1024"], ["tiny-10x10.png", "10x10"], ["notes.txt", "text file"], ["broken.png", "broken png"]];
  const msgs = {};
  for (const [file, label] of bad) {
    await up.setInputFiles(f(file)); await page.waitForTimeout(900);
    msgs[label] = (await feedback(page)).trim();
    parts.push(`${label}: "${msgs[label]}"; modal open=${(await dialogs(page)).includes("Select favicon image")}`);
  }
  // nothing uploaded so far?
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await rail(page, "Uploads"); await page.waitForTimeout(500);
  const rowsAfterBad = (await S(page).locator("[data-part=row]").allInnerTexts()).map((t) => t.split("\n")[0]);
  await rail(page, "Collection"); await page.waitForTimeout(500);
  await choose(page);
  await up.setInputFiles(f("fav-128x128.png"));
  await page.waitForTimeout(150);
  const prog = (await feedback(page)).trim();
  await page.waitForTimeout(900);
  const closed = (await dialogs(page)).length === 0;
  const grp = S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" });
  const sel = await grp.locator("[data-part=preview] img").getAttribute("alt").catch(() => null);
  await shot(page, "COL-08-valid");
  const exp = "Image doesn't match the required size. Actual: 600x300 px. Expected: square 16x16 to 512x512 px";
  const ok = m1 === exp && open1 && !rowsAfterBad.some((n) => /wide|big-1024|tiny|notes|broken|heavy/.test(n)) && /^Uploading fav-128x128\.png 100%/.test(prog) && closed && /fav-128x128/.test(sel || "");
  r.add("COL-08", pf(ok), `${parts.join("; ")}; Uploads rows after the bad files: ${JSON.stringify(rowsAfterBad)}; valid 128x128: progress "${prog}", modal closed=${closed}, favicon preview alt "${sel}"`, "COL-08-wide");
  // heavy valid file (2.1 MB, 512x512): observation
  await choose(page);
  await page.locator(`${MOD} input[type=file]`).setInputFiles(f("heavy-512x512.png")); await page.waitForTimeout(1500);
  const heavyClosed = (await dialogs(page)).length === 0;
  r.add("COL-08b", "INFO", `observation: a 2.1 MB 512x512 PNG (over Uploads' 2 MB limit, valid size) is accepted by the favicon picker, modal closed=${heavyClosed}`);
  await page.context().close();
});

await run(r, "COL-09", async () => {
  const { page, errors } = await open(b, "collection");
  const before = await notifTitles(page);
  await choose(page);
  await page.locator(`${MOD} input[type=file]`).setInputFiles(f("fav-128x128.png")); await page.waitForTimeout(1500);
  const sel = await S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" }).locator("[data-part=preview] img").count();
  // navigate away without Save
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const dlg = await dialogs(page);
  await page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Discard changes" }).click(); await page.waitForTimeout(600);
  const add = clean(await added(page, before));
  await rail(page, "Uploads"); await page.waitForTimeout(500);
  const rows = (await S(page).locator("[data-part=row]").allInnerTexts()).map((t) => t.split("\n")[0].trim());
  await rail(page, "Collection"); await page.waitForTimeout(500);
  const favSet = await S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" }).locator("[data-part=preview]").count();
  const btn = await S(page).locator('[role=group][aria-labelledby]').filter({ hasText: "Custom Favicon" }).getByRole("button").allInnerTexts();
  const ok = sel === 1 && dlg.some((d) => /Discard changes/.test(d)) && add.some((t) => /^Uploaded custom file/.test(t)) && rows.some((n) => /fav-128x128/.test(n)) && favSet === 0;
  r.add("COL-09", pf(ok), `picked image showed in form (preview tiles ${sel}); rail click dialog ${JSON.stringify(dlg)}; after Discard new notifications ${JSON.stringify(add)}; Uploads rows ${JSON.stringify(rows)}; Collection favicon preview tiles ${favSet} (buttons [${btn}])`, "");
  await page.context().close();
});

r.save();
await b.close();
