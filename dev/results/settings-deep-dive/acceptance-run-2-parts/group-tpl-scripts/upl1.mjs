import { watch, launch, open, S, rows, wait, shot, init, rec, realErrors, toSettingsItem, axeOn, noScrollX, dialogs, notifTitles, beaconTexts, activityRows, DIR } from "./common.mjs";
init("upl1");
const b = await launch();
const norm = (t) => t.replace(/\s+/g, " ").trim();
const listView = async (p) => { await S(p).getByRole("radio", { name: "List" }).check({ force: true }).catch(async () => { await S(p).getByRole("button", { name: "List" }).click(); }); await p.waitForTimeout(300); };
const gridView = async (p) => { await S(p).getByRole("radio", { name: "Grid" }).check({ force: true }).catch(async () => { await S(p).getByRole("button", { name: "Grid" }).click(); }); await p.waitForTimeout(300); };
const dataRows = (p) => S(p).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => r.querySelector("[data-column=name]") && r.querySelector("td, [role=cell]")).map((r) => norm(r.innerText)));
const rowNames = (p) => S(p).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && t.toLowerCase() !== "name"));
const clipOk = async (ctx) => ctx.grantPermissions(["clipboard-read", "clipboard-write"]);

// UPL-01
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800);
  const h = norm(await S(page).locator("h2").first().innerText());
  await gridView(page);
  const g = await S(page).locator("[data-part=asset]").evaluateAll((es) => es.map((e) => ({ name: e.innerText.split("\n")[0], img: e.querySelector("img") ? e.querySelector("img").naturalWidth : 0, icon: !!e.querySelector("[data-part=thumb] svg") })));
  await shot(page, "UPL-01-grid");
  await listView(page); await wait(page, 400);
  const hdr = (await S(page).locator("[role=columnheader]").allTextContents()).map((x) => x.trim()).filter(Boolean);
  const l = await S(page).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => r.querySelector("[data-column=name]")).map((r) => ({ cells: [...r.querySelectorAll("[role=cell]")].map((c) => c.innerText.replace(/\s+/g, " ").trim()), img: r.querySelector("img") ? r.querySelector("img").naturalWidth : 0, icon: !!r.querySelector("[data-part=thumb] svg") })));
  const s = await shot(page, "UPL-01");
  l.splice(0, l.length, ...l.filter((r) => r.cells.some((c) => c.startsWith("/assets/") || c.startsWith("/uploads/"))));
  const byName = (n) => l.find((r) => r.cells.some((c) => c === n));
  const svg = byName("logo-iachr.svg"), jpg = byName("cover-banner.jpg"), pdf = byName("style-guide.pdf"), font = byName("Inter-brand.woff2");
  const urls = l.map((r) => r.cells.find((c) => c.startsWith("/")));
  const ok = h === "Uploads" && JSON.stringify(hdr) === JSON.stringify(["Preview", "Name", "URL", "Action"]) && svg?.img > 0 && jpg?.img > 0 && pdf?.icon && !pdf?.img && font?.icon && !font?.img && urls.every((u) => /^\/assets\//.test(u || "")) && g.filter((x) => x.img > 0).length === 2;
  rec("UPL-01", ok ? "PASS" : "FAIL", `heading "${h}"; columns ${JSON.stringify(hdr)}; list rows ${JSON.stringify(l.map((r) => [r.cells.join(" / "), "img=" + r.img, "icon=" + r.icon]))}; URL cells ${JSON.stringify(urls)}; grid cards ${JSON.stringify(g)}`, s);
  await page.context().close();
}
// UPL-02
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const hs = S(page).locator("[role=columnheader]");
  const nameH = hs.filter({ hasText: /^Name$/ }).first(); const urlH = hs.filter({ hasText: /^URL$/ }).first();
  const order = async () => (await rowNames(page));
  const a0 = await order();
  await nameH.locator("button").click(); await wait(page, 250); const s1 = await nameH.getAttribute("aria-sort"); const o1 = await order();
  await nameH.locator("button").click(); await wait(page, 250); const s2 = await nameH.getAttribute("aria-sort"); const o2 = await order();
  const urlBtn = await urlH.locator("button").count(); const urlSort = await urlH.getAttribute("aria-sort");
  await shot(page, "UPL-02");
  const sortedA = [...a0].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }));
  rec("UPL-02", s1 === "ascending" && JSON.stringify(o1) === JSON.stringify(sortedA) && s2 === "descending" && JSON.stringify(o2) === JSON.stringify([...sortedA].reverse()) && urlBtn === 0 && !urlSort ? "PASS" : "FAIL", `Name header: click 1 aria-sort=${s1} order ${JSON.stringify(o1)}; click 2 aria-sort=${s2} order ${JSON.stringify(o2)}; URL header sort button count ${urlBtn}, aria-sort=${urlSort}`, "UPL-02");
  await page.context().close();
}
// UPL-03 + X-11
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const q = S(page).getByRole("textbox", { name: /Search uploads/ });
  const tb = () => S(page).locator("[data-component=SettingsToolbar]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const h0 = await tb();
  await q.fill("logo"); await wait(page, 300); const a = (await rowNames(page)).length;
  await q.fill("/assets/cover"); await wait(page, 300); const bn = await rowNames(page);
  await q.fill("zzz"); await wait(page, 300); const h1 = await tb();
  await q.fill(""); await wait(page, 300);
  await S(page).getByRole("button", { name: /Filter by type/ }).click(); await wait(page, 200);
  await page.getByRole("option", { name: "Images" }).click(); await wait(page, 300);
  const img = (await rowNames(page)).length;
  await S(page).getByRole("button", { name: /Filter by type/ }).click(); await page.getByRole("option", { name: "All types" }).click(); await wait(page, 300);
  const all = (await rowNames(page)).length; const h2 = await tb();
  await shot(page, "UPL-03");
  rec("UPL-03", a === 1 && bn.length === 1 && bn[0] === "cover-banner.jpg" && img === 2 && all === 4 ? "PASS" : "FAIL", `"logo" -> ${a} row; "/assets/cover" -> ${JSON.stringify(bn)}; type Images -> ${img} rows; cleared/all types -> ${all} rows`, "UPL-03");
  rec("X-11", h0 === h1 && h1 === h2 && a === 1 && all === 4 ? "PASS" : "FAIL", `search row height ${h0}px idle, ${h1}px with zero results ("zzz"), ${h2}px after clearing; typing filtered to ${a} row, clearing restored ${all}`, "UPL-03");
  await page.context().close();
}
// UPL-08
{
  const { page, ctx, errors } = await open(b, "uploads"); const mon = watch(errors); await clipOk(ctx); await wait(page, 800); await listView(page);
  const btn = S(page).getByRole("button", { name: "Copy URL for logo-iachr.svg" });
  const cnt = await btn.count();
  const before = await beaconTexts(page);
  const editBtns = await S(page).getByRole("button", { name: /^Edit / }).count();
  await btn.first().click(); await wait(page, 500);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const n = (await beaconTexts(page)).filter((t) => !before.includes(t) && !/Running/.test(t));
  const live = await page.evaluate(() => [...document.querySelectorAll("[role=status],[aria-live]")].map((e) => e.innerText.trim()).filter(Boolean));
  const s = await shot(page, "UPL-08");
  // paste into search field
  await S(page).getByRole("textbox", { name: /Search uploads/ }).fill(clip); await wait(page, 300);
  const found = (await rowNames(page)).length;
  rec("UPL-08", clip === "/assets/logo-iachr.svg" && cnt === 1 && n.some((t) => /URL copied: \/assets\/logo-iachr\.svg/.test(t)) ? "PASS" : "FAIL", `Copy button named "Copy URL for logo-iachr.svg" count ${cnt} (separate from ${editBtns} Edit buttons); clipboard "${clip}"; confirmation in Beacon ${JSON.stringify(n)}; pasted into search -> ${found} row`, s);
  await page.context().close();
}
// UPL-09 / UPL-10
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const rowEl = S(page).locator("[role=row]").filter({ hasText: "logo-iachr.svg" }).first();
  const acts = await rowEl.locator("button").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  const editBtn = rowEl.getByRole("button", { name: "Edit logo-iachr.svg" }).last();
  await editBtn.click(); await wait(page, 500);
  const dlg = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  const txt = norm(await dlg.innerText()); const val0 = await dlg.getByRole("textbox", { name: "File name" }).inputValue();
  await shot(page, "UPL-09-dialog");
  // Cancel first
  await dlg.getByRole("textbox", { name: "File name" }).fill("zzz"); await dlg.getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const afterCancel = (await rowNames(page));
  await editBtn.click(); await wait(page, 400);
  const dlg2 = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  const before = await beaconTexts(page);
  await dlg2.getByRole("textbox", { name: "File name" }).fill("brand"); await dlg2.getByRole("button", { name: "Save" }).click(); await wait(page, 500);
  const n = (await beaconTexts(page)).filter((t) => !before.includes(t) && !/Running/.test(t));
  const rowTxt = norm(await S(page).locator("[role=row]").filter({ hasText: "brand.svg" }).first().innerText());
  await toSettingsItem(page, "Account"); await toSettingsItem(page, "Uploads"); await listView(page);
  const afterNav = await rowNames(page);
  const s = await shot(page, "UPL-09");
  const okOpen = /Edit File/.test(txt) && /general information/i.test(txt) && /File name/.test(txt) && val0 === "logo-iachr";
  rec("UPL-09", okOpen && /brand\.svg/.test(rowTxt) && /\/assets\/logo-iachr\.svg/.test(rowTxt) && n.some((t) => /File updated/.test(t)) && afterCancel.includes("logo-iachr.svg") && afterNav.includes("brand.svg") && acts.includes("Edit logo-iachr.svg") ? "PASS" : "FAIL", `row buttons ${JSON.stringify(acts)}; dialog "${txt}" prefilled "${val0}"; Cancel after typing "zzz" left rows ${JSON.stringify(afterCancel)}; after Save row "${rowTxt}"; Beacon ${JSON.stringify(n)}; after rail navigation rows ${JSON.stringify(afterNav)}; Copy URL is its own action (named "Copy URL for logo-iachr.svg")`, s);
  // UPL-10
  const rowEl2 = S(page).locator("[role=row]").filter({ hasText: "brand.svg" }).first();
  const edit2 = rowEl2.getByRole("button", { name: "Edit brand.svg" }).last();
  await edit2.click(); await wait(page, 400);
  const d3 = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  await d3.getByRole("textbox", { name: "File name" }).fill(""); await d3.getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  const msg = norm(await d3.innerText()); const stillOpen = await page.locator("[role=dialog]").filter({ hasText: "Edit File" }).count();
  await page.keyboard.press("Escape"); await wait(page, 400);
  const closed = await page.locator("[role=dialog]").filter({ hasText: "Edit File" }).count() === 0;
  const focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim());
  const nm = await rowNames(page);
  await shot(page, "UPL-10");
  rec("UPL-10", /This field is required/.test(msg) && stillOpen === 1 && closed && nm.includes("brand.svg") && focus === "Edit brand.svg" ? "PASS" : "FAIL", `after clearing and Save dialog text "${msg}", still open: ${stillOpen === 1}; Escape closed: ${closed}; names unchanged ${JSON.stringify(nm)}; focus returned to "${focus}"`, "UPL-10");
  await page.context().close();
}
await b.close();
