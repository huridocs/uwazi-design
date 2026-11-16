import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, rail, switchTo, toSettings, logEntries } from "./g.mjs";
import { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, saveThes, guard, makeThes } from "./tlib.mjs";
const label = (p, t) => S(p).getByRole("button", { name: `${t}, rename` });
const addGroup = async (p, name, kids) => {
  await S(p).getByRole("button", { name: "Add group" }).click(); await wait(p, 200);
  await p.keyboard.type(name); await p.keyboard.press("Enter"); await wait(p, 150);
  for (const k of kids) { await p.keyboard.type(k); await p.keyboard.press("Enter"); await wait(p, 120); }
  await p.keyboard.press("Escape"); await wait(p, 200);
};
const tick = async (p, name) => { await S(p).getByRole("checkbox", { name: `Select ${name}` }).check(); await wait(p, 100); };
const footTxt = async (p) => clean(await S(p).locator("footer").innerText());
const alertTxt = async (p) => clean(await S(p).locator("footer [role=alert]").innerText().catch(() => ""));
const allIssues = async (p) => clean(await S(p).locator("footer [role=alert]").getAttribute("title").catch(() => "") || "");

await run("THS-h", async (b) => {
  // THS-19 duplicates
  let { page } = await open(b, "thesauri");
  await makeThes(page, "Fruits", ["Pear"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon"]);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 150);
  await page.keyboard.type("Apple"); await page.keyboard.press("Enter"); await page.keyboard.type("Apple"); await page.keyboard.press("Enter"); await page.keyboard.type(" apple "); await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await wait(page, 200);
  await commitBtn(page).click(); await wait(page, 400);
  const blocked = !!(await nameInput(page).count());
  const msg1 = await alertTxt(page); const all1 = await allIssues(page);
  const vs = await vrows(page);
  // remove the dupes, add Apple inside the group
  const rm = S(page).getByRole("button", { name: /^Remove / });
  // remove extra Apple rows by ticking and Remove
  const apples = S(page).getByRole("checkbox", { name: "Select Apple" });
  const nApple = await apples.count();
  for (let i = 1; i < nApple; i++) { await apples.nth(i).check(); }
  await S(page).locator("footer").getByRole("button", { name: /Remove/ }).click(); await wait(page, 300);
  await S(page).getByRole("button", { name: "Add value to Citrus" }).click({ force: true }); await wait(page, 150);
  await page.keyboard.type("Apple"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await wait(page, 200);
  const vs2 = await vrows(page);
  await commitBtn(page).click(); await wait(page, 500);
  const savedOK = !(await nameInput(page).count());
  // editing a saved thesaurus to equal a sibling
  await openThes(page, "Fruits");
  await label(page, "Pear").click(); await page.keyboard.type("Apple"); await page.keyboard.press("Enter"); await wait(page, 200);
  await commitBtn(page).click(); await wait(page, 400);
  const blocked2 = !!(await nameInput(page).count()); const msg2 = await alertTxt(page);
  rec("THS-19", blocked && /Apple/.test(msg1 + all1) && savedOK && blocked2 && /Apple/.test(msg2) ? "PASS" : "FAIL", `three same-level labels "Apple", "Apple", " apple " then Save: blocked=${blocked}; footer "${msg1}" (all issues: "${all1}"); the message names the repeated label=${/Apple/i.test(msg1 + all1)}, names the thesaurus "Fruits"=${/Fruits/.test(msg1 + all1)}; rows were ${JSON.stringify(vs)}. After removing the extras and adding "Apple" inside group Citrus: ${JSON.stringify(vs2)} saved=${savedOK} (different group allowed). Saved thesaurus, "Pear" renamed to "Apple" then Save: blocked=${blocked2}, "${msg2}"`, await sh(page, "THS-19"));
  await page.context().close();

  // THS-20 selection, THS-22 undo
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Pear", "Plum"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon", "Lime"]);
  await addGroup(page, "Berries", ["Fig"]);
  const all = await vrows(page);
  await tick(page, "Citrus");
  const t1 = await S(page).locator("input[type=checkbox]:checked").count();
  const bar1 = await footTxt(page);
  await tick(page, "Pear");
  const bar2 = await footTxt(page);
  await S(page).getByRole("checkbox", { name: /^Select all/ }).check(); await wait(page, 200);
  const bar3 = await footTxt(page);
  const m3 = bar3.match(/Selected (\d+) of (\d+)/);
  const totalRows = (await vrows(page)).length;
  const checkedAll = await S(page).locator("li[data-row-id] input[type=checkbox]:checked").count();
  const widthSlot = await S(page).locator("footer [role=status]").first().evaluate((e) => Math.round(e.getBoundingClientRect().width));
  // Remove all but unticking: untick everything, tick Fig (only child of Berries)
  await S(page).getByRole("checkbox", { name: /^Select all/ }).uncheck(); await wait(page, 200);
  await tick(page, "Fig");
  const b0 = await nlist(page);
  await S(page).locator("footer").getByRole("button", { name: /Remove/ }).click(); await wait(page, 300);
  const dlgs = await dialogs(page);
  const afterFig = await vrows(page);
  const nn = await newNotifs(page, b0);
  const undoBtn = page.locator("article").filter({ hasText: /Fig removed/ }).getByRole("button", { name: "Undo" });
  const undoN = await undoBtn.count();
  await page.getByRole("button", { name: /^Notifications/ }).click(); await wait(page, 400);
  if (undoN) await undoBtn.first().click(); await wait(page, 300);
  const afterUndo = await vrows(page);
  rec("THS-22", !dlgs.length && !afterFig.includes("  -Fig") && undoN === 1 && JSON.stringify(afterUndo) === JSON.stringify(all) ? "PASS" : "FAIL", `unused value "Fig" ticked, Remove: confirm dialogs ${JSON.stringify(dlgs)}; value gone at once=${!afterFig.includes("  -Fig")} (rows ${JSON.stringify(afterFig)}); new Beacon entries ${JSON.stringify(nn)}; Undo buttons=${undoN}; after Undo rows ${JSON.stringify(afterUndo)} (restored to old position=${JSON.stringify(afterUndo) === JSON.stringify(all)})`, await sh(page, "THS-22"));
  rec("THS-20", m3 && +m3[1] <= +m3[2] && t1 >= 3 && +m3[1] === checkedAll && +m3[2] === totalRows ? "PASS" : "FAIL", `thesaurus Fruits with groups Citrus (2 children) and Berries (1): ticking the group "Citrus" leaves ${t1} checkboxes checked (header + group; expected the group and its 2 children ticked); footer "${bar1.slice(0, 40)}"; after also ticking Pear: "${bar2.slice(0, 40)}"; header select-all: "${bar3.slice(0, 40)}" with ${checkedAll} row checkboxes checked of ${totalRows} rows (n never above m=${m3 ? +m3[1] <= +m3[2] : null}); count slot width ${widthSlot}px; removing the last child (Fig) of Berries left rows ${JSON.stringify(afterFig)} (group removed too=${!afterFig.includes("[G]Berries")}); Save still needed (nothing was saved)`, await sh(page, "THS-20"));
  await page.context().close();
});
