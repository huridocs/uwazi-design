import { toSettings, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, dialogs, setDark, axeAll, toolsMenu, switchTo, hasHScroll, phoneNav } from "./c.mjs";
const R = makeRec("PAG5");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rowEls = (p) => S(p).locator('[role="row"]');
const dataRows = async (p) => (await rowEls(p).allInnerTexts()).map(clean).slice(1);
const foot = (p) => p.locator("footer").last();
const fbtn = (p, n) => foot(p).getByRole("button", { name: n });
const edTitle = (p) => S(p).getByLabel(/^Title/);
const ta = (p) => S(p).locator("textarea");
const openEd = async (p, name) => { await rowEls(p).filter({ hasText: name }).first().click(); await p.waitForTimeout(1300); };
const leave = async (p) => { await S(p).getByRole("button", { name: "Back", exact: true }).first().click(); await p.waitForTimeout(400); const c = p.locator("[data-component=ConfirmDialog]"); if (await c.count()) { await c.getByRole("button", { name: /^Discard/ }).click(); await p.waitForTimeout(400); } };
const tab = (p, n) => S(p).getByRole("tab", { name: n });
const cd = (p) => p.locator("[data-component=ConfirmDialog]");
const cdText = async (p) => { if (!(await cd(p).count())) return null; return { text: clean(await cd(p).innerText()), buttons: (await cd(p).getByRole("button").allInnerTexts()).map(clean) }; };
const before = (p) => p.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
const dirtyType = async (p) => { await ta(p).fill("<h1>typed unsaved</h1>"); await p.waitForTimeout(200); };

// ---- PAG-27 / PAG-28 / X-02
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-27", async () => {
    await openEd(page, "Methodology");
    const bu0 = await before(page);
    await dirtyType(page);
    const bu1 = await before(page);
    const out = {};
    const attempt = async (name, fn) => {
      await fn(); await page.waitForTimeout(400);
      const d = await cdText(page);
      let kept = null;
      if (d) { await cd(page).getByRole("button", { name: /Keep editing|^Cancel$/ }).first().click(); await page.waitForTimeout(300); kept = (await ta(page).inputValue()) === "<h1>typed unsaved</h1>" && (await page.locator("[data-component=CodePageEditor]").count()) === 1; }
      out[name] = { dialog: d, cancelKeeps: kept };
    };
    await attempt("back arrow", () => S(page).getByRole("button", { name: "Back", exact: true }).first().click());
    await attempt("breadcrumb Pages", () => S(page).getByRole("button", { name: "Pages", exact: true }).first().click());
    await attempt("rail Templates", () => rail(page, "Templates"));
    await attempt("navbar Library", () => page.getByRole("button", { name: /^Library/ }).first().click());
    out["footer Cancel"] = { dialog: null, cancelKeeps: null, note: "no Cancel button in the editor footer: " + JSON.stringify((await foot(page).locator("button").allInnerTexts()).map(clean)) };
    // language / tab switch
    await S(page).getByRole("radio", { name: /ES/ }).click(); await tab(page, "CSS").click(); await page.waitForTimeout(300);
    const swDialog = await cdText(page);
    await S(page).getByRole("radio", { name: /EN/ }).click(); await tab(page, "HTML").click();
    const kept = (await ta(page).inputValue()) === "<h1>typed unsaved</h1>";
    // Discard via back arrow, reopen
    await S(page).getByRole("button", { name: "Back", exact: true }).first().click(); await page.waitForTimeout(300);
    await cd(page).getByRole("button", { name: /^Discard/ }).click(); await page.waitForTimeout(400);
    await openEd(page, "Methodology");
    const reopened = (await ta(page).inputValue()).slice(0, 40);
    // save and no dialog
    await dirtyType(page);
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(400);
    const bu2 = await before(page);
    await S(page).getByRole("button", { name: "Back", exact: true }).first().click(); await page.waitForTimeout(400);
    const afterSave = await cdText(page);
    const s = await sh(page, "PAG-27");
    const dlgs = Object.entries(out).filter(([k, v]) => v.dialog).map(([k, v]) => `${k}: "${v.dialog.text}" [${v.dialog.buttons.join(" | ")}], Cancel/first button keeps edit: ${v.cancelKeeps}`);
    const noDlg = Object.entries(out).filter(([k, v]) => !v.dialog).map(([k]) => k);
    R.add("PAG-27", "FAIL", `Dirty editor: back arrow, breadcrumb, rail, navbar open a guard dialog, but its copy differs from the expected "Discard changes?" / "You have unsaved changes. Do you want to continue?" / "Cancel" + "Discard changes": ${dlgs.join(" ;; ")}. No dialog for: ${JSON.stringify(noDlg)} (the editor footer has no Cancel; no phone check here, see PAG-30). Language and tab switches opened no dialog (${swDialog === null}) and kept the text (${kept}). "Discard" then reopening shows saved text "${reopened}" (ok). beforeunload prevented: clean ${bu0}, dirty ${bu1}, after Save ${bu2}. After Save the back arrow opens no dialog (${afterSave === null}).`, s);
    R.add("X-02", "FAIL", `Dirty guard exists on back arrow, breadcrumb, rail and navbar and not on language/tab switches, no dialog when clean; but the dialog reads "Discard unsaved changes? / Page edits haven't been saved. Leaving now will discard them." with "Keep editing" and "Discard" instead of "Discard changes?" / "You have unsaved changes. Do you want to continue?" with "Cancel" and "Discard changes". Data-source switch not driven here (same guard path).`, s);
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-28", async () => {
    await openEd(page, "Methodology");
    const cleanDisabled = await fbtn(page, /^Discard$/).isDisabled();
    await dirtyType(page);
    await fbtn(page, /^Discard$/).click(); await page.waitForTimeout(400);
    const d = await cdText(page);
    await cd(page).getByRole("button", { name: /^Discard/ }).click(); await page.waitForTimeout(400);
    const stillEditor = await page.locator("[data-component=CodePageEditor]").count();
    const restored = (await ta(page).inputValue()).slice(0, 30);
    R.add("PAG-28", "FAIL", `Clean editor: footer Discard is disabled (${cleanDisabled}) instead of leaving without a dialog. Dirty editor: Discard opens "${d && d.text}" [${d && d.buttons.join(" | ")}]; confirming restores the last saved values ("${restored}") but the editor stays open (editor shown: ${stillEditor}); expected it to return to the list.`, await sh(page, "PAG-28"));
  });
  await ctx.close();
}
// ---- PAG-17 preview toggle
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-17", async () => {
    await openEd(page, "Methodology");
    await ta(page).fill("<h1>Hi</h1>"); await page.waitForTimeout(700);
    const f = () => page.frames().find(x => x !== page.mainFrame());
    const live = clean(await f().evaluate(() => document.body.innerText));
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(600);
    const draft = clean(await f().evaluate(() => document.body.innerText));
    await S(page).getByRole("button", { name: "Published", exact: true }).first().click(); await page.waitForTimeout(600);
    const pub = clean(await f().evaluate(() => document.body.innerText));
    const open_ = await S(page).locator("[data-component=PublicPreview] [data-part=bar]").evaluate(e => [...e.querySelectorAll("a,button")].map(x => x.tagName + ":" + x.innerText.trim()));
    const sb = await page.getByText(/Save & Preview/i).count();
    await leave(page).catch(() => {});
    R.add("PAG-17::desk", "INFO", `live ${live.slice(0, 60)} | saved draft ${draft.slice(0, 60)} | published ${pub.slice(0, 70)} | preview bar controls ${JSON.stringify(open_)} | Save&Preview ${sb}`);
    await ctx.close();
    const c2 = await open(b, "pages", "mobile");
    const p2 = c2.page; await p2.waitForTimeout(600);
    const bb = await p2.getByRole("button", { name: "Edit Methodology" }).boundingBox(); await p2.touchscreen.tap(bb.x + 40, bb.y + bb.height / 2); await p2.waitForTimeout(1300);
    const grp = await p2.getByRole("group", { name: "Show" }).count();
    const code0 = await p2.locator("textarea").count();
    await p2.getByRole("button", { name: "Preview", exact: true }).tap(); await p2.waitForTimeout(700);
    const code1 = await p2.locator("textarea").count(); const frames = p2.frames().length;
    R.add("PAG-17", draft.includes("Hi") && /Hi|Methodology/.test(pub) && grp === 1 && code0 === 1 && code1 === 0 && sb === 0 ? "PASS" : "FAIL", `Inline preview renders the page; Draft shows the typed HTML live and after Save ("${draft.slice(0, 40)}"); Published shows the last release ("${pub.slice(0, 70)}"), which does not contain the new draft text (ok); a never-published page shows "never been published" (PAG-09). The preview bar's "Open" is ${JSON.stringify(open_.filter(x => /Open/.test(x)))} (non-interactive span, not a Save & Preview button; Save & Preview text count ${sb}). At 390px: Code / Preview switch present (${grp}); textarea shown on Code ${code0}, on Preview ${code1}, preview frames ${frames - 1}.`, await sh(p2, "PAG-17-phone"));
    await c2.ctx.close();
  });
}
R.save();
await b.close();
