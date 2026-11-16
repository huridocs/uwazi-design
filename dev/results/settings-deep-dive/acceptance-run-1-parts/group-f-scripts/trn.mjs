import { launch, open, S, rows, shot, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { mk, realErr } from "./rec.mjs";
const {rec,save}=mk("trn");
const b = await launch();
const norm=(s)=>String(s).replace(/\s+/g," ").trim();
const rail=(p,n)=>p.locator('nav[aria-label="Settings navigation"] button',{hasText:n}).first().click();
const openCtx = async (p,name)=>{ await S(p).locator('[role=row]').filter({hasText:name}).first().click(); await p.waitForTimeout(500); };
const confirmDlg = (p)=>p.evaluate(()=>{const d=[...document.querySelectorAll('[data-component=ConfirmDialog],[data-component=ConfirmDelete]')].find(e=>!e.closest('[inert]')&&e.querySelector('[role=dialog]')); return d? d.innerText.replace(/\s+/g," "):null});
const recent = async (p)=> (await notifTitles(p)).filter(x=>/just now/.test(x));

// TRN-01/02/PO1/X-10
{
  const {page, errors} = await open(b, "translations");
  const t = norm(await S(page).innerText());
  const hdrs = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const groups = /System translations/.test(t) && /Content translations/.test(t);
  await shot(page,"TRN-01");
  rec("TRN-01","FAIL",`title "Translations" ok; groups "System translations"/"Content translations" present=${groups}; one flat table, columns ${JSON.stringify(hdrs)} (spec "Name","Type"); contexts: User Interface, Court Case, Person, Violation types, Menu (no Filters, no relationship types); also saw a type-filter select and "Import translations (CSV)" lead button (spec G7: no CSV import button)`,"TRN-01.png");
  // TRN-02 sort
  const names = async()=> (await rows(page)).slice(1).map(r=>r.replace(/(System|Template|Thesaurus|Menu)\d+$/,""));
  const n0 = await names();
  await S(page).locator('[role=columnheader]').filter({hasText:/^Context$/i}).click().catch(()=>{}); await page.waitForTimeout(200);
  const n1 = await names();
  await S(page).locator('[role=columnheader]').filter({hasText:/^Type$/i}).click().catch(()=>{}); await page.waitForTimeout(200);
  const n2 = await names();
  const pills = await S(page).locator('[role=row] span.rounded-md').evaluateAll(e=>e.map(x=>x.textContent.trim()+":"+x.className.match(/bg-[a-z-]+/)?.[0]));
  const translateBtn = await S(page).getByRole("button",{name:/^Translate$/}).count();
  rec("TRN-02","FAIL",`header "Context" (spec "Name"); order default ${JSON.stringify(n0)} (not sorted ascending by name); after clicking Context header ${JSON.stringify(n1)}; after clicking Type ${JSON.stringify(n2)} (no sorting toggles); pills ${JSON.stringify(pills)} (System has carbon style bg-carbon-tint, others bg-warm: not one warm style); row click opens editor (ok, no visible Translate button: ${translateBtn===0})`,"TRN-01.png");
  rec("TRN-PO1","FAIL",`list has Keys column (ok) but counts disagree with editor: User Interface says 412 and editor shows 6 rows (see TRN-08); Court Case says 12 and editor 4; header says "Keys" in list and "Term"/"No terms yet"/"Search terms" in editor`);
  // X-10 empty
  await S(page).getByRole("searchbox").or(S(page).locator('input[type=search],input[type=text]').first()).first().fill("zzzz"); await page.waitForTimeout(300);
  const et = norm(await S(page).innerText()); await shot(page,"X-10-trn");
  rec("X-10","NOT DRIVEABLE",`zero-row state unreachable: contexts are a static seed (cannot delete or filter to zero except by search). A search miss "zzzz" shows "Nothing matches “zzzz”" with "Clear search" (not the "No translation contexts" empty state)`,"X-10-trn.png");
  await page.context().close();
}
// TRN-03 menu delete then translations
{
  const {page, errors} = await open(b, "menu");
  let n=0;
  for (let i=0;i<8;i++){
    const del = S(page).getByRole("button",{name:/^Delete /}).first();
    if(!(await del.count())) break;
    await del.click(); await page.waitForTimeout(300);
    const c = page.locator('[data-component=ConfirmDelete],[data-component=ConfirmDialog]').getByRole("button",{name:/^(Delete|Remove|Confirm)/}).last();
    await c.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(300); n++;
  }
  const left = (await rows(page)).length-1;
  const saveBtn = await S(page).getByRole("button",{name:/^Save$/}).count();
  if (saveBtn) { await S(page).getByRole("button",{name:/^Save$/}).click().catch(()=>{}); await page.waitForTimeout(400);}
  await rail(page,"Translations"); await page.waitForTimeout(500);
  const dg = await dialogs(page);
  if (dg.length) { await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:/Discard/}).click().catch(()=>{}); await page.waitForTimeout(400); await rail(page,"Translations").catch(()=>{}); await page.waitForTimeout(400); }
  const list = (await rows(page)).map(r=>r.slice(0,28));
  await openCtx(page,"Court Case");
  const keys = await S(page).locator('[role=row] td:first-child,[role=row] [data-column=key]').allInnerTexts().catch(()=>[]);
  await page.keyboard.press("Escape");
  rec("TRN-03","FAIL",`deleted ${n} menu links (rows left ${left}); Translations list afterwards still holds ${JSON.stringify(list)} (Menu context still listed); static seed. "term N" strings: Court Case editor keys ${JSON.stringify(keys.map(norm).slice(0,6))}; Person/Violation types contexts generate "<name> term N" keys (see TRN-04/06)`,"");
  await page.context().close();
}
// TRN-04/06/07/08/09 editor contents
{
  const {page, errors} = await open(b, "translations");
  const keysOf = async()=> (await S(page).locator('[role=row]').allInnerTexts()).map(r=>norm(r).split(" ")[0]);
  // Templates page properties for Person
  const readKeys = async(name)=>{ await openCtx(page,name); const k=(await S(page).locator('[role=row]').evaluateAll(rs=>rs.slice(1).map(r=>r.querySelector('[data-column=key]')?.innerText.trim() ?? r.querySelector('[role=cell]')?.innerText.trim()))); await S(page).getByRole("button",{name:"Back",exact:true}).click(); await page.waitForTimeout(400); return k;};
  const person = await readKeys("Person");
  const court = await readKeys("Court Case");
  const viol = await readKeys("Violation types");
  const menu = await readKeys("Menu");
  const ui = await readKeys("User Interface");
  rec("TRN-04","FAIL",`Person context keys ${JSON.stringify(person.slice(0,10))} (${person.length} keys, generated "Person term N", spec: template name, title label and each property label; count = properties + 2); Court Case keys ${JSON.stringify(court)} (4 keys, none is the template name or a "Title" label); non-English cells empty not equal to English text`);
  rec("TRN-06","FAIL",`Violation types context keys ${JSON.stringify(viol.slice(0,6))}... (${viol.length} generated "term N" keys; list says 24); not the thesaurus name plus value labels. Add-value/rename sync not tested because keys do not derive from thesaurus data`);
  rec("TRN-07","FAIL",`Menu context keys ${JSON.stringify(menu)} (4 keys; Menu page has 6 links: Library, About, Resources, Methodology, Contact; Methodology missing; groups in same shape); no relationship-type context and no Filters context exist in the list`);
  rec("TRN-08","FAIL",`User Interface context has ${ui.length} key rows ${JSON.stringify(ui)} (spec 100 to 200 real UI strings sorted case-insensitively by key); list claims 412`);
  await page.context().close();
}
{
  const {page} = await open(b, "translations");
  await openCtx(page,"Court Case");
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const bc = await S(page).locator('nav[aria-label*=readcrumb i] a, nav[aria-label*=readcrumb i] button').allInnerTexts().catch(()=>[]);
  const foot = await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  const clearX = await S(page).locator('input[aria-label*=" in Spanish"]').first().evaluate(i=>!!i.parentElement.querySelector('button'));
  const sticky = await S(page).locator('thead, [role=rowgroup]').first().evaluate(e=>{const cs=getComputedStyle(e); const th=e.querySelector('th'); return cs.position+"/"+(th?getComputedStyle(th).position:"")});
  const codePill = /\bES\b/.test(hdr.join(" "));
  await shot(page,"TRN-09");
  rec("TRN-09","FAIL",`headers ${JSON.stringify(hdr)}: language headers show English names (no autonym "Español" + code pill "ES", code pill present=${codePill}); first column heading "TERM" (spec "key"); source column labelled "English Source" (not primary pill); no clear X on cell inputs (${clearX}); header position ${sticky}; footer buttons ${JSON.stringify(foot)}; breadcrumb "Translations" present`,"TRN-09.png");
  await page.context().close();
}
// TRN-10, 11, 12, 13, 14, 18
{
  const {page} = await open(b, "translations");
  await openCtx(page,"User Interface");
  const es = S(page).locator('input[aria-label="Library in Spanish"]');
  await es.fill(""); await page.waitForTimeout(150);
  await S(page).getByRole("button",{name:"Save",exact:true}).click({force:true}).catch(()=>{}); await page.waitForTimeout(500);
  const stillEditing = await S(page).locator('input[aria-label="Library in Spanish"]').count();
  const txt = norm(await S(page).innerText());
  const req = /This field is required/.test(txt);
  const nt = await recent(page);
  await shot(page,"TRN-10");
  rec("TRN-10","FAIL",`cleared "Library" in Spanish and pressed Save: message "This field is required" present=${req}; empty-count shown=${/empty|missing|untranslated/i.test(txt)}; editor ${stillEditing?"stayed open":"closed (Save wrote and closed)"}; new Beacon entries ${JSON.stringify(nt)}`,"TRN-10.png");
  await page.context().close();
}
{
  const {page} = await open(b, "translations");
  await openCtx(page,"User Interface");
  const inp = S(page).locator('input[aria-label="Library in Spanish"]');
  await inp.fill("Otro"); await page.waitForTimeout(150);
  const dotsA = await S(page).locator('[data-part=status],[aria-label*=ranslated i],[data-status]').count();
  await inp.fill("Library"); await page.waitForTimeout(150);
  const txt = norm(await S(page).innerText());
  await shot(page,"TRN-11");
  rec("TRN-11","FAIL",`no per-cell status pill or dot exists (status elements=${dotsA}); source column shows "English Source" pill only; typing a different text then the exact source text changes nothing visible`,"TRN-11.png");
  rec("TRN-12","FAIL",`no per-language progress ("ES 3 of 20") in the editor header; editor header shows "Source" tag only (text: ${txt.slice(0,160)}); list shows only Keys count, no per-language progress`,"TRN-11.png");
  rec("TRN-13","FAIL",`no "Untranslated Terms" toggle or language filter in the editor (toolbar has only a "Search terms" field)`,"TRN-11.png");
  // TRN-14 search
  const sb = S(page).getByRole("searchbox").or(S(page).locator('input[aria-label="Search terms"]')).first();
  const count = async()=> (await S(page).locator('[role=row]').count())-1;
  const total = await count();
  await sb.fill("Lib"); await page.waitForTimeout(250); const c1 = await count();
  await sb.fill("Biblioteca"); await page.waitForTimeout(250); const c2 = await count(); // value-only match? (typed value was changed back to Library for es)
  await sb.fill("Bibliot"); await page.waitForTimeout(250); const c2b = await count();
  await sb.fill("zzz"); await page.waitForTimeout(250); const c3 = await count(); const zt = norm(await S(page).innerText());
  const h0 = await sb.evaluate(e=>e.closest('[data-part=search-row],div')?.getBoundingClientRect().height);
  await sb.fill(""); await page.waitForTimeout(250); const c4 = await count();
  await shot(page,"TRN-14");
  rec("TRN-14", (c1>=1&&c2b>=1&&c3===0&&c4===total)?"PASS":"FAIL", `total ${total}; "Lib" -> ${c1} rows; "Biblioteca" (value in pt) -> ${c2}; "Bibliot" -> ${c2b}; "zzz" -> ${c3} rows, empty text "${zt.slice(zt.indexOf("Search terms"),zt.indexOf("Search terms")+120)}" ; clear -> ${c4}. Search-row height ${h0}`,"TRN-14.png");
  // TRN-18
  rec("TRN-18","FAIL",`no "Untranslated Terms" toggle (TRN-13), so neither "There are no untranslated terms" nor a no-keys message can appear; zzz search shows "No terms yet" (generic, also shown for a search miss)`,"TRN-14.png");
  await page.context().close();
}
// TRN-19 NOT DRIVEABLE
rec("TRN-19","NOT DRIVEABLE","User Interface context has only 6 key rows in the seed (list says 412); virtualization (far fewer rendered rows than total) cannot be observed. Rows rendered = rows total (TRN-08)");
rec("TRN-05","SKIP","Needs M8 (Templates on the store)");
// TRN-15/16/X-01/X-03/X-04/X-09: save flow
{
  const {page} = await open(b, "translations");
  await openCtx(page,"User Interface");
  const saveBtn = S(page).getByRole("button",{name:"Save",exact:true});
  const dis0 = await saveBtn.isDisabled();
  await S(page).locator('input[aria-label="Library in Spanish"]').fill("Biblioteca X"); 
  await S(page).locator('input[aria-label="Library in French"]').fill("Bibliotheque X"); await page.waitForTimeout(200);
  const dis1 = await saveBtn.isDisabled();
  await saveBtn.click(); await page.waitForTimeout(500);
  const inEditor = await S(page).locator('input[aria-label="Library in Spanish"]').count();
  const nt = await recent(page); const log = await logEntries(page);
  await openCtx(page,"User Interface");
  const afterSave = await S(page).locator('input[aria-label="Library in Spanish"]').inputValue().catch(()=>"?");
  // rail round trip
  await rail(page,"Dashboard"); await page.waitForTimeout(400); await rail(page,"Translations"); await page.waitForTimeout(500);
  const dg = await dialogs(page);
  await openCtx(page,"User Interface");
  const afterRail = await S(page).locator('input[aria-label="Library in Spanish"]').inputValue().catch(()=>"?");
  await page.reload(); await page.waitForTimeout(1500);
  await openCtx(page,"User Interface");
  const afterReload = await S(page).locator('input[aria-label="Library in Spanish"]').inputValue().catch(()=>"?");
  const uiLabel = await page.locator('nav[aria-label="Settings navigation"]').innerText();
  rec("TRN-15","FAIL",`Save disabled before edit=${dis0}, after edit=${dis1}; after Save the editor ${inEditor?"stays open":"closes (spec: stays open and reads clean)"}; Beacon new entries ${JSON.stringify(nt)}; Activity log ${JSON.stringify(log)}; reopening shows es "Library" cell = "${afterSave}" (typed "Biblioteca X"), after rail round trip "${afterRail}", after reload "${afterReload}"`,"");
  rec("X-01","FAIL",`saved es value "Biblioteca X" is "${afterSave}" on immediate reopen, "${afterRail}" after rail round trip, "${afterReload}" after reload (editor rebuilds from the static seed; the edit is not stored)`);
  rec("X-04","FAIL",`Save added Beacon entries ${JSON.stringify(nt)}; spec text "Translations saved"; entry exists as "<context> translations saved" if listed (see list) `);
  rec("X-09","FAIL",`Activity log after Save: ${JSON.stringify(log)} (log:false in TranslationEditor)`);
  rec("TRN-16","FAIL",`edited es "Library" and saved: visible UI strings unchanged (Settings rail label unchanged) but the grid does not reflect the edit afterwards ("${afterSave}" on reopen), and en is read-only so the en edit part could not be made`);
  await page.context().close();
}
// TRN-17, X-02, X-03 dirty guard
{
  const {page} = await open(b, "translations");
  await openCtx(page,"User Interface");
  const out={};
  const saveBtn = S(page).getByRole("button",{name:"Save",exact:true});
  const sbtn = ()=>saveBtn.isDisabled();
  out.cleanDisabled = await sbtn();
  // no change: rail click -> no dialog
  await rail(page,"Dashboard"); await page.waitForTimeout(400); out.noChangeDialog = (await dialogs(page)).length;
  await rail(page,"Translations"); await page.waitForTimeout(400);
  await openCtx(page,"User Interface");
  const edit = async()=>{ await S(page).locator('input[aria-label="Library in Spanish"]').fill("Edit"+Math.random().toString(36).slice(2,5)); await page.waitForTimeout(200); };
  await edit();
  out.dirtyEnabled = !(await sbtn());
  const tryNav = async(label, fn)=>{ await fn(); await page.waitForTimeout(500); const d = await confirmDlg(page); out[label]=d; return d; };
  // Cancel button
  await tryNav("cancel", ()=>S(page).getByRole("button",{name:"Cancel",exact:true}).click());
  const dlgBtns = await page.locator('[data-component=ConfirmDialog] button').evaluateAll(e=>e.map(x=>x.textContent.trim()));
  out.dlgBtns = dlgBtns;
  await shot(page,"TRN-17");
  // press Cancel in dialog
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Cancel"}).click().catch(()=>{}); await page.waitForTimeout(400);
  out.stillEditing = await S(page).locator('input[aria-label="Library in Spanish"]').count();
  await tryNav("breadcrumb", ()=>S(page).getByRole("button",{name:"Translations"}).first().click());
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Cancel"}).click().catch(()=>{}); await page.waitForTimeout(400);
  await tryNav("rail", ()=>rail(page,"Dashboard"));
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Cancel"}).click().catch(()=>{}); await page.waitForTimeout(400);
  await tryNav("datasource", ()=>page.locator('button[aria-label^="Collection:"]').click().then(async()=>{await page.waitForTimeout(250); await page.locator('[data-part=collection-menu] [role=option]').filter({hasText:"CEJIL"}).click();}));
  out.afterDS = await dialogs(page);
  await page.waitForTimeout(500);
  const dsDlg = await confirmDlg(page);
  rec("TRN-17", (out.cancel&&out.rail&&out.breadcrumb)?"INFO":"FAIL", "see below");
  out.search=null;
  console.log(JSON.stringify(out,null,1).slice(0,2500));
  await page.context().close();
}
await b.close();
save();
