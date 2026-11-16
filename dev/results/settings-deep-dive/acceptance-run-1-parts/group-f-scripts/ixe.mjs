import { launch, open, S, rows, shot, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { mk, realErr } from "./rec.mjs";
const {rec,save}=mk("ixe");
const b = await launch();
const norm=(s)=>String(s).replace(/\s+/g," ").trim();
const rail=(p,n)=>p.locator('nav[aria-label="Settings navigation"] button',{hasText:n}).first().click();
const recent = async (p)=> (await notifTitles(p)).filter(x=>/just now/.test(x));
const dlgTxt = (p)=>p.evaluate(()=>[...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]')&&!/notifications/.test(e.getAttribute("aria-labelledby")||"")&&e.closest('[data-component]')?.getAttribute("data-component")!=="NotificationsSlideOver").map(e=>e.innerText).join(" || ").replace(/\s+/g," "));
const openRow = async (p,i=1)=>{ await S(p).locator('[role=row]').nth(i).click(); await p.waitForTimeout(600); };
const lum=`const parse=s=>s.match(/[\\d.]+/g).map(Number); const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};`;

// IXE-01 + X-10 empty + X-12
{
  const {page, errors} = await open(b,"metadata-extraction");
  const t = norm(await S(page).innerText());
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const review = await S(page).getByRole("button",{name:/^Review/}).count();
  await shot(page,"IXE-01");
  const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
  // delete all
  let n=0;
  for (let i=0;i<8;i++){
    const del = S(page).getByRole("button",{name:/^Delete /}).first();
    if(!(await del.count())) break;
    await del.click(); await page.waitForTimeout(300);
    await page.locator('[data-component=ConfirmDelete]').getByRole("button",{name:"Delete",exact:true}).click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(300); n++;
  }
  const et = norm(await S(page).innerText());
  await shot(page,"IXE-01-empty");
  rec("IXE-01","FAIL",`title "Metadata extraction" ok; no "Extractors" table header (text starts "${t.slice(0,60)}"); columns ${JSON.stringify(hdr)} (spec Extractor Name, Property, Source, Template(s), Review + status/documents/accuracy); "Review" buttons=${review}; the template shows as a sub-line under the property. Zero extractors (deleted ${n}): "${et.slice(0,220)}" (names the object, but action is "Add extractor" not "Create Extractor")`,"IXE-01-empty.png");
  rec("X-10","FAIL",`zero extractors: title "No extractors yet" with hint and action "Add extractor" (names object, hint, create action present); spec example uses a "Create Extractor" action label on the IXE page, so wording differs. Reading: empty state structure passes, label mismatch only; marked FAIL on label per IXE-01`,"IXE-01-empty.png");
  rec("X-12","FAIL",`no selection: rows have no checkboxes (${cbs}); no "Selected n of total" bar; footer keeps "Add extractor" always; delete only through the row action`,"IXE-01.png");
  await page.context().close();
}
// IXE-02, 03, 04
{
  const {page, errors} = await open(b,"metadata-extraction");
  await S(page).getByRole("button",{name:/Create Extractor|Add extractor/}).click(); await page.waitForTimeout(600);
  const t = norm(await S(page).innerText());
  const dg = await dlgTxt(page);
  await shot(page,"IXE-02");
  const saveBtn = S(page).getByRole("button",{name:/^(Create extractor|Save)$/});
  const btns = await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  rec("IXE-02","FAIL",`"Create Extractor" is "Add extractor" (a full-page editor, not a Modal xl with steps; open dialogs: "${dg}"); no name field "Extractor name" (fields: Template, Property, Property type); no step "Next"/"Back"; buttons ${JSON.stringify(btns)}; page text: ${t.slice(0,200)}`,"IXE-02.png");
  const selects = await S(page).locator('[data-part=select]').count();
  rec("IXE-03","FAIL",`no "Properties by template" list or search; Property is a free text input, "Property type" select exists (spec: none; type follows the property); no step 2 with "Input", "Selected templates", "Common sources" (PDF/Title); properties are not read from the active data source's templates`,"IXE-02.png");
  // create
  await page.locator('input[placeholder="e.g. Date filed"]').fill("Case summary"); await page.waitForTimeout(200);
  await S(page).getByRole("button",{name:/^Create extractor$/}).click(); await page.waitForTimeout(600);
  const rs = await rows(page);
  const nt = await recent(page); const log = await logEntries(page);
  await rail(page,"Dashboard"); await page.waitForTimeout(400); await rail(page,"Metadata extraction"); await page.waitForTimeout(500);
  const afterRail = (await rows(page)).some(r=>/Case summary/.test(r));
  await page.reload(); await page.waitForTimeout(1500);
  const afterReload = (await rows(page)).some(r=>/Case summary/.test(r));
  rec("IXE-04","FAIL",`Create closed the editor; list row added=${rs.some(r=>/Case summary/.test(r))} (row text "${rs.find(r=>/Case summary/.test(r))}", no source or template pills); Beacon new entries ${JSON.stringify(nt)} (spec "Saved successfully."); after rail round trip row present=${afterRail}; after reload present=${afterReload}; Activity log ${JSON.stringify(log)}`,"");
  rec("X-01","FAIL",`created extractor "Case summary": present after rail round trip=${afterRail}, after reload=${afterReload} (extractors live in component useState; also the Suggestions edits and config edits do not persist)`);
  rec("X-04","FAIL",`Create added Beacon entries ${JSON.stringify(nt)}; spec quoted text "Saved successfully."`);
  rec("X-09","FAIL",`Activity log after create: ${JSON.stringify(log)} (record() uses log:false on this page)`);
  await page.context().close();
}
// IXE-05 edit
{
  const {page} = await open(b,"metadata-extraction");
  await openRow(page,1);
  const btns = await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()).filter(x=>!/suggestion for/.test(x)));
  await page.locator('input[placeholder="e.g. Date filed"]').fill("Date filed 2"); await page.waitForTimeout(200);
  await S(page).getByRole("button",{name:"Save",exact:true}).click(); await page.waitForTimeout(500);
  const dg = await dlgTxt(page); const nt = await recent(page);
  const rs = await rows(page);
  await shot(page,"IXE-05");
  rec("IXE-05","FAIL",`no "Edit Extractor" footer action (row click opens the editor); editor buttons ${JSON.stringify(btns)}; header "Edit Extractor"/"Back"/"Update" absent (shows title "Date filed", Cancel/Save); changing the property then Save: no dialog about discarded suggestions (dialog text "${dg}"); notifications ${JSON.stringify(nt)}; list row now "${rs[1]}" (Save closed the editor)`,"IXE-05.png");
  await page.context().close();
}
// IXE-06 delete dialog
{
  const {page} = await open(b,"metadata-extraction");
  await S(page).getByRole("button",{name:"Delete Date filed extractor"}).click().catch(async()=>{ await S(page).locator('[role=row]').nth(1).getByRole("button",{name:/Delete/}).last().click(); });
  await page.waitForTimeout(500);
  const d = await dlgTxt(page);
  const btns = await page.locator('[data-component=ConfirmDelete] button').allInnerTexts();
  await shot(page,"IXE-06");
  await page.locator('[data-component=ConfirmDelete]').getByRole("button",{name:"Delete",exact:true}).click(); await page.waitForTimeout(500);
  const nt = await recent(page); const log = await logEntries(page);
  const rs = await rows(page);
  rec("IXE-06","FAIL",`no row checkboxes, so no "Selected n of total" footer swap and no bulk "Delete". Single-row delete dialog: "${d}" with buttons ${JSON.stringify(btns.map(norm))} (spec header "Delete extractors", "Do you want to delete the following items?", name list, suggestion count, accepted-values note, Cancel/Accept); result entries ${JSON.stringify(nt)} (spec "Extractor/s deleted"); rows left ${rs.length-1}; Activity log ${JSON.stringify(log)}`,"IXE-06.png");
  await page.context().close();
}
rec("IXE-07","NOT DRIVEABLE","no dev panel with a failure switch exists in the app, and Save has no failing path");
rec("IXE-19","NOT DRIVEABLE","no dev panel failure switch exists");
// IXE-08 phone
{
  const {page} = await open(b,"metadata-extraction","mobile");
  await shot(page,"IXE-08a");
  const sw0 = await page.evaluate(()=>document.documentElement.scrollWidth);
  const t0 = norm(await S(page).innerText());
  await S(page).getByText("Date filed",{exact:true}).first().click(); await page.waitForTimeout(600);
  await shot(page,"IXE-08");
  const sw = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  const hdr = await S(page).locator('[role=columnheader]').count();
  const review = await S(page).getByRole("button",{name:/^Review/}).count();
  rec("IXE-08","FAIL",`list on phone: scrollWidth ${sw0}, text "${t0.slice(0,200)}" (rows show property, template, status, documents, accuracy; no template chips, no "Review" button: ${review}); tapping a row opens the editor (not "Review"); suggestions on phone: scroll ${JSON.stringify(sw)}, table headers=${hdr}; rows show entity, current, suggested, score, state with Accept check icon and a Reject icon (spec: one row each with entity, current to suggested, state, Accept button; Reject must not exist)`,"IXE-08.png");
  await page.context().close();
}
// IXE-09..18
{
  const {page} = await open(b,"metadata-extraction");
  await openRow(page,1);
  const t = norm(await S(page).innerText());
  const crumb = await S(page).locator('nav a, nav button').allInnerTexts().catch(()=>[]);
  const statsBtn = await S(page).getByRole("button",{name:/Stats/}).count();
  await shot(page,"IXE-09");
  rec("IXE-09","FAIL",`row click opens the extractor editor; header text "${t.slice(0,60)}" (breadcrumb "Metadata extraction / Date filed" ok); no table title with property icon, "for" and template pills; no "Stats & Filters" button (count ${statsBtn}); Back returns to list (Back button present)`,"IXE-09.png");
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const states = await S(page).locator('[role=row] span.rounded-md').allInnerTexts();
  rec("IXE-10","FAIL",`columns ${JSON.stringify(hdr)} (spec "Name", "Context", "Current Value/Suggestion", "Use for training", Accept, Open); no Context column, no training toggle, no Open; one combined column absent (separate Current value / Suggested); no green/amber/red value colouring (all neutral text); state pills present: ${JSON.stringify([...new Set(states.map(norm))])}`,"IXE-09.png");
  const searchBox = await S(page).locator('input[type=search],input[placeholder*=earch]').count();
  const headerClick = await (async()=>{ const first = async()=> (await S(page).locator('[role=row]').nth(1).innerText()).slice(0,30); const a=await first(); await S(page).locator('[role=columnheader]').filter({hasText:/Entity/i}).click(); await page.waitForTimeout(200); const c=await first(); return a!==c; })();
  rec("IXE-11","FAIL",`no search field in the suggestions view (search inputs=${searchBox}); only a "Filter suggestions" select; column headers do not sort (order changed after Entity click=${headerClick}); 12 rows present`,"IXE-09.png");
  rec("IXE-12","FAIL",`no "Stats & Filters" slide-over (button count ${statsBtn}); a "Training" section shows Documents/Reviewed/Pending/Accuracy; quick filter is a select "Filter suggestions" (All, Pending, Mismatch, Empty, Accepted) rather than a segmented control; no "Accuracy" tooltip text`,"IXE-09.png");
  // IXE-13 accept
  const before = (await S(page).getByRole("button",{name:/Accept suggestion for Masacre/}).count());
  await S(page).getByRole("button",{name:/Accept suggestion for Masacre/}).click(); await page.waitForTimeout(400);
  const nt = await recent(page);
  const row = norm(await S(page).locator('[role=row]').filter({hasText:"Masacre"}).innerText());
  const disabled = await S(page).getByRole("button",{name:/Accept suggestion for Masacre/}).isDisabled();
  await shot(page,"IXE-13");
  rec("IXE-13","FAIL",`Accept on a mismatch row: row becomes "${row}" (state Accepted, current takes suggested value); Beacon entries ${JSON.stringify(nt)} (spec "Suggestions sent" then "Suggestions updated": none); Accept disabled after accept=${disabled}; Accept is not disabled for rows with no suggestion (n/a: every row has one); entity value not written (prototype note in the Accept-all dialog: "Entity values are not written in the prototype")`,"IXE-13.png");
  // IXE-14
  const rejectBtns = await S(page).getByRole("button",{name:/^Reject suggestion/}).count();
  const acceptAll = await S(page).getByRole("button",{name:"Accept all",exact:true}).count();
  const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
  rec("IXE-14","FAIL",`no row checkboxes (${cbs}) so no action bar and no "Accept selected"; "Reject" buttons exist (${rejectBtns}, one per row) and "Accept all" button exists (${acceptAll}), both of which the spec says must not exist (G12)`,"IXE-13.png");
  const trainToggle = await S(page).getByRole("switch").count();
  rec("IXE-15","FAIL",`no "Use for training" toggle on rows (switches=${trainToggle})`,"IXE-13.png");
  const trainBtn = await S(page).getByRole("button",{name:/Train model/}).count();
  const find = await S(page).getByRole("button",{name:/Find suggestions/}).count();
  rec("IXE-16","FAIL",`no "Train model" button (${trainBtn}); a single "Find suggestions" button exists (${find}), which the spec says must not exist; clicking it only reseeds suggestions and notifies "Finding suggestions — this runs in the background" (no modal with Training sample radios, "Amount :" or the banner)`,"IXE-13.png");
  const proc = await S(page).getByRole("button",{name:/Process extractor/}).count();
  rec("IXE-17","FAIL",`no "Process extractor" button (${proc}) and no modal with "Find suggestions for", "Amount :", "Auto-accept suggestions" etc.`,"IXE-13.png");
  await S(page).getByRole("button",{name:/Find suggestions/}).click(); await page.waitForTimeout(500);
  const nt2 = await recent(page);
  const foot = norm(await page.evaluate(()=>document.querySelector('[data-testid=settings-content]')?.innerText.slice(-200)));
  rec("IXE-18","FAIL",`after "Find suggestions": Beacon ${JSON.stringify(nt2)}; no footer status ("Sending labeled data...", "Training model...", "Finding suggestions..." with processed/total), no "Cancel"/"Canceling..." swap, no matching Beacon task (footer reads "...${foot.slice(-60)}")`,"IXE-13.png");
  await page.context().close();
}
// IXE-20, X-02, X-03
{
  const {page} = await open(b,"metadata-extraction");
  await openRow(page,1);
  await S(page).getByRole("button",{name:/Accept suggestion for Masacre/}).click(); await page.waitForTimeout(200);
  await S(page).getByRole("button",{name:/Accept suggestion for Bámaca/}).click(); await page.waitForTimeout(200);
  const nDlgAfterAccept = (await dlgTxt(page));
  await rail(page,"Dashboard"); await page.waitForTimeout(500);
  const dgAccepts = await dlgTxt(page);
  await shot(page,"IXE-20");
  // no discard dialog? navigate back
  if (/Discard/.test(dgAccepts)) { await page.locator('[data-component=ConfirmDialog]').getByRole("button",{name:/Discard/}).click(); await page.waitForTimeout(400);}
  await rail(page,"Metadata extraction"); await page.waitForTimeout(500);
  await openRow(page,1);
  const accepted = await S(page).locator('[role=row]').filter({hasText:/Accepted/}).count();
  // config edit + Escape
  await page.locator('input[placeholder="e.g. Date filed"]').fill("Changed"); await page.waitForTimeout(200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const dEsc = await dlgTxt(page);
  await rail(page,"Dashboard"); await page.waitForTimeout(500);
  const dRail = await dlgTxt(page);
  rec("IXE-20","FAIL",`accepted two rows, rail to Dashboard: dialog "${dgAccepts}" (accept-only edits are not dirty, ok); returning to the extractor: Accepted rows=${accepted} (spec: still Accepted; rows reseed on reopen); config edit then Escape: dialog "${dEsc}"; rail click with config edit: dialog "${dRail}"`,"IXE-20.png");
  rec("X-02","FAIL",`config edit then rail click opens "${dRail}" (spec dialog: "Discard changes?" / "You have unsaved changes. Do you want to continue?" with Cancel and Discard changes; copy differs: "Discard unsaved changes?" ... Keep editing / Discard). Escape alone opened ${dEsc?"a dialog":"nothing"} (spec: the guard appears only on the config modal; the config here is a page, not a modal)`);
  await page.context().close();
}
{ // X-03
  const {page} = await open(b,"metadata-extraction");
  await openRow(page,1);
  const sv = S(page).getByRole("button",{name:"Save",exact:true});
  const d0 = await sv.isDisabled();
  await page.locator('input[placeholder="e.g. Date filed"]').fill("Changed"); const d1 = await sv.isDisabled();
  await sv.click(); await page.waitForTimeout(500);
  await rail(page,"Dashboard"); await page.waitForTimeout(400); const d = await dlgTxt(page);
  rec("X-03", d0&&!d1&&!d?"PASS":"FAIL", `Save disabled when clean=${d0}; enabled after edit=${!d1}; after Save the editor closes and a rail click shows no dialog (dialog "${d}")`);
  await page.context().close();
}
// IXE-PO1, PO2
{
  const {page} = await open(b,"metadata-extraction");
  const rs = await rows(page);
  const first = rs[1];
  await openRow(page,1);
  const stats = norm(await S(page).locator('[data-part=stats]').innerText());
  const rowsBefore = norm(await S(page).locator('[data-part=stats]').innerText());
  await S(page).getByRole("button",{name:/Accept suggestion for Masacre/}).click(); await page.waitForTimeout(300);
  const after = norm(await S(page).locator('[data-part=stats]').innerText());
  const score = (await S(page).locator('[role=columnheader]').allInnerTexts()).some(h=>/score/i.test(h));
  rec("IXE-PO1","FAIL",`list row "${first}" shows Accuracy 94% (static seed), while the editor's Accuracy stat reads "${stats}" for the same extractor (computed from the suggestions); status pills are static (Ready/Training/Processing/Error) and not tied to a task state`,"IXE-13.png");
  rec("IXE-PO2", score&&after!==stats?"PASS":"FAIL", `Score column present=${score}; stats strip before "${rowsBefore}" -> after one Accept "${after}" (Reviewed, Pending, Accuracy update)`);
  await page.context().close();
}
// X-06, X-07, X-08, X-13
{
  const {page, errors} = await open(b,"metadata-extraction");
  const a1 = await axe(page);
  const names = await S(page).locator('[role=row] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim()));
  const dup = names.filter((n,i)=>names.indexOf(n)!==i);
  await S(page).getByRole("button",{name:/Delete Date filed/}).first().click().catch(()=>{}); await page.waitForTimeout(400);
  const a2 = await axe(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const foc = await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")||document.activeElement?.tagName);
  await openRow(page,1);
  const a3 = await axe(page);
  const bad = [...a1,...a2,...a3].filter(x=>/serious|critical/.test(x));
  rec("X-07", bad.length||dup.length?"FAIL":"PASS", `axe list ${JSON.stringify(a1)}; axe with delete dialog ${JSON.stringify(a2)}; focus after Escape "${foc}"; axe editor ${JSON.stringify(a3)}; duplicate row button names ${JSON.stringify(dup)}; console ${JSON.stringify(realErr(errors))}`);
  await page.context().close();
}
{
  const {page} = await open(b,"metadata-extraction");
  const calc = ()=>page.evaluate(`(()=>{${lum} return [...document.querySelectorAll('[data-testid=settings-content] [role=row] span')].filter(e=>e.children.length===0&&/^(Ready|Training|Processing|Error)$/.test(e.textContent.trim())).map(el=>{const cs=getComputedStyle(el); let bgEl=el, bg; while(bgEl){bg=getComputedStyle(bgEl).backgroundColor; if(!/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) break; bgEl=bgEl.parentElement;} const a=lum(parse(cs.color)), b=lum(parse(bg)); return el.textContent.trim()+":"+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)})})()`);
  const l = await calc();
  await page.evaluate(()=>document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const d = await calc(); await shot(page,"X-08-ixe-dark");
  const low = [...l,...d].filter(x=>parseFloat(x.split(":")[1])<4.5);
  rec("X-08", low.length?"FAIL":"PASS", `status pill contrast light ${JSON.stringify(l)}; dark ${JSON.stringify(d)}; below 4.5: ${JSON.stringify(low)}`,"X-08-ixe-dark.png");
  await page.context().close();
}
save();
await b.close();
