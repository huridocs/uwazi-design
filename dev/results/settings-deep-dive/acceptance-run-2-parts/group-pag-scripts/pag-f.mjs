import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab, logEntries, arm } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog]");
const pubBtn = (p) => S(p).getByRole("button", { name: "Publish", exact: true });
const resBtn = (p) => S(p).getByRole("button", { name: "Restore", exact: true });
const publish = async (p, msg) => { await inTab(p, "Configuration"); await pubBtn(p).click(); await wait(p, 300); await dlgLoc(p).getByLabel("Release message").fill(msg); await dlgLoc(p).getByRole("button", { name: "Publish", exact: true }).click(); await wait(p, 600); };

// PAG-25
await run("pag-f1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-25", p, async () => {
    const seq = [];
    let seen = await nlist(p);
    const step = async (label) => { const n = await newNotifs(p, seen); seen = await nlist(p); seq.push(label + " -> " + JSON.stringify(n.filter((t) => !/Uploading document|Processing PDFs/.test(t)))); return n; };
    await footerBtn(p, "Add page").click(); await wait(p, 400); await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 800);
    await S(p).getByLabel("Title", { exact: true }).fill("QA25");
    await footerBtn(p, "Save").click(); await wait(p, 500); await step("Save 1");
    await inTab(p, "HTML"); await area(p, "HTML").fill("<p>25</p>");
    await footerBtn(p, "Save").click(); await wait(p, 500); await step("Save 2");
    await publish(p, "rel25"); await step("Publish");
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 300);
    await dlgLoc(p).locator("label").first().click(); await dlgLoc(p).getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 300);
    await guardDlg(p).getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 600); await step("Restore");
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    await S(p).getByRole("checkbox", { name: "Select QA25" }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600); await step("Delete");
    const log = (await logEntries(p)).filter((e) => /QA25/.test(e));
    await rail(p, "Activity log"); await wait(p, 800);
    const ui = clean(await S(p).innerText()).split(/(?=Create|Update|Delete)/).filter((r) => /QA25/.test(r)).slice(0, 8);
    const expected = ["Created page", "Updated page", "Published page release", "Restored page draft from release", "Deleted page"];
    const order = ["Saved successfully.", "Saved successfully.", "Page published successfully.", "Draft restored from release.", "Deleted successfully."];
    const got = seq.map((s) => (s.match(/"([^"]*)"/g) || []).map((x) => x.slice(1, -1)));
    const okN = order.every((m, i) => (got[i] || []).some((t) => t.startsWith(m)) && (got[i] || []).length === 1);
    const okL = expected.every((m) => log.some((e) => e.includes(m + " ") || e.startsWith(m)) ) && log.length === 5 && log.every((e) => /\[admin\]$/.test(e) && /QA25/.test(e));
    await sh(p, "PAG-25-log");
    return [okN && okL, `notification sequence: ${seq.join(" ; ")}; stored Activity log entries (newest first) ${JSON.stringify(log)}; Activity log page rows mentioning QA25: ${JSON.stringify(ui)}`, "PAG-25-log"];
  });
});

// PAG-26 failure paths via the Dev panel
await run("pag-f2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  const read = async (before) => { const n = await newNotifs(p, before); return n.filter((t) => !/Uploading document|Processing PDFs/.test(t)); };
  await check("PAG-26", p, async () => {
    const out = [];
    // Save
    const st1 = await arm(p, "Save", "Disk full (QA save)", "Pages"); await wait(p, 400);
    await editPage(p, "Partners"); await inTab(p, "HTML"); await area(p, "HTML").fill("<p>FAILED SAVE EDIT</p>");
    let before = await nlist(p); const logB = (await logEntries(p)).length;
    await footerBtn(p, "Save").click(); await wait(p, 600);
    const n1 = await read(before);
    const dirtyAfter = clean(await S(p).locator("footer").innerText()); const saveEn = await footerBtn(p, "Save").isEnabled();
    const kept = await area(p, "HTML").inputValue();
    const logA = (await logEntries(p)).length;
    await sh(p, "PAG-26-save");
    out.push(`Save armed (${st1}): notifications ${JSON.stringify(n1)}; editor footer "${dirtyAfter}", Save still enabled=${saveEn}, edit kept=${kept === "<p>FAILED SAVE EDIT</p>"}, activity entries ${logB}->${logA}`);
    const okS = n1.length === 1 && /An error occurred/.test(n1[0]) && /Disk full \(QA save\)/.test(n1[0]) && !/successfully/i.test(n1[0]) && saveEn && /Unsaved edits/.test(dirtyAfter) && logA === logB;
    // retry works (switch cleared)
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const retry = await read(await (async () => before)());
    const okRetry = retry.some((t) => /Saved successfully/.test(t));
    // Publish
    await footerBtn(p, "Cancel").click(); await wait(p, 300); if (await guardDlg(p).count()) await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 300);
    const st2 = await arm(p, "Save", "Gateway timeout (QA publish)", "Pages"); await wait(p, 400);
    await editPage(p, "Partners");
    before = await nlist(p);
    await publish(p, "should fail"); await wait(p, 400);
    const n2 = await read(before);
    const statusAfter = clean(await S(p).locator("footer").innerText());
    const dlgOpen = (await dialogs(p)).length;
    const msgKept = dlgOpen ? await dlgLoc(p).getByLabel("Release message").inputValue().catch(() => "") : "";
    await sh(p, "PAG-26-publish");
    if (dlgOpen) { await p.keyboard.press("Escape"); await wait(p, 300); }
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 300); const rels = (await dlgLoc(p).locator("label").allInnerTexts()).map(clean); await p.keyboard.press("Escape"); await wait(p, 300);
    out.push(`Publish armed (${st2}): notifications ${JSON.stringify(n2)}; Publish modal still open=${dlgOpen > 0} with message "${msgKept}"; footer "${statusAfter}"; releases ${JSON.stringify(rels)}`);
    const okP = n2.length === 1 && /An error occurred/.test(n2[0]) && /Gateway timeout \(QA publish\)/.test(n2[0]) && !/published successfully/i.test(n2[0]) && rels.length === 0;
    // Delete
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400); if (await guardDlg(p).count()) await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 400);
    const st3 = await arm(p, "Delete", "Locked by another user (QA delete)", "Pages"); await wait(p, 400);
    before = await nlist(p);
    await S(p).getByRole("checkbox", { name: "Select Contact" }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 700);
    const n3 = await read(before);
    const rowsAfter = await listRows(p);
    await sh(p, "PAG-26-delete");
    out.push(`Delete armed (${st3}): notifications ${JSON.stringify(n3)}; rows after ${rowsAfter.length}`);
    const okD = n3.length === 1 && /An error occurred/.test(n3[0]) && /Locked by another user \(QA delete\)/.test(n3[0]) && !/Deleted successfully/.test(n3[0]) && rowsAfter.some((r) => /^Contact/.test(r));
    return [okS && okP && okD && okRetry, out.join(" || ") + ` || retry after failure saved normally=${okRetry}; checks: save=${okS} publish=${okP} delete=${okD}`, "PAG-26-delete"];
  });
});
