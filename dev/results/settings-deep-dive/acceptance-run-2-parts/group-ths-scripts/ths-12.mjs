import { kbValue, refreshKb, panelGeo, axe, axeContrast, dark, light, serious, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, label, rowOf, footerTxt, saveClick, dialogs, dialogText, addGroup, hscroll, dupNames, unlabelled } from "./tx.mjs";
await run("THS-12m", async (b) => {
  let { page } = await open(b, "thesauri", "mobile");
  await wait(page, 600);
  const shape = await page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); return { table: !!c.querySelector("table, [role=table], [role=grid]"), rows: c.querySelectorAll("[data-part=row]").length, headers: c.querySelectorAll("[role=columnheader]").length, text: c.innerText.replace(/\s+/g, " ").slice(0, 160) }; });
  const h1 = await hscroll(page);
  await sh(page, "X-06-THS-list-390");
  const listAxe = serious(await axe(page));
  await dark(page); await wait(page, 900);
  const listAxeDark = serious(await axe(page));
  await sh(page, "X-08-THS-list-dark-390");
  await light(page); await wait(page, 900);
  // add: tap row, editor
  await page.locator("[data-testid=settings-content] [data-part=row]").filter({ hasText: "Case status" }).first().tap(); await wait(page, 700);
  const h2 = await hscroll(page);
  await sh(page, "THS-38-editor");
  const ed = await page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const lis = [...c.querySelectorAll("li[data-row-id]")]; return { rows: lis.length, firstRowHeight: Math.round(lis[0].getBoundingClientRect().height) }; });
  // tap a value
  await page.locator("li[data-row-id]").first().locator("[data-part=label]").tap(); await wait(page, 600);
  const afterTap = await page.evaluate(() => ({ dialogs: [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 200)), editing: !!document.querySelector("li[data-row-id] input[aria-label=Value]") }));
  await sh(page, "THS-38-tap");
  // are Move up/down and Remove reachable
  const actions = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] li[data-row-id]")][0].querySelectorAll("button").length);
  const acts = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] li[data-row-id]")][0].querySelector("[data-component=RowActions]")?.className);
  const touchTargets = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] li[data-row-id] button, [data-testid=settings-content] li[data-row-id] [role=checkbox], [data-testid=settings-content] li[data-row-id] input")].slice(0, 8).map((e) => { const r = e.getBoundingClientRect(); return `${e.getAttribute("aria-label") || e.innerText} ${Math.round(r.width)}x${Math.round(r.height)}`; }));
  const edAxe = serious(await axe(page));
  await dark(page); await wait(page, 900);
  await sh(page, "X-08-THS-editor-dark-390");
  const edAxeDark = serious(await axe(page));
  await light(page); await wait(page, 900);
  // dialogs on the phone: delete dialog and import dialog geometry
  await page.getByRole("button", { name: "Back", exact: true }).tap(); await wait(page, 500);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Discard/ }).tap().catch(() => {}); await wait(page, 300);
  const kb0 = await kbValue(page);
  const rowDel = () => page.locator("[data-testid=settings-content] [data-part=row]").filter({ hasText: "Case status" }).first().getByRole("button", { name: "Delete Case status" });
  await rowDel().tap(); await wait(page, 600);
  const gDelRaw = await panelGeo(page);
  await sh(page, "THS-38-delete-sheet");
  await page.keyboard.press("Escape"); await wait(page, 300);
  await refreshKb(page); await wait(page, 200);
  const kb1 = await kbValue(page);
  await rowDel().tap(); await wait(page, 600);
  const gDel = await panelGeo(page);
  await sh(page, "THS-38-delete-sheet-after-kb-refresh");
  await page.keyboard.press("Escape"); await wait(page, 300);
  await page.getByRole("button", { name: "Add thesaurus" }).tap(); await wait(page, 400);
  await page.locator("[data-testid=settings-content] footer").getByRole("button", { name: /Import CSV/ }).tap(); await wait(page, 600);
  const gImp = await panelGeo(page);
  await sh(page, "THS-38-import-sheet");
  const ok38 = !shape.table && afterTap.dialogs.length > 0 && /Move to group/.test(afterTap.dialogs.join(" ")) && h1.doc <= 0 && h2.doc <= 0;
  rec("THS-38", ok38 ? "PASS" : "FAIL", `phone 390x844 list: table=${shape.table}, column headers=${shape.headers}, ${shape.rows} rows, text "${shape.text.slice(0, 100)}", horizontal overflow doc=${h1.doc}px pane=${h1.pane}px; editor ${ed.rows} value rows (first row ${ed.firstRowHeight}px high), overflow doc=${h2.doc}px pane=${h2.pane}px; tapping a value opens ${JSON.stringify(afterTap.dialogs)} (inline text edit=${afterTap.editing}; expected a sheet with the label, "Move to group", Move up/down and Remove); row action buttons in the row=${actions}, row actions class "${(acts || "").slice(0, 90)}"; first controls and sizes ${JSON.stringify(touchTargets)}`, "acceptance-run-2-shots/THS-38-tap.png");
  const visible = (g) => g && g.h > 60 && g.w >= g.vw - 2;
  rec("X-06", !shape.table && h1.doc <= 0 && h2.doc <= 0 && visible(gDelRaw) && visible(gImp) ? "PASS" : "FAIL", `phone (Playwright isMobile + touch at 390x844): list shows rows without a wide table (table=${shape.table}); no horizontal scroll on list (${h1.doc}px) or editor (${h2.doc}px); editor is one column. Dialogs: right after load \`--kb\` is ${JSON.stringify(kb0)} (the keyboard inset hook read innerHeight before the mobile viewport applied and never updates) and the delete dialog panel measures ${JSON.stringify(gDelRaw)} (collapsed to ${gDelRaw?.h}px high at the top: invisible, only the dim overlay shows, see THS-38-delete-sheet.png); the import dialog ${JSON.stringify(gImp)}. After forcing a visualViewport resize (--kb ${JSON.stringify(kb1)}) the delete sheet measures ${JSON.stringify(gDel)} (a bottom sheet of full width with 44px buttons)`, "acceptance-run-2-shots/THS-38-delete-sheet.png");
  rec("X-07m", !listAxe.length && !edAxe.length && !listAxeDark.length && !edAxeDark.length ? "PASS" : "FAIL", `phone axe serious/critical: list light ${JSON.stringify(listAxe)}, list dark ${JSON.stringify(listAxeDark)}, editor light ${JSON.stringify(edAxe)}, editor dark ${JSON.stringify(edAxeDark)}`, "");
  await page.context().close();
});
