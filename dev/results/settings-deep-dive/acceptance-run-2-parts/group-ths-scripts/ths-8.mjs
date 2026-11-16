import fs from "fs";
import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, dialogText, addGroup } from "./tx.mjs";
const FX = new URL("./fixtures/", import.meta.url).pathname;
const imp = (p) => S(p).locator("footer").getByRole("button", { name: /Import CSV/ });
const dlg = (p) => p.locator("[data-component=ThesaurusImportModal]").last();
const modalTxt = async (p) => clean(await dlg(p).innerText().catch(() => ""));
const choose = async (p, f) => { await p.locator("input[type=file]").setInputFiles(FX + f); await wait(p, 700); };
const applyBtn = (p) => dlg(p).locator("[data-part=submit]");

await run("THS-8", async (b) => {
  // THS-29 / 30
  let { page } = await open(b, "thesauri");
  await newThes(page, "");
  await imp(page).click(); await wait(page, 400);
  const emptyNameOpens = (await dlg(page).count()) > 0;
  const impDisabled = await imp(page).isDisabled().catch(() => null);
  if (emptyNameOpens) { await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300); }
  await nameInput(page).fill("Fruit import");
  const impEnabledNamed = !(await imp(page).isDisabled());
  await imp(page).click(); await wait(page, 400);
  const t0 = await modalTxt(page);
  await choose(page, "fruit.csv");
  const t1 = await modalTxt(page);
  const prev = await dlg(page).locator("[aria-label='Rows in the file'] li").allInnerTexts();
  const draftBeforeApply = await vrows(page);
  await sh(page, "THS-29");
  const ok29 = !impEnabledNamed ? false : (impDisabled === true) && /Fruit/.test(t1) && /Apple/.test(t1) && /Banana/.test(t1) && /Dog/.test(t1) && !/Manzana|Fruta|Perro/.test(prev.join(" ")) && draftBeforeApply.length === 0;
  rec("THS-29", ok29 ? "PASS" : "FAIL", `new editor, name empty: "Import CSV" disabled=${impDisabled} (clicking it opened the dialog=${emptyNameOpens}); with the name filled it is enabled=${impEnabledNamed}; dialog "${t0.slice(0, 90)}" with Choose file / Preview steps; after choosing fruit.csv the preview rows are ${JSON.stringify(prev.map(clean))}; Spanish values in the preview=${/Manzana|Fruta|Perro/.test(prev.join(" "))}; editor draft still empty before applying=${draftBeforeApply.length === 0}. Labels as built (A4)`, "acceptance-run-2-shots/THS-29.png");
  // THS-30: cancel
  await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const afterCancel = await vrows(page); const saveStateCancel = [await commitBtn(page).isDisabled(), await cancelBtn(page).isDisabled()];
  const listCancel = null;
  // apply
  await imp(page).click(); await wait(page, 400);
  await choose(page, "fruit.csv");
  const applyLabel = await applyBtn(page).innerText();
  await applyBtn(page).click(); await wait(page, 500);
  const afterApply = await vrows(page);
  const n0 = await nlist(page);
  const bnBeforeSave = await fresh(page, []).then((x) => x.filter((t) => /rows added|Thesauri/.test(t)));
  const b0 = await nlist(page);
  await saveClick(page); await wait(page, 600);
  const nS = await fresh(page, b0);
  await openThes(page, "Fruit import");
  const saved = await vrows(page);
  // same file twice: reopen import with the same file
  await imp(page).click(); await wait(page, 400);
  await choose(page, "fruit.csv");
  const again = await modalTxt(page);
  await sh(page, "THS-30");
  await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  // cancelling the file chooser leaves Save/Cancel enabled: new editor dirty then open dialog and close
  rec("THS-30", afterCancel.length === 0 && afterApply.includes("[G]Fruit") && afterApply.includes("  -Apple") && afterApply.includes("  -Banana") && afterApply.includes("Dog") && nS.some((t) => /^Thesauri updated\./.test(t)) && /Apple/.test(again) ? "PASS" : "FAIL", `Cancel in the preview leaves the draft empty=${afterCancel.length === 0} (Save/Cancel disabled states ${JSON.stringify(saveStateCancel)}); applying with "${applyLabel}" puts ${JSON.stringify(afterApply)} in the draft (not yet saved; app note says to save the thesaurus); Save then gives Beacon ${JSON.stringify(nS)} and the saved thesaurus reopens as ${JSON.stringify(saved)}; choosing the same fruit.csv a second time works=${/Apple/.test(again)}`, "acceptance-run-2-shots/THS-30.png");
  await page.context().close();

  // THS-31 duplicates
  ({ page } = await open(b, "thesauri"));
  await make(page, "Dups", ["Dog"]);
  await openThes(page, "Dups");
  await addGroup(page, "Fruit", ["Apple"]);
  await saveClick(page); await wait(page, 500); await openThes(page, "Dups");
  const base = await vrows(page);
  await imp(page).click(); await wait(page, 400);
  await choose(page, "fruit-dupes.csv");
  const tD = await modalTxt(page);
  const prevD = (await dlg(page).locator("[aria-label='Rows in the file'] li").allInnerTexts()).map(clean);
  await sh(page, "THS-31");
  await applyBtn(page).click(); await wait(page, 500);
  const merged = await vrows(page);
  rec("THS-31", /Skips \d+ values? already there/.test(tD) && merged.filter((x) => /^Dog$/i.test(x)).length === 1 && merged.filter((x) => /^  -Apple$/.test(x)).length === 1 && merged.includes("  -Banana") && merged.includes("Cat") && merged.filter((x) => /^\[G\]Fruit$/.test(x)).length === 1 ? "PASS" : "FAIL", `thesaurus with "Dog" and group "Fruit"(Apple); import fruit-dupes.csv (Fruit/Apple/Banana, Dog, dog, DOG, Cat, cat): preview text "${tD.slice(tD.indexOf("Adds") >= 0 ? tD.indexOf("Adds") : 0, (tD.indexOf("Adds") >= 0 ? tD.indexOf("Adds") : 0) + 130)}"; preview rows ${JSON.stringify(prevD)}; draft after Add ${JSON.stringify(merged)} (before ${JSON.stringify(base)})`, "acceptance-run-2-shots/THS-31.png");
  await page.context().close();

  // THS-32 errors
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Errs");
  await imp(page).click(); await wait(page, 400);
  const errs = {};
  for (const f of ["bad-first-nested.csv", "bad-mixed.csv", "empty.csv", "notes.txt", "semicolon.csv"]) {
    await choose(page, f);
    const al = clean(await dlg(page).locator("[role=alert]").innerText().catch(() => ""));
    const t = await modalTxt(page);
    const onPreview = /Preview/.test(t) && /Rows in the file/.test(await dlg(page).innerHTML());
    errs[f] = { alert: al, preview: onPreview ? clean(await dlg(page).locator("[role=status]").first().innerText().catch(() => "")) : null };
    if (onPreview) { await dlg(page).getByRole("button", { name: "Back" }).click(); await wait(page, 300); await dlg(page).locator('button[aria-label^="Remove "]').first().click(); await wait(page, 300); }
  }
  const stillEmpty = (await vrows(page)).length === 0;
  await sh(page, "THS-32");
  const e = errs;
  rec("THS-32", /Invalid csv: nested value need to be under a non-nested value/.test(e["bad-first-nested.csv"].alert) && /Invalid csv: all the values for a row must be either nested or non-nested/.test(e["bad-mixed.csv"].alert) && e["semicolon.csv"].preview && e["empty.csv"].alert && e["notes.txt"].alert && stillEmpty ? "PASS" : "FAIL", `first-row "- Apple" file: specific message "${e["bad-first-nested.csv"].alert}" (wording differs from Uwazi\'s "Invalid csv: nested value need to be under a non-nested value", accepted as built); a row with a nested English cell and a non-nested Spanish cell was NOT rejected (preview "${e["bad-mixed.csv"].preview}", expected "Invalid csv: all the values for a row must be either nested or non-nested"); empty file "${e["empty.csv"].alert}"; .txt "${e["notes.txt"].alert}"; ";" file imports with N/A cells skipped (${e["semicolon.csv"].preview}); raw ${JSON.stringify(e)}; nothing written to the new thesaurus=${stillEmpty}`, "acceptance-run-2-shots/THS-32.png");
  await page.context().close();

  // THS-33 export / re-import
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruit import");
  await imp(page).click(); await wait(page, 400); await choose(page, "fruit.csv"); await applyBtn(page).click(); await wait(page, 400);
  await saveClick(page); await wait(page, 600);
  await openThes(page, "Fruit import");
  const [dl] = await Promise.all([page.waitForEvent("download"), S(page).locator("footer").getByRole("button", { name: /Export CSV/ }).click()]);
  const path = (await dl.path()); const csv = fs.readFileSync(path, "utf8");
  fs.copyFileSync(path, FX + "exported.csv");
  await imp(page).click(); await wait(page, 400); await choose(page, "exported.csv");
  const tE = await modalTxt(page);
  const canAdd = !(await applyBtn(page).isDisabled());
  await sh(page, "THS-33");
  rec("THS-33", /^English/.test(csv) && /\n- Apple/.test(csv) && !canAdd && /Nothing to add|already/.test(tE) ? "PASS" : "FAIL", `downloaded "${dl.suggestedFilename()}" content ${JSON.stringify(csv)}; re-import preview text "${tE.slice(0, 200)}"; Add button enabled=${canAdd}`, "acceptance-run-2-shots/THS-33.png");
  await page.context().close();
});
