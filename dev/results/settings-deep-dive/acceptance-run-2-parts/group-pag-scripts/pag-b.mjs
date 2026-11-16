import { run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const title = (p) => S(p).getByLabel("Title", { exact: true }).inputValue();
const confirmGuard = (p, name) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").getByRole("button", { name });

// PAG-03
await run("pag-b1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-03", p, async () => {
    await editPage(p, "Partners");
    await S(p).getByLabel("Title", { exact: true }).fill("Partners and funders");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await rail(p, "Dashboard"); await wait(p, 500);
    await rail(p, "Pages"); await wait(p, 600);
    const r = await listRows(p);
    await p.reload(); await wait(p, 1500);
    const r2 = await listRows(p);
    const ok = r.some((x) => /^Partners and funders \/page\/p3\/partners-and-funders Draft$/.test(x)) && r2.some((x) => /^Partners and funders \/page\/p3\/partners-and-funders Draft$/.test(x));
    return [ok, `after Save + Dashboard + Pages: ${JSON.stringify(r)}; after reload: ${JSON.stringify(r2)}`, "PAG-03"];
  });
});

// PAG-04, PAG-05
await run("pag-b2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-04", p, async () => {
    await footerBtn(p, "Add page").click(); await wait(p, 500);
    const d = dlgLoc(p);
    const dn = await d.getAttribute("aria-label").catch(() => null);
    const starters = await d.locator("[role=radio]").allInnerTexts();
    const hasModal = await p.locator("[data-component=TemplatePickerModal]").count();
    await sh(p, "PAG-04-picker");
    await d.locator("[role=radio]").nth(1).click();
    await d.getByRole("button", { name: "Create page" }).click(); await wait(p, 900);
    const head = clean(await S(p).locator("h2").first().innerText());
    await sh(p, "PAG-04-editor");
    await footerBtn(p, "Cancel").click(); await wait(p, 400);
    const dl = await p.locator("[data-component=ConfirmDialog]").count();
    if (dl) await confirmGuard(p, "Discard changes").click();
    await wait(p, 500);
    const r = await listRows(p);
    const ok = hasModal === 1 && starters.length >= 2 && /New page/.test(head) && r.length === 4;
    return [ok, `picker is TemplatePickerModal=${hasModal === 1}, starters ${JSON.stringify(starters.map((s) => clean(s).slice(0, 40)))}; editor heading "${head}"; Cancel opened a Discard dialog=${!!dl}; list after leaving: ${r.length} rows`, "PAG-04-editor"];
  });
  await check("PAG-05", p, async () => {
    await footerBtn(p, "Add page").click(); await wait(p, 500);
    await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 900);
    const out = {};
    for (const l of ["Español", "English"]) { await lang(p, l); out[l] = await title(p); }
    for (const l of ["Français", "العربية", "English"]) { await lang(p, l).catch(() => {}); out[l] = await title(p).catch(() => "?"); }
    const pubDis = await S(p).getByRole("button", { name: "Publish", exact: true }).isDisabled();
    const resDis = await S(p).getByRole("button", { name: "Restore", exact: true }).isDisabled();
    const urlBefore = await S(p).getByLabel("URL", { exact: true }).count();
    const listBefore = null;
    await S(p).getByLabel("Title", { exact: true }).fill("QA page");
    await footerBtn(p, "Save").click(); await wait(p, 600);
    const stillEditor = await S(p).getByRole("tab", { name: "HTML", exact: true }).count();
    const pubAfter = await S(p).getByRole("button", { name: "Publish", exact: true }).isEnabled();
    const resAfter = await S(p).getByRole("button", { name: "Restore", exact: true }).isEnabled();
    const foot = clean(await S(p).locator("footer").innerText());
    await sh(p, "PAG-05-editor");
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const r = await listRows(p);
    const ok = Object.values(out).every((t) => t === "New page") && pubDis && resDis && stillEditor === 1 && pubAfter && resAfter && r.length === 5 && r.some((x) => /^QA page .* Draft$/.test(x));
    return [ok, `title before first Save per language ${JSON.stringify(out)}; Publish disabled=${pubDis}, Restore disabled=${resDis}; after Save editor still open=${stillEditor === 1}, Publish enabled=${pubAfter}, Restore enabled=${resAfter}, footer "${foot}"; list after Back ${JSON.stringify(r)}`, "PAG-05"];
  });
});

// PAG-10, PAG-11, PAG-12
await run("pag-b3", async (b) => {
  const { page: p, ctx } = await open(b, "pages");
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await wait(p, 800);
  await check("PAG-10", p, async () => {
    await editPage(p, "Methodology");
    const before = await nlist(p);
    await S(p).getByLabel("Title", { exact: true }).fill("");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const msg = clean(await S(p).innerText());
    const req = /This field is required/.test(msg);
    const n1 = await newNotifs(p, before);
    await S(p).getByLabel("Title", { exact: true }).fill("Methodology notes");
    await lang(p, "Español");
    await S(p).getByLabel("Title", { exact: true }).fill("Metodología");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const n2 = await newNotifs(p, before);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const r = await listRows(p);
    await editPage(p, "Methodology notes");
    const en = await title(p); await lang(p, "Español"); const es = await title(p);
    const ok = req && n1.length === 0 && r.some((x) => /^Methodology notes /.test(x)) && en === "Methodology notes" && es === "Metodología";
    return [ok, `empty-title Save: "This field is required" shown=${req}; notifications after failed Save ${JSON.stringify(n1)}; after valid save notifications ${JSON.stringify(n2)}; list row ${JSON.stringify(r.find((x) => /Methodology/.test(x)))}; reopened EN title "${en}", ES title "${es}"`, "PAG-10"];
  });
  await check("PAG-11", p, async () => {
    await S(p).getByRole("button", { name: "Back" }).click().catch(() => {}); await wait(p, 300);
    const g = p.locator("[data-component=ConfirmDialog]"); if (await g.count()) await confirmGuard(p, "Discard changes").click();
    await wait(p, 400);
    if (!(await S(p).getByRole("button", { name: /^Edit /i }).count())) {}
    await editPage(p, "Methodology notes");
    const urlEl = S(p).getByLabel("URL", { exact: true });
    const ro = await urlEl.getAttribute("readonly"); const v0 = await urlEl.inputValue();
    await urlEl.click(); await p.keyboard.type("zzz"); const v1 = await urlEl.inputValue();
    await S(p).getByRole("button", { name: "Copy URL" }).click(); await wait(p, 300);
    const clip = await p.evaluate(() => navigator.clipboard.readText());
    await S(p).getByLabel("Title", { exact: true }).fill("Method notes"); await wait(p, 200);
    const v2 = await urlEl.inputValue();
    const view = await S(p).getByRole("button", { name: /View page/ }).count();
    const editableSlug = await S(p).getByLabel(/slug/i).count();
    await lang(p, "Español"); const v3 = await urlEl.inputValue();
    await sh(p, "PAG-11");
    await lang(p, "English");
    // new page: URL hidden
    await footerBtn(p, "Cancel").click(); await wait(p, 300);
    if (await p.locator("[data-component=ConfirmDialog]").count()) await confirmGuard(p, "Discard changes").click();
    await wait(p, 400);
    await footerBtn(p, "Add page").click(); await wait(p, 400);
    await dlgLoc(p).getByRole("button", { name: "Create page" }).click(); await wait(p, 800);
    const newUrl = await S(p).getByLabel("URL", { exact: true }).count();
    const newView = await S(p).getByRole("button", { name: /View page/ }).count();
    const ok = ro !== null && /^\/en\/page\/p2\/methodology-notes$/.test(v0) && v1 === v0 && clip === v0 && v2 === "/en/page/p2/method-notes" && view === 1 && editableSlug === 0 && /^\/es\/page\/p2\/metodologia/.test(v3) && newUrl === 0 && newView === 0;
    return [ok, `readonly attr=${ro !== null}; value "${v0}"; after typing "zzz" "${v1}"; clipboard after Copy "${clip}"; after Title "Method notes": "${v2}"; "View page" buttons ${view}; slug inputs ${editableSlug}; ES selected: "${v3}"; unsaved new page: URL fields ${newUrl}, View page ${newView}`, "PAG-11"];
  });
});
