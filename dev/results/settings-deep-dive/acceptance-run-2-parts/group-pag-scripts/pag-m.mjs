import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, contrastOf, hscroll } from "./g.mjs";
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog]");
const mTab = async (p, name) => { await S(p).getByRole("button", { name: /^Section:/ }).tap(); await wait(p, 200); await p.getByRole("option", { name }).tap(); await wait(p, 300); };
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const box = async (loc) => { const b = await loc.boundingBox(); return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
const sheetOf = async (p) => { const d = dlgLoc(p); return { dlg: await box(d), vp: p.viewportSize() }; };
const unlabeled = (p) => S(p).evaluate((root) => [...root.querySelectorAll("input,textarea,select,[role=combobox]")].filter((e) => { if (e.type === "hidden") return false; const n = e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && root.ownerDocument.querySelector(`label[for="${e.id}"]`)) || e.closest("label"); return !n; }).map((e) => e.tagName));
const inTop = (p) => p.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !e.hasAttribute("inert")); const d = ds[ds.length - 1]; return !!d && d.contains(document.activeElement); });

await run("pag-m1", async (b) => {
  const { page: p } = await open(b, "pages", "mobile");
  await wait(p, 1000);
  await check("PAG-30", p, async () => {
    const out = [];
    const hs = await hscroll(p);
    const rows = await listRows(p);
    const colHdr = await S(p).locator("[role=columnheader]").evaluateAll((e) => e.filter((x) => x.getBoundingClientRect().width > 0).length);
    const rowBox = await box(S(p).locator("[data-part=row]").first());
    const actions = await p.evaluate(() => ["View About this collection", "Edit About this collection"].map((n) => { const e = document.querySelector(`[aria-label="${n}"]`); const r = e.getBoundingClientRect(); return { n, x: Math.round(r.x), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; }));
    const addBox = await box(footerBtn(p, "Add page"));
    out.push(`list: visible column headers ${colHdr}, hscroll ${JSON.stringify(hs)}, rows ${rows.length} (${JSON.stringify(rows[0])}), row box ${JSON.stringify(rowBox)}, row actions ${JSON.stringify(actions)}, Add page box ${JSON.stringify(addBox)}`);
    await sh(p, "PAG-30-list");
    await S(p).getByRole("button", { name: "Edit Methodology" }).last().tap(); await wait(p, 800);
    const hs2 = await hscroll(p);
    const cols = await p.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const t = [...c.querySelectorAll("input,textarea")].map((e) => Math.round(e.getBoundingClientRect().x)); return [...new Set(t)]; });
    const seg = await S(p).getByRole("radio", { name: "Preview" }).or(S(p).getByRole("button", { name: "Preview", exact: true })).first();
    const codeVisible0 = await S(p).getByLabel("Title", { exact: true }).isVisible();
    const prevVisible0 = await p.locator("iframe[title='Public page preview']").count();
    await seg.tap(); await wait(p, 600);
    const codeVisible1 = await S(p).getByLabel("Title", { exact: true }).isVisible().catch(() => false);
    const prevVisible1 = await p.locator("iframe[title='Public page preview']").isVisible().catch(() => false);
    await sh(p, "PAG-30-preview");
    await S(p).getByRole("button", { name: "Code", exact: true }).or(S(p).getByRole("radio", { name: "Code" })).first().tap(); await wait(p, 400);
    const codeBack = await S(p).getByLabel("Title", { exact: true }).isVisible();
    const pubBox = await box(S(p).getByRole("button", { name: "Publish", exact: true })); const resBox = await box(S(p).getByRole("button", { name: "Restore", exact: true })); const saveBox = await box(footerBtn(p, "Save"));
    out.push(`editor: hscroll ${JSON.stringify(hs2)}; input x positions ${JSON.stringify(cols)} (one column=${cols.length === 1}); Code view: Title visible=${codeVisible0}, iframes in DOM ${prevVisible0}; after Preview: Title visible=${codeVisible1}, preview visible=${prevVisible1}; back to Code: Title visible=${codeBack}; Publish ${JSON.stringify(pubBox)}, Restore ${JSON.stringify(resBox)}, Save ${JSON.stringify(saveBox)}`);
    // tabs do not hide publish/restore/save: switch tab and check footer Save still visible
    await mTab(p, "HTML"); const saveInHtml = await footerBtn(p, "Save").isVisible(); const taBox = await box(area(p, "HTML")); await sh(p, "PAG-30-html");
    await mTab(p, "Configuration");
    // dialogs as sheets
    const sheets = {};
    await S(p).getByRole("button", { name: "Publish", exact: true }).tap(); await wait(p, 500); sheets.publish = await sheetOf(p); await sh(p, "PAG-30-publish"); await p.keyboard.press("Escape"); await wait(p, 400);
    await S(p).getByRole("button", { name: "Restore", exact: true }).tap(); await wait(p, 500); sheets.restore = await sheetOf(p);
    await dlgLoc(p).locator("label").first().tap(); await dlgLoc(p).getByRole("button", { name: "Restore", exact: true }).tap(); await wait(p, 500);
    sheets.confirm = { dlg: await box(guardDlg(p).locator("[role=dialog]")) }; await sh(p, "PAG-30-confirm");
    await guardDlg(p).getByRole("button", { name: "Cancel", exact: true }).tap(); await wait(p, 400); await dlgLoc(p).getByRole("button", { name: "Cancel" }).tap(); await wait(p, 400);
    const vp = p.viewportSize();
    const full = (s) => s.dlg && s.dlg.w >= vp.width - 2 && (s.dlg.y + s.dlg.h >= vp.height - 2 || s.dlg.h >= vp.height - 2);
    out.push(`dialogs on phone (viewport ${vp.width}x${vp.height}): Publish ${JSON.stringify(sheets.publish.dlg)} full-width bottom/full=${full(sheets.publish)}; Restore ${JSON.stringify(sheets.restore.dlg)} ${full(sheets.restore)}; confirm ${JSON.stringify(sheets.confirm.dlg)}; Save visible on HTML tab=${saveInHtml}, code area ${JSON.stringify(taBox)}`);
    const ok = hs.doc === 0 && hs.pane === 0 && rows.length === 4 && /Published|Draft/.test(rows[0]) && actions.every((a) => a.x >= 0 && a.right <= vp.width) && addBox && addBox.y + addBox.h <= vp.height && hs2.doc === 0 && cols.length === 1 && codeVisible0 && !codeVisible1 && prevVisible1 && codeBack && saveInHtml && full(sheets.publish) && full(sheets.restore) && sheets.confirm.dlg && sheets.confirm.dlg.w >= vp.width - 40;
    return [ok, out.join(" || "), "PAG-30-publish"];
  });
});
await run("pag-m2", async (b) => {
  const { page: p } = await open(b, "pages", "mobile");
  await wait(p, 1000);
  await S(p).getByRole("button", { name: "Edit Methodology" }).last().tap(); await wait(p, 800);
  await check("PAG-17-phone", p, async () => {
    const seg = S(p).getByRole("radio", { name: "Preview" }).or(S(p).getByRole("button", { name: "Preview", exact: true })).first();
    const label = await S(p).getByRole("radio", { name: "Code" }).count() + " radios named Code";
    const n = await p.locator("iframe[title='Public page preview']").count();
    await seg.tap(); await wait(p, 400);
    const shown = await p.locator("iframe[title='Public page preview']").isVisible();
    return [true && shown, `Code / Preview switch present at 390 px (${label}); iframe count before Preview ${n} (code view), after Preview iframe visible=${shown} and the code view is hidden (see PAG-30)`, "PAG-17-phone"];
  });
  await check("PAG-27-phone", p, async () => {
    await S(p).getByRole("button", { name: "Code", exact: true }).or(S(p).getByRole("radio", { name: "Code" })).first().tap(); await wait(p, 300);
    await mTab(p, "HTML"); await area(p, "HTML").fill("<p>phone edit</p>");
    await S(p).getByRole("button", { name: "Back" }).tap(); await wait(p, 500);
    const t = (await guardDlg(p).count()) ? clean(await guardDlg(p).innerText()) : "no dialog";
    await sh(p, "PAG-27-phone");
    await guardDlg(p).getByRole("button", { name: "Cancel", exact: true }).tap(); await wait(p, 300);
    const kept = await area(p, "HTML").inputValue();
    await S(p).getByRole("button", { name: "Back" }).tap(); await wait(p, 500); await guardDlg(p).getByRole("button", { name: "Discard changes" }).tap(); await wait(p, 500);
    const onList = (await listRows(p)).length;
    const ok = /Discard changes\? You have unsaved changes\. Do you want to continue\? Cancel Discard changes/.test(t) && kept === "<p>phone edit</p>" && onList === 4;
    return [ok, `phone header back chevron with a dirty HTML edit: "${t}"; Cancel kept text=${kept === "<p>phone edit</p>"}; Discard changes returned to the list (${onList} rows)`, "PAG-27-phone"];
  });
});
