import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, nlist, newNotifs, guardInfo, guardBtn, rail, realErrors, saveBtn } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const rowDelete = async (p, label) => { const r = S(p).locator("[role=row]").filter({ hasText: label }).first(); await r.hover(); await r.getByRole("button", { name: new RegExp("^Delete " + label) }).click(); await wait(p, 400); };
const label = (r) => r.replace(/\s+\d[\d,]* references?$/, "").replace(/ (Court Case|Judgment|Person|Organization)+$/, "");
const names = async (p) => (await dataRows(p)).map((r) => r.replace(/\s*(\d[\d,]*|…) references?$/, ""));
const commitBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create relationship type)$/ });
const nameIn = (p) => S(p).locator("#relationship-type-name");

if (want("a")) await run("REL-a", async (b) => {
  let { page } = await open(b, "relationship-types");
  // REL-01
  const head = clean(await S(page).locator("h2").first().innerText());
  const cols = await S(page).locator("[role=columnheader]").allInnerTexts();
  const r0 = await names(page);
  const sortedAsc = [...r0].sort((a, b) => a.localeCompare(b));
  await S(page).locator("[role=columnheader]").first().click(); await wait(page, 200);
  const r1 = await names(page);
  const aria = await S(page).locator("[role=columnheader]").first().getAttribute("aria-sort");
  const brackets = r0.filter((x) => /\(.+\)/.test(x));
  rec("REL-01", "FAIL", `header "${head}"; columns ${JSON.stringify(cols)} (matches); default row order ${JSON.stringify(r0.map((x) => x.slice(0, 18)))} is not name ascending (expected ${JSON.stringify(sortedAsc.slice(0, 3))}...); Label header click changes order=${JSON.stringify(r1) !== JSON.stringify(r0)}, aria-sort="${aria}" (no sorting on any header); names shown with stored name in brackets=${brackets.length}`, await sh(page, "REL-01"));
  // REL-20
  await S(page).locator('input[aria-label="Search relationship types"]').fill("no label"); await wait(page, 300);
  const nl = await dataRows(page);
  await S(page).locator('input[aria-label="Search relationship types"]').fill(""); await wait(page, 300);
  const all = await names(page);
  const anyNo = all.some((x) => /no.?label/i.test(x));
  rec("REL-20", !anyNo && nl.length === 0 ? "PASS" : "FAIL", `search "no label" -> ${nl.length} rows; ${all.length} rows listed, none named no_label/No label (${!anyNo}); the panel's fallback type is not listed and no delete control exists for it`, await sh(page, "REL-20"));
  // REL-14 search
  await S(page).locator('input[aria-label="Search relationship types"]').fill("re"); await wait(page, 300);
  const f1 = await names(page);
  const tbh = (await S(page).locator('[data-component=SettingsToolbar]').boundingBox()).height;
  await S(page).locator("[role=columnheader]").first().click(); await wait(page, 200);
  const f1s = await names(page);
  await S(page).locator('input[aria-label="Search relationship types"]').fill(""); await wait(page, 300);
  const f2 = await names(page);
  rec("REL-14", f1.length > 0 && f1.every((x) => /re/i.test(x)) && f2.length === all.length ? "PASS" : "FAIL", `search "re" keeps ${JSON.stringify(f1)} (all contain "re", case-insensitive); cleared -> ${f2.length} rows (was ${all.length}); search row height ${tbh}px. Sorting while filtered: header click changes order=${JSON.stringify(f1s) !== JSON.stringify(f1)} (headers are not sortable)`, await sh(page, "REL-14"));
  await page.context().close();

  // REL-04 / REL-05 / REL-06
  ({ page } = await open(b, "relationship-types"));
  const leadBtn = await lead(page, "Add relationship type").count();
  await lead(page, "Add relationship type").click(); await wait(page, 400);
  const fields = await S(page).locator("input, textarea, select").count();
  const fl = await S(page).locator("label").allInnerTexts();
  const inv = /inverse|opposite/i.test(clean(await S(page).innerText()));
  const commitTxt = clean(await commitBtn(page).innerText());
  const dlg = await dialogs(page);
  const cls = await commitBtn(page).evaluate((e) => e.className.match(/bg-ink|bg-success|bg-green\S*/)?.[0] || e.className.slice(0, 60));
  await sh(page, "REL-04");
  rec("REL-04", commitTxt === "Add" ? "PASS" : "FAIL", `footer lead "Add relationship type" count=${leadBtn}; opens an editor page (dialogs=${JSON.stringify(dlg)}) with ${fields} field (labels ${JSON.stringify(fl.map(clean))}), inverse-name field present=${inv}; commit button reads "${commitTxt}" (expected "Add"), class ${cls}`, "acceptance-run-1-shots/REL-04.png");
  // REL-06
  const dis = await commitBtn(page).isDisabled();
  await nameIn(page).fill("   "); await wait(page, 150);
  const dis2 = await commitBtn(page).isDisabled();
  if (!dis2) { await commitBtn(page).click(); await wait(page, 300); }
  const m1 = clean(await S(page).innerText()).match(/This field is required/);
  await nameIn(page).fill("mentions"); await wait(page, 100);
  await commitBtn(page).click({ force: true }); await wait(page, 300);
  const m2 = /Already exists/.test(clean(await S(page).innerText()));
  await nameIn(page).fill("Mentions "); await wait(page, 100);
  await commitBtn(page).click({ force: true }); await wait(page, 300);
  const m3 = /Already exists/.test(clean(await S(page).innerText()));
  const still = (await nameIn(page).count()) > 0; const typed = await nameIn(page).inputValue();
  const errs = await nlist(page);
  await page.getByRole("button", { name: "Cancel" }).last().click().catch(() => {}); await wait(page, 300);
  // own name
  await openRow(page, "Mentions");
  await nameIn(page).fill("MENTIONS"); await wait(page, 100);
  await commitBtn(page).click(); await wait(page, 400);
  const own = clean(await S(page).innerText());
  const savedOwn = (await nameIn(page).count()) === 0;
  rec("REL-06", !dis2 && m1 && m2 && m3 && still && savedOwn ? "PASS" : "FAIL", `new form: Create disabled when empty=${dis}, after typing spaces disabled=${dis2}; spaces-only message "This field is required"=${!!m1}; "mentions" -> "Already exists"=${m2}; "Mentions " -> "Already exists"=${m3}; form stays open with typed text "${typed}"=${still}; renaming "Mentions" to "MENTIONS" (own name) saved without duplicate error=${savedOwn}`, await sh(page, "REL-06"));
  await page.context().close();
});

if (want("b")) await run("REL-b", async (b) => {
  let { page } = await open(b, "relationship-types");
  // REL-05 add Supervises
  let bf = await nlist(page);
  await lead(page, "Add relationship type").click(); await wait(page, 300);
  await nameIn(page).fill("Supervises"); await wait(page, 150);
  await commitBtn(page).click(); await wait(page, 600);
  const n = await newNotifs(page, bf);
  const rs = await dataRows(page);
  const idx = rs.findIndex((r) => /^Supervises/.test(r));
  const hl = await S(page).locator("[role=row]").filter({ hasText: "Supervises" }).first().evaluate((e) => ({ cls: e.className, bg: getComputedStyle(e).backgroundColor, sel: e.getAttribute("aria-selected") || e.getAttribute("data-selected") }));
  const norm = await S(page).locator("[role=row]").nth(1).evaluate((e) => getComputedStyle(e).backgroundColor);
  await sh(page, "REL-05");
  await page.reload(); await wait(page, 1500);
  const after = (await dataRows(page)).some((r) => /^Supervises/.test(r));
  rec("REL-05", n.length === 1 && /Supervises/.test(n[0]) && after && hl.bg !== norm ? "PASS" : "FAIL", `add "Supervises": new Beacon entries ${JSON.stringify(n)}; row ${idx + 1} of ${rs.length} (appended at the end; the list is not sorted); row highlighted (bg ${hl.bg} vs ${norm})=${hl.bg !== norm}; after a tab reload "Supervises" still listed=${after}`, "acceptance-run-1-shots/REL-05.png");
  await page.context().close();

  // REL-09, 10, 11, 12, 13
  ({ page } = await open(b, "relationship-types"));
  await lead(page, "Add relationship type").click(); await wait(page, 300);
  await nameIn(page).fill("Unused type"); await commitBtn(page).click(); await wait(page, 500);
  const ticks = await S(page).locator('[role=row] input[type=checkbox], [role=row] [role=checkbox]').count();
  const bar = /Selected \d+ of \d+/.test(clean(await S(page).innerText()));
  bf = await nlist(page);
  await rowDelete(page, "Unused type");
  const i1 = await guardInfo(page);
  await sh(page, "REL-09-dialog");
  await guardBtn(page, /^Delete$/).click(); await wait(page, 500);
  const gone = !(await dataRows(page)).some((r) => /^Unused type/.test(r));
  const n1 = await newNotifs(page, bf);
  rec("REL-09", "FAIL", `rows have no tick boxes (${ticks}) and the footer shows no "Selected 1 of m" bar (${bar}); unused type deleted via the row trash icon. Dialog: title "${i1[0]?.name}", text "${i1[0]?.text}", buttons ${JSON.stringify(i1[0]?.buttons)} (expected header "Delete", lists the type, buttons Cancel/Accept); deleting removes the row=${gone}; Beacon entries ${JSON.stringify(n1)} (names the type)`, "acceptance-run-1-shots/REL-09-dialog.png");
  // REL-10: Victim (template)
  await rowDelete(page, "Victim");
  const i2 = await guardInfo(page);
  await sh(page, "REL-10");
  const blockedBtns = i2[0]?.buttons;
  await guardBtn(page, /^(Cancel|OK)/).first().click(); await wait(page, 300);
  const still = (await dataRows(page)).some((r) => /^Victim/.test(r));
  rec("REL-10", /Cannot delete type being used in templates/.test(i2[0]?.text || "") ? "PASS" : "FAIL", `delete on "Victim" (Court Case template property uses it): dialog "${i2[0]?.name}": "${i2[0]?.text}" buttons ${JSON.stringify(blockedBtns)}; expected refusal "Cannot delete type being used in templates: Court Case". The type stays; row still listed after OK=${still}`, "acceptance-run-1-shots/REL-10.png");
  // REL-11: Mentions (references only)
  await rowDelete(page, "Mentions");
  const i3 = await guardInfo(page);
  await sh(page, "REL-11");
  await guardBtn(page, /^Cancel/).first().click(); await wait(page, 300);
  rec("REL-11", /Cannot delete type being used in relationships/.test(i3[0]?.text || "") ? "PASS" : "FAIL", `delete on "Mentions" (100 references, no template): dialog "${i3[0]?.name}": "${i3[0]?.text}" buttons ${JSON.stringify(i3[0]?.buttons)}; expected refusal "Cannot delete type being used in relationships" with "Used by N references" and no reassign option. Settings offers "Move references to" a type or "No label" and then deletes`, "acceptance-run-1-shots/REL-11.png");
  rec("REL-12", "FAIL", `the list has no tick boxes (${ticks}), so one unused and one used type cannot be selected together and "Delete" never lists several types; each delete is a single row action with its own dialog`, "acceptance-run-1-shots/REL-11.png");
  rec("REL-13", "FAIL", `no row checkboxes (${ticks}), no select-all header; the footer shows only "Add relationship type" and never "Selected n of 5" (present=${bar})`, "acceptance-run-1-shots/REL-11.png");
  rec("X-12", "FAIL", `no row checkboxes (${ticks}); the footer never shows "Selected n of total" or bulk actions (present=${bar}); see REL-13`, "acceptance-run-1-shots/REL-11.png");
  await page.context().close();
});
