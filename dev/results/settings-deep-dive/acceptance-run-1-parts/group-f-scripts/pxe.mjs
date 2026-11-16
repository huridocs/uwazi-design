import { launch, open, S, rows, shot, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
const {rec,save}=mk("pxe");
const b = await launch();
const norm=(s)=>String(s).replace(/\s+/g," ").trim();
const rail=(p,n)=>p.locator('nav[aria-label="Settings navigation"] button',{hasText:n}).first().click();
const recent = async (p)=> (await notifTitles(p)).filter(x=>/just now/.test(x));
const dlgTxt = (p)=>p.evaluate(()=>[...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]')&&e.closest('[data-component]')?.getAttribute("data-component")!=="NotificationsSlideOver"&&!/notifications/i.test(e.getAttribute("aria-labelledby")||"")).map(e=>e.innerText).join(" || ").replace(/\s+/g," "));
const openRow = async (p,i=1)=>{ await S(p).locator('[role=row]').nth(i).click(); await p.waitForTimeout(600); };

// PXE-01, X-10, X-12
{
  const {page} = await open(b,"paragraph-extraction");
  const t = norm(await S(page).innerText());
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const view = await S(page).getByRole("button",{name:/^View/}).count();
  const del = await S(page).getByRole("button",{name:/Delete|Remove/}).count();
  const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
  await shot(page,"PXE-01");
  rec("PXE-01","FAIL",`columns ${JSON.stringify(hdr)} (spec "Source Template", "Target Template" pills, "Entities" with "<n> New" pill, "View"); no "Extractors" table header; "View" buttons=${view}; footer button "Add extraction" (spec "Add extractor"). Empty state could not be reached: rows have no delete action (delete buttons=${del}); the page's empty state in code would read "No extractions yet" but is unreachable`,"PXE-01.png");
  rec("X-10","NOT DRIVEABLE",`zero-extractor state cannot be reached: the list has no delete or remove action for any row (delete buttons=${del}); a search miss shows a different state`);
  rec("X-12","FAIL",`no row checkboxes (${cbs}), no "Selected n of total" bar, footer keeps the lead action "Add extraction"; no bulk Delete on this list`,"PXE-01.png");
  // PXE-02
  await S(page).getByRole("button",{name:/Add extraction/}).click(); await page.waitForTimeout(600);
  const t2 = norm(await S(page).innerText());
  const dg = await dlgTxt(page);
  const btns = await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  await shot(page,"PXE-02");
  rec("PXE-02","FAIL",`"Add extraction" opens a full-page editor "New extraction" (open dialogs "${dg}"), not a Modal xl wizard with 3 dots; no "Target template" title, description or hint; template select (not filtered to templates with markdown + numeric properties) plus Segmentation and Min characters; buttons ${JSON.stringify(btns)}; no "Next"`,"PXE-02.png");
  rec("PXE-03","FAIL",`no step 2 "Source template" (no wizard); editor has a single Template select, Segmentation and Min characters fields; no Back/Next`,"PXE-02.png");
  rec("PXE-04","FAIL",`no step 3: none of "Paragraph text extraction property (rich text)", "Paragraph number extraction property (numeric)", "Target relationship type", "Source relationship type" exist; relationship types are not selectable here`,"PXE-02.png");
  // PXE-05 create
  await S(page).getByRole("button",{name:/Start extraction/}).click(); await page.waitForTimeout(600);
  const rs = await rows(page); const nt = await recent(page); const log = await logEntries(page);
  await rail(page,"Dashboard"); await page.waitForTimeout(400); await rail(page,"Paragraph extraction"); await page.waitForTimeout(500);
  const rs2 = await rows(page);
  await page.reload(); await page.waitForTimeout(1500);
  const rs3 = await rows(page);
  rec("PXE-05","FAIL",`"Start extraction" closed the editor; rows ${rs.length-1} (was 3: no new row added); Beacon new entries ${JSON.stringify(nt)} (spec "Paragraph Extractor added"); rows after rail round trip ${rs2.length-1}, after reload ${rs3.length-1}; Activity log ${JSON.stringify(log)}`,"");
  rec("X-01","FAIL",`created an extraction via Start: row count stayed ${rs.length-1}, rail round trip ${rs2.length-1}, reload ${rs3.length-1} (nothing is stored; the list reads a static seed)`);
  rec("X-04","FAIL",`Start added Beacon entries ${JSON.stringify(nt)}; spec text "Paragraph Extractor added"`);
  rec("X-09","FAIL",`Activity log after Start: ${JSON.stringify(log)}`);
  await page.context().close();
}
// PXE-06, 08, 09, 10, 11, 12, 13
{
  const {page} = await open(b,"paragraph-extraction");
  const rowTxt = (await rows(page))[1];
  const pencil = await S(page).getByRole("button",{name:/^Edit/}).count();
  await openRow(page,1);
  const t = norm(await S(page).innerText());
  await shot(page,"PXE-08");
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const btns = await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()).filter(x=>!/^Re-run extraction for/.test(x)));
  rec("PXE-06","FAIL",`no per-row "View" button and no delete: whole row is a button named "Edit Judgment extraction" (edit action exists, spec says none); no checkboxes, no "Selected n of total", no "Delete", no "Are you sure?" dialog with the paragraph-entities note; no "Extractor/s deleted"`,"PXE-01.png");
  rec("PXE-08","FAIL",`row opens an editor, breadcrumb "Paragraph extraction / Judgment" (ok); no "Paragraphs for" header with template pill; table columns ${JSON.stringify(hdr)} (spec "Entity", "Language(s)", "Paragraphs", "Status", "View"); rows are documents (e.g. "Velásquez-Rodríguez v. Honduras — Judgment"), status vocabulary Done/Queued/Skipped (spec New, Processing, Obsolete, Error, Processed); buttons ${JSON.stringify(btns)}`,"PXE-08.png");
  const search = await S(page).locator('input[type=search],input[placeholder*=earch]').count();
  const filtersBtn = await S(page).getByRole("button",{name:/^Filters/}).count();
  rec("PXE-09","FAIL",`no search by title (search inputs=${search}); no "Filters" slide-over or badge (Filters buttons=${filtersBtn}); only a "Filter documents" select with All/Done/Queued/Skipped; no "Clear All"`,"PXE-08.png");
  const ext = await S(page).getByRole("button",{name:/Extract new paragraphs|Extract paragraphs/}).count();
  const runBtn = await S(page).getByRole("button",{name:/Run extraction/}).count();
  rec("PXE-10","FAIL",`no "Extract new paragraphs" or "Extract paragraphs" action (${ext}); no row ticking; no "Are you sure?" / "Continue" dialog; present instead: "Run extraction" (${runBtn}) which toasts "Extraction queued — runs in the background"; statuses do not move New to Processing to Processed`,"PXE-08.png");
  // PXE-11: click a Done row
  await S(page).locator('[role=row]').filter({hasText:/Done/}).first().click({force:true}).catch(()=>{}); await page.waitForTimeout(500);
  const t11 = norm(await S(page).innerText());
  await shot(page,"PXE-11");
  rec("PXE-11","FAIL",`clicking a Done row does nothing (page text unchanged: ${/Paragraph #/.test(t11)?"has":"no"} "Paragraph #" table); no read-only paragraphs page with main-language row and sub-rows, "Paragraph #", "Language", text cut at 200 characters`,"PXE-11.png");
  const view = await S(page).getByRole("button",{name:/^View/}).count();
  rec("PXE-12","FAIL",`no paragraphs page and no per-paragraph "View" slide-over (View buttons ${view}); the only row action is a "Re-run extraction for <title>" button`,"PXE-11.png");
  // PXE-13
  const present = ["Segmentation","Min characters","Run extraction","Re-run","Last run"].map(w=>w+":"+new RegExp(w).test(t));
  const docs = norm(await S(page).locator('[data-part=stats]').innerText());
  const shown = await S(page).locator('[role=row]').count()-1;
  const sumTable = await S(page).locator('[role=row] [data-column=paragraphs]').allInnerTexts();
  const sum = sumTable.reduce((a,x)=>a+parseInt(x.replace(/,/g,"")||"0"),0);
  rec("PXE-13","FAIL",`controls that must not exist are present: ${JSON.stringify(present)} ("Re-run" is the footer Save label; per-row re-run buttons exist). Header stats "${docs}" vs ${shown} table rows and table paragraph sum ${sum} (list row said "${rowTxt}")`,"PXE-08.png");
  await page.context().close();
}
// PXE-07 phone
{
  const {page} = await open(b,"paragraph-extraction","mobile");
  const sw0 = await page.evaluate(()=>document.documentElement.scrollWidth);
  await shot(page,"PXE-07a");
  const t0 = norm(await S(page).innerText());
  await S(page).getByRole("button",{name:/Add extraction/}).click(); await page.waitForTimeout(600);
  const dg = await page.evaluate(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(e=>!e.closest('[inert]')&&!e.closest('[data-component=NotificationsSlideOver]')); return d?d.getAttribute("aria-label"):null});
  const sw1 = await page.evaluate(()=>document.documentElement.scrollWidth);
  await shot(page,"PXE-07b");
  await S(page).getByRole("button",{name:/^Cancel$/}).click().catch(()=>{}); await page.waitForTimeout(500);
  await page.locator('[data-testid=settings-content] [role=row], [data-testid=settings-content] li').first().click({force:true}).catch(()=>{}); await page.waitForTimeout(500);
  const sw2 = await page.evaluate(()=>document.documentElement.scrollWidth);
  const hdr = await S(page).locator('[role=columnheader]').count();
  await shot(page,"PXE-07c");
  rec("PXE-07","FAIL",`list on phone: scrollWidth ${sw0}, one-line rows (template, status, count) readable without sideways scroll (ok); "wizard" is a full-page editor (scrollWidth ${sw1}; dialog "${dg}"), not a full-screen wizard; entities page does not exist, the document editor shows cards (scrollWidth ${sw2}, table headers ${hdr})`,"PXE-07c.png");
  await page.context().close();
}
// X-06 phone dialog: IXE delete dialog geometry (informational for IXE)
// X-07, X-08
{
  const {page, errors} = await open(b,"paragraph-extraction");
  const a1 = await axe(page);
  const names = await S(page).locator('[role=row] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  await openRow(page,1);
  const a2 = await axe(page);
  const bad = [...a1,...a2].filter(x=>/serious|critical/.test(x));
  rec("X-07", bad.length?"FAIL":"PASS", `axe list ${JSON.stringify(a1)}; axe editor ${JSON.stringify(a2)}; row button names ${JSON.stringify(names)}; no dialogs exist on this page to test focus trap; console ${JSON.stringify(realErr(errors))}`);
  await page.context().close();
}
{
  const {page} = await open(b,"paragraph-extraction");
  const lum=`const parse=s=>s.match(/[\\d.]+/g).map(Number); const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};`;
  const calc = ()=>page.evaluate(`(()=>{${lum} return [...document.querySelectorAll('[data-testid=settings-content] [role=row] span')].filter(e=>e.children.length===0&&/^(Ready|Training|Processing|Error)$/.test(e.textContent.trim())).map(el=>{const cs=getComputedStyle(el); let bgEl=el, bg; while(bgEl){bg=getComputedStyle(bgEl).backgroundColor; if(!/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) break; bgEl=bgEl.parentElement;} const a=lum(parse(cs.color)), b=lum(parse(bg)); return el.textContent.trim()+":"+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)})})()`);
  const l = await calc();
  await page.evaluate(()=>document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const d = await calc(); await shot(page,"X-08-pxe-dark");
  const low = [...l,...d].filter(x=>parseFloat(x.split(":")[1])<4.5);
  rec("X-08", low.length?"FAIL":"PASS", `status pill contrast light ${JSON.stringify(l)}; dark ${JSON.stringify(d)}; below 4.5: ${JSON.stringify(low)}`,"X-08-pxe-dark.png");
  await page.context().close();
}
rec("X-06","PENDING","filled below");
save();
await b.close();
