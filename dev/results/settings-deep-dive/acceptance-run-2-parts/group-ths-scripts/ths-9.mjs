import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, dialogText, addGroup, arm, devButton, switchTo, logEntries, hscroll } from "./tx.mjs";

const rowCount = (p) => p.locator("li[data-row-id]").count();
await run("THS-9a", async (b) => {
  let { page } = await open(b, "thesauri", "desktop", { source: "travesia" });
  await wait(page, 3000);
  const t0 = Date.now();
  await openThes(page, "Municipios");
  const usable = Date.now() - t0;
  const n0 = await rowCount(page);
  const total = clean(await S(page).innerText()).match(/Values \(([\d,]+)\)/)?.[1];
  // scroll to the middle
  await page.evaluate(() => { const sc = document.querySelector("[data-testid=settings-content]"); const el = [...sc.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 500 && /auto|scroll/.test(getComputedStyle(e).overflowY)); (el || sc).scrollTop = (el ? el.scrollHeight : 0) / 2; });
  await wait(page, 600);
  const n1 = await rowCount(page);
  const midRows = await vrows(page);
  const search = S(page).getByPlaceholder(/Search values/);
  await search.fill("Medell"); await wait(page, 700);
  const found = await vrows(page);
  const status = clean(await S(page).locator("[role=search] [role=status]").innerText().catch(() => ""));
  await search.fill(""); await wait(page, 500);
  await S(page).getByRole("button", { name: "Jump to M", exact: true }).click(); await wait(page, 800);
  const afterJump = await vrows(page);
  const firstM = afterJump.find((x) => /^M/i.test(x.replace(/^\s*-?/, "")));
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText);
  await sh(page, "THS-34");
  rec("THS-34", usable < 4000 && n0 < 200 && n1 < 200 && found.some((x) => /Medell/i.test(x)) && found.every((x) => /Medell|^\[G\]/i.test(x)) && /^M/i.test((focused || "").replace(/, rename$/, "")) ? "PASS" : "FAIL", `Municipios opened and rendered in ${usable} ms; header total "${total}"; value rows in the DOM at the top ${n0}, after scrolling to the middle ${n1} (first rows there ${JSON.stringify(midRows.slice(0, 3))}); search "Medell" leaves ${JSON.stringify(found.slice(0, 5))} (status "${status}"); "Jump to M" focuses "${focused}" and rows start ${JSON.stringify(afterJump.slice(0, 3))}`, "acceptance-run-2-shots/THS-34.png");
  // THS-35
  await page.evaluate(() => { const sc = document.querySelector("[data-testid=settings-content]"); const el = [...sc.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 500 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (el) el.scrollTop = el.scrollHeight / 2; });
  await wait(page, 500);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 600);
  const inView = await page.evaluate(() => { const i = document.querySelector("li[data-row-id] input[aria-label=Value]"); if (!i) return null; const r = i.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, focused: document.activeElement === i }; });
  await page.keyboard.type("Zzz Nuevo"); await page.keyboard.press("Enter"); await wait(page, 200); await page.keyboard.press("Escape"); await wait(page, 300);
  // Municipios is flat: add a group with children to collapse
  await S(page).getByRole("button", { name: "Add group", exact: true }).first().click(); await wait(page, 300);
  await page.keyboard.type("Prueba"); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.type("Hijo 1"); await page.keyboard.press("Enter"); await wait(page, 150); await page.keyboard.type("Hijo 2"); await page.keyboard.press("Enter"); await wait(page, 150); await page.keyboard.press("Escape"); await wait(page, 300);
  const listH = () => page.evaluate(() => parseFloat(document.querySelector("ul[aria-label=Values]").parentElement.style.height));
  const hOpen = await listH();
  const hasCollapseAll = await S(page).getByRole("button", { name: "Collapse all" }).count();
  let collapsedInfo = "no Collapse all";
  let dropped = false;
  if (hasCollapseAll) { await S(page).getByRole("button", { name: "Collapse all" }).click(); await wait(page, 400); const hShut = await listH(); dropped = hShut < hOpen; collapsedInfo = `after adding a group with two children and Collapse all the list height goes ${hOpen}rem -> ${hShut}rem (rows dropped=${dropped})`; }
  await sh(page, "THS-35");
  rec("THS-35", inView && inView.focused && inView.top >= 0 && inView.bottom <= inView.vh && dropped ? "PASS" : "FAIL", `scrolled to the middle of 2,443 rows, "Add value": new row input in edit mode and focused=${inView?.focused}, input top ${inView?.top}px of viewport ${inView?.vh}px (in view=${!!inView && inView.top >= 0 && inView.bottom <= inView.vh}); Municipios has no groups, so one was added in the draft; ${collapsedInfo}`, "acceptance-run-2-shots/THS-35.png");
  await page.context().close();
});

await run("THS-9b", async (b) => {
  // THS-36 + X-02: dirty guard
  let { page } = await open(b, "thesauri");
  const guardTexts = [];
  const readGuard = async (what) => { await wait(page, 400); const t = await dialogText(page); const g = await guardInfo(page); guardTexts.push(`${what}: ${t ? '"' + t.replace(/^.*?(Discard)/, "$1").slice(0, 150) + '"' : "no dialog"}`); return t; };
  await openThes(page, "Case status");
  await addVals(page, ["Zed"]);
  // back arrow
  await S(page).getByRole("button", { name: "Back", exact: true }).click(); 
  const tBack = await readGuard("back arrow");
  const cancelBtnD = page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" });
  const discardTitle = clean(await page.locator("[data-component=ConfirmDialog]").innerText().catch(() => ""));
  await sh(page, "THS-36");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  const stillA = (await nameInput(page).count()) === 1 && (await vrows(page)).includes("Zed");
  // breadcrumb
  await S(page).locator("header, [data-part=header]").getByText("Thesauri", { exact: true }).first().click().catch(() => {});
  const tCrumb = await readGuard("breadcrumb");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  // rail
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first().click().catch(() => {});
  const tRail = await readGuard("rail item Templates");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  // second attempt prompts again
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first().click().catch(() => {});
  const tRail2 = await readGuard("rail item again after Cancel");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  // navbar link Library
  await page.locator("button", { hasText: "Library" }).first().click().catch(() => {});
  const tNav = await readGuard("navbar Library");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  // data source switch
  await page.locator('button[aria-label^="Collection:"]').click().catch(() => {}); await wait(page, 250);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Sample" }).click().catch(() => {}); 
  const tDs = await readGuard("data source switch");
  if (await cancelBtnD.count()) { await cancelBtnD.click(); await wait(page, 300); }
  // Cancel button
  await cancelBtn(page).click(); await wait(page, 500);
  const tCancel = await readGuard("footer Cancel");
  const afterCancelPage = clean(await S(page).innerText()).slice(0, 40);
  // discard via back arrow then check edit gone
  await openThes(page, "Case status");
  const edited = await vrows(page);
  const exp = /You have unsaved changes\. Do you want to continue\?/.test(discardTitle) && /Discard changes/.test(discardTitle);
  const x = [tBack, tCrumb, tRail, tRail2, tNav, tDs, tCancel];
  const all5 = [tBack, tCrumb, tRail, tRail2, tCancel].every((t) => /unsaved changes/.test(t));
  rec("THS-36", exp && all5 ? "PASS" : "FAIL", `dirty editor (added "Zed"): ${guardTexts.join("; ")}. Dialog text when it opens: "${discardTitle.slice(0, 160)}" (expected "Discard changes?" / "You have unsaved changes. Do you want to continue?" with Cancel and Discard changes); footer Cancel discards without a prompt (page after: "${afterCancelPage}"); Cancel in the dialog kept the edit=${stillA}`, "acceptance-run-2-shots/THS-36.png");
  rec("X-02", exp && [tBack, tCrumb, tRail, tRail2, tNav, tDs].every((t) => /unsaved changes/.test(t)) ? "PASS" : "FAIL", `editor dirty, then: ${guardTexts.join("; ")}. Expected the "Discard changes?" dialog (body "You have unsaved changes. Do you want to continue?", buttons Cancel / Discard changes) for each of back arrow, breadcrumb, rail item, navbar link, data source switch. Clean editor: see next line`, "acceptance-run-2-shots/THS-36.png");
  await page.context().close();

  // clean editor: no dialog; new untouched Cancel; redirect after save
  ({ page } = await open(b, "thesauri"));
  await openThes(page, "Case status");
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first().click(); await wait(page, 500);
  const cleanRail = (await dialogText(page)) === "";
  await toSettings(page, "Thesauri");
  await newThes(page, "");
  await cancelBtn(page).click(); await wait(page, 400);
  const cleanCancel = (await dialogText(page)) === "";
  rec("X-02b", cleanRail && cleanCancel ? "PASS" : "FAIL", `clean editor: rail click opens no dialog=${cleanRail}; new untouched editor + Cancel opens no dialog=${cleanCancel}`, "");
  await page.context().close();
});
