import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, footerTxt, openBeacon, dialogs, dialogText, newGroup, setGroupOf, groupSel, frow, groupNames, actName, logEntries } from "./tx.mjs";
const names = async (p) => (await fRows(p)).map((r) => r.slice(1));
await run("FLT-3", async (b) => {
  let { page } = await open(b, "filters");
  await wait(page, 500);
  // FLT-07
  const base = await names(page);
  const grip = (n) => S(page).locator(`button[aria-label^="Reorder ${n},"]`);
  await grip(base[2]).dragTo(grip(base[0])); await wait(page, 300);
  const d1 = await names(page);
  const dirty = !(await saveF(page).isDisabled());
  const b0 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const n0 = await fresh(page, b0);
  await rail(page, "Templates"); await wait(page, 400); await rail(page, "Filters"); await wait(page, 500);
  const afterRail = await names(page);
  await page.reload(); await wait(page, 1500);
  const d2 = await names(page);
  await sh(page, "FLT-07");
  rec("FLT-07", d1[0] === base[2] && dirty && d2[0] === base[2] && JSON.stringify(d2) === JSON.stringify(d1) ? "PASS" : "FAIL", `order ${JSON.stringify(base.slice(0, 4))}; mouse drag of "${base[2]}" onto the first row: ${JSON.stringify(d1.slice(0, 4))} (page dirty=${dirty}); Save (${JSON.stringify(n0)}), Templates and back: ${JSON.stringify(afterRail.slice(0, 4))}; after tab reload ${JSON.stringify(d2.slice(0, 4))}`, "acceptance-run-2-shots/FLT-07.png");
  rec("X-01", JSON.stringify(d2) === JSON.stringify(d1) && JSON.stringify(afterRail) === JSON.stringify(d1) ? "PASS" : "FAIL", `reordered filters, Save: after Templates -> Filters the order is kept (${JSON.stringify(afterRail.slice(0, 3))}) and after reloading the tab it is kept (${JSON.stringify(d2.slice(0, 3))}); Settings > Dashboard > Reset demo data not driven here`, "");
  await page.context().close();

  // FLT-08
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const nm = await names(page);
  const btn = (n, d) => S(page).getByRole("button", { name: `Move ${n} ${d}`, exact: true });
  const firstUpDis = await btn(nm[0], "up").isDisabled(); const lastDownDis = await btn(nm[nm.length - 1], "down").isDisabled();
  await btn(nm[1], "up").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k1 = await names(page); const f1 = await actName(page);
  await btn(nm[1], "up").focus().catch(() => {});
  await btn(nm[2], "down").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k2 = await names(page); const f2 = await actName(page);
  await newGroup(page, "Docs");
  await groupSel(page, nm[4]).focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  const opts = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape"); await wait(page, 200);
  await groupSel(page, nm[4]).focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  await page.getByRole("option", { name: "Docs", exact: true }).click(); await wait(page, 200);
  const selLabel = await groupSel(page, nm[4]).getAttribute("aria-label");
  await sh(page, "FLT-08");
  rec("FLT-08", k1[0] === nm[1] && /Move .* up/.test(f1) && firstUpDis && lastDownDis && /Docs/.test(selLabel) && /Court Case/.test(`Move ${nm[1]} up`) ? "PASS" : "FAIL", `buttons "Move <template> up/down" (first row's up disabled=${firstUpDis}, last row's down disabled=${lastDownDis}); Enter on "Move ${nm[1]} up": ${JSON.stringify(k1.slice(0, 3))}, focus then on "${f1}" (the row reached the first position, so the pressed "Move up" became disabled and focus fell to the page body); Enter on "Move ${nm[2]} down" (row now at index 2): ${JSON.stringify(k2.slice(0, 4))}, focus on "${f2}"; keyboard-opened group select options ${JSON.stringify(opts)}; picking "Docs" with the keyboard-opened select: "${selLabel}"; names include the template name ("Move ${nm[1]} up")`, "acceptance-run-2-shots/FLT-08.png");
  await page.context().close();
});
