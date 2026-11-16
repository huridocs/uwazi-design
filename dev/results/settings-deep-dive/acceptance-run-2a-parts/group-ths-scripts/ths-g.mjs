import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, rail, switchTo, toSettings, logEntries } from "./g.mjs";
import { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, saveThes, guard, makeThes } from "./tlib.mjs";
const label = (p, t) => S(p).getByRole("button", { name: `${t}, rename` });
const act = (p) => p.evaluate(() => { const a = document.activeElement; return a === document.body ? "document.body (focus lost)" : (a.getAttribute("aria-label") || a.innerText || a.tagName); });
const liOf = (p, name) => S(p).locator("li[data-row-id]").filter({ has: p.getByRole("button", { name: `${name}, rename` }) }).first();
const grip = (p, name) => liOf(p, name).locator("[data-component=ReorderGrip]");
const addGroup = async (p, name, kids) => {
  await S(p).getByRole("button", { name: "Add group" }).click(); await wait(p, 200);
  await p.keyboard.type(name); await p.keyboard.press("Enter"); await wait(p, 150);
  for (const k of kids) { await p.keyboard.type(k); await p.keyboard.press("Enter"); await wait(p, 120); }
  await p.keyboard.press("Escape"); await wait(p, 200);
};
const tick = async (p, name) => { await S(p).getByRole("checkbox", { name: `Select ${name}` }).check(); await wait(p, 100); };
const footTxt = async (p) => clean(await S(p).locator("footer").innerText());

await run("THS-g", async (b) => {
  let { page } = await open(b, "thesauri");
  // THS-15 drag
  await makeThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon", "Lime"]);
  const before = await vrows(page);
  await grip(page, "Fig").dragTo(liOf(page, "Pear")); await wait(page, 300);
  const afterRoot = await vrows(page);
  await grip(page, "Lemon").dragTo(liOf(page, "Pear")); await wait(page, 300);
  const afterChild = await vrows(page);
  await saveThes(page); await openThes(page, "Fruits");
  const saved = await vrows(page);
  const rootsOf = (v) => v.filter((r) => !r.startsWith("  -"));
  const okRoot = JSON.stringify(rootsOf(afterRoot)) === JSON.stringify(["[G]Citrus", "Fig", "Pear", "Plum"]);
  const okChild = JSON.stringify(afterChild) === JSON.stringify(afterRoot);
  rec("THS-15", okRoot && okChild && JSON.stringify(rootsOf(saved)) === JSON.stringify(["[G]Citrus", "Fig", "Pear", "Plum"]) ? "PASS" : "FAIL", `before ${JSON.stringify(before)}; dragging "Fig" above "Pear": ${JSON.stringify(afterRoot)} (moved=${okRoot}); dragging the child "Lemon" onto the root list: ${JSON.stringify(afterChild)} (child stays in its group=${okChild}); after Save and reopen ${JSON.stringify(saved)}`, await sh(page, "THS-15"));

  // THS-16 keyboard
  await page.context().close();
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Fig", "Pear", "Plum"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon", "Lime", "Orange"]);
  // put the group third among the roots: Fig, Pear, Citrus, Plum
  await S(page).getByRole("button", { name: "Move Citrus down" }).focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  await S(page).getByRole("button", { name: "Move Citrus down" }).focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const start = await vrows(page);
  const upBtn = (n) => S(page).getByRole("button", { name: `Move ${n} up` });
  const downBtn = (n) => S(page).getByRole("button", { name: `Move ${n} down` });
  const names = await S(page).getByRole("button", { name: /^Move .* (up|down)$/ }).evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  const roots0 = (await vrows(page)).filter((r) => !r.startsWith("  -"));
  const dis = { firstUp: await upBtn("Fig").isDisabled(), lastDown: await downBtn("Plum").isDisabled(), lemonUp: await upBtn("Lemon").isDisabled(), orangeDown: await downBtn("Orange").isDisabled(), midUp: await upBtn("Lime").isDisabled() };
  await upBtn("Plum").focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  const r1 = await vrows(page); const f1 = await act(page);
  await upBtn("Citrus").focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  const r2 = await vrows(page); const f2 = await act(page);
  await downBtn("Lemon").focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  const r3 = await vrows(page); const f3 = await act(page);
  await downBtn("Lemon").focus(); await page.keyboard.press("Enter"); await wait(page, 250);
  const r4 = await vrows(page); const f4 = await act(page);
  const rowMid = /Move Plum (up|down)/.test(f1) && /Move Citrus (up|down)/.test(f2) && /Move Lemon (up|down)/.test(f3);
  const stays = rowMid && /Move Lemon (up|down)/.test(f4);
  rec("THS-16", dis.firstUp && dis.lastDown && dis.lemonUp && dis.orangeDown && !dis.midUp && stays && names.every((n) => /^Move .+ (up|down)$/.test(n)) ? "PASS" : "FAIL",
    `start ${JSON.stringify(start)}; names ${JSON.stringify([...new Set(names)].slice(0, 4))}...; disabled at the ends: first root up=${dis.firstUp}, last root down=${dis.lastDown}, first child up=${dis.lemonUp}, last child down=${dis.orangeDown}, middle child up=${dis.midUp}; "Move Plum up" -> ${JSON.stringify(r1.filter((r) => !r.startsWith("  -")))}, focus "${f1}"; group row "Move Citrus up" -> ${JSON.stringify(r2.filter((r) => !r.startsWith("  -")))}, focus "${f2}"; child "Move Lemon down" -> ${JSON.stringify(r3.filter((r) => r.startsWith("  -")))}, focus "${f3}"; pressed again (Lemon now in the middle) -> ${JSON.stringify(r4.filter((r) => r.startsWith("  -")))}, focus "${f4}" (the row lands last and its Move down is disabled)`, await sh(page, "THS-16"));
  await page.context().close();

  // THS-17 sort
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Sortme", ["zebra", "Apple", "álamo", "Banana"]);
  await openThes(page, "Sortme");
  await addGroup(page, "Group", ["zeta", "alpha"]);
  await saveThes(page); await openThes(page, "Sortme");
  const orig = await vrows(page);
  const sortBtn = S(page).getByRole("button", { name: /^Sort/ });
  const sortLabel = await sortBtn.innerText();
  const dirty0 = !(await commitBtn(page).isDisabled());
  await sortBtn.click(); await wait(page, 300);
  const sorted = await vrows(page);
  const dirty1 = !(await commitBtn(page).isDisabled());
  await cancelBtn(page).click(); await wait(page, 500);
  const dlgs = await dialogs(page);
  const left = !(await nameInput(page).count());
  if (dlgs.length) await guardBtn(page, /Discard changes/).click();
  await wait(page, 400);
  await openThes(page, "Sortme");
  const reopened = await vrows(page);
  await S(page).getByRole("button", { name: /^Sort/ }).click(); await wait(page, 300);
  await saveThes(page); await openThes(page, "Sortme");
  const stored = await vrows(page);
  const wantRoots = ["álamo", "Apple", "Banana", "zebra"];
  const rootsSorted = sorted.filter((r) => !r.startsWith("  -") && !r.startsWith("[G]")).join() === wantRoots.join();
  rec("THS-17", rootsSorted && dirty1 && !dirty0 && JSON.stringify(reopened) === JSON.stringify(orig) && stored.filter((r) => !r.startsWith("  -") && !r.startsWith("[G]")).join() === wantRoots.join() ? "PASS" : "FAIL", `button "${sortLabel}"; original ${JSON.stringify(orig)}; after Sort: ${JSON.stringify(sorted)} (roots as álamo, Apple, Banana, zebra=${rootsSorted}); dirty before/after=${dirty0}/${dirty1}; Cancel: dialogs ${JSON.stringify(dlgs)}, left the editor=${left}; reopened order restored=${JSON.stringify(reopened) === JSON.stringify(orig)}; Sort again + Save, reopened ${JSON.stringify(stored)}`, await sh(page, "THS-17"));
  await page.context().close();

  // THS-18
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Pear"]);
  await openThes(page, "Fruits");
  const noGroupBtns = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  await addGroup(page, "Citrus", ["Lemon"]);
  const c = S(page).getByRole("button", { name: "Collapse all" }), e = S(page).getByRole("button", { name: "Expand all" });
  const s0 = [await c.isDisabled(), await e.isDisabled()];
  await c.click(); await wait(page, 200);
  const vAfterC = await vrows(page);
  const s1 = [await c.isDisabled(), await e.isDisabled()];
  await e.click(); await wait(page, 200);
  const s2 = [await c.isDisabled(), await e.isDisabled()];
  await saveThes(page);
  // a group of >50 values via CSV import
  await openThes(page, "Fruits");
  const rowsCsv = "English\nBig group\n" + Array.from({ length: 60 }, (_, i) => `- Item ${i + 1}`).join("\n") + "\n";
  const fs = await import("fs"); fs.writeFileSync(new URL("./files/big.csv", import.meta.url).pathname, rowsCsv);
  await footerBtn(page, "Import CSV").click(); await wait(page, 400);
  await page.locator('input[type=file]').setInputFiles(new URL("./files/big.csv", import.meta.url).pathname); await wait(page, 600);
  await p_apply(page);
  const bigNow = (await vrows(page)).filter((r) => /^  -Item/.test(r)).length;
  await saveThes(page); await openThes(page, "Fruits");
  const big = await vrows(page);
  const bigOpen = big.filter((r) => /^  -Item/.test(r)).length;
  rec("THS-18", noGroupBtns === 0 && s0[0] === false && s0[1] === true && s1[0] === true && s1[1] === false && s2[0] === false && s2[1] === true && bigOpen === 0 ? "PASS" : "FAIL", `thesaurus with no group: Collapse all/Expand all buttons=${noGroupBtns}; with a group: [Collapse disabled, Expand disabled] open=${JSON.stringify(s0)}, after Collapse all=${JSON.stringify(s1)} (rows ${JSON.stringify(vAfterC)}), after Expand all=${JSON.stringify(s2)}; a group of 60 values (CSV import) opens collapsed=${bigOpen === 0} (children visible right after the import ${bigNow}; after Save and reopening the thesaurus ${bigOpen} of 60)`, await sh(page, "THS-18"));
  await page.context().close();
});
async function p_apply(page) {
  const dlg = page.locator("[role=dialog]:not([inert] *)");
  await dlg.getByRole("button", { name: /Add values|Preview/ }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const add = dlg.getByRole("button", { name: "Add values" });
  if (await add.count()) await add.click().catch(() => {});
  await page.waitForTimeout(600);
}
