import { run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, actName, addGroup, tick, openBeacon, dialogs } from "./tx.mjs";

await run("THS-4", async (b) => {
  // THS-15 drag
  let { page } = await open(b, "thesauri");
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon", "Lime"]);
  const base = await vrows(page);
  const grip = (n) => S(page).locator(`button[aria-label^="Reorder ${n},"]`);
  await grip("Kiwi").dragTo(grip("Apple")); await wait(page, 300);
  const d1 = await vrows(page);
  const dirty1 = !(await commitBtn(page).isDisabled());
  await grip("Lemon").dragTo(grip("Apple")); await wait(page, 300);
  const d2 = await vrows(page);
  await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const d3 = await vrows(page);
  await page.reload(); await wait(page, 1500);
  const afterReload = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  await sh(page, "THS-15");
  const keptOrder = d3[0] === "Kiwi";
  const childStays = d2.indexOf("  -Lemon") > d2.indexOf("[G]Citrus");
  rec("THS-15", d1[0] === "Kiwi" && dirty1 && childStays && keptOrder && afterReload.includes("Fruits") ? "PASS" : "FAIL", `base ${JSON.stringify(base)}; mouse drag of "Kiwi" above "Apple": ${JSON.stringify(d1)} (page dirty=${dirty1}); dragging child "Lemon" onto root "Apple": ${JSON.stringify(d2)} (stays in its group=${childStays}); after Save and reopen ${JSON.stringify(d3)}; after tab reload the list is ${JSON.stringify(afterReload)} ("Fruits" kept=${afterReload.includes("Fruits")})`, "acceptance-run-2-shots/THS-15.png");
  await page.context().close();

  // THS-16 keyboard
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Citrus", ["Lemon", "Lime"]);
  const k0 = await vrows(page);
  const btn = (n, dir) => S(page).getByRole("button", { name: `Move ${n} ${dir}`, exact: true });
  const up0 = await btn("Kiwi", "up").count(); const disUpFirst = await btn("Citrus", "up").isDisabled(); 
  await btn("Kiwi", "up").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k1 = await vrows(page); const f1 = await actName(page);
  await btn("Kiwi", "up").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k2 = await vrows(page);
  await btn("Lime", "up").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k3 = await vrows(page); const f3 = await actName(page);
  await btn("Citrus", "down").focus(); await page.keyboard.press("Enter"); await wait(page, 200);
  const k4 = await vrows(page); const f4 = await actName(page);
  const lastDisabled = await S(page).locator("li[data-row-id]").last().getByRole("button", { name: /Move .* down/ }).isDisabled();
  await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const k5 = await vrows(page);
  await sh(page, "THS-16");
  rec("THS-16", k1.indexOf("Kiwi") === k0.indexOf("Kiwi") - 1 && /Kiwi/.test(f1) && disUpFirst && k3.indexOf("  -Lime") < k3.indexOf("  -Lemon") && /Lime/.test(f3) && JSON.stringify(k5) === JSON.stringify(k4) ? "PASS" : "FAIL", `start ${JSON.stringify(k0)}; "Move Kiwi up" + Enter: ${JSON.stringify(k1)}, focus then on "${f1}"; again: ${JSON.stringify(k2)}; inside a group "Move Lime up": ${JSON.stringify(k3)} (focus afterwards on "${f3}", expected the same row's button; the pressed button became disabled because Lime is now first in its group); group "Move Citrus down": ${JSON.stringify(k4)} (focus "${f4}"); first row's "Move up" disabled=${disUpFirst}, last row's "Move down" disabled=${lastDisabled}; saved and reopened ${JSON.stringify(k5)}. Labels "Move <label> up" as built (A4)`, "acceptance-run-2-shots/THS-16.png");
  await page.context().close();

  // THS-17 sort
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["zebra", "Apple", "álamo", "Banana"]);
  await openThes(page, "Fruits");
  await addGroup(page, "Zone", ["zeta", "Alpha"]);
  await saveClick(page); await wait(page, 500); await openThes(page, "Fruits");
  const s0 = await vrows(page);
  await S(page).getByRole("button", { name: /Sort/ }).click(); await wait(page, 300);
  const s1 = await vrows(page);
  const dirtyS = !(await commitBtn(page).isDisabled());
  await cancelBtn(page).click(); await wait(page, 500);
  await openThes(page, "Fruits");
  const s2 = await vrows(page);
  await S(page).getByRole("button", { name: /Sort/ }).click(); await wait(page, 300);
  await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const s3 = await vrows(page);
  await sh(page, "THS-17");
  const exp = ["álamo", "Apple", "Banana", "zebra"];
  const roots = s1.filter((x) => !/^  -/.test(x) && !/^\[G\]/.test(x));
  rec("THS-17", JSON.stringify(roots) === JSON.stringify(exp) && dirtyS && JSON.stringify(s2) === JSON.stringify(s0) && JSON.stringify(s3) === JSON.stringify(s1) ? "PASS" : "FAIL", `before ${JSON.stringify(s0)}; button "Sort A–Z" gives ${JSON.stringify(s1)} (roots ${JSON.stringify(roots)} vs expected ${JSON.stringify(exp)}; the group's children sorted=${JSON.stringify(s1.filter((x) => /^  -/.test(x)))}); page dirty=${dirtyS}; Cancel then reopen: ${JSON.stringify(s2)} (reverted=${JSON.stringify(s2) === JSON.stringify(s0)}); Sort + Save + reopen: ${JSON.stringify(s3)}. Button label "Sort A–Z" as built (A4)`, "acceptance-run-2-shots/THS-17.png");
  await page.context().close();

  // THS-18 collapse
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple"]);
  await openThes(page, "Fruits");
  const noGroupBtns = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  await addGroup(page, "Citrus", ["Lemon"]);
  const col = S(page).getByRole("button", { name: "Collapse all" }); const exp2 = S(page).getByRole("button", { name: "Expand all" });
  const st0 = [await col.isDisabled(), await exp2.isDisabled()];
  await col.click(); await wait(page, 200);
  const c1 = await vrows(page); const st1 = [await col.isDisabled(), await exp2.isDisabled()];
  await exp2.click(); await wait(page, 200);
  const c2 = await vrows(page); const st2 = [await col.isDisabled(), await exp2.isDisabled()];
  await page.context().close();
  // >50 group via CSV
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Big");
  await S(page).locator("footer").getByRole("button", { name: /Import CSV/ }).click(); await wait(page, 400);
  await page.locator('input[type=file]').setInputFiles("/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-2-parts/group-ths-scripts/fixtures/big.csv"); await wait(page, 600);
  await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: /^Add \d+ rows?$/ }).click(); await wait(page, 400);
  await saveClick(page); await wait(page, 600);
  await openThes(page, "Big");
  const big = await vrows(page);
  await sh(page, "THS-18");
  const ok18 = noGroupBtns === 0 && st0[1] === true && st0[0] === false && c1.every((x) => !/^  -/.test(x)) && st1[0] === true && st1[1] === false && c2.some((x) => /^  -/.test(x)) && st2[1] === true && big.length === 1;
  rec("THS-18", ok18 ? "PASS" : "FAIL", `no group: Collapse all / Expand all buttons=${noGroupBtns}; with a group: initial disabled [collapse, expand]=${JSON.stringify(st0)}; after Collapse all rows ${JSON.stringify(c1)} state ${JSON.stringify(st1)}; after Expand all ${JSON.stringify(c2)} state ${JSON.stringify(st2)}; a saved group of 55 values reopens with ${big.length} rows ${JSON.stringify(big.slice(0, 3))} (collapsed=${big.length === 1})`, "acceptance-run-2-shots/THS-18.png");
  await page.context().close();
});
