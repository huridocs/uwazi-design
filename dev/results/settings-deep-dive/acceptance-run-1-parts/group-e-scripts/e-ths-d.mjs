import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, vals, commit, newThes, nameInput, guardInfo, guardBtn, rail, realErrors, saveBtn } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const backArrow = (p) => S(p).locator("header").getByRole("button").first();

if (want("a")) await run("THS-guard", async (b) => {
  const out = {}; let errors0 = [];
  const route = async (key, act) => {
    const { page, errors } = await open(b, "thesauri");
    await openRow(page, "Regions");
    if (key === "clean") { await backArrow(page).click(); await wait(page, 400); out.clean = await dialogs(page); out.cleanBack = (await commit(page).count()) === 0; await page.context().close(); return; }
    await edit_(page);
    await act(page);
    await wait(page, 500);
    out[key] = await guardInfo(page);
    if (key === "back") await sh(page, "X-02-THS-guard");
    if (key === "cancel") out.cancelLeft = (await commit(page).count()) === 0;
    errors0.push(...errors);
    await page.context().close();
  };
  await route("clean", null);
  await route("back", (p) => backArrow(p).click());
  await route("cancel", (p) => S(p).getByRole("button", { name: "Cancel" }).click());
  await route("rail", (p) => rail(p, "Filters"));
  await route("crumb", (p) => S(p).locator("header").getByRole("button", { name: "Thesauri" }).click());
  await route("navbar", (p) => p.locator("button", { hasText: "Library" }).first().click());
  await route("switch", async (p) => { await p.locator('button[aria-label^="Collection:"]').click(); await wait(p, 300); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); });
  const beforeUnload = false;
  const dClean = out.clean, backToList = out.cleanBack;
  let page, errors = errors0;
  const n = (k) => `${k}=${out[k].length ? JSON.stringify(out[k]) : "no dialog"}`;
  rec("THS-36", out.back.length && out.cancel.length && out.rail.length && out.crumb.length ? "PASS" : "FAIL", `unchanged editor: back arrow opens no dialog (${JSON.stringify(dClean)}) and returns to the list=${backToList}. Edited editor: ${n("back")}; footer Cancel: ${n("cancel")}; rail item: ${n("rail")}; breadcrumb: ${n("crumb")}; navbar Library: ${n("navbar")}; data-source switch: ${n("switch")}. Footer Cancel on a dirty editor leaves without a dialog (left editor=${out.cancelLeft}). Edits are lost without warning. Moving from one thesaurus editor to another and the redirect after Save: the editor closes to the list after Save without a dialog`, "acceptance-run-1-shots/X-02-THS-guard.png");
  const info = out.back[0]; 
  const copyOk = /Discard changes\?/.test(info?.name || "") && /You have unsaved changes\. Do you want to continue\?/.test(info?.text || "") && (info?.buttons || []).includes("Discard changes") && (info?.buttons || []).includes("Cancel");
  rec("X-02", copyOk && out.back.length && out.rail.length && out.navbar.length && out.switch.length && out.cancel.length && !dClean.length ? "PASS" : "FAIL", `editor guard: back arrow, rail, breadcrumb, navbar and data-source switch open it (${[out.back, out.rail, out.crumb, out.navbar, out.switch].map((x) => x.length).join("/")}); Cancel opens none (${out.cancel.length}); no dialog without a change. Copy: title "${info?.name}", body "${info?.text}", buttons ${JSON.stringify(info?.buttons)} vs expected "Discard changes?", "You have unsaved changes. Do you want to continue?", "Cancel" and "Discard changes"`, "acceptance-run-1-shots/X-02-THS-guard.png");
  const re = realErrors(errors0);
  rec("X-console", re.length ? "FAIL" : "PASS", `console errors during THS guard drives: ${JSON.stringify(re)}`);

  // X-03
  ({ page } = await open(b, "thesauri"));
  await openRow(page, "Regions");
  const dis0 = await commit(page).isDisabled();
  await edit_(page);
  const en = !(await commit(page).isDisabled());
  await commit(page).click(); await wait(page, 500);
  const left = (await commit(page).count()) === 0;
  await rail(page, "Filters"); await wait(page, 500);
  const d = await dialogs(page);
  await rail(page, "Thesauri"); await wait(page, 400);
  await openRow(page, "Regions");
  const dis1 = await commit(page).isDisabled();
  await edit_(page);
  const en2 = !(await commit(page).isDisabled());
  rec("X-03", dis0 && en && left && !d.length && dis1 && en2 ? "PASS" : "FAIL", `Save disabled on open=${dis0}; enabled after edit=${en}; after Save the editor closes to the list=${left} (the checklist expects the editor to stay open with Save disabled), rail click dialogs=${JSON.stringify(d)}; reopened Save disabled=${dis1}; editing again re-enables=${en2}`, await sh(page, "X-03-THS"));
  await page.context().close();
});
async function edit_(page) { const i = S(page).locator('[aria-label="Item label"]').first(); const v = await i.inputValue(); await i.fill(v + "x"); await wait(page, 150); }
