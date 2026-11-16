import { run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, actName } from "./tx.mjs";

await run("THS-3", async (b) => {
  let { page } = await open(b, "thesauri");
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  // THS-11
  const asText = await S(page).locator("li[data-row-id] [data-part=label]").count();
  const inputsBefore = await S(page).locator("li[data-row-id] input[aria-label=Value]").count();
  await label(page, "Apple").click(); await wait(page, 150);
  const inputNow = await S(page).locator("li[data-row-id] input[aria-label=Value]").count();
  await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Apples"); await page.keyboard.press("Enter"); await wait(page, 200);
  const v1 = await vrows(page);
  await label(page, "Fig").click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Zzz"); await page.keyboard.press("Escape"); await wait(page, 200);
  const v2 = await vrows(page);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 150);
  const newEdit = await S(page).locator("li[data-row-id] input[aria-label=Value]").count();
  await page.keyboard.type("Pear"); await page.keyboard.press("Enter"); await wait(page, 150);
  const afterEnter = await S(page).locator("li[data-row-id] input[aria-label=Value]").count();
  await page.keyboard.type("Plum"); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const v3 = await vrows(page);
  const blankKept = v3.some((x) => /^<|Untitled/.test(x));
  await sh(page, "THS-11");
  const ok11 = asText >= 3 && inputsBefore === 0 && inputNow === 1 && v1.includes("Apples") && v2.includes("Fig") && !v2.includes("Zzz") && newEdit === 1 && afterEnter === 1 && v3.includes("Pear") && v3.includes("Plum") && !blankKept;
  rec("THS-11", ok11 ? "PASS" : "FAIL", `values render as text buttons (${asText}) with no inputs (${inputsBefore}); click -> input (${inputNow}); Enter commits "Apples" (${v1.includes("Apples")}); Escape on "Fig" keeps it (${v2.includes("Fig")}, no "Zzz"); "Add value" opens one new row in edit (${newEdit}); Enter commits and opens the next (${afterEnter}); trailing blank dropped on Escape (${!blankKept}); draft ${JSON.stringify(v3)}. Labels as built: "Add value" for "Add item" (A4)`, "acceptance-run-2-shots/THS-11.png");
  await page.context().close();

  // THS-12
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  await label(page, "Fig").click(); await page.keyboard.press("Enter"); await wait(page, 150);
  const focusedRow = await label(page, "Fig").count();
  await rowOf(page, "Fig").locator("[data-part=label]").focus(); await wait(page, 100);
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 150);
  await page.keyboard.type("Mid"); await page.keyboard.press("Enter"); await wait(page, 100); await page.keyboard.press("Escape"); await wait(page, 150);
  const vA = await vrows(page);
  await page.context().close();
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 150);
  await page.keyboard.type("Zero"); await page.keyboard.press("Enter"); await wait(page, 100); await page.keyboard.press("Escape"); await wait(page, 150);
  const vB = await vrows(page);
  const inView = await page.evaluate(() => { const li = [...document.querySelectorAll("li[data-row-id]")].find((l) => /Zero/.test(l.innerText)); if (!li) return null; const r = li.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  // whitespace handling
  await S(page).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(page, 150);
  await page.keyboard.type("  Two   Words  "); await page.keyboard.press("Enter"); await wait(page, 100); await page.keyboard.type("    "); await page.keyboard.press("Enter"); await wait(page, 100); await page.keyboard.press("Escape"); await wait(page, 150);
  const vC = await vrows(page);
  await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const vD = await vrows(page);
  await sh(page, "THS-12");
  const ok12 = vA.indexOf("Mid") === vA.indexOf("Fig") + 1 && vB[0] === "Zero" && inView && vD.includes("Two Words") && !vD.some((x) => /^\s*$|^<>/.test(x));
  rec("THS-12", ok12 ? "PASS" : "FAIL", `row "Fig" focused then Add value "Mid": order ${JSON.stringify(vA)} (Mid directly after Fig=${vA.indexOf("Mid") === vA.indexOf("Fig") + 1}); no row focused, Add value "Zero": order ${JSON.stringify(vB)} (at top=${vB[0] === "Zero"}, in view=${inView}); typed "  Two   Words  " and a whitespace-only value, saved and reopened: ${JSON.stringify(vD)}`, "acceptance-run-2-shots/THS-12.png");
  await page.context().close();

  // THS-13
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig"]);
  await openThes(page, "Fruits");
  await S(page).getByRole("button", { name: "Add group", exact: true }).first().click(); await wait(page, 200);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const vGE = await vrows(page);
  const dirtyAfterEmpty = !(await commitBtn(page).isDisabled());
  await S(page).getByRole("button", { name: "Add group", exact: true }).first().click(); await wait(page, 200);
  await page.keyboard.type("Citrus"); await page.keyboard.press("Enter"); await wait(page, 200);
  const afterGroupEnter = await S(page).locator("li[data-row-id] input").count();
  await page.keyboard.press("Escape"); await wait(page, 200);
  const vG1 = await vrows(page);
  const t0 = await footerTxt(page);
  await saveClick(page); await wait(page, 500);
  const noItemSave = clean(await S(page).innerText());
  const savedNoItem = /Add thesaurus/.test(noItemSave);
  const alertTxt = await S(page).locator("[role=alert]").allInnerTexts();
  await sh(page, "THS-13");
  // group inside group? a group row's actions
  let editor = savedNoItem ? (await openThes(page, "Fruits"), true) : false;
  const vG2 = await vrows(page);
  const addInGroup = await S(page).getByRole("button", { name: "Add group", exact: true }).count();
  const grpActions = await S(page).locator("li[data-row-id]").filter({ has: page.locator("button[aria-expanded]") }).first().locator("button").evaluateAll((bs) => bs.map((x) => x.getAttribute("aria-label") || x.innerText));
  rec("THS-13", !savedNoItem && alertTxt.some((a) => /group/i.test(a)) ? "PASS" : "FAIL", `Add group then Escape on the blank name: draft ${JSON.stringify(vGE)} (blank group dropped, page dirty=${dirtyAfterEmpty}); group "Citrus" typed, Enter: ${afterGroupEnter} inputs left in edit; draft ${JSON.stringify(vG1)}; Save with the group holding no item: saved without error=${savedNoItem}, footer/alerts ${JSON.stringify(alertTxt)} (expected an inline rejection "A group with no item"); reopened: ${JSON.stringify(vG2)}; a group row's actions: ${JSON.stringify(grpActions)} (no "Add group" inside a group; page-level "Add group" buttons=${addInGroup})`, "acceptance-run-2-shots/THS-13.png");
  await page.context().close();

  // THS-14
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Pear", "Plum"]);
  await openThes(page, "Fruits");
  await S(page).getByRole("button", { name: "Add group", exact: true }).first().click(); await wait(page, 200);
  await page.keyboard.type("Citrus"); await page.keyboard.press("Enter"); await wait(page, 150);
  await page.keyboard.type("Lemon"); await page.keyboard.press("Enter"); await wait(page, 150); await page.keyboard.press("Escape"); await wait(page, 150);
  await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const w0 = await vrows(page);
  await rowOf(page, "Pear").hover(); await wait(page, 150);
  await S(page).getByRole("button", { name: "Move Pear to group" }).click(); await wait(page, 300);
  const dlg = page.locator("[role=dialog]:not([inert] *)").last();
  const dtxt = clean(await dlg.innerText());
  await dlg.getByText("Citrus").first().click(); await wait(page, 150);
  const readback = clean(await dlg.innerText());
  await dlg.getByRole("button", { name: /^Move$/ }).click(); await wait(page, 300);
  const w1 = await vrows(page);
  await rowOf(page, "Pear").hover(); await wait(page, 150);
  await S(page).getByRole("button", { name: "Move Pear to group" }).click(); await wait(page, 300);
  const dlg2 = page.locator("[role=dialog]:not([inert] *)").last();
  const opts = clean(await dlg2.innerText());
  await dlg2.getByText(/No group/).first().click(); await wait(page, 150);
  await dlg2.getByRole("button", { name: /^Move$/ }).click(); await wait(page, 300);
  const w2 = await vrows(page);
  await label(page, "Citrus").click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Citrus fruit"); await page.keyboard.press("Enter"); await wait(page, 200);
  const w3 = await vrows(page);
  await sh(page, "THS-14");
    const into = w1.findIndex((x) => /Pear/.test(x)) > w1.findIndex((x) => /Citrus/.test(x)) && /^  -/.test(w1.find((x) => /Pear/.test(x)) || "");
  const outAgain = !/^  -/.test(w2.find((x) => /Pear/.test(x)) || "");
  rec("THS-14", into && outAgain && w3.some((x) => /Citrus fruit/.test(x)) && /No group/.test(opts) ? "PASS" : "FAIL", `before ${JSON.stringify(w0)}; "Move Pear to group" dialog options "${opts.slice(0, 160)}"; after Move into Citrus: ${JSON.stringify(w1)} (Pear is a child=${into}); moved back to "No group (top level)": ${JSON.stringify(w2)} (top level=${outAgain}); group renamed inline: ${JSON.stringify(w3)}. Menu label "No group (top level)" accepted as built (A4)`, "acceptance-run-2-shots/THS-14.png");
  await page.context().close();
});
