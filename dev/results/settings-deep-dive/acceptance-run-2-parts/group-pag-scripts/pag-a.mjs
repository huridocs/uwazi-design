import { run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh } from "./g.mjs";

// PAG-01, 02, 06 on one clean context
await run("pag-a1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-01", p, async () => {
    const h2 = clean(await S(p).locator("h2").first().innerText());
    const heads = await S(p).locator("[role=columnheader]").allInnerTexts();
    const hdrTxt = heads.map(clean);
    const selAll = await S(p).locator("[role=columnheader] input,[role=columnheader] [role=checkbox]").first().getAttribute("aria-label");
    const r = await listRows(p);
    const names = await S(p).locator("button").evaluateAll((bs) => bs.map((x) => x.getAttribute("aria-label") || x.innerText.trim()).filter(Boolean));
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    const cbs = await S(p).locator("[data-part=row] [data-part=select] input[type=checkbox], [data-part=row] [data-part=select] [role=checkbox]").count();
    const footer = clean(await S(p).locator("footer").innerText());
    const urlOk = r.every((x) => /\/page\/p\d+\/[a-z0-9-]+/.test(x));
    const order = ["About this collection", "Methodology", "Partners", "Contact"].every((t, i) => r[i]?.startsWith(t));
    const pills = r.map((x) => x.split(" ").slice(-1)[0]);
    const ok = h2 === "Pages" && r.length === 4 && order && urlOk && cbs === 4 && /Add page/.test(footer) && hdrTxt.filter((t) => !t).length <= 1 && selAll === "Select all" && /Title/i.test(hdrTxt.join()) && /URL/i.test(hdrTxt.join()) && /Status/i.test(hdrTxt.join()) && dup.length === 0 && names.includes("Edit Partners") && names.includes("View Partners");
    return [ok, `heading "${h2}"; headers ${JSON.stringify(hdrTxt)}; rows ${JSON.stringify(r)}; row checkboxes ${cbs}; the one header without text holds the checkbox named "${selAll}" (other headers incl. sr-only Actions have text); footer "${footer}"; duplicate button names ${JSON.stringify(dup)}; has "Edit Partners"=${names.includes("Edit Partners")}`, "PAG-01"];
  });
  await check("PAG-02", p, async () => {
    const s = S(p).getByRole("searchbox", { name: /Search pages/ }).or(S(p).getByLabel("Search pages")).first();
    await s.fill("meth"); await wait(p, 300); const a = await listRows(p);
    await s.fill("/partners"); await wait(p, 300); const bb = await listRows(p);
    await s.fill(""); await wait(p, 300); const c = await listRows(p);
    await s.fill("zzzz"); await wait(p, 300); const d = clean(await S(p).innerText());
    await s.fill(""); await wait(p, 200);
    const ok = a.length === 1 && /^Methodology/.test(a[0]) && bb.length === 1 && /^Partners/.test(bb[0]) && c.length === 4 && /No pages match/.test(d);
    return [ok, `"meth" -> ${JSON.stringify(a)}; "/partners" -> ${JSON.stringify(bb)}; cleared -> ${c.length} rows; "zzzz" -> text has "No pages match": ${/No pages match/.test(d)}`, "PAG-02"];
  });
  await check("PAG-06", p, async () => {
    const tick = (t) => S(p).getByRole("checkbox", { name: `Select ${t}` }).click();
    await tick("Methodology"); await tick("Contact"); await wait(p, 250);
    const bar = S(p).locator("[data-component=SettingsSelectionBar]");
    const t2 = clean(await bar.innerText());
    const w2 = (await bar.locator("[role=status]").boundingBox()).width;
    const footerHas = clean(await S(p).locator("footer").innerText());
    await S(p).getByRole("checkbox", { name: /Select all/ }).click(); await wait(p, 250);
    const t4 = clean(await bar.innerText());
    const w4 = (await bar.locator("[role=status]").boundingBox()).width;
    const del = bar.locator("[data-action=delete]");
    const st = await del.evaluate((e) => { const c = getComputedStyle(e); return { color: c.color, bg: c.backgroundColor, border: c.borderTopWidth + " " + c.borderTopStyle, shadow: c.boxShadow }; });
    const fst = await S(p).locator("footer").evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, border: c.borderTopWidth }; });
    const sealRef = await p.evaluate(() => { const d = document.createElement("span"); d.className = "text-seal"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); const e = document.createElement("span"); e.className = "text-seal-label"; document.body.appendChild(e); const c2 = getComputedStyle(e).color; e.remove(); return [c, c2]; });
    await S(p).getByRole("checkbox", { name: /Deselect all|Select all/ }).first().click(); await wait(p, 250);
    const back = clean(await S(p).locator("footer").innerText());
    const ok = /Selected 2 of 4/.test(t2) && /Selected 4 of 4/.test(t4) && /Delete/.test(t2) && Math.abs(w2 - w4) < 0.5 && !/Add page/.test(footerHas) && /Add page/.test(back) && !/Selected/.test(back) && sealRef.includes(st.color) && st.bg === "rgba(0, 0, 0, 0)" && st.border.startsWith("0");
    return [ok, `2 ticked: "${t2}" (status width ${w2}); header checkbox: "${t4}" (width ${w4}); Delete style ${JSON.stringify(st)} vs seal tokens ${JSON.stringify(sealRef)}; footer bg ${JSON.stringify(fst)}; footer while ticked had Add page=${/Add page/.test(footerHas)}; after unticking all: "${back}"`, "PAG-06"];
  });
});

// PAG-07 / PAG-08 / PAG-09 deletes and View
await run("pag-a2", async (b) => {
  const { page: p, ctx } = await open(b, "pages");
  await wait(p, 800);
  const tick = (t) => S(p).getByRole("checkbox", { name: `Select ${t}` }).click();
  await check("PAG-09", p, async () => {
    // make Methodology's draft differ from its release, then View
    await editPage(p, "Methodology"); await S(p).getByRole("tab", { name: "HTML", exact: true }).click(); await wait(p, 200);
    await S(p).getByLabel(/^HTML · English/).fill("<h1>UNPUBLISHED DRAFT TEXT</h1>");
    await footerBtn(p, "Save").click(); await wait(p, 400);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    await S(p).getByRole("button", { name: "View Methodology" }).click(); await wait(p, 1500);
    const d1 = dlgLoc(p);
    const f1 = d1.frameLocator("iframe").first();
    const t1 = clean(await f1.locator("body").innerText());
    const title1 = clean(await d1.innerText()).slice(0, 80);
    await sh(p, "PAG-09-methodology");
    await p.keyboard.press("Escape"); await wait(p, 400);
    await S(p).getByRole("button", { name: "View Partners" }).click(); await wait(p, 1200);
    const d2 = dlgLoc(p);
    const t2 = clean(await d2.frameLocator("iframe").first().locator("body").innerText());
    const dt = clean(await d2.innerText());
    const ok = /How records are selected/.test(t1) && !/UNPUBLISHED DRAFT/.test(t1) && /not published/i.test(t2) && !/The organisations that contribute/.test(t2);
    return [ok, `Methodology draft edited to "UNPUBLISHED DRAFT TEXT" and saved (not published). View Methodology preview text: "${t1.slice(0, 160)}" (dialog "${title1}"). View Partners (never published) preview text: "${t2.slice(0, 160)}"; dialog text "${dt.slice(0, 120)}"`, "PAG-09-partners"];
  });
  await p.keyboard.press("Escape"); await wait(p, 300);
  await check("PAG-07", p, async () => {
    await tick("Methodology"); await wait(p, 200);
    await footerBtn(p, "Delete").click(); await wait(p, 400);
    const dt = clean(await p.locator("[data-component=ConfirmDelete]").innerText());
    await sh(p, "PAG-07-dialog");
    // Cancel
    await p.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
    const afterCancel = (await listRows(p)).length;
    await footerBtn(p, "Delete").click(); await wait(p, 300);
    const before = await nlist(p);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    const r = await listRows(p);
    const n = await newNotifs(p, before);
    await rail(p, "Menu"); await wait(p, 700);
    const menuTxt = clean(await S(p).innerText());
    const menuHas = /Methodology/.test(menuTxt) && /page\/methodology/.test(menuTxt + (await S(p).locator("input").evaluateAll((i) => i.map((x) => x.value).join(" "))));
    const ok = /Methodology/.test(dt) && /menu link/i.test(dt) && /\/page\/methodology/.test(dt) && /missing page|stays in the menu/i.test(dt) && afterCancel === 4 && r.length === 3 && !r.some((x) => /^Methodology/.test(x)) && n.some((t) => /Deleted successfully\./.test(t)) && menuHas;
    return [ok, `dialog: "${dt}"; after Cancel rows=${afterCancel}; after Confirm rows ${JSON.stringify(r)}; new notifications ${JSON.stringify(n)}; Menu page still lists Methodology link (stays, as the dialog said)=${menuHas}`, "PAG-07"];
  });
});

// PAG-08 two pages, reload persistence
await run("pag-a3", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-08", p, async () => {
    await S(p).getByRole("checkbox", { name: "Select Partners" }).click();
    await S(p).getByRole("checkbox", { name: "Select About this collection" }).click(); await wait(p, 200);
    await footerBtn(p, "Delete").click(); await wait(p, 400);
    const dlg = p.locator("[data-component=ConfirmDelete]");
    const dt = clean(await dlg.innerText());
    const btns = await dlg.getByRole("button").allInnerTexts();
    await sh(p, "PAG-08-dialog");
    const before = await nlist(p);
    await dlg.locator("[data-part=confirm]").click(); await wait(p, 600);
    const r = await listRows(p);
    const n = await newNotifs(p, before);
    await p.reload(); await wait(p, 1500);
    const r2 = await listRows(p);
    const ok = /Do you want to delete the following items\?/.test(dt) && /• About this collection/.test(dt) && /• Partners/.test(dt) && /About this collection/.test(dt.split("leads to")[0] || "") === true && /menu link “About”/.test(dt) && r.length === 2 && r2.length === 2 && !r2.some((x) => /^(Partners|About)/.test(x));
    return [ok, `dialog: "${dt}"; buttons ${JSON.stringify(btns.map(clean))}; rows after confirm ${JSON.stringify(r)}; notifications ${JSON.stringify(n)}; after page.reload() rows ${JSON.stringify(r2)}`, "PAG-08"];
  });
});

// PAG-29 empty and no-match
await run("pag-a4", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-29", p, async () => {
    await S(p).getByRole("checkbox", { name: /Select all/ }).click(); await wait(p, 200);
    await footerBtn(p, "Delete").click(); await wait(p, 400);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 700);
    const empty = clean(await S(p).innerText());
    const foot = clean(await S(p).locator("footer").innerText());
    await sh(p, "PAG-29-empty");
    const hasAct = await S(p).getByRole("button", { name: "Add page" }).count();
    // add one page
    await S(p).getByRole("button", { name: "Add page" }).last().click(); await wait(p, 500);
    await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 900);
    await footerBtn(p, "Save").click(); await wait(p, 600);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const rr = await listRows(p);
    await S(p).getByLabel("Search pages").fill("zzz"); await wait(p, 300);
    const nm = clean(await S(p).innerText());
    const clearBtn = await S(p).getByRole("button", { name: /Clear/ }).count();
    await sh(p, "PAG-29-nomatch");
    const ok = /No pages yet/.test(empty) && /A page holds your own content/.test(empty) && hasAct >= 1 && !/Nothing here yet|NO DATA AVAILABLE/.test(empty) && /No pages match “zzz”/.test(nm) && clearBtn >= 1 && rr.length === 1;
    return [ok, `after deleting all four: "${empty}"; footer "${foot}"; Add page buttons ${hasAct}; after adding one page rows ${JSON.stringify(rr)}; search "zzz": "${nm}"; clear control count ${clearBtn}`, "PAG-29-nomatch"];
  });
});
