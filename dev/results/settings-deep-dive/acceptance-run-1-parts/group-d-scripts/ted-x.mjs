import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, dialogs, rows, typeOptions, pickType, notifTitles, logEntries, axe, switchTo, toSettings } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const lum = (c) => { const [r,g,bb] = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*bb; };
const ratio = (a, c) => { const x = lum(a), y = lum(c); return ((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)).toFixed(2); };
const confirmText = async (p) => strip(await p.locator('[data-component=ConfirmDialog] [role=dialog]').last().innerText().catch(()=>""));

// X-01 + X-03 + X-04 + X-09 on one save
{
  const { page, errors } = await openEditor(b, "Court Case");
  const n0 = await notifTitles(page);
  await S(page).locator("#template-name-input").fill("Court QA");
  await S(page).locator('button[aria-label="Colour #2563EB"]').click();
  await openAdd(page); await dlg(page).getByLabel("Label").fill("QA Text"); await dlg(page).getByRole("button", { name: "Add property" }).click(); await wait(page, 300);
  const dirtyBefore = await dirtyNow(page);
  await saveBtn(page).click(); await wait(page, 600);
  const n1 = await notifTitles(page);
  const newN = n1.filter(t => !n0.includes(t) && !/Running|Finishing/.test(t));
  const afterSave = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
  const dlgsAfter = await dialogs(page);
  await rail(page, "Thesauri"); await wait(page, 500);
  const guardOnRail = (await dialogs(page)).length;
  await rail(page, "Templates"); await wait(page, 500);
  const afterNav = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
  let props = "n/a";
  if (afterNav.includes("Court QA")) { await S(page).locator('[role=row]', { hasText: "Court QA" }).first().click(); await wait(page, 400); props = JSON.stringify(await propNames(page)); }
  await page.reload(); await wait(page, 1500);
  const afterReload = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim())).catch(()=>[]);
  const log = await logEntries(page);
  rec("TED:X-01", afterNav.includes("Court QA") && afterReload.includes("Court QA") ? "PASS" : "FAIL", `Court Case renamed "Court QA", colour #2563EB, property "QA Text" added, Save: list right after save has "Court QA"=${afterSave.includes("Court QA")}; after rail Thesauri then Templates: has "Court QA"=${afterNav.includes("Court QA")} (rows ${JSON.stringify(afterNav)}); properties on reopen ${props}; after tab reload has "Court QA"=${afterReload.includes("Court QA")}.`, "");
  rec("TED:X-03", dirtyBefore && dlgsAfter.length === 0 && guardOnRail === 0 ? "PASS" : "FAIL", `Reading: after a successful Save the editor closes to the list (no Save button left to be disabled). Save enabled before=${dirtyBefore}; rail click after Save opened dialogs ${guardOnRail} (expected none); a freshly opened editor re-enables Save on edit (seen in TED-17/34).`, "");
  rec("TED:X-04", "FAIL", `One editor Save produced new Beacon entries ${JSON.stringify(newN)} (one entry, but reads "<name> saved", not "Template saved successfully." from TED-100). Property removal produces a Beacon entry "Date filed removed ... Undo" (TED-25). Failure path not driven.`, "");
  rec("TED:X-09", log.some(l => /template/i.test(l)) ? "PASS" : "FAIL", `Activity-log store (sessionStorage uwazi:settings:activity) after the Save: ${JSON.stringify(log)} (no "Updated template" entry naming the template and user).`, "");
  await page.close();
}
// X-02 guard
{
  const results = [];
  const attempt = async (name, trigger, vp = "desktop") => {
    const { page } = await openEditor(b, "Court Case", vp);
    await S(page).locator("#template-name-input").fill("Court Case Z"); await wait(page, 150);
    await trigger(page); await wait(page, 500);
    const dl = await dialogs(page);
    const t = dl.length ? await confirmText(page) : "";
    const btns = dl.length ? (await page.locator('[data-component=ConfirmDialog] [role=dialog] button').allInnerTexts()).map(strip).filter(Boolean) : [];
    let keep = null, discard = null;
    if (dl.length) {
      await page.locator('[data-component=ConfirmDialog] [role=dialog] button', { hasText: /Keep editing|^Cancel$/ }).first().click(); await wait(page, 400);
      keep = (await S(page).locator("#template-name-input").inputValue().catch(()=>null));
      await trigger(page); await wait(page, 500);
      await page.locator('[data-component=ConfirmDialog] [role=dialog] button', { hasText: /Discard/ }).first().click(); await wait(page, 600);
      discard = (await S(page).locator("#template-name-input").count()) === 0 ? "left editor" : "still in editor";
    }
    results.push({ name, dialogs: dl, text: t, btns, keptValue: keep, afterDiscard: discard });
    await page.close();
  };
  await attempt("rail", (p) => rail(p, "Thesauri"));
  await attempt("back arrow", (p) => S(p).getByRole("button", { name: /^Back$|Go back|back/i }).first().click());
  await attempt("breadcrumb", (p) => S(p).getByRole("button", { name: "Templates" }).first().click());
  await attempt("navbar Library link", (p) => p.locator('button:has-text("Library")').first().click());
  await attempt("data source switch", async (p) => { await p.locator('button[aria-label^="Collection:"]').click(); await wait(p, 250); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); });
  await attempt("mobile back chevron", (p) => S(p).getByRole("button", { name: /back/i }).first().tap(), "mobile");
  // no change, no dialog
  const { page } = await openEditor(b, "Court Case");
  await rail(page, "Thesauri"); await wait(page, 500);
  const noChange = (await dialogs(page)).length;
  await page.close();
  const okTitle = (r) => r.dialogs.includes("Discard changes?");
  rec("TED:X-02", results.every(okTitle) && noChange === 0 ? "PASS" : "FAIL", `Guard seen per trigger: ${JSON.stringify(results.map(r => ({ trigger: r.name, dialog: r.dialogs, buttons: r.btns, body: r.text.slice(0, 120), keepKeptEdit: r.keptValue, discard: r.afterDiscard })))}. No-change rail click opened dialogs ${noChange}. Expected title "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" and "Discard changes".`, "");
}
// X-05: scan for a blocked property removal
{
  const found = [];
  for (const tname of ["Person", "Court Case", "Country", "Judgment", "Violation", "Right", "Organization", "Document", "Hearing"]) {
    const { page } = await openEditor(b, tname);
    const names = await propNames(page);
    for (const n of names) {
      const row = propRows(page).filter({ hasText: n }).first();
      await row.hover().catch(()=>{});
      const btn = S(page).getByRole("button", { name: `Delete ${n}`, exact: true });
      if (!(await btn.count())) continue;
      await btn.first().click(); await wait(page, 250);
      const dl = await dialogs(page);
      if (dl.length) { found.push({ template: tname, property: n, dialog: dl, text: strip(await page.locator('[data-component=ConfirmDelete] [role=dialog]').last().innerText()) }); await page.keyboard.press("Escape"); await wait(page, 200); }
    }
    await page.close();
  }
  rec("TED:X-05", found.length ? "PASS" : "FAIL", `Removing every property of every Sample template one by one: blocked with a dialog for ${JSON.stringify(found)}. Unblocked removal: no dialog, Beacon entry "<label> removed" with usage line (e.g. "5 entities hold a value for it. Nothing is saved until you save the template.") and Undo (TED-25).`, "");
}
// X-07 axe
{
  const { page } = await openEditor(b, "Court Case");
  const a1 = await axe(page);
  await openAdd(page);
  const a2 = await page.evaluate(async () => { const ds = [...document.querySelectorAll("[role=dialog][data-part=panel]")].filter(e => !e.closest("[inert]")); const r = await window.axe.run(ds[ds.length - 1], { resultTypes: ["violations"] }); return r.violations.map(v => v.id + " (" + v.impact + ") x" + v.nodes.length); });
  await pickType(page, "Select");
  const a3 = await page.evaluate(async () => { const ds = [...document.querySelectorAll("[role=dialog][data-part=panel]")].filter(e => !e.closest("[inert]")); const r = await window.axe.run(ds[ds.length - 1], { resultTypes: ["violations"] }); return r.violations.map(v => v.id + " (" + v.impact + ") x" + v.nodes.length); });
  const uniq = await page.evaluate(() => { const names = [...document.querySelectorAll('[data-testid=settings-content] [data-part=property] button, [data-testid=settings-content] [data-part=property] input')].map(e => e.getAttribute("aria-label")).filter(Boolean); return { total: names.length, dup: names.filter((n, i) => names.indexOf(n) !== i) }; });
  rec("TED:X-07", a1.filter(x=>/serious|critical/.test(x)).length + a2.filter(x=>/serious|critical/.test(x)).length + a3.filter(x=>/serious|critical/.test(x)).length === 0 ? "PASS" : "FAIL", `axe on editor pane: ${JSON.stringify(a1)}; on property dialog (Text): ${JSON.stringify(a2)}; with type Select: ${JSON.stringify(a3)}. Row control names unique: ${uniq.total} names, duplicates ${JSON.stringify(uniq.dup)}. Dialog focus trap / restore / Escape seen in TED-31/32. (Moderate/minor findings are listed above; only serious/critical decide.)`, "");
  await page.close();
}
// X-08 dark mode contrast of type badge
{
  const { page } = await openEditor(b, "Court Case");
  const r = await page.evaluate(() => { const out = []; for (const dark of [false, true]) { document.documentElement.classList.toggle("dark", dark); const e = [...document.querySelectorAll('[data-part=property] td span')].find(x => x.textContent.trim() === "Text"); const c = getComputedStyle(e); const bg = getComputedStyle(e).backgroundColor; out.push([c.color, bg]); } document.documentElement.classList.remove("dark"); return out; });
  const rl = ratio(r[0][0], r[0][1]), rd = ratio(r[1][0], r[1][1]);
  rec("TED:X-08", parseFloat(rl) >= 4.5 && parseFloat(rd) >= 4.5 ? "PASS" : "FAIL", `Type badge ("Text") contrast light ${rl}:1 (${r[0][0]} on ${r[0][1]}), dark ${rd}:1 (${r[1][0]} on ${r[1][1]}). Editor has no status pills or Default badge.`, "");
  await page.close();
}
// X-06 phone layout
{
  const { page } = await openEditor(b, "Court Case", "mobile");
  const info = await page.evaluate(() => { const t = document.querySelector('[data-part=properties]').getBoundingClientRect(); const a = document.querySelector('[data-testid=settings-content] aside').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, tableBottom: Math.round(t.bottom + scrollY), asideTop: Math.round(a.top + scrollY), tableLeft: Math.round(t.left), asideLeft: Math.round(a.left) }; });
  const actionsVisible = await S(page).getByRole("button", { name: "Edit Case number" }).isVisible();
  await shot(page, "X-06-TED");
  const single = info.asideTop >= info.tableBottom - 2 && Math.abs(info.tableLeft - info.asideLeft) < 20;
  rec("TED:X-06", info.sw === info.cw && single && actionsVisible ? "PASS" : "FAIL", `Phone: scrollWidth ${info.sw}/${info.cw}; single column (card preview below the table: table bottom ${info.tableBottom}, preview top ${info.asideTop}) = ${single}; row pencil visible without hover=${actionsVisible}; property dialog is a near-full-height sheet (TED-33); mobile back chevron guarded (X-02). Per-row flags are labelled checkboxes, common rows absent (TED-108 FAIL).`, "X-06-TED");
  await page.close();
}
rec("TED:X-10", "N/A", "Page's Applies line: X-10 and X-11 do not apply to the editor.");
rec("TED:X-11", "N/A", "Page's Applies line: X-10 and X-11 do not apply to the editor.");
rec("TED:X-12", "FAIL", "The editor's property table has no selection (the per-row checkboxes are Required/Filter/Cards flags, TED-24), so no fixed \"Selected n\" slot and no footer Remove.");
// X-13
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const out = {};
  for (const [label, key, tname] of [["CEJIL", "cejil", "Causa"], ["Red Trav", "travesia", null], ["Best Artworks", "artworks", null]]) {
    await switchTo(page, label); await wait(page, 1500); await toSettings(page, "Templates"); await wait(page, 2500);
    const ns = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
    out[key] = ns.slice(0, 4).join(", ") + ` (${ns.length})`;
    if (tname && ns.includes(tname)) { await S(page).locator('[role=row]', { hasText: tname }).first().click(); await wait(page, 600); out.cejilProps = JSON.stringify((await propNames(page)).slice(0, 5)); await S(page).getByRole("button", { name: "Templates" }).first().click(); await wait(page, 400); }
  }
  await shot(page, "X-13-TED");
  rec("TED:X-13", "FAIL", `Templates list per data source: CEJIL ${out.cejil} (editor Causa properties ${out.cejilProps}); Travesia ${out.travesia}; Artworks ${out.artworks} (Sample's list; expected Artwork and Artist). Only CEJIL switches.`, "X-13-TED");
  await page.close();
}
await b.close();
