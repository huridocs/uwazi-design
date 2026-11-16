import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, toSettings, logEntries, axe, dupNames, unlabelled } from "./g.mjs";
import { arm } from "./dev.mjs";
const showState = (p) => S(p).locator('[aria-label^="Show "]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label").slice(5) + ":" + e.checked));
const typeRows = (p) => S(p).locator("table").first().locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));

await run("FLT-a", async (b) => {
  // FLT-01, FLT-02
  let { page, errors } = await open(b, "filters");
  const txt = clean(await S(page).innerText());
  const hdr = clean(await S(page).locator("h2").first().innerText());
  const hasBanner = /Filters configuration/.test(txt);
  const hasTypes = /\bTypes\b/.test(txt) || /entity type/i.test(txt);
  const sentence = /Select "Add group" below to group templates under a label, for example "Documents" or "People"\./.test(txt);
  rec("FLT-01", hdr === "Filters" && hasBanner && sentence && !hasTypes ? "PASS" : "FAIL",
    `header "${hdr}"; banner heading "Filters configuration" present=${hasBanner}; Add-group sentence present=${sentence}; "Types"/"entity type" on page=${hasTypes}; intro reads "${txt.slice(txt.indexOf("Choose"), txt.indexOf("Choose") + 60)}..."; section headings: ${JSON.stringify(await S(page).locator("h3").allInnerTexts())}`, await sh(page, "FLT-01"));
  const names = await showState(page);
  const tp = await open(b, "templates"); await wait(tp.page, 1200);
  const tplRows = (await tp.page.locator('[data-testid=settings-content] [role=row]').allTextContents()).map(clean);
  await tp.ctx.close();
  await S(page).getByLabel("Show Person").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page);
  await page.reload(); await wait(page, 1500);
  const after = await showState(page);
  const personOff = after.find((x) => x.startsWith("Person:"));
  const othersOn = after.filter((x) => !x.startsWith("Person:")).every((x) => /true/.test(x));
  rec("FLT-02", /false/.test(personOff) && othersOn && names.length === tplRows.length - 1 ? "PASS" : "FAIL",
    `Show checkboxes named "Show <template>": ${names.length} on Filters, Settings > Templates lists ${tplRows.length - 1} rows. After unticking Person, Save, reload: ${personOff}; others still on=${othersOn}`, await sh(page, "FLT-02"));
  await page.context().close();
});

await run("FLT-b", async (b) => {
  // FLT-04, FLT-05
  let { page } = await open(b, "filters");
  const bodyBtn = await S(page).locator("section, [data-part=body], main").getByRole("button", { name: "New group" }).count();
  const footer = S(page).locator("footer");
  const footerAdd = await footer.getByRole("button", { name: "Add group" }).count();
  const footerBtns = await footer.locator("button").allInnerTexts();
  await (footerAdd ? footer.getByRole("button", { name: "Add group" }) : S(page).getByRole("button", { name: /New group|Add group/ }).first()).click(); await wait(page, 500);
  const dlg = await dialogs(page);
  const chips = await S(page).locator('[aria-label="Group name"]').count();
  const dirty = !(await saveBtn(page).isDisabled());
  rec("FLT-04", bodyBtn === 0 && footerAdd === 1 && dlg.length === 1 && dirty ? "PASS" : "FAIL",
    `body "New group" button count=${bodyBtn}; footer "Add group" count=${footerAdd} (footer buttons ${JSON.stringify(footerBtns)}). Clicking the group action opens dialogs=${JSON.stringify(dlg)}; inline group-name inputs on the page=${chips} (no "Add group" Modal with a Name field and Templates multi-select); page dirty=${dirty}`, await sh(page, "FLT-04"));
  // FLT-05 as built: inline name input
  const gn = S(page).locator('[aria-label="Group name"]').first();
  if (await gn.count()) {
    await gn.fill(""); await wait(page);
    const m1 = /This field is required/.test(clean(await S(page).innerText()));
    await gn.fill("   "); await wait(page);
    const m2 = /This field is required/.test(clean(await S(page).innerText()));
    await gn.fill("Documents"); await wait(page);
    await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page);
    await S(page).locator('[aria-label="Group name"]').nth(1).fill("documents "); await wait(page);
    const dup = /already exists|duplicate|Already/i.test(clean(await S(page).innerText()));
    const n = await S(page).locator('[aria-label="Group name"]').count();
    rec("FLT-05", m1 && m2 && dup && n === 1 ? "PASS" : "FAIL", `no Add group dialog. Inline name input: empty shows "This field is required"=${m1}; spaces only=${m2}; second group "documents " (case-insensitive duplicate) shows an error=${dup}; groups now ${n} (a duplicate was ${n === 2 ? "allowed" : "refused"})`, await sh(page, "FLT-05"));
  } else rec("FLT-05", "FAIL", "no group name input reachable after the group action");
  await page.context().close();
});

await run("FLT-c", async (b) => {
  // FLT-06, FLT-09, FLT-10
  let { page } = await open(b, "filters");
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page, 400);
  await S(page).locator('[aria-label="Group name"]').first().fill("Docs"); await wait(page);
  const sel = (n) => S(page).locator('[aria-label^="Move to group"]').nth(n);
  await sel(0).click(); await wait(page, 200);
  const opts = await page.locator('[role=option]').allTextContents();
  await page.locator('[role=option]').filter({ hasText: "Docs" }).first().click(); await wait(page);
  await sel(1).click(); await wait(page, 200);
  await page.locator('[role=option]').filter({ hasText: "Docs" }).first().click(); await wait(page);
  const sels = await S(page).locator('[aria-label^="Move to group"]').count();
  const editBtn = await S(page).getByRole("button", { name: /Edit (group|Docs)|^Update$/ }).count();
  const groupChipHasSelect = await S(page).locator('[aria-label="Group name"]').first().evaluate((e) => !!e.closest("div").querySelector('[aria-label^="Move to group"]'));
  const rowsNow = await typeRows(page);
  rec("FLT-09", !groupChipHasSelect ? "PASS" : "FAIL", `A group is a chip with a name input and a remove button, no group select (group chip has select=${groupChipHasSelect}); not draggable; group select options on template rows ${JSON.stringify(opts)}; no group can sit inside a group`, await sh(page, "FLT-09"));
  rec("FLT-06", editBtn ? "PASS" : "FAIL", `group Edit/Update action buttons=${editBtn}; group is renamed inline; templates join a group through each row's "Move to group" select (${sels} selects), not an Edit dialog with unticking. Rows: ${JSON.stringify(rowsNow.slice(0, 3))}`, await sh(page, "FLT-06"));
  const collapse = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  const emptyText = /Empty group\. Drop here to add/.test(clean(await S(page).innerText()));
  rec("FLT-10", collapse && emptyText ? "PASS" : "FAIL", `group rows do not exist (groups are chips above the table, members stay as flat rows); "Collapse all"/"Expand all" buttons=${collapse}; "Empty group. Drop here to add" present=${emptyText}`, await sh(page, "FLT-10"));
  await page.context().close();
});

await run("FLT-d", async (b) => {
  // FLT-07 drag, FLT-08 keyboard
  let { page } = await open(b, "filters");
  const before = (await typeRows(page)).map((r) => r.slice(0, 12));
  const rowsLoc = S(page).locator("table").first().locator("tbody tr");
  await rowsLoc.nth(2).locator('[data-component=ReorderGrip]').dragTo(rowsLoc.nth(0)); await wait(page);
  const afterDrag = (await typeRows(page)).map((r) => r.slice(0, 12));
  const dirty = !(await saveBtn(page).isDisabled());
  const moved = /^Country/.test(afterDrag[0]) || /^Country/.test(afterDrag[1]);
  let kept = null;
  if (moved) { await saveBtn(page).click(); await wait(page); await page.reload(); await wait(page, 1500); kept = (await typeRows(page)).map((r) => r.slice(0, 12)).slice(0, 3); }
  const keptOk = kept && /^Country/.test(kept[0] + kept[1]);
  rec("FLT-07", moved && dirty && keptOk ? "PASS" : "FAIL", `before ${JSON.stringify(before.slice(0, 4))}; after dragging row 3 above row 1: ${JSON.stringify(afterDrag.slice(0, 4))}; dirty=${dirty}; after Save+reload ${JSON.stringify(kept)}`, await sh(page, "FLT-07"));
  await page.context().close();

  ({ page } = await open(b, "filters"));
  const T = S(page).locator("table").first();
  const ups = T.getByRole("button", { name: /^Move .* up$|^Move up$/ });
  const downs = T.getByRole("button", { name: /^Move .* down$|^Move down$/ });
  const upNames = await ups.evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  const downNames = await downs.evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  const firstUpDis = await ups.first().isDisabled();
  const lastDownDis = await downs.last().isDisabled();
  const act = () => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "document.body (focus lost)" : (a.getAttribute("aria-label") || a.innerText || a.tagName); });
  await ups.nth(2).focus(); await page.keyboard.press("Enter"); await wait(page);
  const rows1 = (await typeRows(page)).map((r) => r.slice(0, 12)).slice(0, 3);
  const f1 = await act();
  await page.keyboard.press("Enter"); await wait(page);
  const rows2 = (await typeRows(page)).map((r) => r.slice(0, 12)).slice(0, 3);
  const f2 = await act();
  const namesOk = upNames.every((n) => /^Move .+ up$/.test(n)) && downNames.every((n) => /^Move .+ down$/.test(n));
  const movedOk = /^Country/.test(rows2[0]);
  const focusOk = /Move Country (up|down)/.test(f1) && /Move Country (up|down)/.test(f2);
  // keyboard group select: Enter opens, Tab through the options, Enter chooses
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page, 300);
  await S(page).locator('[aria-label="Group name"]').first().fill("Docs"); await wait(page);
  const sel = S(page).locator('button[aria-label^="Move to group"]').first();
  await sel.focus(); await page.keyboard.press("Enter"); await wait(page, 300);
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await wait(page);
  const val = await sel.getAttribute("aria-label");
  rec("FLT-08", movedOk && namesOk && firstUpDis && lastDownDis && focusOk && /Docs/.test(val || "") ? "PASS" : "FAIL",
    `Move up names ${JSON.stringify([...new Set(upNames)].slice(0, 3))}..., Move down ${JSON.stringify([...new Set(downNames)].slice(0, 2))}...; first Move up disabled=${firstUpDis}, last Move down disabled=${lastDownDis}; Enter on row 3 "Move up" -> rows ${JSON.stringify(rows1)}, focus "${f1}"; Enter again -> rows ${JSON.stringify(rows2)}, focus "${f2}" (the row is now first and its Move up is disabled); keyboard group select (Enter, Tab, Tab, Enter) ends "${val}"`, await sh(page, "FLT-08"));
  await page.context().close();
});
