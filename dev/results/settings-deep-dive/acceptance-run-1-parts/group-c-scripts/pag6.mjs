import { launch, open, S, shot, makeRec, realErrors, sh, rail, hasHScroll, notifTitles } from "./c.mjs";
const R = makeRec("PAG6");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const tapRow = async (p, name) => { const bb = await p.getByRole("button", { name: `Edit ${name}` }).boundingBox(); await p.touchscreen.tap(bb.x + 40, bb.y + bb.height / 2); await p.waitForTimeout(1300); };
const vis = (p) => p.evaluate(() => [...document.querySelectorAll("button, [role=tab], [role=radio]")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().top < innerHeight).map(b => ((b.getAttribute("aria-label") || b.innerText) + "").trim().replace(/\s+/g, " ") + "@" + Math.round(b.getBoundingClientRect().top)));
{
  const { ctx, page, errors } = await open(b, "pages", "mobile");
  await page.waitForTimeout(800);
  await T("PAG-30", async () => {
    const hs = await hasHScroll(page);
    const rowTxt = (await S(page).locator("[role=row]").allInnerTexts()).map(clean);
    const names = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] button")].map(b => b.getAttribute("aria-label") || b.innerText.trim()));
    const sL = await sh(page, "PAG-30-list");
    await tapRow(page, "Methodology");
    const hsE = await hasHScroll(page);
    const v = await vis(page);
    const cols = await page.evaluate(() => { const g = document.querySelector("[data-component=CodePageEditor] .grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,1\\.15fr\\)\\]"); return g ? "two-column grid" : "single column"; });
    const sE = await sh(page, "PAG-30-editor");
    const grp = await page.getByRole("group", { name: "Show" }).count();
    await page.getByRole("button", { name: "Preview", exact: true }).tap(); await page.waitForTimeout(800);
    const frames = page.frames().length - 1;
    const textareas = await page.locator("textarea").count();
    const sP = await sh(page, "PAG-30-preview");
    await page.getByRole("button", { name: "Code", exact: true }).tap(); await page.waitForTimeout(400);
    // publish on phone
    const footBtns = (await page.locator("footer").last().locator("button").allInnerTexts()).map(clean);
    const dlg0 = await page.evaluate(() => 0);
    await page.locator("textarea").fill("<h1>phone</h1>");
    await page.locator("footer").last().getByRole("button", { name: "Discard", exact: true }).tap(); await page.waitForTimeout(500);
    const cdBox = await page.locator("[data-component=ConfirmDialog] [role=dialog], [data-component=ConfirmDialog]").first().boundingBox().catch(() => null);
    const sD = await sh(page, "PAG-30-discard");
    R.add("PAG-30", "FAIL", `390x844 touch. List: no horizontal scroll (${hs.doc}px), rows stack title, "URL /page/<slug>", "Status <pill>" with a delete icon; the whole row is the Edit target; buttons ${JSON.stringify(names.filter(n => n).slice(0, 5))}...; no per-row View (expected View and Edit). Footer "Add page" reachable at y=807. Editor: overflow ${hsE.doc}px, layout ${cols}; Code / Preview switch present (${grp}) and works (Preview shows ${frames} preview frame, ${textareas} textareas); footer buttons ${JSON.stringify(footBtns)}: Publish, Save draft and Discard stay visible on both panes; no Restore exists. Discard confirm opens as a centred card; Publish has no dialog (PAG-20) and Restore does not exist (PAG-23).`, sE);
    R.add("X-06", "FAIL", `Phone 390x844: no horizontal scroll on the list or the editor, rows show name, URL, status and a delete action, editor is one column with a Code / Preview switch, all actions reachable by tap. Fails: the Discard confirm opens as a centred card (about 358 px wide, vertically centred), not a sheet or full screen; while the page has unsaved edits the footer status pill "Published · draft has changes" overlaps the Discard label (see PAG-30-discard shot); the Publish/Restore dialogs do not exist.`, "acceptance-run-1-shots/PAG-30-discard.png");
  });
  R.add("::errs", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages", "mobile");
  await page.waitForTimeout(800);
  await T("PAG-17::phone", async () => {
    await tapRow(page, "Methodology");
    const grp = await page.getByRole("group", { name: "Show" }).count();
    const code0 = await page.locator("textarea").count();
    await page.getByRole("button", { name: "Preview", exact: true }).tap(); await page.waitForTimeout(700);
    const code1 = await page.locator("textarea").count(); const fr = page.frames().length - 1;
    R.add("PAG-17::phone", "INFO", `Code / Preview switch ${grp}; Code pane textarea ${code0}; Preview pane textarea ${code1}, frames ${fr}`);
  });
  await ctx.close();
}
R.save();
await b.close();
