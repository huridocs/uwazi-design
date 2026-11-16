import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, nlist, newNotifs, guardInfo, guardBtn, rail, toSettings, switchTo, notifTitles, logEntries, axe, axeEl, dupNames, unlabelled, realErrors, hscroll } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const nameIn = (p) => S(p).locator("#relationship-type-name");
const commitBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create relationship type)$/ });
const backArrow = (p) => S(p).locator("header").getByRole("button").first();
const rowDelete = async (p, label) => { const r = S(p).locator("[role=row]").filter({ hasText: label }).first(); await r.hover(); await r.getByRole("button", { name: new RegExp("^Delete " + label) }).click(); await wait(p, 400); };

if (want("a")) await run("REL-guard", async (b) => {
  const out = {}; const errs = [];
  const route = async (key, act, pre) => {
    const { page, errors } = await open(b, "relationship-types");
    await openRow(page, "Victim");
    await nameIn(page).fill("Victim2"); await wait(page, 150);
    await act(page); await wait(page, 500);
    out[key] = await guardInfo(page);
    out[key + "Left"] = (await commitBtn(page).count()) === 0;
    if (key === "back") await sh(page, "X-02-REL-guard");
    errs.push(...errors);
    await page.context().close();
  };
  // clean back
  { const { page } = await open(b, "relationship-types"); await openRow(page, "Victim"); await backArrow(page).click(); await wait(page, 400); out.clean = await dialogs(page); await page.context().close(); }
  await route("back", (p) => backArrow(p).click());
  await route("cancel", (p) => S(p).getByRole("button", { name: "Cancel" }).click());
  await route("escape", (p) => p.keyboard.press("Escape"));
  await route("rail", (p) => rail(p, "Filters"));
  await route("crumb", (p) => S(p).locator("header").getByRole("button", { name: "Relationship types" }).click());
  await route("navbar", (p) => p.locator("button", { hasText: "Library" }).first().click());
  await route("switch", async (p) => { await p.locator('button[aria-label^="Collection:"]').click(); await wait(p, 300); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); });
  const k = (x) => out[x].length ? "dialog" : "no dialog";
  const info = out.back[0];
  // save + highlight
  const { page } = await open(b, "relationship-types");
  await openRow(page, "Victim"); await nameIn(page).fill("Victim2"); await commitBtn(page).click(); await wait(page, 600);
  const hl = await S(page).locator("[role=row]").filter({ hasText: "Victim2" }).first().evaluate((e) => getComputedStyle(e).backgroundColor);
  const base = await S(page).locator("[role=row]").nth(1).evaluate((e) => getComputedStyle(e).backgroundColor);
  const listBack = (await commitBtn(page).count()) === 0;
  await sh(page, "REL-15");
  rec("REL-15", out.back.length && out.cancel.length && out.escape.length && hl !== base ? "PASS" : "FAIL", `after Save the list returns (${listBack}) with "Victim2" row highlighted=${hl !== base} (bg ${hl} vs ${base}); dirty form: back arrow ${k("back")}, footer Cancel ${k("cancel")} (left editor=${out.cancelLeft}), Escape ${k("escape")} (left editor=${out.escapeLeft}), rail ${k("rail")}, breadcrumb ${k("crumb")}; failed save: not reachable (no failure switch). Mobile chevron: see X-02 phone`, "acceptance-run-1-shots/REL-15.png");
  const copyOk = /Discard changes\?/.test(info?.name || "") && /You have unsaved changes\. Do you want to continue\?/.test(info?.text || "") && (info?.buttons || []).includes("Cancel") && (info?.buttons || []).includes("Discard changes");
  rec("X-02", copyOk && out.back.length && out.rail.length && out.navbar.length && out.switch.length && out.cancel.length && !out.clean.length ? "PASS" : "FAIL", `dirty relationship-type editor: back arrow, rail, breadcrumb, navbar, data-source switch -> dialog (${[out.back, out.rail, out.crumb, out.navbar, out.switch].map((x) => x.length).join("/")}); footer Cancel leaves without a dialog (dialogs ${out.cancel.length}); Escape ${k("escape")}; no dialog when unchanged (${out.clean.length}). Copy: title "${info?.name}", body "${info?.text}", buttons ${JSON.stringify(info?.buttons)} vs expected "Discard changes?" / "You have unsaved changes. Do you want to continue?" / "Cancel" + "Discard changes"`, "acceptance-run-1-shots/X-02-REL-guard.png");
  // X-03
  await openRow(page, "Victim2");
  const d0 = await commitBtn(page).isDisabled();
  await nameIn(page).fill("Victim3"); await wait(page, 100);
  const e1 = !(await commitBtn(page).isDisabled());
  await commitBtn(page).click(); await wait(page, 500);
  await rail(page, "Filters"); await wait(page, 400);
  const dr = await dialogs(page);
  await rail(page, "Relationship types"); await wait(page, 300);
  await openRow(page, "Victim3");
  const d1 = await commitBtn(page).isDisabled();
  await nameIn(page).fill("Victim4"); await wait(page, 100);
  const e2 = !(await commitBtn(page).isDisabled());
  rec("X-03", d0 && e1 && !dr.length && d1 && e2 ? "PASS" : "FAIL", `Save disabled when clean=${d0}; enabled after edit=${e1}; after Save the editor closes, rail click dialogs=${JSON.stringify(dr)}; reopened clean Save disabled=${d1}; editing re-enables=${e2}`, await sh(page, "X-03-REL"));
  rec("X-console-REL", realErrors(errs).length ? "FAIL" : "PASS", `console errors during REL guard drives: ${JSON.stringify(realErrors(errs))}`);
  await page.context().close();
});

if (want("b")) await run("REL-empty", async (b) => {
  // REL-21, X-10
  const { page } = await open(b, "relationship-types");
  const before = (await dataRows(page)).length;
  const blocked = []; const gone = [];
  const rs0 = (await dataRows(page)).map((r) => r.replace(/\s*(Court Case|Judgment|Person|Organization)*\s*(\d[\d,]*|…) references?$/, ""));
  for (const name of rs0) {
    await rowDelete(page, name);
    const info = await guardInfo(page);
    const bt = info[0]?.buttons || [];
    if (bt.includes("Move and delete")) {
      await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Choose a type/ }).click(); await wait(page, 200);
      await page.locator('[role=option]').filter({ hasText: "No label" }).first().click(); await wait(page, 200);
      await guardBtn(page, "Move and delete").click(); await wait(page, 400); gone.push(name);
    } else if (bt.includes("Delete")) { await guardBtn(page, /^Delete$/).click(); await wait(page, 400); gone.push(name); }
    else { blocked.push(name); await guardBtn(page, /^OK/).click(); await wait(page, 300); }
  }
  const left = await dataRows(page);
  await S(page).locator('input[aria-label="Search relationship types"]').fill("zzzz"); await wait(page, 300);
  const txt = clean(await S(page).innerText());
  const hasAdd = await S(page).getByRole("button", { name: "Add relationship type" }).count();
  const why = `an empty Relationship types list cannot be reached on the Sample: only ${gone.length} of ${before} types could be deleted (reassigning references to "No label" works), the other ${left.length} (${JSON.stringify(blocked)}) are refused because template relationship properties use them, and unbinding needs the template store (M8). With a search that matches nothing the page shows "${txt.slice(txt.indexOf("LABEL") > 0 ? txt.indexOf("LABEL") : 60, 260)}" (the "No relationship types yet" empty state was not seen; "Add relationship type" actions ${hasAdd})`;
  rec("REL-21", "NOT DRIVEABLE", why, await sh(page, "REL-21"));
  rec("X-10", "NOT DRIVEABLE", why, "acceptance-run-1-shots/REL-21.png");
  await page.context().close();
});
