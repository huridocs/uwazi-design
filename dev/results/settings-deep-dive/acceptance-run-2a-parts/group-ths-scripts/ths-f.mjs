import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, rail, switchTo, toSettings, logEntries } from "./g.mjs";
import { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, saveThes, guard, makeThes } from "./tlib.mjs";
const label = (p, t) => S(p).getByRole("button", { name: `${t}, rename` });
const act = (p) => p.evaluate(() => { const a = document.activeElement; return a === document.body ? "document.body (focus lost)" : (a.getAttribute("aria-label") || a.innerText || a.tagName); });
const rowAct = (p, name) => S(p).locator("li[data-row-id]").filter({ has: p.getByRole("button", { name: `${name}, rename` }) }).first();
const setGroup = async (p, valueLabel, group) => {
  await rowAct(p, valueLabel).hover(); await wait(p, 150);
  await S(p).getByRole("button", { name: `Move ${valueLabel} to group` }).click(); await wait(p, 300);
  const dlg = p.locator("[role=dialog]:not([inert] *)");
  await dlg.getByText(group, { exact: false }).first().click(); await wait(p, 200);
  await dlg.getByRole("button", { name: /^Move$/ }).click(); await wait(p, 400);
};

await run("THS-f", async (b) => {
  let { page } = await open(b, "thesauri");
  await makeThes(page, "Fruits", ["Apple", "Fig"]);
  await openThes(page, "Fruits");
  // THS-11
  const initialInputs = await S(page).locator("li[data-row-id] input[type=text], li[data-row-id] input:not([type=checkbox])").count();
  const asText = await S(page).locator("li[data-row-id] [data-part=label]").count();
  await label(page, "Apple").click(); await wait(page, 150);
  const inputNow = await S(page).locator('li[data-row-id] input[aria-label="Value"]').count();
  await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Apples"); await page.keyboard.press("Enter"); await wait(page, 200);
  const v1 = await vrows(page);
  await label(page, "Fig").click(); await wait(page, 150); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Figxx"); await page.keyboard.press("Escape"); await wait(page, 200);
  const v2 = await vrows(page);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 200);
  const newEditing = await S(page).locator('li[data-row-id] input[aria-label="Value"]').count();
  const focusedIsInput = await page.evaluate(() => document.activeElement?.tagName === "INPUT");
  await page.keyboard.type("Pear"); await page.keyboard.press("Enter"); await wait(page, 150);
  const afterEnter = await S(page).locator('li[data-row-id] input[aria-label="Value"]').count();
  await page.keyboard.type("Plum"); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const v3 = await vrows(page);
  const blank = v3.some((r) => /^<>|^$/.test(r));
  rec("THS-11", initialInputs === 0 && asText >= 2 && inputNow === 1 && v1.includes("Apples") && v2.includes("Fig") && !v2.includes("Figxx") && newEditing === 1 && focusedIsInput && afterEnter === 1 && v3.includes("Pear") && v3.includes("Plum") && !blank ? "PASS" : "FAIL",
    `values at rest: ${asText} text labels, ${initialInputs} inputs; click on a label -> input=${inputNow}; Enter committed "Apples": ${JSON.stringify(v1)}; Escape reverted "Figxx": ${JSON.stringify(v2)}; "Add value" -> new row in edit mode=${newEditing}, input focused=${focusedIsInput}; Enter after "Pear" opened the next row=${afterEnter === 1}; after "Plum" Enter + Escape the blank row is dropped=${!blank}; draft ${JSON.stringify(v3)}`, await sh(page, "THS-11"));
  await page.context().close();

  // THS-12
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 200);
  await page.keyboard.type("TopNone"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await wait(page, 200);
  const none = await vrows(page);
  // add with a row focused: click Fig, Escape, then Add value
  await label(page, "Fig").click(); await wait(page, 150); await page.keyboard.press("Escape"); await wait(page, 150);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 200);
  await page.keyboard.type("  Double   space   label  "); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.type("   "); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const focused = await vrows(page);
  await saveThes(page);
  await openThes(page, "Fruits");
  const saved = await vrows(page);
  // new row in view?  (no-focus add was at top)
  rec("THS-12", none[0] === "TopNone" && focused[focused.indexOf("Fig") + 1] === "Double space label" && !focused.some((r) => /^<\s*>|^$/.test(r)) && saved.includes("Double space label") ? "PASS" : "FAIL",
    `no row focused: Add value + "TopNone" lands at ${JSON.stringify(none)} (first=${none[0] === "TopNone"}); after clicking "Fig" then Add value: ${JSON.stringify(focused)} (new row directly after Fig=${focused[focused.indexOf("Fig") + 1] === "Double space label"}); whitespace-only row dropped=${!focused.some((r) => /^<\s*>/.test(r))}; saved labels ${JSON.stringify(saved)} (internal spaces collapsed, trimmed=${saved.includes("Double space label")})`, await sh(page, "THS-12"));
  await page.context().close();

  // THS-13, THS-14, THS-15
  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Pear", "Plum", "Fig"]);
  await openThes(page, "Fruits");
  await S(page).getByRole("button", { name: "Add group" }).click(); await wait(page, 200);
  const grpInput = await S(page).locator('input[aria-label="Group name"]').count();
  await page.keyboard.press("Enter"); await wait(page, 200);
  const afterEmpty = await vrows(page);
  const msgRequired = /This field is required/.test(clean(await S(page).innerText()));
  await S(page).getByRole("button", { name: "Add group" }).click(); await wait(page, 200);
  await page.keyboard.type("Citrus"); await page.keyboard.press("Enter"); await wait(page, 200);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const emptyGroup = await vrows(page);
  const noItemsText = /No values in this group/.test(clean(await S(page).innerText()));
  const groupRowBtns = await rowAct(page, "Citrus").locator("button").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  await commitBtn(page).click(); await wait(page, 500);
  const inEditor = await nameInput(page).count();
  const ftxt = clean(await S(page).locator("footer").innerText().catch(() => ""));
  let rejected = false;
  if (inEditor) { rejected = /group|empty|item|value/i.test(ftxt) && !/Cancel Save$/.test(ftxt) && (await commitBtn(page).getAttribute("aria-disabled")) === "true"; }
  const addGroupInside = groupRowBtns.some((n) => /Add group/i.test(n || ""));
  const stateAfterSave = inEditor ? "editor still open" : "saved and closed";
  const atEnd = emptyGroup[emptyGroup.length - 1].startsWith("[G]Citrus");
  rec("THS-13", afterEmpty.length === 3 && msgRequired && inEditor && rejected && !addGroupInside && atEnd ? "PASS" : "FAIL",
    `Add group opens a name input (${grpInput}); Enter with the name empty: row removed silently, rows ${JSON.stringify(afterEmpty)}, "This field is required" shown=${msgRequired}; group "Citrus" with no item: rows ${JSON.stringify(emptyGroup)}, "No values in this group" row=${noItemsText}; Save -> ${stateAfterSave}, footer "${ftxt.slice(0, 100)}" (group without an item rejected with a message=${rejected}); group row actions ${JSON.stringify(groupRowBtns)} ("Add group" inside a group=${addGroupInside}); the new group landed at the ${atEnd ? "end" : "start"} of the root list (expected: end)`, await sh(page, "THS-13"));
  if (!inEditor) { await openThes(page, "Fruits"); }
  // THS-14: add Lemon to Citrus, then move Pear in and out
  const hasCitrus = (await vrows(page)).some((r) => /^\[G\]Citrus/.test(r));
  if (!hasCitrus) { await S(page).getByRole("button", { name: "Add group" }).click(); await page.keyboard.type("Citrus"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await wait(page, 200); }
  await rowAct(page, "Citrus").hover();
  await S(page).getByRole("button", { name: "Add value to Citrus" }).click({ force: true }); await wait(page, 200);
  await page.keyboard.type("Lemon"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await wait(page, 200);
  const base14 = await vrows(page);
  await setGroup(page, "Pear", "Citrus");
  const moved = await vrows(page);
  await setGroup(page, "Pear", "No group");
  const movedBack = await vrows(page);
  await label(page, "Citrus").click(); await wait(page, 150); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Citrus fruit"); await page.keyboard.press("Enter"); await wait(page, 200);
  const renamed = await vrows(page);
  const pearIn = moved.indexOf("  -Pear") > moved.findIndex((r) => /^\[G\]Citrus/.test(r));
  rec("THS-14", pearIn && !movedBack.some((r) => r === "  -Pear") && renamed.some((r) => /^\[G\]Citrus fruit/.test(r)) ? "PASS" : "FAIL",
    `base ${JSON.stringify(base14)}; "Move Pear to group" -> Citrus: ${JSON.stringify(moved)} (Pear inside the group=${pearIn}); back to "No group (top level)": ${JSON.stringify(movedBack)}; group renamed inline: ${JSON.stringify(renamed)}`, await sh(page, "THS-14"));
  await saveThes(page);
  await page.context().close();
});
