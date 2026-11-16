import { launch, open, S, rows, shot, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { mk, realErr } from "./rec.mjs";
const {rec,save}=mk("lng");
const b = await launch();
const txt = (p)=>S(p).innerText().then(t=>t.replace(/\s+/g," "));
const modalTxt = (p)=>p.evaluate(()=>[...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]')).map(e=>e.innerText).join(" || ").replace(/\s+/g," "));

// ---- LNG-01, 02, 18, PO2, X-checks on a fresh context
{
  const {page, errors} = await open(b, "languages");
  const t = await txt(page);
  const rs = await rows(page);
  const hasCardHeader = await S(page).locator("h3,h4,[data-part=card-header],[data-part=header]").filter({hasText:/^Active languages$/}).count()>0;
  const keyFmt = rs.some(r=>/Spanish \(es\)/.test(r));
  const defaults = (await S(page).locator("[role=row]").filter({hasText:/Default$|Default\d/}).count());
  const btn = await S(page).getByRole("button",{name:"Install Language(s)"}).count();
  const colHdrs = await S(page).locator('[role=columnheader]').allTextContents();
  await shot(page,"LNG-01");
  rec("LNG-01", (hasCardHeader&&keyFmt&&btn===1&&colHdrs.length===1)?"PASS":"FAIL", `title "Languages" ok; no card header "Active languages" (${hasCardHeader}); rows read "${rs[1]}" not "Spanish (es)"; columns ${JSON.stringify(colHdrs)} (spec: one Language column, saw separate Translations/Default columns); footer button "Install Language(s)" count=${btn} (saw "Install language"); Default badges=${defaults}`, "LNG-01.png");
  // sort toggle
  const first = async()=> (await rows(page)).slice(1).map(r=>r.split(" ")[0]);
  const before = await first();
  await S(page).locator('[role=columnheader]').first().click(); await page.waitForTimeout(200);
  const after = await first();
  rec("LNG-01b(sort)", JSON.stringify(before)!==JSON.stringify(after)?"INFO":"INFO", `default order ${before.join(",")}; after clicking Language header ${after.join(",")}`);
  // LNG-02 row menu
  const rowEls = S(page).locator('[role=row]');
  const n = await rowEls.count();
  const menuBtn = await S(page).locator('[role=row] button[aria-haspopup],[role=row] button[aria-label*="menu" i],[role=row] button[aria-label*="actions" i]').count();
  const acts = await S(page).locator('[role=row] [data-component=RowActions] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent));
  await shot(page,"LNG-02");
  rec("LNG-02", "FAIL", `no row menu (menu buttons=${menuBtn}). Row actions are inline icon buttons: ${JSON.stringify(acts.slice(0,6))}...; default row (English) has "Reset English" and no Uninstall (ok) but no "Make default" menu; non-default rows show "Reset" for Portuguese which has no predefined file (spec: Reset only for ar, el, en, es, fr, ko, my, ru, th, tr, uk); default is changed by a separate "Set" text button`, "LNG-02.png");
  // PO2
  const es = rs.find(r=>/Spanish/.test(r)); const en=rs.find(r=>/^English/.test(r));
  rec("LNG-PO2", /Español/.test(es)&&!/English English/.test(en)?"PASS":"FAIL", `Spanish row: "${es}"; English row: "${en}"`);
  // LNG-18
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  const saveBtns = await page.getByRole("button",{name:/^save$/i}).count();
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const d1 = await dialogs(page);
  await S(page).getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click(); await page.waitForTimeout(300);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const rsA = await rows(page);
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Dashboard"}).first().click(); await page.waitForTimeout(500);
  const d2 = await dialogs(page);
  rec("LNG-18", (d1.length===0&&d2.length===0&&saveBtns===0)?"PASS":"FAIL", `no Save button (${saveBtns}); after Escape dialogs=${JSON.stringify(d1)}; German installed row present=${rsA.some(r=>/German/.test(r))}; rail click to Dashboard dialogs=${JSON.stringify(d2)}`);
  rec("X-02/X-03", "N/A", "Languages: X-02 and X-03 do not apply per page's Applies line");
  rec("X-05/X-10/X-11/X-12","N/A","Languages: do not apply per Applies line (X-05 replaced by LNG-13/14)");
  await page.context().close();
}

// ---- LNG-03..06 install modal
{
  const {page, errors} = await open(b, "languages");
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(400);
  const mt = await modalTxt(page);
  const hasNote = /This action may take some time while we add the extra language to the entire collection\./.test(mt);
  const radio = await page.locator('[role=dialog] [role=radio], [role=dialog] input[type=radio]').count();
  const placeholder = await page.locator('[role=dialog] input').first().getAttribute("placeholder");
  const btns = await page.locator('[data-component=InstallLanguageDialog]').getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute('aria-label')||x.textContent.trim()));
  const dialogName = await page.locator('[role=dialog]').first().getAttribute("aria-label");
  await shot(page,"LNG-03");
  rec("LNG-03","FAIL",`modal title "Install language" (spec "Install Language(s)"); note text present=${hasNote}; radios All/Selected=${radio}; search placeholder "${placeholder}" (spec "Search"); legend "* Available default translation" present=${/Available default translation/.test(mt)}; footer Cancel/Install buttons absent (dialog buttons: ${JSON.stringify(btns.slice(0,4))} ... one per row); each row has its own Install button`,"LNG-03.png");
  // LNG-04
  const items = await page.locator('[role=dialog] [data-part=language]').allInnerTexts();
  const names = items.map(s=>s.replace(/\s+/g," ").trim());
  const star = names.filter(n=>n.startsWith("*"));
  rec("LNG-04","FAIL",`${names.length} rows listed (spec 32 minus installed; catalog in app has 32 entries so expected 27); installed languages listed? ${names.some(n=>/Spanish|English|French|Arabic|Portuguese/.test(n))}; rows read "${names[0]}" (spec "<name> (<key>)"); leading * rows=${star.length} (spec ar... not installed: el, ko, my, ru, th, tr, uk = 7 expected); order first 5: ${names.slice(0,5).join(" / ")}`,"LNG-03.png");
  // LNG-05
  const input = page.locator('[role=dialog] input').first();
  const list = async()=> (await page.locator('[role=dialog] [data-part=language]').allInnerTexts()).map(s=>s.replace(/\s+/g," ").trim());
  await input.fill("ger"); await page.waitForTimeout(200); const g1=await list();
  await input.fill("GERMAN"); await page.waitForTimeout(200); const g2=await list();
  await input.fill("de"); await page.waitForTimeout(200); const g3=await list();
  await input.fill("zzz"); await page.waitForTimeout(200); const g4=await modalTxt(page);
  const clearX = await page.locator('[role=dialog]').getByRole("button",{name:/clear/i}).count();
  await shot(page,"LNG-05");
  rec("LNG-05","FAIL",`"ger" -> ${JSON.stringify(g1)}; "GERMAN" -> ${JSON.stringify(g2)}; "de" -> ${g3.length} rows (${g3.slice(0,4).join(" / ")}); "zzz" shows "${(g4.match(/No languages match your search\.|No items available/)||["?"])[0]}" (spec "No items available"); clear X buttons=${clearX}`,"LNG-05.png");
  // LNG-06
  await input.fill("");
  await page.waitForTimeout(200);
  const row = page.locator('[role=dialog] [data-part=language]').filter({hasText:"German"}).first();
  await row.click({force:true}).catch(()=>{}); await page.waitForTimeout(200);
  const after = await list();
  const installBtn = await page.locator('[role=dialog]').getByRole("button",{name:/^Install \(\d\)/}).count();
  rec("LNG-06","FAIL",`clicking a row does not select it (German still listed, "Install (n)" button count=${installBtn}); no "Selected (n)" radio; installation is immediate per-row "Install German" button`,"LNG-05.png");
  await page.context().close();
}

// ---- LNG-07/08: install and observe
{
  const {page, errors} = await open(b, "languages");
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click();
  await page.waitForTimeout(100);
  const rs0 = await rows(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const rs1 = await rows(page);
  const marker = rs1.some(r=>/Installing/i.test(r));
  const beacon = await page.locator('button[aria-label^="Notifications"]').getAttribute("aria-label").catch(()=>"?");
  await page.waitForTimeout(3500);
  const nt = (await notifTitles(page)).filter(x=>/just now/.test(x));
  await shot(page,"LNG-07");
  rec("LNG-07","FAIL",`German row appears at once with 0% (row "${rs1.find(r=>/German/.test(r))}") but no "Installing" marker (${marker}); Beacon aria "${beacon}"; new Beacon entries after 3.5s: ${JSON.stringify(nt)} (one plain "German installed" entry, no running task; spec: running task "Installing languages", then "Languages installed successfully" once)`,"LNG-07.png");
  rec("LNG-08","FAIL","no Installing state exists, so Uninstall cannot be shown disabled while installing; row has an enabled Uninstall button immediately after install","LNG-07.png");
  rec("LNG-09","NOT DRIVEABLE","no dev panel with a 'fail next install' switch exists in the app (grep and UI)");
  rec("LNG-17","NOT DRIVEABLE","no dev panel failure switch exists");
  // X-04, X-09 on the install
  const log = await logEntries(page);
  rec("X-04","FAIL",`install added new Beacon entries ${JSON.stringify(nt)}; spec expects a Beacon entry with the page's quoted text ("Languages installed successfully")`);
  rec("X-09","FAIL",`Activity log after install: ${JSON.stringify(log)} (record() is called with log:false in LanguagesPage; no Activity log entry)`);
  await page.context().close();
}

// ---- LNG-10, 11, 12, 13, 14, 15, 16, PO1, PO3
{
  const {page, errors} = await open(b, "languages");
  // LNG-11 make default
  await S(page).locator('[role=row]').filter({hasText:"Spanish"}).getByRole("button",{name:"Set",exact:true}).click(); await page.waitForTimeout(400);
  const mt = await modalTxt(page); await shot(page,"LNG-11");
  const mentions = /source for later installs|reference for .untranslated|untranslated/i.test(mt);
  // cancel
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Cancel"}).click(); await page.waitForTimeout(300);
  const stillEn = (await rows(page)).find(r=>/Default/.test(r));
  await S(page).locator('[role=row]').filter({hasText:"Spanish"}).getByRole("button",{name:"Set",exact:true}).click(); await page.waitForTimeout(400);
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Make default"}).click(); await page.waitForTimeout(500);
  const def = (await rows(page)).filter(r=>/Default/.test(r));
  const nt = (await notifTitles(page)).filter(x=>/just now/.test(x)); const log = await logEntries(page);
  rec("LNG-11", (mentions&&/Default language change success/.test(nt.join(" "))&&log.length>0)?"PASS":"FAIL", `confirm text "${mt}"; names effect on later installs/untranslated=${mentions}; Cancel left default "${stillEn?.slice(0,30)}"; after confirm Default rows=${JSON.stringify(def.map(r=>r.slice(0,25)))}; Beacon notifications ${JSON.stringify(nt)} (spec "Default language change success"); Activity log ${JSON.stringify(log)}`,"LNG-11.png");
  // LNG-12 translations editor source column
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Translations"}).first().click(); await page.waitForTimeout(500);
  await S(page).locator('[role=row]').filter({hasText:"Person"}).first().click(); await page.waitForTimeout(500);
  const hdr = await S(page).locator('[role=columnheader]').allInnerTexts();
  await shot(page,"LNG-12");
  rec("LNG-12", "FAIL", `after Make default=Spanish, Translations editor headers ${JSON.stringify(hdr.map(h=>h.replace(/\s+/g," ")))}; editor reads the static seedLanguages, so English remains Source and Spanish stays an editable column`,"LNG-12.png");
  // LNG-PO3
  await page.context().close();
}
{
  const {page, errors} = await open(b, "languages");
  // LNG-13 reset
  await S(page).getByRole("button",{name:"Reset Spanish"}).click(); await page.waitForTimeout(400);
  const mt = await modalTxt(page); await shot(page,"LNG-13");
  const hasInput = await page.locator('[data-component=ConfirmDelete] input').count();
  const btns = await page.locator('[data-component=ConfirmDelete]').getByRole("button").allTextContents();
  rec("LNG-13","FAIL",`dialog text: "${mt}"; spec title "Are you sure?" + band "Other users will be affected by this action!", body "You are about to reset a language.", "Please type in CONFIRM:" input (text inputs=${hasInput}), buttons "No, cancel"/"Reset" (saw ${JSON.stringify(btns)}); no CONFIRM gate, no key count`,"LNG-13.png");
  // try confirming: does Reset enable w/o typing
  const resetBtn = page.locator('[data-component=ConfirmDelete]').getByRole("button",{name:"Reset"});
  const dis = await resetBtn.isDisabled().catch(()=>"?");
  rec("LNG-13b","INFO",`Reset button disabled with empty input = ${dis}`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // LNG-14 uninstall
  await S(page).getByRole("button",{name:"Uninstall French"}).click(); await page.waitForTimeout(400);
  const ut = await modalTxt(page); await shot(page,"LNG-14");
  const inp = page.locator('[role=dialog] input').first();
  const ph = await inp.getAttribute("placeholder").catch(()=>null);
  const accept = page.locator('[data-component=ConfirmDelete]').getByRole("button",{name:"Uninstall"});
  const d0 = await accept.isDisabled();
  await inp.fill("confirm"); const d1 = await accept.isDisabled();
  await inp.fill("CONFIRM "); const d2 = await accept.isDisabled();
  await inp.fill("CONFIRM"); const d3 = await accept.isDisabled();
  rec("LNG-14","FAIL",`dialog text "${ut}"; accept disabled: empty=${d0}, "confirm"=${d1}, "CONFIRM "=${d2}, "CONFIRM"=${d3}. Typing gate works; but title/band/body differ from spec ("Are you sure?", "Other users will be affected by this action!", "You are about to uninstall a language."), and content counts for the language: ${/record|key/i.test(ut)}`,"LNG-14.png");
  // X-07 axe on dialog open
  const ax = await axe(page);
  const role = await page.locator('[role=dialog]').first().getAttribute("aria-label")||await page.locator('[role=dialog]').first().getAttribute("aria-labelledby");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const focus = await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")||document.activeElement?.tagName);
  rec("X-07a","INFO",`axe (pane, uninstall dialog open) ${JSON.stringify(ax)}; dialog accessible name attr "${role}"; focus after Escape: ${focus}`);
  // confirm uninstall flow LNG-16
  await S(page).getByRole("button",{name:"Uninstall French"}).click(); await page.waitForTimeout(400);
  await page.locator('[role=dialog] input').first().fill("CONFIRM");
  await page.locator('[data-component=ConfirmDelete]').getByRole("button",{name:"Uninstall"}).click(); await page.waitForTimeout(500);
  const rs = await rows(page); const nt = (await notifTitles(page)).filter(x=>/just now/.test(x));
  const log = await logEntries(page);
  rec("LNG-16","FAIL",`French row removed=${!rs.some(r=>/French/.test(r))}; notifications ${JSON.stringify(nt)} (spec task "Uninstalling language" then "Language uninstalled successfully"); Activity log ${JSON.stringify(log)}`);
  await page.waitForTimeout(100);
  // Translations editor loses column?
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Translations"}).first().click(); await page.waitForTimeout(500);
  await S(page).locator('[role=row]').filter({hasText:"Person"}).first().click(); await page.waitForTimeout(500);
  const hdr = await S(page).locator('[role=columnheader]').allInnerTexts();
  rec("LNG-16b","INFO",`Translations editor headers after uninstalling French: ${JSON.stringify(hdr.map(h=>h.replace(/\s+/g," ")))}`);
  await page.context().close();
}
// LNG-10 and 21 style: install German, check Translations editor
{
  const {page, errors} = await open(b, "languages");
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click(); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Translations"}).first().click(); await page.waitForTimeout(500);
  await S(page).locator('[role=row]').filter({hasText:"Person"}).first().click(); await page.waitForTimeout(500);
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(h=>h.replace(/\s+/g," "));
  await shot(page,"LNG-10");
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Dashboard"}).first().click().catch(()=>{}); 
  await page.waitForTimeout(600);
  const dash = await S(page).innerText().then(t=>t.replace(/\s+/g," ").slice(0,400));
  rec("LNG-10","FAIL",`after installing German, Translations editor headers ${JSON.stringify(hdr)} (no German column; editor uses static seedLanguages). Dashboard text: "${dash.slice(0,300)}"`,"LNG-10.png");
  await page.context().close();
}
// LNG-15
{
  const {page, errors} = await open(b, "translations");
  await S(page).locator('[role=row]').filter({hasText:"User Interface"}).first().click(); await page.waitForTimeout(500);
  const inputs = await S(page).locator('input[aria-label*=" in Spanish"]').count();
  rec("LNG-15","FAIL",`Translations User Interface editor opens with ${inputs} Spanish inputs; edit/Reset flow: Reset dialog has no key counts and Reset only logs; nothing restores System keys (no translation store). Reset es notification shows: see LNG-13/14 evidence`,"");
  await page.context().close();
}
// LNG-PO1, LNG-PO3
{
  const {page} = await open(b, "languages");
  const pct = (await rows(page)).map(r=>r.replace(/\s+/g," ").slice(0,40));
  rec("LNG-PO1","FAIL",`percentages are static seed values (${JSON.stringify(pct.slice(1))}); a newly installed language starts at 0% but it is not derived from a Translations store (Translations edits do not change it; see TRN-15)`);
  await page.context().close();
}
{
  const {page} = await open(b, "languages");
  const pickersBefore = await page.evaluate(()=>[...document.querySelectorAll("button,select")].filter(e=>/language/i.test(e.getAttribute("aria-label")||"")).map(e=>(e.getAttribute("aria-label")||"")+":"+(e.textContent||"").trim()));
  const titleBefore = await page.locator('nav[aria-label="Settings navigation"]').innerText();
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click(); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await S(page).locator('[role=row]').filter({hasText:"German"}).getByRole("button",{name:"Set",exact:true}).click(); await page.waitForTimeout(300);
  await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:"Make default"}).click(); await page.waitForTimeout(300);
  const pickersAfter = await page.evaluate(()=>[...document.querySelectorAll("button,select")].filter(e=>/language/i.test(e.getAttribute("aria-label")||"")).map(e=>(e.getAttribute("aria-label")||"")+":"+(e.textContent||"").trim()));
  const titleAfter = await page.locator('nav[aria-label="Settings navigation"]').innerText();
  const same = titleBefore===titleAfter && JSON.stringify(pickersBefore)===JSON.stringify(pickersAfter);
  rec("LNG-PO3", same?"PASS":"FAIL", `Installed German and made it default. Interface pickers before ${JSON.stringify(pickersBefore)} after ${JSON.stringify(pickersAfter)}; rail text unchanged=${titleBefore===titleAfter}. (Edit-a-System-key part not drivable: translations editor save writes no store; UI strings cannot change.)`);
  await page.context().close();
}
// LNG-19 phone, X-06
{
  const {page, errors} = await open(b, "languages", "mobile");
  await shot(page,"LNG-19");
  const sw = await page.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
  const cardTxt = (await S(page).innerText()).replace(/\s+/g," ");
  await S(page).getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(400);
  const inst = await page.evaluate(()=>{const d=document.querySelector('[data-component=InstallLanguageDialog] [role=dialog]'); if(!d) return null; const r=d.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top)}});
  await shot(page,"LNG-19b");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await S(page).getByRole("button",{name:"Reset Spanish"}).click(); await page.waitForTimeout(500);
  const rst = await page.evaluate(()=>{const d=document.querySelector('[data-component=ConfirmDelete] [role=dialog]'); if(!d) return null; const r=d.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top)}});
  const btns = await page.locator('[data-component=ConfirmDelete] button').evaluateAll(e=>e.map(x=>{const r=x.getBoundingClientRect();return x.textContent.trim()+":"+Math.round(r.width)+"x"+Math.round(r.height)}));
  await shot(page,"LNG-19c");
  rec("LNG-19","FAIL",`no horizontal scroll (${JSON.stringify(sw)}); rows are cards but show name, native name and Default badge only, no key (spec "name, key"), and actions are inline icon buttons (Reset, Uninstall) plus a text "Set", no row menu; install modal is full screen ${JSON.stringify(inst)} (ok); Reset dialog is a centered card ${JSON.stringify(rst)}, not a sheet/full screen, with buttons ${JSON.stringify(btns)} (28px high)`,"LNG-19c.png");
  rec("X-06","FAIL",`Languages on phone: no horizontal scroll and rows are cards with actions reachable (pass parts, shot LNG-19.png), but the Reset/Uninstall/Make-default dialogs are centered cards ${JSON.stringify(rst)} with 28px-high buttons rather than sheets or full screen (reading of "dialogs are sheets or full screen")`,"LNG-19c.png");
  await page.context().close();
}
{ // X-13 corpus
  const {page, errors} = await open(b, "languages");
  const sample = (await rows(page)).map(r=>r.slice(0,22));
  await switchTo(page,"CEJIL"); await toSettings(page,"Languages"); await page.waitForTimeout(800);
  const cej = (await rows(page)).map(r=>r.slice(0,22));
  await shot(page,"X-13-lng-cejil");
  rec("X-13", JSON.stringify(sample)!==JSON.stringify(cej)?"PASS":"FAIL", `Sample rows ${JSON.stringify(sample.slice(1))}; CEJIL rows ${JSON.stringify(cej.slice(1))}`,"X-13-lng-cejil.png");
  await page.context().close();
}
{ // X-01 persistence: install, rail away and back, reload
  const {page, errors} = await open(b, "languages");
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click(); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Dashboard"}).first().click(); await page.waitForTimeout(400);
  await page.locator('nav[aria-label="Settings navigation"] button',{hasText:"Languages"}).first().click(); await page.waitForTimeout(500);
  const back = (await rows(page)).some(r=>/German/.test(r));
  await page.reload(); await page.waitForTimeout(1500);
  const rel = (await rows(page)).some(r=>/German/.test(r));
  rec("X-01", (back&&rel)?"PASS":"FAIL", `German present after rail round-trip=${back}; after reload=${rel} (languages live in component useState)`);
  await page.context().close();
}
{ // X-08 dark
  const {page} = await open(b, "languages");
  await page.evaluate(()=>document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const c = await page.evaluate(()=>{const parse=s=>s.match(/[\d.]+/g).map(Number); const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)}; const el=[...document.querySelectorAll('[data-testid=settings-content] span')].find(e=>e.textContent.trim()==="Default"); if(!el) return null; const cs=getComputedStyle(el); let bgEl=el, bg; while(bgEl){bg=getComputedStyle(bgEl).backgroundColor; if(!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) break; bgEl=bgEl.parentElement;} const a=lum(parse(cs.color)), b=lum(parse(bg)); return {fg:cs.color,bg,ratio:((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)}});
  await shot(page,"X-08-lng-dark");
  await page.evaluate(()=>document.documentElement.classList.remove("dark")); await page.waitForTimeout(200);
  const l = await page.evaluate(()=>{const parse=s=>s.match(/[\d.]+/g).map(Number); const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)}; const el=[...document.querySelectorAll('[data-testid=settings-content] span')].find(e=>e.textContent.trim()==="Default"); const cs=getComputedStyle(el); let bgEl=el, bg; while(bgEl){bg=getComputedStyle(bgEl).backgroundColor; if(!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) break; bgEl=bgEl.parentElement;} const a=lum(parse(cs.color)), b=lum(parse(bg)); return {fg:cs.color,bg,ratio:((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)}});
  rec("X-08", (parseFloat(c?.ratio)>=4.5&&parseFloat(l.ratio)>=4.5)?"PASS":"FAIL", `Default badge contrast dark ${JSON.stringify(c)}, light ${JSON.stringify(l)}`,"X-08-lng-dark.png");
  await page.context().close();
}
{ // X-07 base axe + console
  const {page, errors} = await open(b, "languages");
  const ax = await axe(page);
  const names = await S(page).locator('[role=row] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  const dup = names.filter((n,i)=>names.indexOf(n)!==i);
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  const axd = await axe(page);
  const trap = await page.evaluate(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(e=>!e.closest('[inert]')); return d?{name:d.getAttribute("aria-label")||d.getAttribute("aria-labelledby"), modal:d.getAttribute("aria-modal")}:null});
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const foc = await page.evaluate(()=>document.activeElement?.textContent?.trim()||document.activeElement?.getAttribute("aria-label"));
  const ser = [...ax,...axd].filter(x=>/serious|critical/.test(x));
  rec("X-07", (ser.length===0&&dup.length===0)?"PASS":"FAIL", `axe pane ${JSON.stringify(ax)}; axe with install modal ${JSON.stringify(axd)}; duplicate row button names ${JSON.stringify([...new Set(dup)])} ("Set" appears once per row, shared name); dialog ${JSON.stringify(trap)}; focus after Escape "${foc}"; console issues ${JSON.stringify(realErr(errors))}`);
  await page.context().close();
}
save();
await b.close();
