import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab, logEntries } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog]");
const bu = (p) => p.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });

// PAG-27, PAG-28
await run("pag-g1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-27", p, async () => {
    const res = {};
    await editPage(p, "Methodology"); await inTab(p, "HTML");
    const orig = await area(p, "HTML").inputValue();
    const dirty = async () => { await area(p, "HTML").fill(orig + "<!--typed-->"); await wait(p, 150); };
    await dirty();
    res.buBefore = await bu(p);
    const triggers = { back: () => S(p).getByRole("button", { name: "Back" }).click(), breadcrumb: () => S(p).getByRole("button", { name: "Pages", exact: true }).click(), cancel: () => footerBtn(p, "Cancel").click(), rail: () => rail(p, "Dashboard") };
    for (const [k, fn] of Object.entries(triggers)) {
      await fn(); await wait(p, 400);
      const g = guardDlg(p); const n = await g.count();
      const txt = n ? clean(await g.innerText()) : "";
      const btns = n ? (await g.getByRole("button").allInnerTexts()).map(clean) : [];
      if (k === "back") await sh(p, "PAG-27-guard");
      if (n) await g.getByRole("button", { name: "Cancel", exact: true }).click(); await wait(p, 300);
      const kept = await area(p, "HTML").inputValue().catch(() => "GONE");
      res[k] = { dialog: !!n, text: txt, btns, cancelKept: kept === orig + "<!--typed-->" };
    }
    // switching language or tab does not open dialog, keeps text
    await lang(p, "Español"); await inTab(p, "CSS"); await lang(p, "English"); await inTab(p, "HTML");
    res.switchDialog = await guardDlg(p).count(); res.switchKept = (await area(p, "HTML").inputValue()) === orig + "<!--typed-->";
    // Discard changes via back; reopen shows saved
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 500);
    const listShown = (await listRows(p)).length;
    await editPage(p, "Methodology"); await inTab(p, "HTML"); res.reopened = (await area(p, "HTML").inputValue()) === orig;
    // other triggers with Discard too
    await dirty(); await rail(p, "Dashboard"); await wait(p, 400); await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 500);
    res.railDiscard = /Dashboard/.test(await S(p).locator("h2").first().innerText());
    await rail(p, "Pages"); await wait(p, 400); await editPage(p, "Methodology"); await inTab(p, "HTML");
    // after Save: no dialog
    await dirty(); await footerBtn(p, "Save").click(); await wait(p, 500);
    res.buAfterSave = await bu(p);
    await rail(p, "Dashboard"); await wait(p, 400); res.afterSaveDialog = await guardDlg(p).count();
    const all = ["back", "breadcrumb", "cancel", "rail"].every((k) => res[k].dialog && res[k].text.includes("Discard changes?") || res[k].text.includes("Discard changes"));
    const body = ["back", "breadcrumb", "cancel", "rail"].every((k) => /You have unsaved changes\. Do you want to continue\?/.test(res[k].text) && res[k].btns.join("|").includes("Cancel") && res[k].btns.join("|").includes("Discard changes"));
    const ok = res.buBefore === true && all && body && ["back", "breadcrumb", "cancel", "rail"].every((k) => res[k].cancelKept) && res.switchDialog === 0 && res.switchKept && res.reopened && res.railDiscard && res.buAfterSave === false && res.afterSaveDialog === 0;
    return [ok, `beforeunload prevented while dirty=${res.buBefore}; per trigger ${JSON.stringify(["back", "breadcrumb", "cancel", "rail"].map((k) => ({ k, dialog: res[k].dialog, title: res[k].text.split("?")[0] + "?", body: /You have unsaved changes\. Do you want to continue\?/.test(res[k].text), btns: res[k].btns, cancelKept: res[k].cancelKept })))}; language/tab switch dialog=${res.switchDialog}, text kept=${res.switchKept}; Discard via Back left (list rows ${listShown}), reopened shows saved text=${res.reopened}; Discard via rail left=${res.railDiscard}; after Save: beforeunload prevented=${res.buAfterSave}, rail click dialog=${res.afterSaveDialog}; (phone back chevron: see PAG-30 row)`, "PAG-27-guard"];
  });
  await check("PAG-28", p, async () => {
    await rail(p, "Pages"); await wait(p, 500);
    await editPage(p, "Partners"); await inTab(p, "HTML");
    const orig = await area(p, "HTML").inputValue();
    await area(p, "HTML").fill("<p>DISCARD-ME</p>");
    await footerBtn(p, "Cancel").click(); await wait(p, 400);
    const asked = await guardDlg(p).count();
    await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 500);
    const onList = (await listRows(p)).length;
    await editPage(p, "Partners"); await inTab(p, "HTML"); const back = await area(p, "HTML").inputValue();
    // clean editor
    await footerBtn(p, "Cancel").click(); await wait(p, 400);
    const cleanAsk = await guardDlg(p).count(); const onList2 = (await listRows(p)).length;
    const discardBtn = await footerBtn(p, "Discard").count();
    const ok = asked === 1 && onList === 4 && back === orig && cleanAsk === 0 && onList2 === 4;
    return [ok, `dirty editor footer button is "Cancel" (a "Discard" button present=${discardBtn}): confirmation shown=${asked}; confirming returned to list (${onList} rows) and reopening shows the saved HTML (${back === orig}); clean editor Cancel: dialog=${cleanAsk}, back on list (${onList2} rows)`, "PAG-28"];
  });
});

// PAG-13: languages
const typed = async (p) => { const d = dlgLoc(p); await d.locator("input").first().fill("CONFIRM"); await d.locator("[data-part=confirm]").click(); await wait(p, 500); };
const menuPick = async (p, name, item) => { await p.getByRole("button", { name: `Actions for ${name}` }).click(); await wait(p, 200); await p.getByRole("menuitem", { name: item, exact: true }).click(); await wait(p, 400); };
const install = async (p, name) => {
  await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await wait(p, 300);
  const d = dlgLoc(p); await d.locator("[data-part=language]").filter({ hasText: name }).first().click();
  await d.getByRole("button", { name: /^Install \(\d+\)/ }).click(); await wait(p, 4200);
};
await run("pag-g2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-13", p, async () => {
    const out = [];
    // EN content with JS and CSS
    await editPage(p, "Partners"); await inTab(p, "Javascript"); await area(p, "Javascript").fill("window.p=1;"); await inTab(p, "CSS"); await area(p, "CSS").fill("h1{color:blue}");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await rail(p, "Languages"); await wait(p, 600);
    await install(p, "German");
    const langRows = await listRows(p);
    await rail(p, "Pages"); await wait(p, 500); await editPage(p, "Partners");
    await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150);
    const opts = (await p.getByRole("option").allInnerTexts()).map(clean);
    await p.getByRole("option", { name: /German|Deutsch/ }).click(); await wait(p, 300);
    const deTitle = await S(p).getByLabel("Title", { exact: true }).inputValue();
    await inTab(p, "HTML"); const deHtml = await S(p).locator("textarea").first().inputValue();
    await inTab(p, "Javascript"); const deJs = await S(p).locator("textarea").first().inputValue();
    await inTab(p, "CSS"); const deCss = await S(p).locator("textarea").first().inputValue();
    await sh(p, "PAG-13-de");
    const copied = deTitle === "Partners" && /Partners/.test(deHtml) && deJs === "window.p=1;" && deCss === "h1{color:blue}";
    out.push(`after installing German the selector offers ${JSON.stringify(opts)}; German Title "${deTitle}", HTML "${deHtml.slice(0, 30)}", JS "${deJs}", CSS "${deCss}" (copied from English=${copied})`);
    // edit DE and save
    await inTab(p, "HTML"); await S(p).locator("textarea").first().fill("<p>DE-EDIT</p>"); await footerBtn(p, "Save").click(); await wait(p, 500);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await rail(p, "Languages"); await wait(p, 500);
    await menuPick(p, "German", "Uninstall"); await typed(p); await wait(p, 3500);
    await rail(p, "Pages"); await wait(p, 500); await editPage(p, "Partners");
    await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150);
    const opts2 = (await p.getByRole("option").allInnerTexts()).map(clean); await p.keyboard.press("Escape");
    // others unchanged: ES, FR title
    await lang(p, "Español"); const esT = await S(p).getByLabel("Title", { exact: true }).inputValue();
    await lang(p, "English"); await inTab(p, "HTML"); const enH = await S(p).locator("textarea").first().inputValue();
    out.push(`after uninstalling German the selector offers ${JSON.stringify(opts2)}; ES title "${esT}", EN HTML "${enH}"`);
    // reinstall German: content must be the default copy again
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await rail(p, "Languages"); await wait(p, 500); await install(p, "German");
    await rail(p, "Pages"); await wait(p, 500); await editPage(p, "Partners");
    await lang(p, /German|Deutsch/.source ? "Deutsch" : "German").catch(async () => lang(p, "German"));
    await inTab(p, "HTML"); const re = await S(p).locator("textarea").first().inputValue();
    out.push(`after reinstalling German its HTML is "${re.slice(0, 40)}" (the old "DE-EDIT" gone=${!/DE-EDIT/.test(re)})`);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    // uninstall all but default
    await rail(p, "Languages"); await wait(p, 500);
    for (const n of ["German", "Spanish", "French", "Portuguese", "Arabic"]) { await menuPick(p, n, "Uninstall"); await typed(p); await wait(p, 3000); }
    const left = await listRows(p);
    await rail(p, "Pages"); await wait(p, 500); await editPage(p, "Partners");
    const selCount = await S(p).getByRole("button", { name: /^Page language/ }).count();
    await inTab(p, "HTML"); const enH2 = await S(p).locator("textarea").first().inputValue();
    await inTab(p, "Javascript"); const enJ = await S(p).locator("textarea").first().inputValue();
    await sh(p, "PAG-13-one");
    out.push(`languages left ${JSON.stringify(left.map((r) => r.slice(0, 30)))}; "Page language" selector count ${selCount}; EN HTML "${enH2.slice(0, 40)}", JS "${enJ}"`);
    const ok = copied && opts.some((o) => /German|Deutsch/.test(o)) && !opts2.some((o) => /German|Deutsch/.test(o)) && opts2.length === 5 && esT === "Socios" && !/DE-EDIT/.test(re) && selCount === 0 && enJ === "window.p=1;" && /Partners/.test(enH2);
    return [ok, out.join(" || "), "PAG-13-one"];
  });
});
