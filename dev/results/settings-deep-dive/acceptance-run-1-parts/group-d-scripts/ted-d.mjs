import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, dialogs, rows, typeOptions, pickType } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const SAME = "Properties from other templates in the collection using the same label.";
const optsOf = async (p, name) => { await dlg(p).getByRole("button", { name }).click(); await wait(p, 250); const o = (await p.locator('[role=listbox] [role=option]').allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; };

// TED-85/86/87: compat table in Judgment editor with label existing elsewhere
{
  const { page } = await openEditor(b, "Judgment");
  const names = await propNames(page);
  await openAdd(page);
  await dlg(page).getByLabel("Label").fill("Case number"); await wait(page, 300);
  const t1 = strip(await dlg(page).innerText());
  const heading = t1.includes(SAME);
  await shot(page, "TED-85");
  rec("TED-85", heading ? "PASS" : "FAIL", `Judgment editor (existing properties ${JSON.stringify(names)}), Add property with label "Case number" (exists in Court Case): same-label heading "${SAME}" present=${heading}; panel text: "${t1.slice(0, 160)}". No table of other templates' properties.`, "TED-85");
  await pickType(page, "Date"); await wait(page, 300);
  const t2 = await dlg(page).innerText();
  const alerts = await dlg(page).locator("[role=alert]").count();
  const addDis = await dlg(page).getByRole("button", { name: "Add property" }).isDisabled();
  rec("TED-86", "FAIL", `Same label "Case number" with type Date (Court Case's is Text): conflict error lines (role=alert) ${alerts}; Add property disabled=${addDis} (no conflict check exists, the property can be added); no red Type cell because no table exists.`, "TED-86");
  await pickType(page, "Select"); await wait(page, 300);
  const addDis2 = await dlg(page).getByRole("button", { name: "Add property" }).isDisabled();
  rec("TED-87", "FAIL", `Select with a different thesaurus and relationship types cannot be compared: no Thesauri / Relation type / Entities / Inherit type cells exist (no table). Add property disabled with Select + "Case number" = ${addDis2}.`, "TED-86");
  await page.close();
}
// TED-88 draft rename
{
  const { page } = await openEditor(b, "Court Case");
  await propRows(page).filter({ hasText: "Summary" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Summary" }).click(); await wait(page, 300);
  await dlg(page).getByLabel("Label").fill("Synopsis");
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  await openAdd(page);
  await dlg(page).getByLabel("Label").fill("Summary"); await wait(page, 300);
  const t = strip(await dlg(page).innerText());
  rec("TED-88", "FAIL", `Renamed Summary to Synopsis in the draft, then Add property "Summary": panel shows the same-label table=${t.includes("Properties from other templates")} (no table exists at all, so the draft-vs-saved rule cannot be observed). Rows: ${JSON.stringify(await propNames(page))}.`, "");
  await page.close();
}
// TED-89 same template match
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  await dlg(page).getByLabel("Label").fill("Summary"); // Rich text exists with this label
  await dlg(page).getByRole("button", { name: "Add property" }).click(); await wait(page, 300);
  const added = await propNames(page);
  rec("TED-89", "FAIL", `Adding Text "Summary" while Court Case already has Rich text "Summary": no block or message (dialog closed=${(await dialogs(page)).length===0}); rows now ${JSON.stringify(added)}. No strict exact-type rule and no own-row exclusion logic exists (no same-label table).`, "");
  await page.close();
}
// TED-90 thesaurus select
{
  const { ctx, page: p0 } = await open(b, "thesauri");
  await wait(p0, 700);
  const thNames = (await S(p0).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim())));
  await rail(p0, "Templates"); await wait(p0, 500);
  await S(p0).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(p0, 500);
  await openAdd(p0);
  await pickType(p0, "Select");
  const o = await optsOf(p0, /Thesaurus/);
  const cur = strip(await dlg(p0).getByRole("button", { name: /^Thesaurus/ }).innerText());
  await dlg(p0).getByLabel("Label").fill("QA sel");
  const dis = await dlg(p0).getByRole("button", { name: "Add property" }).isDisabled();
  const req = strip(await dlg(p0).innerText()).includes("This field is required");
  await shot(p0, "TED-90");
  const sorted = [...thNames].sort((a, c) => a.localeCompare(c));
  rec("TED-90", "FAIL", `Thesaurus select options ${JSON.stringify(o)}; current value "${cur}" (a thesaurus is preselected, no "Select..." first option); expected the live thesauri sorted by label ${JSON.stringify(sorted)}. Add property enabled with nothing chosen=${!dis}; "This field is required" under Thesaurus=${req}.`, "TED-90");
  await p0.close();
  // TED-91 new thesaurus
  const p = await ctx.newPage(); await p.goto("http://localhost:1438/"); await wait(p, 1200);
  await rail(p, "Thesauri"); await wait(p, 500);
  await p.getByRole("button", { name: "Add thesaurus" }).first().click(); await wait(p, 400);
  await S(p).locator("input[type=text], input:not([type])").first().fill("QA list"); await wait(p, 100);
  await p.locator("footer").getByRole("button", { name: /Create thesaurus/ }).click(); await wait(p, 600);
  const listed = (await S(p).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()))).includes("QA list");
  await rail(p, "Templates"); await wait(p, 500);
  await S(p).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(p, 500);
  await openAdd(p); await pickType(p, "Select");
  const o2 = await optsOf(p, /Thesaurus/);
  await shot(p, "TED-91");
  rec("TED-91", o2.includes("QA list") ? "PASS" : "FAIL", `Created thesaurus "QA list" on Settings > Thesauri (listed=${listed}). Property panel Select > Thesaurus options: ${JSON.stringify(o2)}; "QA list" present=${o2.includes("QA list")} (picker uses the static seed list).`, "TED-91");
  await p.close(); await ctx.close();
}
// TED-93 relationship
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page); await pickType(page, "Relationship");
  const rt = await optsOf(page, /Relationship type/);
  const ent = await optsOf(page, /Related template/);
  const lines = strip(await dlg(page).innerText());
  await dlg(page).getByLabel("Label").fill("QA rel");
  const dis = await dlg(page).getByRole("button", { name: "Add property" }).isDisabled();
  await dlg(page).getByRole("button", { name: "Add property" }).click(); await wait(page, 300);
  const msg = strip(await dlg(page).innerText().catch(() => ""));
  await shot(page, "TED-93");
  rec("TED-93", "FAIL", `Relationship type options ${JSON.stringify(rt)} (first "Select..." present; sorted=${JSON.stringify(rt.slice(1)) === JSON.stringify([...rt.slice(1)].sort((a,c)=>a.localeCompare(c)))}). The second select is "Related template" (not "Entities"): options ${JSON.stringify(ent)} (no "Any entity" first; includes the template being edited "Court Case"=${ent.includes("Court Case")}). No "Inherit property" field. Add property with empty Relationship type: enabled=${!dis}, "This field is required" shown=${msg.includes("This field is required")}, dialog still open=${msg.length>0}.`, "TED-93");
  await page.close();
}
// TED-94 inherit property
{
  const { page } = await openEditor(b, "Court Case");
  await propRows(page).filter({ hasText: "Respondent state" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Respondent state" }).click(); await wait(page, 300);
  const t = strip(await dlg(page).innerText());
  rec("TED-94", "FAIL", `Edit Respondent state (Relationship): panel has no "Inherit property" field (text: "${t.slice(0,180)}"), so the clearing/reopen behaviour cannot be exercised.`, "");
  await page.close();
}
// TED-95 registry
{
  const { ctx, page: p0 } = await open(b, "relationship-types");
  await wait(p0, 700);
  await p0.getByRole("button", { name: "Add relationship type" }).first().click(); await wait(p0, 400);
  await S(p0).getByRole("textbox").first().fill("QA rel type"); await wait(p0, 100);
  await p0.locator("footer").getByRole("button", { name: /^(Create|Save|Create relationship type)/ }).last().click(); await wait(p0, 600);
  const listed = (await rows(p0)).some(r => /QA rel type/.test(r));
  await rail(p0, "Templates"); await wait(p0, 500);
  await S(p0).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(p0, 500);
  await openAdd(p0); await pickType(p0, "Relationship");
  const rt = await optsOf(p0, /Relationship type/);
  rec("TED-95.part", "INFO", `Relationship types page lists new type=${listed}; property panel options ${JSON.stringify(rt)}`);
  await p0.close(); await ctx.close();
}
// TED-98/99 add thesaurus / relationship type in editor
{
  const { page } = await openEditor(b, "Court Case");
  const inEditor = await page.getByRole("button", { name: /Add thesaurus|Add relationship type/ }).count();
  await openAdd(page); await pickType(page, "Select");
  const inSel = await dlg(page).getByRole("button", { name: /Add thesaurus|New thesaurus|Add relationship type/ }).count();
  await pickType(page, "Relationship");
  const inRel = await dlg(page).getByRole("button", { name: /Add relationship type|New relationship type/ }).count();
  rec("TED-98", "FAIL", `No "Add thesaurus" control in the editor (${inEditor}) or in the property panel with type Select (${inSel}); the modal (title "Add thesaurus", placeholder "Thesaurus name", duplicate error) cannot be opened.`, "");
  rec("TED-99", "FAIL", `No "Add relationship type" control in the editor (${inEditor}) or in the property panel with type Relationship (${inRel}); the modal cannot be opened.`, "");
  await page.close();
}
await b.close();
