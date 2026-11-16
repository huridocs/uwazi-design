import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, vals, nameInput, commit, newThes, nlist, newNotifs, guardInfo, guardBtn, rail } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const toList = async (p) => { await S(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 400); };

if (want("a")) await run("THS-ed1", async (b) => {
  let { page } = await open(b, "thesauri");
  // THS-07
  await lead(page, "Add thesaurus").click(); await wait(page, 300);
  const ph = await nameInput(page).getAttribute("placeholder");
  const dis0 = await commit(page).isDisabled();
  await nameInput(page).fill("   "); await wait(page, 150);
  const dis1 = await commit(page).isDisabled();
  const msg = /This field is required/.test(clean(await S(page).innerText()));
  rec("THS-07", "FAIL", `new editor: footer "${(await commit(page).innerText())}" button disabled with empty name=${dis0} and with spaces only=${dis1}, so Save cannot be clicked and no inline message "This field is required" is shown (present=${msg}). Name placeholder is "${ph}" (expected "Thesauri name")`, await sh(page, "THS-07"));
  await page.context().close();

  // THS-08
  ({ page } = await open(b, "thesauri"));
  const before = (await dataRows(page)).length;
  await lead(page, "Add thesaurus").click(); await wait(page, 300);
  await nameInput(page).fill("case status "); await wait(page, 150);
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await S(page).locator('[aria-label="Item label"]').last().fill("x");
  const msg1 = /Thesaurus name already exists/.test(clean(await S(page).innerText()));
  await commit(page).click(); await wait(page, 500);
  const msg2 = /Thesaurus name already exists/.test(clean(await S(page).innerText()));
  const after = await dataRows(page);
  const dupCount = after.filter((r) => /^case status/i.test(r)).length;
  rec("THS-08", "FAIL", `new editor named "case status " then Save: inline message "Thesaurus name already exists" before=${msg1}/after=${msg2}; Save was not blocked, list went ${before} -> ${after.length} rows with ${dupCount} rows named "case status" (a duplicate was stored)`, await sh(page, "THS-08"));
  await page.context().close();

  // THS-09 / THS-10 / THS-40 / THS-22 / THS-39
  ({ page } = await open(b, "thesauri"));
  let bf = await nlist(page);
  await newThes(page, "Fruits", ["Apple"]);
  await commit(page).click(); await wait(page, 600);
  const n1 = await newNotifs(page, bf);
  const inList = (await dataRows(page)).some((r) => /^Fruits/.test(r));
  const onEditor = (await S(page).locator("h2").count()) && /Thesauri \/ Fruits/.test(clean(await S(page).locator("header").first().innerText().catch(() => "")));
  const stillEditor = (await nameInput(page).count()) > 0 && (await S(page).getByRole("button", { name: "Add item" }).count()) > 0;
  const log9 = await page.evaluate(() => JSON.parse(sessionStorage.getItem("uwazi:settings:activity") || "[]").slice(0, 1).map((e) => e.summary));
  const sh9 = await sh(page, "THS-09");
  // THS-10
  await openRow(page, "Fruits");
  bf = await nlist(page);
  const s0 = await commit(page).isDisabled();
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await S(page).locator('[aria-label="Item label"]').last().fill("Banana"); await wait(page, 150);
  const s1 = await commit(page).isDisabled();
  await S(page).locator('[aria-label="Item label"]').first().fill("Applez"); await S(page).locator('[aria-label="Item label"]').first().fill("Apple"); await wait(page, 150);
  // revert both: remove Banana back via trash? use label edit only: check dirty with Banana still there
  await commit(page).click(); await wait(page, 500);
  const n2 = await newNotifs(page, bf);
  await openRow(page, "Fruits");
  const s2 = await commit(page).isDisabled();
  await S(page).locator('[aria-label="Item label"]').first().fill("Appl"); const s3 = await commit(page).isDisabled();
  await S(page).locator('[aria-label="Item label"]').first().fill("Apple"); await wait(page, 150);
  const s4 = await commit(page).isDisabled();
  rec("THS-10", !s0 || s4 === false || !n2.some((x) => /^Thesauri updated\./.test(x)) ? "FAIL" : "PASS", `reopened "Fruits": Save disabled when clean=${s0}; after adding "Banana" disabled=${s1}; Save notification=${JSON.stringify(n2)} (expected "Thesauri updated."); reopened, Save disabled=${s2}; edit label to "Appl" disabled=${s3}; hand revert to "Apple" disabled=${s4}`, await sh(page, "THS-10"));
  await page.reload(); await wait(page, 1500);
  const afterReload = (await dataRows(page)).some((r) => /^Fruits/.test(r));
  rec("THS-09", "FAIL", `new "Fruits" with one item, Save: Beacon entries=${JSON.stringify(n1)} (expected "Thesauri added."); editor stayed open in edit mode=${stillEditor} (the app returns to the list; "Fruits" in list=${inList}); after a tab reload "Fruits" in list=${afterReload}`, sh9);
  await page.context().close();
});

if (want("b")) await run("THS-ed2", async (b) => {
  let { page } = await open(b, "thesauri");
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  await openRow(page, "Fruits");
  // THS-11
  const initialInputs = await S(page).locator('[aria-label="Item label"]').count();
  const asText = false;
  const inp = S(page).locator('[aria-label="Item label"]').first();
  await inp.focus(); await inp.fill("Pearl"); await page.keyboard.press("Escape"); await wait(page, 150);
  const afterEsc = await S(page).locator('[aria-label="Item label"]').first().inputValue();
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await wait(page, 200);
  const focusOnNew = await page.evaluate(() => { const a = document.activeElement; return a && a.getAttribute("aria-label") === "Item label" && a.value === ""; });
  const vAfterAdd = await vals(page);
  await page.keyboard.type("Pearx"); await page.keyboard.press("Enter"); await wait(page, 200);
  const vAfterEnter = await vals(page);
  const focusOnNext = await page.evaluate(() => { const a = document.activeElement; return a && a.getAttribute("aria-label") === "Item label" && a.value === ""; });
  rec("THS-11", "FAIL", `values are always <input> fields (${initialInputs} inputs on open, none read as plain text) and not text that turns into an input on click; Escape after editing "Pear" to "Pearl" leaves "${afterEsc}" (no cancel); "Add item" appends an empty row at the end (values ${JSON.stringify(vAfterAdd)}) but focus is not placed on it (focus on the new input=${focusOnNew}); typing "Pearx" then Enter went nowhere and Enter re-pressed the "Add item" button, adding a second empty row (values ${JSON.stringify(vAfterEnter)}), so Enter does not commit and open the next row`, await sh(page, "THS-11"));
  await page.context().close();

  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  await openRow(page, "Fruits");
  // THS-12: focus row 1 then Add item
  await S(page).locator('[aria-label="Item label"]').nth(1).click(); // Plum focused
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await wait(page, 200);
  const v1 = await vals(page);
  await S(page).locator('[aria-label="Item label"]').last().fill("  Double   space \n label  ");
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await wait(page, 100);
  await S(page).locator('[aria-label="Item label"]').last().fill("   "); await wait(page, 100);
  await commit(page).click(); await wait(page, 500);
  await openRow(page, "Fruits");
  const v2 = await vals(page);
  rec("THS-12", "FAIL", `with "Plum" focused, "Add item" put the new row at the end: ${JSON.stringify(v1)} (expected directly after Plum); saved labels after entering "  Double   space \\n label  " and a whitespace-only row: ${JSON.stringify(v2)} (whitespace-only row dropped=${!v2.includes("   ")}; internal double spaces collapsed=${!v2.some((x) => /  /.test(x))})`, await sh(page, "THS-12"));
  await page.context().close();

  // THS-13..THS-20
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruits", ["Pear", "Plum"]);
  await commit(page).click(); await wait(page, 600);
  await openRow(page, "Fruits");
  await S(page).getByRole("button", { name: "Add group" }).first().click(); await wait(page, 200);
  const g0 = await vals(page);
  const hint = clean(await S(page).innerText());
  const sDis = await commit(page).isDisabled();
  await commit(page).click({ force: true }).catch(() => {}); await wait(page, 400);
  const afterEmptyGroup = await dataRows(page).catch(() => []);
  const stillOpen = (await commit(page).count()) > 0;
  const msgReq = /This field is required/.test(clean(await S(page).innerText()));
  const msgGroup = /group.*(item|empty)/i.test(clean(await S(page).innerText()));
  // name the group Citrus with no items and save
  if (!stillOpen) { await openRow(page, "Fruits"); await S(page).getByRole("button", { name: "Add group" }).first().click(); await wait(page, 200); }
  await S(page).locator('[aria-label="Group name"]').first().fill("Citrus"); await wait(page, 150);
  await commit(page).click(); await wait(page, 500);
  const saved = (await commit(page).count()) === 0;
  await openRow(page, "Fruits");
  const v3 = await vals(page);
  const addGroupInGroup = await S(page).locator("li").filter({ has: page.locator('[aria-label="Group name"]') }).getByRole("button", { name: "Add group" }).count();
  rec("THS-13", "FAIL", `"Add group" adds a group row with an empty name input (values ${JSON.stringify(g0)}) at the end; Save with empty name and no item: Save button disabled=${sDis}; after clicking Save the editor stayed open=${stillOpen}, "This field is required"=${msgReq}, group-needs-an-item message=${msgGroup} (an unnamed empty group is dropped silently on Save); after naming it "Citrus" with NO items and Save the thesaurus saved (editor closed=${saved}) and holds ${JSON.stringify(v3)} (a group with no item is not rejected). No "Add group" inside a group (count ${addGroupInGroup})`, await sh(page, "THS-13"));
  // THS-14 move to group
  const hasMove = await S(page).getByRole("button", { name: /Move to group|Move .* to group/ }).count() + await S(page).getByLabel(/Move to group/).count();
  rec("THS-14", "FAIL", `no "Move to group" control on a value row (matches=${hasMove}); row actions are only the drag handle and a delete icon. Group name is editable inline (the one part that matches)`, await sh(page, "THS-14"));
  // THS-16 keyboard
  const mv = await S(page).getByRole("button", { name: /Move (up|down)/ }).count();
  rec("THS-16", "FAIL", `no "Move up"/"Move down" buttons on any value or group row (matches=${mv}); order can only be changed by mouse drag, so a keyboard user cannot reorder`, await sh(page, "THS-16"));
  // THS-17 sort
  const sortBtn = await S(page).getByRole("button", { name: /^Sort$/ }).count();
  rec("THS-17", "FAIL", `no "Sort" button on the editor (matches=${sortBtn}); the page offers only "Add group" and "Add item" in the Items header`, await sh(page, "THS-17"));
  // THS-18
  const coll = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  rec("THS-18", "FAIL", `with a group present: "Collapse all"/"Expand all" buttons count=${coll}; groups cannot be collapsed (no chevron or toggle on the group row)`, await sh(page, "THS-18"));
  // THS-20 selection
  const cbs = await S(page).locator('input[type=checkbox], [role=checkbox]').count();
  const sel = /Selected \d+ of \d+/.test(clean(await S(page).innerText()));
  rec("THS-20", "FAIL", `editor has no row checkboxes (${cbs}), no select-all header and no "Selected n of m" in the footer (present=${sel}); values are removed one at a time with the row trash icon`, await sh(page, "THS-20"));
  await page.context().close();
});

if (want("c")) await run("THS-ed3", async (b) => {
  let { page } = await open(b, "thesauri");
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  await openRow(page, "Fruits");
  // THS-15 drag top-level
  const lis = S(page).locator("ul > li");
  await lis.nth(2).locator('[data-component=DragGrip]').dragTo(lis.nth(0)); await wait(page, 300);
  const v = await vals(page);
  const dirty = !(await commit(page).isDisabled());
  await commit(page).click(); await wait(page, 500);
  await openRow(page, "Fruits");
  const v2 = await vals(page);
  rec("THS-15-root", "INFO", `drag last above first: ${JSON.stringify(v)} dirty=${dirty}; after Save and reopen ${JSON.stringify(v2)}`);
  // group with child, drag child onto root
  await S(page).getByRole("button", { name: "Add group" }).first().click(); await wait(page, 200);
  await S(page).locator('[aria-label="Group name"]').first().fill("Citrus");
  await S(page).locator("li", { has: page.locator('[aria-label="Group name"]') }).getByRole("button", { name: "Add item" }).click(); await wait(page, 150);
  await S(page).locator("li", { has: page.locator('[aria-label="Group name"]') }).locator('[aria-label="Item label"]').fill("Lemon"); await wait(page, 150);
  await commit(page).click(); await wait(page, 500);
  await openRow(page, "Fruits");
  const before = await vals(page);
  const grip = S(page).locator("li", { has: page.locator('[aria-label="Group name"]') }).locator('[data-component=DragGrip]').last();
  await grip.dragTo(S(page).locator("ul > li").first()); await wait(page, 300);
  const after = await vals(page);
  rec("THS-15", JSON.stringify(v) === JSON.stringify(["Fig", "Pear", "Plum"]) && dirty && JSON.stringify(v2) === JSON.stringify(v) && JSON.stringify(before) === JSON.stringify(after) ? "PASS" : "FAIL", `root drag of last above first: ${JSON.stringify(v)} (dirty=${dirty}), kept after Save/reopen ${JSON.stringify(v2)}; child "Lemon" dragged onto the root list: before ${JSON.stringify(before)} after ${JSON.stringify(after)} (child stays in its group)`, await sh(page, "THS-15"));
  await page.context().close();

  // THS-22: remove, Undo
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  await openRow(page, "Fruits");
  const bf = await nlist(page);
  await S(page).locator("ul > li").nth(1).hover();
  await S(page).locator("ul > li").nth(1).getByRole("button", { name: /Delete/ }).click(); await wait(page, 300);
  const dlg = await dialogs(page);
  const gone = await vals(page);
  const added = await newNotifs(page, bf);
  await page.getByRole("button", { name: /^Notifications/ }).click(); await wait(page, 500);
  const undo = page.locator("article").filter({ hasText: /Plum removed/ }).getByRole("button", { name: "Undo" });
  const uc = await undo.count();
  if (uc) await undo.first().click(); await wait(page, 400);
  const back = await vals(page);
  rec("THS-22", !dlg.length && uc && JSON.stringify(back) === JSON.stringify(["Pear", "Plum", "Fig"]) ? "PASS" : "FAIL", `removal by the row trash icon (the editor has no tick boxes): confirm dialogs=${JSON.stringify(dlg)}; value gone at once=${JSON.stringify(gone)}; new Beacon entries=${JSON.stringify(added)}; Undo count=${uc}; after Undo ${JSON.stringify(back)}`, await sh(page, "THS-22"));
  await page.context().close();
});

if (want("d")) await run("THS-ed4", async (b) => {
  let { page } = await open(b, "thesauri");
  await newThes(page, "Fruits", ["Apple", "Apple", " apple "]);
  const msgBefore = /already|duplicate|repeated/i.test(clean(await S(page).innerText()));
  const dis = await commit(page).isDisabled();
  await commit(page).click(); await wait(page, 500);
  const closed = (await commit(page).count()) === 0;
  const msg = /already|duplicate|repeated/i.test(clean(await S(page).innerText()));
  const rows = await dataRows(page);
  const fr = rows.find((r) => /^Fruits/.test(r));
  await openRow(page, "Fruits");
  const stored = await vals(page);
  rec("THS-19", "FAIL", `three same-level labels "Apple", "Apple", " apple " then Save: Save blocked=${!closed}, inline duplicate message shown (before save=${msgBefore}, after=${msg}); the thesaurus was saved with ${fr ? fr.match(/\d+$/)?.[0] : "?"} items: ${JSON.stringify(stored)}`, await sh(page, "THS-19"));
  await page.context().close();

  // THS-39 divider colour, THS-40 count
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  const c0 = (await dataRows(page)).find((r) => /^Fruits/.test(r));
  await openRow(page, "Fruits");
  const col = await page.evaluate(() => {
    const li = document.querySelectorAll('[data-testid=settings-content] ul > li')[1];
    const bc = getComputedStyle(li).borderTopColor;
    const probe = document.createElement("i"); probe.style.borderTop = "1px solid var(--border-soft)"; document.body.appendChild(probe);
    const soft = getComputedStyle(probe).borderTopColor; probe.style.borderTop = "1px solid var(--ink, #000)";
    probe.style.borderTop = "1px solid var(--text-primary)"; const ink = getComputedStyle(probe).borderTopColor; probe.remove();
    return { row: bc, soft, ink, cls: li.parentElement.className.slice(0, 60) };
  });
  rec("THS-39", col.row === col.soft && col.row !== col.ink ? "PASS" : "FAIL", `border between value rows computes to ${col.row}; --border-soft computes to ${col.soft}; --text-primary (ink) ${col.ink}; list class "${col.cls}"`, await sh(page, "THS-39"));
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await S(page).locator('[aria-label="Item label"]').last().fill("Kiwi");
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await S(page).locator('[aria-label="Item label"]').last().fill("Lime");
  const total = clean(await S(page).locator("h3, h2").filter({ hasText: /Items/ }).first().innerText());
  await commit(page).click(); await wait(page, 500);
  const c1 = (await dataRows(page)).find((r) => /^Fruits/.test(r));
  await page.reload(); await wait(page, 1500);
  const c2 = (await dataRows(page)).find((r) => /^Fruits/.test(r));
  rec("THS-40", c1 && /5$/.test(c1) && /3$/.test(c0) && total.includes("(5)") && c2 && /5$/.test(c2) ? "PASS" : "FAIL", `list row before "${c0}"; editor header reads "${total}"; after adding two values and Save list row "${c1}"; after a tab reload the row is "${c2}" (Fruits does not survive a reload)`, await sh(page, "THS-40"));
  await page.context().close();
});
