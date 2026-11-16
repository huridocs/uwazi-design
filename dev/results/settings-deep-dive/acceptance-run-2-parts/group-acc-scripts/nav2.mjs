import { launch, open, S, shot, notifTitles, dialogs, rail, axeSrc } from "./lib.mjs";
import { watch, mk, hscroll, contrast, dark } from "./rec.mjs";
import { openCatalog, setRole, resumeSettings, toggleFlag, flagState, flagBox } from "./devp.mjs";
const { rec, save } = mk("nav2");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const NAV = 'nav[aria-label="Settings navigation"]';
const railItems = (p) => p.evaluate((sel) => [...document.querySelectorAll(sel + " [data-part=item]")].map(e => e.innerText.trim()), NAV);
const railHeads = (p) => p.evaluate((sel) => [...document.querySelectorAll(sel + " h2, " + sel + " h3")].map(e => e.textContent.trim() + (e.className.includes("sr-only") ? "(sr)" : "")), NAV);
const paneT = (p) => S(p).innerText().then(norm).catch(() => "");
const activeEl = (p) => p.evaluate(() => { const e = document.activeElement; return e ? (e.tagName + ":" + (e.textContent || "").trim().slice(0, 40)) : null; });

// NAV-05 every item as admin
{
  const { page: p } = await open(b, "dashboard");
  const items = [["Dashboard", "Dashboard"], ["Users & Groups", "Users & Groups"], ["Collection", "Collection"], ["Menu", "Menu"], ["Pages", "Pages"], ["Languages", "Languages"], ["Translations", "Translations"], ["Filters", "Filters"], ["Templates", "Templates"], ["Thesauri", "Thesauri"], ["Relationship types", "Relationship types"], ["Activity log", "Activity log"], ["Uploads", "Uploads"], ["Global CSS", "Global CSS"]];
  const res = [];
  for (const [name] of items) {
    const present = await p.locator(NAV + " [data-part=item]", { hasText: name }).count();
    if (!present) { res.push(`${name}: MISSING`); continue; }
    await rail(p, name); await p.waitForTimeout(700);
    const t = await paneT(p);
    const ph = /not available|roadmap|hasn't been built/.test(t);
    const h = norm(await S(p).locator("h2").first().innerText().catch(() => "?"));
    res.push(`${name}: opens "${h.slice(0, 28)}"${ph ? " BLOCKED/PLACEHOLDER" : ""}`);
  }
  // Import CSV (own view)
  await rail(p, "Import CSV"); await p.waitForTimeout(900);
  const imp = norm((await p.locator("body").innerText()).slice(0, 5000));
  const importOpen = /CSV/.test(imp) && (await p.locator(NAV).count()) === 1;
  res.push(`Import CSV: opens (rail still shown=${(await p.locator(NAV).count()) === 1})`);
  const bad = res.filter(r => /MISSING|BLOCKED/.test(r));
  rec("NAV-05", !bad.length && importOpen ? "PASS" : "FAIL", `Admin: ${res.join("; ")}`, "");
  // NAV-15 import CSV rail and back
  const m = await p.evaluate((sel) => ({ active: [...document.querySelectorAll(sel + " [aria-current=page]")].map(e => e.innerText.trim()), items: document.querySelectorAll(sel + " [data-part=item]").length }), NAV);
  const act = await p.evaluate((sel) => { const e = document.querySelector(sel + " [aria-current=page]"); if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, w: cs.fontWeight }; }, NAV);
  await shot(p, "NAV-15");
  const backBtn = await p.getByRole("button", { name: /^Back$|Back to/ }).count();
  let landed = "";
  if (backBtn) { await p.getByRole("button", { name: /^Back$|Back to/ }).first().click(); await p.waitForTimeout(800); landed = norm((await S(p).locator("h2").first().innerText().catch(() => "?"))); }
  else { landed = "(no Back control)"; }
  rec("NAV-15", m.active.join() === "Import CSV" && m.items === 19 && backBtn && /Activity log|Uploads|Global/.test(landed) ? "PASS" : "FAIL", `Import CSV view: rail shown with ${m.items} items, active=${JSON.stringify(m.active)} (bg ${act && act.bg}, weight ${act && act.w}); Back controls=${backBtn}; after Back lands on "${landed}" (page it came from: Global CSS & JS)`, "NAV-15.png");
  await p.context().close();
}
// NAV-06 editor, NAV-08, NAV-07 collaborator
{
  const { page: p } = await open(b, "templates");
  await openCatalog(p);
  await setRole(p, "Editor");
  await resumeSettings(p);
  const items = await railItems(p), heads = await railHeads(p);
  const t = await paneT(p);
  const focus = await activeEl(p);
  await shot(p, "NAV-06");
  const link = S(p).getByRole("link", { name: /Go to/ }).or(S(p).getByRole("button", { name: /Go to/ })).first();
  const linkTxt = await link.innerText().catch(() => "");
  const okTexts = /This page is not available\./.test(t) && /role/.test(t) && linkTxt;
  rec("NAV-06", items.join() === "Account,Metadata extraction,Paragraph extraction" && okTexts && !/^Account/.test(t) ? "PASS" : "FAIL", `Editor via Dev panel with Templates open: rail items=${JSON.stringify(items)}, headings=${JSON.stringify(heads)} (only groups with a visible item); Templates pane text="${t.slice(0, 200)}"; link "${linkTxt}"`, "NAV-06.png");
  // NAV-08
  const heading = await S(p).locator("h2").first().innerText().catch(() => "");
  const hFocus = await p.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, text: (e.textContent || "").trim().slice(0, 40), isHeading: !!e.closest("h1,h2,h3") || e.hasAttribute("tabindex") && /^H[1-3]$/.test(e.tagName) }; });
  await link.click(); await p.waitForTimeout(700);
  const after = await paneT(p); const activeItem = await p.locator(NAV + " [aria-current=page]").innerText().catch(() => "");
  rec("NAV-08", /This page is not available\./.test(t) && /your role|role cannot/.test(t) && linkTxt && /Account/.test(activeItem) && (hFocus.isHeading) ? "PASS" : "FAIL", `Blocked page text="${t.slice(0, 200)}" names the cause (role)=${/role/.test(t)}; link "${linkTxt}" opens "${activeItem}" (page text now "${after.slice(0, 40)}"); focus on the blocked page when it opened=${JSON.stringify(hFocus)} (spec: focus moves to the page heading "${norm(heading)}"); "cloning roadmap" wording absent=${!/roadmap/.test(t)}`, "NAV-06.png");
  await p.context().close();
}
{
  // NAV-07: collaborator
  const { page: p } = await open(b, "users");
  await openCatalog(p);
  await setRole(p, "Editor"); await setRole(p, "Collaborator");
  await resumeSettings(p);
  const items = await railItems(p), heads = await railHeads(p);
  const t = await paneT(p);
  // collaborator on a stored admin page (users)
  await shot(p, "NAV-07");
  const link = S(p).getByRole("link", { name: /Go to/ }).or(S(p).getByRole("button", { name: /Go to/ })).first();
  await link.click().catch(() => {}); await p.waitForTimeout(600);
  const acc = await paneT(p);
  const works = /Account/.test(acc.slice(0, 20)) && (await p.locator("#account-email").count()) === 1;
  const roleField = await p.locator("#account-role").inputValue().catch(() => "");
  rec("NAV-07", items.join() === "Account" && heads.join() === "User" && works ? "PASS" : "FAIL", `Collaborator: rail items=${JSON.stringify(items)}, headings=${JSON.stringify(heads)} (no empty Content model/Tools headings); stored Users & Groups page text="${t.slice(0, 90)}"; after the link, Account works=${works} (role field "${roleField}")`, "NAV-07.png");
  await p.context().close();
}
// NAV-09, NAV-10 (editor), NAV-11 (admin)
for (const [id, flagName, page, pageH] of [["NAV-09", "metadata-extraction", "Metadata extraction", "Metadata extraction"], ["NAV-10", "paragraphExtraction", "Paragraph extraction", "Paragraph extraction"]]) {
  const { page: p } = await open(b, "dashboard");
  await openCatalog(p); await setRole(p, "Editor"); await resumeSettings(p);
  await rail(p, page); await p.waitForTimeout(600);
  const openedOK = norm(await S(p).locator("h2").first().innerText()) === pageH;
  const itemsOn = await railItems(p);
  await openCatalog(p); await toggleFlag(p, flagName); await resumeSettings(p);
  const itemsOff = await railItems(p); const t = await paneT(p);
  const focusOff = await activeEl(p);
  await shot(p, id + "-off");
  const link = S(p).getByRole("link", { name: /Go to/ }).or(S(p).getByRole("button", { name: /Go to/ })).first();
  const linkTxt = await link.innerText().catch(() => "");
  // admin too
  await openCatalog(p); await setRole(p, "Admin"); await resumeSettings(p);
  const adminOff = await railItems(p);
  // on again
  await openCatalog(p); await toggleFlag(p, flagName); await resumeSettings(p);
  const adminOn = await railItems(p);
  const tOn = await paneT(p);
  await openCatalog(p); await setRole(p, "Editor"); await resumeSettings(p);
  const editorOn = await railItems(p);
  const ok = openedOK && itemsOn.includes(page) && !itemsOff.includes(page) && /This page is not available\./.test(t) && new RegExp(flagName.replace(".", "\\.")).test(t) && !adminOff.includes(page) && adminOn.includes(page) && editorOn.includes(page);
  rec(id, ok ? "PASS" : "FAIL", `Editor, flag on: "${page}" opens=${openedOK}, in rail=${itemsOn.includes(page)}; flag off: in rail for editor=${itemsOff.includes(page)}, open page replaced by "${t.slice(0, 170)}" (link "${linkTxt}"); admin with flag off: in rail=${adminOff.includes(page)}; flag on again: admin rail has it=${adminOn.includes(page)} (page text now "${tOn.slice(0, 40)}"), editor rail has it=${editorOn.includes(page)}`, id + "-off.png");
  await p.context().close();
}
{
  const { page: p } = await open(b, "preserve");
  const adminOn = await railItems(p);
  const opens = norm(await S(p).locator("h2").first().innerText().catch(() => ""));
  await openCatalog(p); await toggleFlag(p, "preserve.host"); await resumeSettings(p);
  const adminOff = await railItems(p); const t = await paneT(p);
  await shot(p, "NAV-11-off");
  const link = S(p).getByRole("link", { name: /Go to/ }).or(S(p).getByRole("button", { name: /Go to/ })).first();
  const linkTxt = await link.innerText().catch(() => "");
  await openCatalog(p); await toggleFlag(p, "preserve.host"); await resumeSettings(p);
  const adminOn2 = await railItems(p); const t2 = await paneT(p);
  await openCatalog(p); await setRole(p, "Editor"); await resumeSettings(p);
  const editor = await railItems(p);
  const ok = adminOn.includes("Preserve") && !adminOff.includes("Preserve") && /This page is not available\./.test(t) && /preserve\.host/.test(t) && adminOn2.includes("Preserve") && !editor.includes("Preserve");
  rec("NAV-11", ok ? "PASS" : "FAIL", `Admin: Preserve page "${opens}" in rail=${adminOn.includes("Preserve")}; preserve.host off: in rail=${adminOff.includes("Preserve")}, open page replaced by "${t.slice(0, 170)}" (link "${linkTxt}"); on again: in rail=${adminOn2.includes("Preserve")} (page text now "${t2.slice(0, 30)}"); editor rail has Preserve=${editor.includes("Preserve")}`, "NAV-11-off.png");
  await p.context().close();
}
rec("NAV2-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
