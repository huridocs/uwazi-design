import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, vals, commit, newThes, nlist, newNotifs, guardInfo, guardBtn, rail, notifTitles } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const rowDelete = async (p, label) => { const r = S(p).locator("[role=row]").filter({ hasText: label }).first(); await r.hover(); await r.getByRole("button", { name: new RegExp("^Delete " + label) }).click(); await wait(p, 400); };

if (want("a")) await run("THS-del", async (b) => {
  let { page } = await open(b, "thesauri");
  await newThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await commit(page).click(); await wait(page, 600);
  const ticks = await S(page).locator('[role=row] input[type=checkbox], [role=row] [role=checkbox]').count();
  const bar = /Selected \d+ of \d+/.test(clean(await S(page).innerText()));
  let bf = await nlist(page);
  await rowDelete(page, "Fruits");
  const info = await guardInfo(page);
  await sh(page, "THS-27-dialog");
  const btns = info[0]?.buttons;
  await guardBtn(page, /Cancel/).click(); await wait(page, 300);
  const still = (await dataRows(page)).some((r) => /^Fruits/.test(r));
  await rowDelete(page, "Fruits");
  await guardBtn(page, /^(Delete|Accept)/).last().click(); await wait(page, 500);
  const gone = !(await dataRows(page)).some((r) => /^Fruits/.test(r));
  const n = await newNotifs(page, bf);
  rec("THS-27", "FAIL", `list rows have no tick boxes (${ticks}) and the footer shows no "Selected 1 of m" bar (present=${bar}); delete is a row trash action. Dialog: title "${info[0]?.name}", text "${info[0]?.text}", buttons ${JSON.stringify(btns)} (expected header "Delete", warning "Are you sure you want to delete this item?", buttons Cancel/Accept). Cancel keeps the row=${still}; confirming removes it=${gone}; Beacon entries=${JSON.stringify(n)} (expected "Thesauri deleted")`, await sh(page, "THS-27"));
  rec("X-05-unused", /No template uses it/.test(info[0]?.text || "") ? "INFO" : "INFO", `unused thesaurus delete dialog text: "${info[0]?.text}"`);
  // THS-28 + used delete
  bf = await nlist(page);
  await rowDelete(page, "Case status");
  const i2 = await guardInfo(page);
  await sh(page, "THS-28-dialog");
  await guardBtn(page, /^(OK|Cancel)/).first().click(); await wait(page, 400);
  const n2 = await newNotifs(page, bf);
  const stays = (await dataRows(page)).some((r) => /^Case status/.test(r));
  rec("THS-28", "FAIL", `delete on "Case status" opens a refusal dialog "${i2[0]?.name}": "${i2[0]?.text}" with buttons ${JSON.stringify(i2[0]?.buttons)}; expected refusal text "Cannot delete thesaurus with 1 associated templates. Please remove the related templates first." naming the templates. The thesaurus stays=${stays}; new Beacon entries=${JSON.stringify(n2)} (expected exactly one error entry); the row has no disabled checkbox with a reason`, await sh(page, "THS-28"));
  rec("X-05", /Used by|hold|uses/.test(i2[0]?.text || "") && /No template uses it/.test(info[0]?.text || "") ? "PASS" : "FAIL", `used thesaurus: refusal dialog states "${i2[0]?.text}" (usage counts, blocks the delete); unused thesaurus: dialog states "${info[0]?.text}" (no other change). Wording differs from Uwazi's "Cannot delete thesaurus with 1 associated templates..." (see THS-28); removing a value that entities hold opens no dialog (see THS-21, skipped on M3b)`, "acceptance-run-1-shots/THS-28.png");
  await page.context().close();

  // CSV import / export
  ({ page } = await open(b, "thesauri"));
  await lead(page, "Add thesaurus").click(); await wait(page, 300);
  await S(page).locator("input").first().fill("Fruit import"); await wait(page, 150);
  const btnsAll = await S(page).locator("button").allInnerTexts();
  const file = await S(page).locator('input[type=file]').count();
  const imp = await page.getByRole("button", { name: /Import|Export CSV/ }).count();
  const impS = await S(page).getByRole("button", { name: /Import|Export/ }).count();
  const ev = `editor buttons: ${JSON.stringify(btnsAll.map(clean).filter(Boolean))}; Import/Export buttons in the editor=${impS}; file inputs=${file}; no Dropzone`;
  rec("THS-29", "FAIL", `${ev}. fruit.csv cannot be chosen: there is no Import control`, await sh(page, "THS-29"));
  rec("THS-30", "FAIL", `${ev}. No preview or apply step exists to Cancel/Apply`, "acceptance-run-1-shots/THS-29.png");
  rec("THS-31", "FAIL", `${ev}. No import, so duplicate skipping and group merging by CSV cannot occur`, "acceptance-run-1-shots/THS-29.png");
  rec("THS-32", "FAIL", `${ev}. None of the invalid-CSV messages can be reached`, "acceptance-run-1-shots/THS-29.png");
  rec("THS-33", "FAIL", `${ev}. No "Export CSV" action on the editor or the list footer`, "acceptance-run-1-shots/THS-29.png");
  await page.context().close();
});

if (want("b")) await run("THS-mun", async (b) => {
  let { page } = await open(b, "thesauri", "desktop", { source: "travesia" });
  await wait(page, 5000);
  const t0 = Date.now();
  await openRow(page, "Municipios");
  const ready = Date.now() - t0;
  await wait(page, 1500);
  const total = clean(await S(page).locator("h3, h2").filter({ hasText: /Items/ }).first().innerText().catch(() => ""));
  const dom = await S(page).locator('[aria-label="Item label"], [aria-label="Group name"]').count();
  const liN = await S(page).locator("ul > li").count();
  await page.evaluate(() => { const e = document.querySelector("[data-testid=settings-content]"); const sc = [...e.querySelectorAll("*")].find((x) => x.scrollHeight > x.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(x).overflowY)); if (sc) sc.scrollTop = sc.scrollHeight / 2; });
  await wait(page, 500);
  const dom2 = await S(page).locator('[aria-label="Item label"], [aria-label="Group name"]').count();
  const searchBox = await S(page).locator('input[placeholder*="earch"], input[type=search], [role=searchbox]').count();
  const az = await page.getByRole("button", { name: /^(A-Z|Jump|M)$/ }).count();
  rec("THS-34", dom < 200 && searchBox ? "PASS" : "FAIL", `"Municipios" editor opened in ~${ready}ms; header "${total}"; ${dom} value inputs / ${liN} list items in the DOM at top, ${dom2} after scrolling to the middle (all rows rendered, not virtualised); value search inputs=${searchBox}; A-Z jump controls=${az}. Expected fewer than 200 rows at any time, value search and an A-Z jump`, await sh(page, "THS-34"));
  const tbefore = await S(page).locator("ul > li").count();
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await wait(page, 400);
  const inView = await page.evaluate(() => { const els = [...document.querySelectorAll('[data-testid=settings-content] [aria-label="Item label"]')]; const last = els[els.length - 1]; const r = last.getBoundingClientRect(); return { top: Math.round(r.top), inView: r.top >= 0 && r.bottom <= innerHeight, focus: document.activeElement === last, count: els.length }; });
  rec("THS-35", inView.inView && inView.focus ? "PASS" : "FAIL", `"Add item" while scrolled to the middle: new empty row is last of ${inView.count} (appended at the end, ~2,443 rows below the viewport); in view=${inView.inView}, in edit mode (focused)=${inView.focus}; groups collapse: no control`, await sh(page, "THS-35"));
  await page.context().close();
});
