import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries } from "./tx.mjs";
const pageText = async (p) => clean(await S(p).innerText());
await run("REL-1", async (b) => {
  let { page } = await open(b, "relationship-types");
  await wait(page, 600);
  // REL-01
  const hdr = clean(await S(page).locator("h2").first().innerText());
  const cols = await S(page).locator("[role=columnheader]").allInnerTexts();
  const n0 = await relNames(page);
  const asc = JSON.stringify(n0) === JSON.stringify([...n0].sort((a, c) => a.localeCompare(c)));
  const ch = S(page).locator("[role=columnheader]").first();
  await ch.click().catch(() => {}); await wait(page, 200);
  const n1 = await relNames(page);
  const aria = await ch.getAttribute("aria-sort");
  await sh(page, "REL-01");
  rec("REL-01", hdr === "Relationship types" && cols.map((c) => c.toLowerCase()).join() === "label,templates,references,actions" && asc && JSON.stringify(n1) !== JSON.stringify(n0) ? "PASS" : "FAIL", `header "${hdr}"; columns ${JSON.stringify(cols)} (Label, Templates, References, actions: ok); default order ${JSON.stringify(n0)} (ascending by name=${asc}); clicking the Label header changes the order=${JSON.stringify(n1) !== JSON.stringify(n0)} (aria-sort ${aria}); no "Parent(Parent)" duplicates in the labels`, "acceptance-run-2-shots/REL-01.png");
  // REL-20
  const search = S(page).getByPlaceholder(/Search relationship types/);
  await search.fill("no label"); await wait(page, 300);
  const nl = await relNames(page);
  const nlText = await pageText(page);
  await search.fill(""); await wait(page, 200);
  const allTxt = (await relNames(page)).join("|");
  const delNoLabel = await S(page).getByRole("button", { name: /Delete No label/ }).count();
  rec("REL-20", nl.length === 0 && !/no[_ ]label/i.test(allTxt) && delNoLabel === 0 ? "PASS" : "FAIL", `searching "no label" leaves ${nl.length} rows (${JSON.stringify(nl)}; page shows "${nlText.slice(nlText.indexOf("LABEL"), nlText.indexOf("LABEL") + 100)}"); no_label or other built-in rows in the full list: ${/no[_ ]label/i.test(allTxt)}; "Delete No label" buttons=${delNoLabel}`, "");
  // REL-14 / X-11 search (the seed has 12 types, no "Parent")
  const hS = (await search.boundingBox()).height;
  await search.fill("re"); await wait(page, 300);
  const f = await relNames(page); const hS2 = (await search.boundingBox()).height;
  await ch.click().catch(() => {}); await wait(page, 200);
  const f2 = await relNames(page);
  const sortWorks = JSON.stringify(f2) !== JSON.stringify(f);
  await search.fill(""); await wait(page, 300);
  const back = (await relNames(page)).length;
  rec("REL-14", f.length > 0 && f.every((x) => /re/i.test(x)) && back === n0.length && hS === hS2 && sortWorks ? "PASS" : "FAIL", `the seed has ${n0.length} types (no "par" match); typing "re" keeps ${JSON.stringify(f)} (all contain "re"=${f.every((x) => /re/i.test(x))}); cleared -> ${back} rows; search height ${hS} -> ${hS2}; clicking the Label header while filtered changes the order=${sortWorks} (expected sorting to work while filtered; the header does not sort, REL-01)`, "");
  rec("X-11", f.length > 0 && back === n0.length && hS === hS2 ? "PASS" : "FAIL", `search row "Search relationship types" fixed height ${hS}px with and without text; "re" filters to ${f.length} rows; clearing restores ${back}`, "");
  // REL-04 / REL-06 / REL-05
  const lead = await addTypeBtn(page).count();
  await addTypeBtn(page).click(); await wait(page, 500);
  const title = clean(await S(page).locator("h2").first().innerText());
  const fields = await S(page).locator("input:not([type=checkbox]), select, textarea").count();
  const labels = await S(page).locator("label").allInnerTexts();
  const commit = clean(await S(page).locator("footer").innerText());
  const inverse = /inverse/i.test(await pageText(page));
  await sh(page, "REL-04");
  rec("REL-04", lead === 1 && fields === 1 && !inverse && /\bAdd\b/.test(commit.replace(/Add relationship type/, "")) && !/Create relationship type/.test(commit) ? "PASS" : "FAIL", `footer lead "Add relationship type" buttons=${lead}; it opens an editor page titled "${title}" (not a Modal) with ${fields} field (labels ${JSON.stringify(labels)}), inverse-name field present=${inverse}; footer reads "${commit}" (the commit is "Create relationship type", expected "Add")`, "acceptance-run-2-shots/REL-04.png");
  // REL-06 on this form
  const saveB = relSave(page);
  const dis0 = await saveB.isDisabled();
  await relName(page).fill("   "); await wait(page, 150);
  await saveB.click({ force: true }); await wait(page, 300);
  const spaces = clean(await S(page).innerText());
  const reqMsg = /This field is required/.test(spaces);
  await relName(page).fill("mentions"); await saveB.click({ force: true }); await wait(page, 300);
  const dup1 = clean(await S(page).innerText());
  await relName(page).fill("Mentions "); await saveB.click({ force: true }); await wait(page, 300);
  const dup2 = clean(await S(page).innerText());
  const alrMsg = /Already exists/.test(dup1) && /Already exists/.test(dup2);
  const stillOpen = (await relName(page).count()) === 1 && (await relName(page).inputValue()) === "Mentions ";
  await sh(page, "REL-06");
  const msg = (t) => (t.match(/(This field is required|Already exists|already exists[^.]*|is required|[^.]*already[^.]*)/i) || ["(no message)"])[0];
  rec("REL-06", reqMsg && alrMsg && stillOpen ? "PASS" : "FAIL", `new form: Save disabled while untouched=${dis0}; 3 spaces + Save: message "${msg(spaces)}" (expected "This field is required"); "mentions" + Save: "${msg(dup1)}", "Mentions " + Save: "${msg(dup2)}" (expected "Already exists"); form stays open with the typed text=${stillOpen}`, "acceptance-run-2-shots/REL-06.png");
  await page.context().close();

  // REL-05 + REL-07 + X-04 + X-09 + X-01 + X-03
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const b0 = await nlist(page);
  await addRelType(page, "Supervises");
  const n5 = await fresh(page, b0);
  const rowsAfter = await relNames(page);
  const hl = await page.evaluate(() => { const r = [...document.querySelectorAll("[data-testid=settings-content] [data-part=row]")].find((x) => /Supervises/.test(x.innerText)); return r ? { cls: r.className.slice(0, 160), bg: getComputedStyle(r).backgroundColor, aria: r.getAttribute("aria-selected") || r.getAttribute("data-highlight") } : null; });
  const others = await page.evaluate(() => getComputedStyle([...document.querySelectorAll("[data-testid=settings-content] [data-part=row]")][0]).backgroundColor);
  const dis = await page.evaluate(() => 0);
  await page.reload(); await wait(page, 1500);
  const afterReload = (await relNames(page)).includes("Supervises");
  await sh(page, "REL-05");
  rec("REL-05", n5.length === 1 && /Supervises/.test(n5[0]) && rowsAfter.includes("Supervises") && afterReload ? "PASS" : "FAIL", `added "Supervises": Beacon new ${JSON.stringify(n5)} (expected an entry naming the action and the type, not a bare "Updated"); new row listed=${rowsAfter.includes("Supervises")} at position ${rowsAfter.indexOf("Supervises") + 1} of ${rowsAfter.length}, row background ${hl?.bg} vs another row ${others} (highlight until next interaction: ${hl && hl.bg !== others}); after tab reload still listed=${afterReload}`, "acceptance-run-2-shots/REL-05.png");
  await page.context().close();
});
