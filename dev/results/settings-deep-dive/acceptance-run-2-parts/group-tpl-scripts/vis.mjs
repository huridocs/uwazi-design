import { fixKb, watch, launch, open, S, wait, shot, init, rec, setDark, pageContrast, axeOn, devArm, devReturn, beaconTexts } from "./common.mjs";
init("vis");
const b = await launch();
const norm = (t) => t.replace(/\s+/g, " ").trim();
const listView = async (p) => { await S(p).getByRole("radio", { name: "List" }).check({ force: true }).catch(() => {}); await p.waitForTimeout(300); };
// Templates: dark + light at 1280 and 390, Default badge contrast, axe contrast
for (const vp of ["desktop", "mobile"]) {
  const { page, errors } = await open(b, "templates", vp); const mon = watch(errors); await wait(page, 1200);
  if (vp === "mobile") await fixKb(page);
  const res = {};
  for (const dark of [false, true]) {
    await setDark(page, dark); await wait(page, 300);
    await page.evaluate(() => { const e = [...document.querySelectorAll("[data-testid=settings-content] span")].find((x) => x.textContent.trim() === "Default"); e?.setAttribute("data-qa-default", "1"); document.querySelectorAll("[data-testid=settings-content] [data-part=cell] span, [data-testid=settings-content] [role=row] .font-medium").forEach((e, i) => { if (e.textContent.trim()) e.setAttribute("data-qa-n", String(i)); }); });
    const c = await pageContrast(page, ['[data-qa-default="1"]']);
    const idx = await page.evaluate(() => [...document.querySelectorAll("[data-qa-n]")].map((e) => e.getAttribute("data-qa-n")));
    const all = await pageContrast(page, idx.map((i) => `[data-qa-n="${i}"]`));
    const low = all.map((x, i) => x && x.ratio < 4.5 ? i : null).filter((x) => x !== null);
    const ax = (await axeOn(page, null)).filter((v) => /color-contrast/.test(v));
    res[dark ? "dark" : "light"] = { badge: c[0]?.ratio, lowTextNodes: low.length, axe: ax };
    await shot(page, `TPL-visual-${dark ? "dark" : "light"}-${vp === "mobile" ? "390" : "1280"}`);
  }
  rec(`X-08-${vp === "mobile" ? "390" : "1280"}`, res.light.badge >= 4.5 && res.dark.badge >= 4.5 && res.light.axe.length === 0 && res.dark.axe.length === 0 ? "PASS" : "FAIL", `Templates at ${vp === "mobile" ? 390 : 1280}px: Default badge contrast light ${res.light.badge}, dark ${res.dark.badge}; text nodes under 4.5 light ${res.light.lowTextNodes}, dark ${res.dark.lowTextNodes}; axe color-contrast light ${JSON.stringify(res.light.axe)}, dark ${JSON.stringify(res.dark.axe)}; screenshots TPL-visual-*`, `TPL-visual-dark-${vp === "mobile" ? "390" : "1280"}`);
  await page.context().close();
}
// Uploads: failure injection beyond Import/Upload: Save (rename) and Delete
{
  const { page, errors } = await open(b, "dashboard"); const mon = watch(errors); await wait(page, 800);
  const st = await devArm(page, "Save", "Disk quota exceeded.");
  await devReturn(page, "Uploads"); await listView(page);
  const before = await beaconTexts(page);
  await S(page).getByRole("button", { name: "Edit logo-iachr.svg" }).last().click(); await wait(page, 400);
  const dlg = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  await dlg.getByRole("textbox", { name: "File name" }).fill("brand"); await dlg.getByRole("button", { name: "Save" }).click(); await wait(page, 700);
  const n = (await beaconTexts(page)).filter((t) => !before.includes(t) && !/Running/.test(t));
  const names = await S(page).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.trim()));
  await shot(page, "X-04-fail-rename");
  rec("X-04-fail-rename", n.some((t) => /An error occurred/.test(t)) && n.filter((t) => /An error occurred/.test(t)).length === 1 && !names.includes("brand.svg") ? "PASS" : "FAIL", `armed "${st}"; renaming logo-iachr to brand and saving: new Beacon entries ${JSON.stringify(n)}; rows ${JSON.stringify(names)} (the rename went through and no error entry was added, so the Save scope does not reach the Uploads rename)`, "X-04-fail-rename");
  await page.context().close();
}
{
  const { page, errors } = await open(b, "dashboard"); const mon = watch(errors); await wait(page, 800);
  const st = await devArm(page, "Delete", "The server did not answer in time.");
  await devReturn(page, "Uploads"); await listView(page);
  const before = await beaconTexts(page);
  await S(page).getByRole("button", { name: "Delete style-guide.pdf" }).click(); await wait(page, 400);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 700);
  const n = (await beaconTexts(page)).filter((t) => !before.includes(t) && !/Running/.test(t));
  const names = await S(page).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.trim()));
  await shot(page, "X-04-fail-delete-upload");
  rec("X-04-fail-delete-upload", n.filter((t) => /An error occurred/.test(t)).length === 1 && names.includes("style-guide.pdf") ? "PASS" : "FAIL", `armed "${st}"; deleting style-guide.pdf: new Beacon entries ${JSON.stringify(n)}; rows ${JSON.stringify(names)} (the file was deleted with "Deleted custom file" and no error was added, so the Delete scope does not reach Uploads)`, "X-04-fail-delete-upload");
  await page.context().close();
}
await b.close();
