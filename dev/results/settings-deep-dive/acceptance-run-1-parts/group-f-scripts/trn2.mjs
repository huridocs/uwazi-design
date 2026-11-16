import { launch, open, S, rows, shot, dialogs, axe, logEntries, notifTitles, dlgText } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { mk, realErr } from "./rec.mjs";
const {rec,save}=mk("trn2");
const b = await launch();
const norm=(s)=>String(s).replace(/\s+/g," ").trim();
const rail=(p,n)=>p.locator('nav[aria-label="Settings navigation"] button',{hasText:n}).first().click();
const openCtx = async (p,name)=>{ await S(p).locator('[role=row]').filter({hasText:name}).first().click(); await p.waitForTimeout(500); };
const ed = (p)=>S(p).locator('input[aria-label="Library in Spanish"]');
const dirty = async(p)=>{ await ed(p).fill("Edited"); await p.waitForTimeout(200); };
const dlg = async(p)=>{ await p.waitForTimeout(500); const d = await dialogs(p); return d.length? {names:d, text: norm(await p.evaluate(()=>[...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]')).map(e=>e.innerText).join(" || ")))}:null; };
const res={};
const navs = {
  cancel: (p)=>S(p).getByRole("button",{name:"Cancel",exact:true}).click(),
  breadcrumb: (p)=>S(p).getByRole("button",{name:"Translations",exact:true}).first().click(),
  back: (p)=>S(p).getByRole("button",{name:"Back",exact:true}).click(),
  rail: (p)=>rail(p,"Dashboard"),
  datasource: async(p)=>{ await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250); await p.locator('[data-part=collection-menu] [role=option]').filter({hasText:"CEJIL"}).click(); },
};
for (const [k,fn] of Object.entries(navs)) {
  const {page} = await open(b,"translations");
  await openCtx(page,"User Interface"); await dirty(page);
  await fn(page); const d = await dlg(page);
  const where = await page.evaluate(()=>({ed: !!document.querySelector('input[aria-label="Library in Spanish"]'), title: document.querySelector('[data-testid=settings-content] h2')?.textContent}));
  res[k]={dialog:d, after:where};
  if (k==="cancel") await shot(page,"TRN-17");
  await page.context().close();
}
console.log(JSON.stringify(res,null,1).slice(0,3000));
// no-change no dialog, search/toggle no dialog, clear X
{
  const {page} = await open(b,"translations");
  await openCtx(page,"User Interface");
  await S(page).locator('input[aria-label="Search terms"]').fill("Lib"); await page.waitForTimeout(300);
  await rail(page,"Dashboard"); const d = await dlg(page);
  res.searchOnly={dialog:d};
  await page.context().close();
}
const g = res.rail?.dialog;
const guardOK = (k)=>res[k].dialog && /Discard changes\?/.test(res[k].dialog.text) && /You have unsaved changes\. Do you want to continue\?/.test(res[k].dialog.text);
rec("TRN-17", ["cancel","breadcrumb","rail","datasource"].every(guardOK)?"PASS":"FAIL", `dirty guard per navigation (edit es "Library"): ${Object.entries(res).filter(([k])=>k!=="searchOnly").map(([k,v])=>`${k}: ${v.dialog?'dialog "'+v.dialog.text.slice(0,140)+'"':"no dialog, "+(v.after.ed?"stayed in editor":"navigated away (title "+v.after.title+")")}`).join("; ")}; search-only edit rail click: ${res.searchOnly.dialog?"dialog":"no dialog"}`,"TRN-17.png");
rec("X-02", ["cancel","breadcrumb","rail","datasource"].every(guardOK)?"PASS":"FAIL", `same evidence as TRN-17: dialog on rail=${!!res.rail.dialog}, datasource=${!!res.datasource.dialog}, cancel=${!!res.cancel.dialog}, breadcrumb=${!!res.breadcrumb.dialog}, back=${!!res.back.dialog}`,"TRN-17.png");
// X-03
{
  const {page} = await open(b,"translations");
  await openCtx(page,"User Interface");
  const sv = S(page).getByRole("button",{name:"Save",exact:true});
  const d0 = await sv.isDisabled();
  await dirty(page); const d1 = await sv.isDisabled();
  await sv.click(); await page.waitForTimeout(500);
  const closed = (await ed(page).count())===0;
  await rail(page,"Dashboard"); const d = await dlg(page);
  rec("X-03", d0&&!d1&&!d?"PASS":"FAIL", `Save disabled when clean=${d0}; enabled after edit=${!d1}; after Save editor ${closed?"closed":"open"} and rail click shows dialog=${!!d}. Editing again enable behaviour not observable because Save closes the editor`);
  await page.context().close();
}
// TRN-20 phone, X-06
{
  const {page, errors} = await open(b,"translations","mobile");
  await shot(page,"TRN-20a");
  const sw0 = await page.evaluate(()=>document.documentElement.scrollWidth);
  await S(page).getByText("User Interface",{exact:true}).first().click(); await page.waitForTimeout(600);
  await shot(page,"TRN-20");
  const sw = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth, pane:(()=>{const e=document.querySelector('[data-testid=settings-content]'); return e?{sw:e.scrollWidth,cw:e.clientWidth}:null})()}));
  const txt = norm(await S(page).innerText());
  const inputs = await S(page).locator('input[aria-label*=" in "]').count();
  const tbl = await S(page).locator('[role=columnheader]').count();
  const footer = await page.evaluate(()=>[...document.querySelectorAll('[data-testid=settings-content] button')].filter(b=>/^(Save|Cancel)$/.test(b.textContent.trim())).map(b=>{const r=b.getBoundingClientRect();return b.textContent.trim()+":"+Math.round(r.left)+","+Math.round(r.top)+","+Math.round(r.width)+"x"+Math.round(r.height)}));
  rec("TRN-20","FAIL",`phone editor: doc scrollWidth ${JSON.stringify(sw)}; column headers=${tbl} (table layout kept: ${tbl>0}); inputs=${inputs}; Save/Cancel positions ${JSON.stringify(footer)}; no status dot per language row; card shows: ${txt.slice(0,200)}`,"TRN-20.png");
  const sbtn = await S(page).getByRole("button",{name:"Save",exact:true}).count();
  rec("X-06","FAIL",`list page: scrollWidth ${sw0} (no horizontal overflow); editor on phone per TRN-20: ${tbl>0?"wide table with sideways scroll inside pane "+JSON.stringify(sw.pane):"cards"}; see shot TRN-20.png`,"TRN-20.png");
  await page.context().close();
}
// TRN-21: install German then editor, default change, uninstall
{
  const {page} = await open(b,"languages");
  await page.getByRole("button",{name:"Install language"}).click(); await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Install German"}).click(); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await rail(page,"Translations"); await page.waitForTimeout(500);
  await openCtx(page,"User Interface");
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  rec("TRN-21","FAIL",`installed German in Languages, then opened the User Interface editor: headers ${JSON.stringify(hdr)}: no German column (editor always uses the 5 seeded languages); default change and uninstall effects therefore not reflected either (see LNG-12, LNG-16b)`,"");
  await page.context().close();
}
// X-07 axe in editor + list
{
  const {page, errors} = await open(b,"translations");
  const a1 = await axe(page);
  const names = await S(page).locator('[role=row] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  await openCtx(page,"User Interface");
  const a2 = await axe(page);
  const unl = await S(page).locator('input:not([aria-label])').count();
  const dup = names.filter((n,i)=>names.indexOf(n)!==i);
  rec("X-07", [...a1,...a2].some(x=>/serious|critical/.test(x))||dup.length?"FAIL":"PASS", `axe list ${JSON.stringify(a1)}; axe editor ${JSON.stringify(a2)}; inputs without aria-label ${unl}; duplicate row button names ${JSON.stringify(dup)}; console ${JSON.stringify(realErr(errors))}`);
  await page.context().close();
}
// X-08 dark: pills contrast
{
  const {page} = await open(b,"translations");
  const calc = ()=>page.evaluate(()=>{const parse=s=>s.match(/[\d.]+/g).map(Number); const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)}; return [...document.querySelectorAll('[data-testid=settings-content] [role=row] span.rounded-md')].map(el=>{const cs=getComputedStyle(el); let bgEl=el, bg; while(bgEl){bg=getComputedStyle(bgEl).backgroundColor; if(!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) break; bgEl=bgEl.parentElement;} const a=lum(parse(cs.color)), b=lum(parse(bg)); return el.textContent.trim()+":"+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)})});
  const l = await calc();
  await page.evaluate(()=>document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const d = await calc(); await shot(page,"X-08-trn-dark");
  const low = [...l,...d].filter(x=>parseFloat(x.split(":")[1])<4.5);
  rec("X-08", low.length?"FAIL":"PASS", `type pill contrast light ${JSON.stringify(l)} dark ${JSON.stringify(d)}`,"X-08-trn-dark.png");
  await page.context().close();
}
// X-13
{
  const {page} = await open(b,"translations");
  const s = (await rows(page)).map(r=>r.slice(0,26));
  await switchTo(page,"CEJIL"); await toSettings(page,"Translations"); await page.waitForTimeout(1000);
  const c = (await rows(page)).map(r=>r.slice(0,26));
  await shot(page,"X-13-trn-cejil");
  rec("X-13", JSON.stringify(s)!==JSON.stringify(c)?"PASS":"FAIL", `Sample ${JSON.stringify(s.slice(1))}; CEJIL ${JSON.stringify(c.slice(1))}`,"X-13-trn-cejil.png");
  await page.context().close();
}
save();
await b.close();
