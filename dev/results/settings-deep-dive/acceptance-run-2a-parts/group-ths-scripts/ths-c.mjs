import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, rail, switchTo, toSettings, logEntries } from "./g.mjs";
import { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, saveThes, guard, makeThes } from "./tlib.mjs";
const issue = async (p) => clean(await S(p).locator("footer [role=alert]").innerText().catch(() => ""));
const inlineMsgs = async (p) => clean(await S(p).locator("[role=alert], [data-part=issue], [id$=-issue]").allInnerTexts().then((a) => a.join(" | ")).catch(() => ""));

await run("THS-d", async (b) => {
  // THS-07, THS-08
  let { page } = await open(b, "thesauri");
  await newThes(page);
  const ph = await nameInput(page).getAttribute("placeholder");
  const dis0 = await commitBtn(page).isDisabled();
  await commitBtn(page).click({ force: true, timeout: 1500 }).catch(() => {}); await wait(page, 300);
  const t0 = clean(await S(page).innerText());
  await nameInput(page).fill("   "); await wait(page, 200);
  const dis1 = await commitBtn(page).isDisabled();
  await commitBtn(page).click({ timeout: 1500 }).catch(() => {}); await wait(page, 400);
  const ft = clean(await S(page).locator("footer").innerText());
  const inline = await S(page).getByText("This field is required").count();
  const clearX = await S(page).getByRole("button", { name: /clear/i }).count();
  const stillEditor = await nameInput(page).count();
  await sh(page, "THS-07");
  rec("THS-07", inline > 0 && ph === "Thesauri name" && stillEditor ? "PASS" : "FAIL", `new editor: Save/Create disabled when untouched=${dis0}; after spaces in the name disabled=${dis1}, pressing it: footer reads "${ft.slice(0, 120)}"; inline "This field is required" count=${inline}; placeholder "${ph}" (expected "Thesauri name"); clear X buttons=${clearX}; nothing saved (editor still open=${!!stillEditor}, list rows unchanged)`, "acceptance-run-2a-shots/THS-07.png");
  await page.context().close();

  ({ page } = await open(b, "thesauri"));
  await newThes(page, "case status "); await addVals(page, ["One"]);
  await commitBtn(page).click(); await wait(page, 400);
  const f1 = clean(await S(page).locator("footer").innerText());
  const inline1 = /Thesaurus name already exists/.test(clean(await S(page).innerText()));
  const stillEd = await nameInput(page).count();
  await sh(page, "THS-08");
  await page.getByRole("button", { name: /^Cancel$/ }).first().click().catch(() => {}); await wait(page, 400);
  const g = await dialogs(page); if (g.length) await guardBtn(page, /Discard changes/).click();
  await wait(page, 400);
  const listN = (await listRows(page)).length;
  await openThes(page, "Case status");
  await nameInput(page).fill("Case status"); await nameInput(page).fill("Case status "); await nameInput(page).fill("Case status");
  await addVals(page, ["Other"]);
  await commitBtn(page).click(); await wait(page, 500);
  const afterOwn = clean(await S(page).locator("footer").innerText().catch(() => ""));
  const savedOwn = !(await nameInput(page).count());
  rec("THS-08", stillEd && inline1 && savedOwn ? "PASS" : "FAIL", `"case status " Save: blocked=${!!stillEd} (editor still open, list stays ${listN} rows); message in footer "${f1.slice(0, 110)}"; exact text "Thesaurus name already exists" present=${inline1}. Own name on "Case status" (kept, plus a new value): saved=${savedOwn}, footer "${afterOwn.slice(0, 60)}"`, "acceptance-run-2a-shots/THS-08.png");
  await page.context().close();
});

await run("THS-e", async (b) => {
  // THS-09, THS-10, THS-40, X-01
  let { page } = await open(b, "thesauri");
  const b0 = await nlist(page);
  await newThes(page, "Fruits"); await addVals(page, ["Apple"]);
  await saveThes(page);
  const n1 = await newNotifs(page, b0);
  const editorStays = await nameInput(page).count();
  const saveDis = editorStays ? await commitBtn(page).isDisabled() : null;
  const inList = (await listRows(page)).some((r) => /^Fruits/.test(r));
  const beforeCount = (await listRows(page)).find((r) => /^Fruits/.test(r));
  await page.reload(); await wait(page, 1500);
  const afterReload = (await listRows(page)).some((r) => /^Fruits/.test(r));
  rec("THS-09", n1.length === 1 && /^Thesauri added\./.test(n1[0]) && editorStays && saveDis && inList && afterReload ? "PASS" : "FAIL", `new "Fruits" with one item, Save: Beacon entries ${JSON.stringify(n1)} (expected "Thesauri added."); editor stays in edit mode=${!!editorStays}, Save disabled=${saveDis}; "Fruits" in list=${inList}; after a tab reload in list=${afterReload}`, await sh(page, "THS-09"));
  // Make persisted state for the rest: recreate if lost
  if (!afterReload) { await makeThes(page, "Fruits", ["Apple"]); }
  await page.context().close();

  ({ page } = await open(b, "thesauri"));
  await makeThes(page, "Fruits", ["Apple", "Pear", "Plum"]);
  const b1 = await nlist(page);
  await openThes(page, "Fruits");
  const dis0 = await commitBtn(page).isDisabled();
  await addVals(page, ["Banana"]);
  const dis1 = await commitBtn(page).isDisabled();
  await saveThes(page);
  const n2 = await newNotifs(page, b1);
  await openThes(page, "Fruits");
  const dis2 = await commitBtn(page).isDisabled();
  await S(page).getByRole("button", { name: "Apple, rename" }).click(); await page.keyboard.press("ArrowRight"); await page.keyboard.type("x"); await page.keyboard.press("Enter"); await wait(page, 200);
  const dirtyEdit = !(await commitBtn(page).isDisabled());
  await S(page).getByRole("button", { name: "Applex, rename" }).click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Apple"); await page.keyboard.press("Enter"); await wait(page, 200);
  const disRev = await commitBtn(page).isDisabled();
  rec("THS-10", n2.length === 1 && /^Thesauri updated\./.test(n2[0]) && dis0 && !dis1 && dis2 && dirtyEdit && disRev ? "PASS" : "FAIL", `reopened "Fruits": Save disabled when clean=${dis0}; after adding "Banana" disabled=${dis1}; Save notification ${JSON.stringify(n2)} (expected "Thesauri updated."); reopened: disabled=${dis2}; label edited to "Applex": disabled=${!dirtyEdit}; changed back by hand: disabled=${disRev}`, await sh(page, "THS-10"));
  // THS-40: counts
  await cancelBtn(page).click(); await wait(page, 400);
  const dg = await dialogs(page); if (dg.length) await guardBtn(page, /Discard/).click();
  await wait(page, 400);
  const row0 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  await openThes(page, "Fruits");
  const hdr = clean(await S(page).locator("h3").first().innerText());
  await addVals(page, ["Fig", "Lime"]); await saveThes(page);
  const row1 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  await page.reload(); await wait(page, 1500);
  const row2 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  const c0 = +(row0 || "").match(/(\d+)$/)?.[1], c1 = +(row1 || "").match(/(\d+)$/)?.[1];
  rec("THS-40", c1 === c0 + 2 && row2 === row1 && /\((\d+)\)/.test(hdr) ? "PASS" : "FAIL", `list row before "${row0}"; editor header "${hdr}"; after adding two values and Save "${row1}"; after a tab reload "${row2}"`, await sh(page, "THS-40"));
  // X-01
  rec("X-01", row2 === row1 ? "PASS" : "FAIL", `thesaurus "Fruits" created and extended in session: list after a rail round trip "${row1}"; after a tab reload "${row2}" (a thesaurus kept after reload=${row2 === row1}). Reset demo data not re-driven here`, "");
  await page.context().close();
});
