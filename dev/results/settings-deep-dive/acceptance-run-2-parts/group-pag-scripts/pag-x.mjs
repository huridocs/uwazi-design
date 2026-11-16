import { arm, toSettings, dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab, logEntries, axeOn, dark, contrastOf, switchTo, crumb, hscroll } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog]");
const pubBtn = (p) => S(p).getByRole("button", { name: "Publish", exact: true });
const resBtn = (p) => S(p).getByRole("button", { name: "Restore", exact: true });

// X-01, X-03, X-02 (navbar and data source), X-05, X-09
await run("pag-x1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("X-01", p, async () => {
    await editPage(p, "Contact"); await S(p).getByLabel("Title", { exact: true }).fill("Contact us");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await rail(p, "Dashboard"); await wait(p, 400); await rail(p, "Pages"); await wait(p, 500);
    const a = (await listRows(p)).find((r) => /Contact/.test(r));
    await p.reload(); await wait(p, 1500);
    const bb = (await listRows(p)).find((r) => /Contact/.test(r));
    await rail(p, "Dashboard"); await wait(p, 400); await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    await rail(p, "Pages"); await wait(p, 500);
    const c = (await listRows(p)).find((r) => /Contact/.test(r));
    const ok = /^Contact us /.test(a) && /^Contact us /.test(bb) && /^Contact \/page\/p4\/contact/.test(c);
    return [ok, `Saved "Contact us" -> rail Dashboard -> Pages: "${a}"; after reload: "${bb}"; after Reset demo data: "${c}"`, "X-01"];
  });
  await check("X-03", p, async () => {
    await editPage(p, "Contact"); await S(p).getByLabel("Title", { exact: true }).fill("Contact two");
    const en0 = await footerBtn(p, "Save").isEnabled();
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const dis = await footerBtn(p, "Save").isDisabled();
    await rail(p, "Dashboard"); await wait(p, 400);
    const d1 = await guardDlg(p).count();
    await rail(p, "Pages"); await wait(p, 400); await editPage(p, "Contact two");
    await S(p).getByLabel("Title", { exact: true }).fill("Contact three");
    const en2 = await footerBtn(p, "Save").isEnabled();
    await footerBtn(p, "Cancel").click(); await wait(p, 300); await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 400);
    const ok = en0 && dis && d1 === 0 && en2;
    return [ok, `edit -> Save enabled=${en0}; after Save disabled=${dis}; rail click showed dialog=${d1}; editing again re-enables Save=${en2}`, "X-03"];
  });
  await check("X-02", p, async () => {
    const out = {};
    await editPage(p, "Contact"); await S(p).getByLabel("Title", { exact: true }).fill("dirty edit");
    // data source switch
    await crumb(p).click(); await wait(p, 250); await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: "CEJIL" }).click(); await wait(p, 600);
    out.source = (await guardDlg(p).count()) ? clean(await guardDlg(p).innerText()) : "no dialog";
    if (await guardDlg(p).count()) await guardDlg(p).getByRole("button", { name: "Cancel", exact: true }).click(); await wait(p, 300);
    out.srcKept = await S(p).getByLabel("Title", { exact: true }).inputValue();
    // navbar link
    await p.locator("header, nav").first().getByRole("button", { name: "Library" }).first().click().catch(async () => p.getByRole("link", { name: "Library" }).first().click()); await wait(p, 500);
    out.navbar = (await guardDlg(p).count()) ? clean(await guardDlg(p).innerText()) : "no dialog";
    if (await guardDlg(p).count()) await guardDlg(p).getByRole("button", { name: "Cancel", exact: true }).click(); await wait(p, 300);
    await sh(p, "X-02-navbar");
    // clean: no dialog
    await footerBtn(p, "Cancel").click(); await wait(p, 300); await guardDlg(p).getByRole("button", { name: "Discard changes" }).click(); await wait(p, 400);
    await editPage(p, "Contact"); await rail(p, "Dashboard"); await wait(p, 400); out.clean = await guardDlg(p).count();
    const g = (t) => /Discard changes\?/.test(t) && /You have unsaved changes\. Do you want to continue\?/.test(t);
    const ok = g(out.source) && out.srcKept === "dirty edit" && g(out.navbar) && out.clean === 0;
    return [ok, `data-source switch while dirty: "${out.source}" (Cancel kept the edit: ${out.srcKept === "dirty edit"}); navbar Library link while dirty: "${out.navbar}"; clean editor rail click dialogs ${out.clean}; Back/breadcrumb/Cancel/rail covered in PAG-27`, "X-02-navbar"];
  });
});

// X-05, X-09 and X-12
await run("pag-x2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("X-05", p, async () => {
    await S(p).getByRole("checkbox", { name: "Select Partners" }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    const unused = clean(await p.locator("[data-component=ConfirmDelete]").innerText());
    await p.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
    await S(p).getByRole("checkbox", { name: "Select Partners" }).click();
    await S(p).getByRole("checkbox", { name: "Select Methodology" }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    const used = clean(await p.locator("[data-component=ConfirmDelete]").innerText());
    await p.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
    const ok = /nothing else changes/i.test(unused) && /menu link/i.test(used) && /\/page\/methodology/.test(used) && /what|will lead to a missing page/i.test(used);
    return [ok, `unused page (Partners): "${unused}"; used page (Methodology): "${used}"`, "X-05"];
  });
  await check("X-09", p, async () => {
    await p.reload(); await wait(p, 1500);
    await S(p).getByRole("checkbox", { name: "Select Partners" }).click(); await S(p).getByRole("checkbox", { name: "Select Contact" }).click();
    await footerBtn(p, "Delete").click(); await wait(p, 300); await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    await editPage(p, "Methodology"); await S(p).getByLabel("Title", { exact: true }).fill("Methodology X9"); await footerBtn(p, "Save").click(); await wait(p, 500);
    const log = await logEntries(p);
    const mine = log.filter((e) => /Partners|Contact|X9/.test(e));
    const ok = mine.length === 3 && mine.every((e) => /\[admin\]$/.test(e)) && mine.some((e) => /^DELETE Deleted page “Partners”/.test(e)) && mine.some((e) => /^DELETE Deleted page “Contact”/.test(e)) && mine.some((e) => /^UPDATE Updated page “Methodology X9”/.test(e));
    return [ok, `bulk delete of two pages and one Save logged as ${JSON.stringify(mine)}`, "X-09"];
  });
  await check("X-12", p, async () => {
    await p.reload(); await wait(p, 1500);
    const footerH0 = (await S(p).locator("footer").boundingBox()).height;
    await S(p).getByRole("checkbox", { name: "Select About this collection" }).click(); await wait(p, 200);
    const bar = S(p).locator("[data-component=SettingsSelectionBar]");
    const txt = clean(await bar.innerText());
    const footerH1 = (await S(p).locator("footer").boundingBox()).height;
    const w = (await bar.locator("[role=status]").boundingBox()).width;
    const s = await bar.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, border: c.borderTopWidth, ring: c.boxShadow }; });
    const f = await S(p).locator("footer").evaluate((e) => getComputedStyle(e).backgroundColor);
    const f0 = await (async () => { await bar.getByRole("button", { name: "Clear" }).click(); await wait(p, 200); return S(p).locator("footer").evaluate((e) => getComputedStyle(e).backgroundColor); })();
    const backLead = clean(await S(p).locator("footer").innerText());
    const ok = /Selected 1 of 2/.test(txt) && footerH0 === footerH1 && f === f0 && s.bg === "rgba(0, 0, 0, 0)" && s.border === "0px" && /Add page/.test(backLead);
    return [ok, `"${txt}" in a ${w}px slot (also 136px for "Selected 2 of 4" in PAG-06); footer height ${footerH0} -> ${footerH1}; footer bg with selection ${f} vs idle ${f0}; selection bar own bg ${s.bg}, border ${s.border}, shadow ${s.ring}; Clear brings back "${backLead}"`, "X-12"];
  });
});

// X-11, X-10 (via PAG-29 delete), X-13
await run("pag-x3", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("X-11", p, async () => {
    const tb = S(p).locator("[data-component=SettingsToolbar]");
    const h0 = (await tb.boundingBox()).height; const y0 = (await tb.boundingBox()).y;
    await S(p).getByLabel("Search pages").fill("meth"); await wait(p, 300);
    const h1 = (await tb.boundingBox()).height; const y1 = (await tb.boundingBox()).y; const rows1 = (await listRows(p)).length;
    await S(p).getByLabel("Search pages").fill("zzz"); await wait(p, 300);
    const h2 = (await tb.boundingBox()).height; const y2 = (await tb.boundingBox()).y;
    await S(p).getByLabel("Search pages").fill(""); await wait(p, 300);
    const rows3 = (await listRows(p)).length; const h3 = (await tb.boundingBox()).height;
    const role = await tb.getAttribute("role");
    const ok = h0 === h1 && h1 === h2 && h2 === h3 && y0 === y1 && y1 === y2 && rows1 === 1 && rows3 === 4 && role === "search";
    return [ok, `toolbar height/top: idle ${h0}/${y0}, typed "meth" ${h1}/${y1} (${rows1} row), no-match ${h2}/${y2}, cleared ${h3} (${rows3} rows); role=${role}`, "X-11"];
  });
  await check("X-13", p, async () => {
    const seedRows = await listRows(p);
    const users0 = null;
    await switchTo(p, "CEJIL"); await toSettings(p, "Pages"); await wait(p, 800);
    const cejil = await listRows(p);
    await switchTo(p, "Red Trav"); await toSettings(p, "Pages"); await wait(p, 600);
    const trav = await listRows(p);
    await editPage(p, "Contact"); await S(p).getByLabel("Title", { exact: true }).fill("Contact TRAV"); await footerBtn(p, "Save").click(); await wait(p, 500);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    const travEdited = await listRows(p);
    await switchTo(p, "Best Artworks"); await toSettings(p, "Pages"); await wait(p, 600);
    const art = await listRows(p);
    await sh(p, "X-13-art");
    await switchTo(p, "Sample"); await toSettings(p, "Users"); await wait(p, 600);
    const usr = clean(await S(p).locator("h2").first().innerText());
    const usersTab = (await listRows(p)).length;
    await rail(p, "Pages"); await wait(p, 500); const back = await listRows(p);
    const ok = cejil.length > 0 && JSON.stringify(cejil) !== JSON.stringify(seedRows) && travEdited.some((r) => /^Contact TRAV/.test(r)) && !art.some((r) => /TRAV/.test(r)) && JSON.stringify(back) === JSON.stringify(seedRows);
    return [ok, `Sample ${JSON.stringify(seedRows.map((r) => r.split(" ")[0] + "…"))}; CEJIL ${JSON.stringify(cejil)}; Travesía ${JSON.stringify(trav)}; Artworks ${JSON.stringify(art)}; Travesía edit "Contact TRAV" saved (${JSON.stringify(travEdited.find((r) => /TRAV/.test(r)))}) and absent from Artworks=${!art.some((r) => /TRAV/.test(r))}; back to Sample same as seed=${JSON.stringify(back) === JSON.stringify(seedRows)}; Users page rows ${usersTab}`, "X-13-art"];
  });
  await check("X-10", p, async () => {
    await S(p).getByRole("checkbox", { name: /Select all/ }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    const t = clean(await S(p).innerText());
    const ok = /No pages yet/.test(t) && /A page holds your own content/.test(t) && /Add page/.test(t) && !/Nothing here yet/.test(t);
    return [ok, `Pages has no "Empty pages" dev action, so all four were deleted: "${t.replace(/^Pages .*?until you publish it\. /, "")}"`, "X-10"];
  });
});

// X-04: one entry per action, one error entry per failure
await run("pag-x4", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("X-04", p, async () => {
    const read = async (before) => (await newNotifs(p, before)).filter((t) => !/Uploading document|Processing PDFs/.test(t));
    await arm(p, "Save", "Quota exceeded (X-04)", "Pages"); await wait(p, 400);
    await editPage(p, "Contact"); await S(p).getByLabel("Title", { exact: true }).fill("Contact x04");
    let before = await nlist(p);
    await footerBtn(p, "Save").click(); await wait(p, 600);
    const failN = await read(before);
    before = await nlist(p);
    await footerBtn(p, "Save").click(); await wait(p, 600);
    const okN = await read(before);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    before = await nlist(p);
    await S(p).getByRole("checkbox", { name: "Select Contact x04" }).click(); await footerBtn(p, "Delete").click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    const delN = await read(before);
    const ok = failN.length === 1 && /^An error occurred/.test(failN[0]) && /Quota exceeded \(X-04\)/.test(failN[0]) && okN.length === 1 && /^Saved successfully\./.test(okN[0]) && delN.length === 1 && /^Deleted successfully\./.test(delN[0]);
    return [ok, `failed Save (armed via the Dev panel) added ${JSON.stringify(failN)}; the next Save added ${JSON.stringify(okN)}; delete added ${JSON.stringify(delN)}; publish, restore and bulk delete entries are in PAG-21/24/25/26`, "X-04"];
  });
});
