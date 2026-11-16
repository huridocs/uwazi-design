import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab, logEntries } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const title = (p) => S(p).getByLabel("Title", { exact: true }).inputValue();
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const confirmGuard = (p, name) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").getByRole("button", { name });
const frame = async (p, scope) => { const h = await (scope || p).locator("iframe[title='Public page preview']").first().elementHandle(); return h.contentFrame(); };
const show = async (p, v) => { await S(p).getByRole("radio", { name: v }).or(S(p).getByRole("button", { name: v, exact: true })).first().click(); await wait(p, 700); };
const pubBtn = (p) => S(p).getByRole("button", { name: "Publish", exact: true });
const resBtn = (p) => S(p).getByRole("button", { name: "Restore", exact: true });
const relList = async (p) => { await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 300); const d = dlgLoc(p); const t = (await d.locator("label").allInnerTexts()).map(clean); return t; };
const publish = async (p, msg) => { await inTab(p, "Configuration"); await pubBtn(p).click(); await wait(p, 300); await dlgLoc(p).getByLabel("Release message").fill(msg); await dlgLoc(p).getByRole("button", { name: "Publish", exact: true }).click(); await wait(p, 600); };
const today = new Date().toLocaleDateString();

// PAG-20, 21, 22, 23, 24 on Partners
await run("pag-e1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await editPage(p, "Partners");
  await check("PAG-20", p, async () => {
    await pubBtn(p).click(); await wait(p, 400);
    const d = dlgLoc(p);
    const name = await d.getAttribute("aria-label") || clean(await d.locator("h2").first().innerText());
    const ta = d.getByLabel("Release message");
    const labelOk = await ta.count();
    const btn = d.getByRole("button", { name: "Publish", exact: true });
    const dis0 = await btn.isDisabled();
    await ta.fill("   "); const dis1 = await btn.isDisabled();
    await ta.fill("x"); const dis2 = await btn.isDisabled();
    await sh(p, "PAG-20-modal");
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
    const open0 = (await dialogs(p)).length;
    const foc = await p.evaluate(() => document.activeElement.innerText);
    await pubBtn(p).click(); await wait(p, 300);
    const again = await dlgLoc(p).getByLabel("Release message").inputValue();
    await p.keyboard.press("Escape"); await wait(p, 300);
    // new unsaved page
    await footerBtn(p, "Cancel").click(); await wait(p, 300); if (await p.locator("[data-component=ConfirmDialog]").count()) await confirmGuard(p, "Discard changes").click(); await wait(p, 400);
    await footerBtn(p, "Add page").click(); await wait(p, 400); await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 800);
    const newDis = await pubBtn(p).isDisabled();
    await footerBtn(p, "Cancel").click(); await wait(p, 300); if (await p.locator("[data-component=ConfirmDialog]").count()) await confirmGuard(p, "Discard changes").click(); await wait(p, 400);
    const ok = name === "Publish release" && labelOk === 1 && dis0 && dis1 && !dis2 && open0 === 0 && foc === "Publish" && again === "" && newDis;
    return [ok, `dialog name "${name}"; textarea labelled "Release message" x${labelOk}; Publish disabled empty=${dis0}, spaces=${dis1}, with text=${dis2}; Cancel closed it (dialogs left ${open0}); focus returned to "${foc}"; reopened message "${again}"; on a new unsaved page Publish disabled=${newDis}`, "PAG-20"];
  });
  await editPage(p, "Partners");
  await check("PAG-21", p, async () => {
    await lang(p, "Español"); await inTab(p, "HTML"); await area(p, "HTML", "Español").fill("<p>Socios ES-UNSAVED</p>");
    await lang(p, "English"); await inTab(p, "HTML"); await area(p, "HTML", "English").fill("<p>Partners EN-UNSAVED</p>");
    const before = await nlist(p);
    await publish(p, "First release");
    const n = await newNotifs(p, before);
    const dlgs = (await dialogs(p)).length;
    const foot = clean(await S(p).locator("footer").innerText());
    await show(p, "Published"); const pubTxt = clean(await (await frame(p)).locator("body").innerText());
    await sh(p, "PAG-21-published");
    const rl = await relList(p);
    await p.keyboard.press("Escape"); await wait(p, 300);
    await pubBtn(p).click(); await wait(p, 300); const msgAfter = await dlgLoc(p).getByLabel("Release message").inputValue(); await p.keyboard.press("Escape"); await wait(p, 300);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const list = (await listRows(p)).find((r) => /^Partners/.test(r));
    // saved first: ES unsaved edit persisted
    await editPage(p, "Partners"); await lang(p, "Español"); await inTab(p, "HTML"); const es = await area(p, "HTML", "Español").inputValue();
    const ok = n.some((t) => /Page published successfully\./.test(t)) && dlgs === 0 && /Published/.test(foot) && !/edited/.test(foot) && /Partners EN-UNSAVED/.test(pubTxt) && rl.length === 1 && rl[0].startsWith("First release") && rl[0].includes(today) && msgAfter === "" && /Published$/.test(list) && es.includes("ES-UNSAVED");
    return [ok, `notifications ${JSON.stringify(n)}; modal closed (dialogs ${dlgs}); editor footer "${foot}"; Published preview "${pubTxt.slice(-50)}"; Restore list ${JSON.stringify(rl)} (today = ${today}); reopened Publish message "${msgAfter}"; list row "${list}"; unsaved ES edit saved by Publish: ES HTML "${es}"`, "PAG-21-published"];
  });
  await check("PAG-22", p, async () => {
    await inTab(p, "HTML"); await lang(p, "English"); await area(p, "HTML", "English").fill("<p>Partners EDITED-AFTER-PUBLISH</p>");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const edFoot = clean(await S(p).locator("footer").innerText());
    const edPill = clean(await S(p).locator("footer [data-part=status]").innerText());
    const f = await frame(p);
    const dr = clean(await f.locator("body").innerText());
    await show(p, "Published"); const pb = clean(await (await frame(p)).locator("body").innerText());
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const row = (await listRows(p)).find((r) => /^Partners/.test(r));
    const listPill = clean(await rowOf(p, "Partners").locator("[data-part=status]").innerText());
    await S(p).getByRole("button", { name: "View Partners" }).click(); await wait(p, 1200);
    const vw = clean(await (await frame(p, dlgLoc(p))).locator("body").innerText());
    await p.keyboard.press("Escape"); await wait(p, 300);
    // never-published: new page
    await footerBtn(p, "Add page").click(); await wait(p, 400); await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 800);
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const nf = clean(await S(p).locator("footer").innerText());
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const nrow = (await listRows(p)).find((r) => /^New page/.test(r));
    await S(p).getByRole("button", { name: "View New page" }).click(); await wait(p, 1200);
    const nv = clean(await (await frame(p, dlgLoc(p))).locator("body").innerText());
    const ok = edPill === "Published · edited" && listPill === "Published · edited" && /Published · draft has changes/.test(row + edFoot) === false && /EDITED-AFTER-PUBLISH/.test(dr) && /EN-UNSAVED/.test(pb) && !/EDITED-AFTER/.test(pb) && /EN-UNSAVED/.test(vw) && !/EDITED-AFTER/.test(vw) && /Draft/.test(nrow) && /not published yet/i.test(nv);
    return [ok, `after Save: editor pill "${edPill}", list pill "${listPill}"; Draft preview "${dr.slice(-50)}"; Published preview "${pb.slice(-45)}"; list View "${vw.slice(-45)}"; never-published new page: editor footer "${nf}", list row "${nrow}", View shows "${nv.slice(-80)}"`, "PAG-22"];
  });
});

// PAG-23, PAG-24
await run("pag-e2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await editPage(p, "Partners");
  await check("PAG-23", p, async () => {
    await publish(p, "v1");
    await inTab(p, "HTML"); await area(p, "HTML").fill("<p>second</p>"); await footerBtn(p, "Save").click(); await wait(p, 400);
    await publish(p, "v2 " + "x".repeat(60));
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 400);
    const d = dlgLoc(p);
    const name = clean(await d.locator("h2").first().innerText().catch(() => ""));
    const labels = (await d.locator("label").allInnerTexts()).map(clean);
    const restoreBtn = d.getByRole("button", { name: "Restore", exact: true });
    const dis0 = await restoreBtn.isDisabled();
    await d.locator("label").nth(0).click(); const dis1 = await restoreBtn.isDisabled();
    await d.locator("label").nth(1).click(); const checked = await d.locator("input[type=radio]").evaluateAll((r) => r.map((x) => x.checked));
    const dis2 = await restoreBtn.isDisabled();
    await sh(p, "PAG-23-modal");
    // Escape closes only this modal
    await p.keyboard.press("Escape"); await wait(p, 400);
    const left = (await dialogs(p));
    const editorStill = await S(p).getByRole("tab", { name: "HTML", exact: true }).count();
    // empty releases: new saved page
    await footerBtn(p, "Cancel").click(); await wait(p, 300); if (await p.locator("[data-component=ConfirmDialog]").count()) await confirmGuard(p, "Discard changes").click(); await wait(p, 400);
    await footerBtn(p, "Add page").click(); await wait(p, 400); await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 800);
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 400);
    const none = clean(await dlgLoc(p).innerText());
    await p.keyboard.press("Escape"); await wait(p, 300);
    const msg48 = labels[0] || "";
    const ok = name === "Restore previous version" && labels.length === 3 && labels[0].startsWith("v2 " + "x".repeat(45) + "…") && !labels[0].includes("x".repeat(46)) && labels[2].startsWith("Initial") === false || true;
    const strict = name === "Restore previous version" && labels.length === 2 && /^v2 x{45}… /.test(labels[0]) && /^v1 /.test(labels[1]) && dis0 && !dis1 && !dis2 && checked.filter(Boolean).length === 1 && checked[1] && left.filter((n) => n !== "Notifications").length === 0 && editorStill === 1 && /No releases yet/.test(none);
    return [strict, `modal "${name}"; rows ${JSON.stringify(labels)}; Restore disabled with none picked=${dis0}, with one=${dis1}, after picking a second=${dis2}, radios checked ${JSON.stringify(checked)}; Escape closed the modal, other open dialogs ${JSON.stringify(left)}, editor still shown=${editorStill === 1}; page with no releases: "${none}"`, "PAG-23-modal"];
  });
});

await run("pag-e3", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await editPage(p, "Partners");
  await check("PAG-24", p, async () => {
    const setBoth = async (en, es) => {
      await lang(p, "English"); await inTab(p, "HTML"); await area(p, "HTML", "English").fill(en);
      await lang(p, "Español"); await inTab(p, "HTML"); await area(p, "HTML", "Español").fill(es);
      await lang(p, "English");
    };
    await setBoth("A", "A-es"); await publish(p, "rel A");
    await setBoth("B", "B-es"); await footerBtn(p, "Save").click(); await wait(p, 500);
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 300);
    const d = dlgLoc(p);
    await d.locator("label").first().click();
    await d.getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 400);
    const cf = p.locator("[data-component=ConfirmDialog]");
    const cfTxt = clean(await cf.innerText());
    await sh(p, "PAG-24-confirm");
    await cf.getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
    await inTab(p, "HTML"); const en1 = await area(p, "HTML", "English").inputValue();
    await lang(p, "Español"); const es1 = await area(p, "HTML", "Español").inputValue(); await lang(p, "English");
    await inTab(p, "Configuration"); await resBtn(p).click(); await wait(p, 300);
    await dlgLoc(p).locator("label").first().click();
    await dlgLoc(p).getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 400);
    const before = await nlist(p);
    await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 600);
    const n = await newNotifs(p, before);
    await inTab(p, "HTML"); const en2 = await area(p, "HTML", "English").inputValue();
    await lang(p, "Español"); const es2 = await area(p, "HTML", "Español").inputValue();
    const ok = /every language/i.test(cfTxt) && en1 === "B" && es1 === "B-es" && en2 === "A" && es2 === "A-es" && n.some((t) => /Draft restored from release\./.test(t));
    return [ok, `confirm text "${cfTxt}"; after Cancel in confirm and closing: EN "${en1}", ES "${es1}"; after confirming: EN "${en2}", ES "${es2}" (no reload; ES was not the active language when restored); notifications ${JSON.stringify(n)}`, "PAG-24"];
  });
});
