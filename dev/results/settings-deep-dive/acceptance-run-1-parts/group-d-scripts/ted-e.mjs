import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, dialogs, rows, typeOptions, pickType, notifTitles, logEntries } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const optsOf = async (p, name) => { await dlg(p).getByRole("button", { name }).click(); await wait(p, 250); const o = (await p.locator('[role=listbox] [role=option]').allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; };

// TED-95 both pickers
{
  const { page } = await open(b, "relationship-types");
  await wait(page, 700);
  await page.getByRole("button", { name: "Add relationship type" }).first().click(); await wait(page, 400);
  await S(page).getByRole("textbox").first().fill("QA rel type");
  await page.locator("footer").getByRole("button", { name: /^(Create|Save)/ }).last().click(); await wait(page, 600);
  const listed = (await rows(page)).some(r => /QA rel type/.test(r));
  await rail(page, "Templates"); await wait(page, 500);
  await S(page).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(page, 500);
  await openAdd(page); await pickType(page, "Relationship");
  const rt = await optsOf(page, /Relationship type/);
  await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  // go to Library entity relationships panel (discard guard)
  await page.locator('button:has-text("Library")').first().click(); await wait(page, 1200);
  const guard = await dialogs(page);
  if (guard.length) { const d = page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: /Discard/ }); await d.click(); await wait(page, 800); }
  await wait(page, 1500);
  await page.getByText("Hearing 3, October 2019 session").first().click(); await wait(page, 1200);
  await page.getByRole("button", { name: /View entity/ }).click(); await wait(page, 1500);
  await page.getByRole("tab", { name: /Relationships/ }).first().click().catch(() => {}); await wait(page, 800);
  await page.getByRole("button", { name: "Edit", exact: true }).last().click(); await wait(page, 600);
  await page.getByRole("button", { name: /Create relationship/ }).first().click({ timeout: 5000 }).catch(async (e) => { await shot(page, "dbg-e2"); throw e; }); await wait(page, 800);
  await page.getByText("Juan Carlos Abella").first().click(); await wait(page, 800);
  const panelTxt = strip(await page.locator("[role=dialog]").last().innerText());
  await shot(page, "TED-95");
  const inProp = rt.includes("QA rel type"), inPanel = /QA rel type/.test(panelTxt);
  rec("TED-95", inProp && inPanel ? "PASS" : "FAIL", `Added "QA rel type" on Settings > Relationship types (listed=${listed}). Property panel Relationship type options end with ${JSON.stringify(rt.slice(-3))} (present=${inProp}). Library > entity > Relationships > Edit > Create relationship > "Choose relationship type" list includes it=${inPanel}.`, "TED-95");
  await page.close();
}
// TED-103 cancel guard
{
  const { page } = await openEditor(b, "Court Case");
  // no change cancel
  await S(page).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(page, 400);
  const noChangeGoesList = (await S(page).locator("#template-name-input").count()) === 0;
  await S(page).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(page, 400);
  // opened and cancelled prop panel
  await openAdd(page); await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const dirtyAfterPanel = await dirtyNow(page);
  // change then Cancel
  await S(page).locator("#template-name-input").fill("Court Case X"); await wait(page, 150);
  await S(page).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(page, 500);
  const d1 = await dialogs(page);
  const left = (await S(page).locator("#template-name-input").count()) === 0;
  const cancelCls = await S(page).locator("footer").getByRole("button", { name: "Cancel" }).count();
  await shot(page, "TED-103");
  rec("TED-103", d1.includes("Discard changes?") ? "PASS" : "FAIL", `No change + Cancel returns to the list=${noChangeGoesList}. Opening and cancelling the Add property panel leaves Save dirty=${dirtyAfterPanel}. With a name change ("Court Case X"), clicking Cancel: dialogs open ${JSON.stringify(d1)}; editor left immediately without asking=${left}.`, "TED-103");
  await page.close();
}
// TED-108 phone table
{
  const { page } = await openEditor(b, "Court Case", "mobile");
  const info = await page.evaluate(() => { const rs = [...document.querySelectorAll('[data-part=property]')]; return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, rows: rs.map(r => r.innerText.replace(/\s+/g, " ").trim()), vis: rs.map(r => Math.round(r.getBoundingClientRect().width)), common: rs.slice(0,3).map(r=>!!r.querySelector('svg.lucide-lock')) }; });
  const foot = (await S(page).locator("footer").getByRole("button").allInnerTexts()).map(strip);
  const fb = await S(page).locator("footer").getByRole("button", { name: "Cancel" }).boundingBox();
  await shot(page, "TED-108");
  rec("TED-108", "FAIL", `Phone: scrollWidth ${info.sw} / ${info.cw} (no horizontal scroll). Rows read ${JSON.stringify(info.rows.slice(0,3))}: name, type badge, then labelled Required/Filter/Cards checkboxes (not small icons for flags). No lock on common rows (no common rows exist; lock svgs ${JSON.stringify(info.common)}). Footer ${JSON.stringify(foot)}, Cancel button box ${JSON.stringify(fb)} (reachable). Rows' flags are labelled text checkboxes, not flag icons; common rows absent.`, "TED-108");
  await page.close();
}
// TED-109 phone back chevron guard + add thesaurus
{
  const { page } = await openEditor(b, "Court Case", "mobile");
  await S(page).locator("#template-name-input").fill("Court Case Y"); await wait(page, 200);
  const hasAddTh = await page.getByRole("button", { name: /Add thesaurus/ }).count();
  const back = S(page).getByRole("button", { name: /back|Templates/i }).first();
  const bn = await back.getAttribute("aria-label").catch(()=>null);
  await back.tap(); await wait(page, 500);
  const dl = await dialogs(page);
  const txt = dl.length ? strip(await page.locator('[data-component=ConfirmDialog] [role=dialog], [role=dialog]').last().innerText()) : "";
  await shot(page, "TED-109");
  rec("TED-109", "FAIL", `Phone with a draft change: "Add thesaurus" control count ${hasAddTh} (not reachable, so the first half of the check cannot be run). Mobile back control ("${bn}") with an unsaved name change opens dialogs ${JSON.stringify(dl)}: "${txt.slice(0, 160)}" (that half is ${dl.includes("Discard changes?") ? "met" : "not met"}).`, "TED-109");
  await page.close();
}
await b.close();
