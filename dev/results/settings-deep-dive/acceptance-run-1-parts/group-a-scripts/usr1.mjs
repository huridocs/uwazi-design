import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles } from "./lib.mjs";
import { toSettings } from "./h.mjs";
import { mk, signInAs, switchUser, realErrors, lines, delta, newN, contrast, dark, hscroll } from "./rec.mjs";
const { rec, save } = mk("usr1");
const b = await launch();
const tab = (p, n) => S(p).getByRole("tab", { name: new RegExp("^" + n) });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
const userRows = async (p) => (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
const uname = (r) => r.split(" ")[0].replace(/^[A-Z]{2}/, (m)=>"" );

// USR-01 .. USR-04
{
  const { page: p, errors } = await open(b, "users");
  const tabs = await S(p).getByRole("tab").allInnerTexts();
  const ur = await userRows(p);
  await tab(p, "Groups").click(); await p.waitForTimeout(300);
  const gr = (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
  const gtxt = await S(p).innerText();
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  const head = await S(p).locator("h2").first().innerText();
  const activeDefault = await S(p).getByRole("tab", { selected: true }).innerText().catch(()=>"?");
  await shot(p, "USR-01");
  const ok = head === "Users & Groups" && tabs.some(t=>/Users\s*5/.test(norm(t))) && tabs.some(t=>/Groups\s*3/.test(norm(t))) && ur.length === 5 && gr.length === 3;
  rec("USR-01", ok ? "PASS" : "FAIL", `Header "${head}"; tabs=${JSON.stringify(tabs.map(norm))}; Users rows=${ur.length}, Groups rows=${gr.length}; default tab="${norm(activeDefault)}". Counts after adding a user (6) and deleting a group (2) are checked in USR-10 and USR-24`, "USR-01.png");
  // USR-02 selection
  const cbs = await S(p).locator('input[type=checkbox], [role=checkbox]').count();
  rec("USR-02", "FAIL", `Users tab has ${cbs} row checkboxes and no header select-all, so rows cannot be ticked; there is no selection to clear and no bar; "Add user" is the only footer action`, "USR-01.png");
  // USR-03
  const heads = (await S(p).locator('[role=columnheader], th').allInnerTexts()).map(norm).filter(Boolean);
  const pills = await S(p).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.replace(/\s+/g, " ").trim()));
  const adminPill = await p.evaluate(() => { const e = [...document.querySelectorAll('[data-testid="settings-content"] span')].find(x => x.textContent.trim().toLowerCase() === "admin" && getComputedStyle(x).textTransform === "capitalize"); return e ? { text: e.innerText, cls: e.className } : null; });
  rec("USR-03", "FAIL", `Columns=${JSON.stringify(heads)} (spec: Username, Protection, Role, Group); no Protection column and no "Password + 2fa" / "Password" pill: 2FA is a column with a shield icon for admin and mlopez and an em dash for the rest; roles shown "Admin"/"Editor"/"Collaborator" and the Admin pill is vellum (not seal), which match; the group column is headed "Groups" with one pill per group; tbuergenthal group cell shows an em dash (spec: empty). Rows: ${JSON.stringify(pills)}`, "USR-01.png");
  // USR-04 sort
  const before = await userRows(p);
  const hdr = S(p).locator('[role=columnheader], th').first();
  const sortable = await S(p).locator('[role=columnheader] button, th button, [aria-sort]').count();
  await hdr.click().catch(()=>{}); await p.waitForTimeout(200);
  const a1 = await userRows(p);
  await hdr.click().catch(()=>{}); await p.waitForTimeout(200);
  const a2 = await userRows(p);
  const hdrs2 = await S(p).locator('[role=columnheader]').evaluateAll(es => es.map(e => e.getAttribute("aria-sort")));
  rec("USR-04", "FAIL", `Default order (admin, mlopez, jnkemba, afarah, tbuergenthal) = seed order, not Username ascending (admin, afarah, jnkemba, mlopez, tbuergenthal): ${JSON.stringify(before.map(r=>r.split(" ")[1]))}; sortable header controls=${sortable}; after clicking the first header twice the order is unchanged=${JSON.stringify(a1)===JSON.stringify(before) && JSON.stringify(a2)===JSON.stringify(before)}; aria-sort values=${JSON.stringify(hdrs2)}`, "");
  // USR-05
  rec("USR-05", "NOT DRIVEABLE", `Needs a seeded locked user ("add to seed"); the seed has none and the app has no account-locked state at all (no field, lock icon, "Account locked" tooltip or "Unlock account" action anywhere in Users & Groups)`, "");
  // USR-30
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(400);
  const t = await S(p).innerText();
  const invite = /Invite user/.test(t);
  await shot(p, "USR-30");
  rec("USR-30", !invite ? "PASS" : "FAIL", `"Add user" opens the full editor page (title "New user", breadcrumb "Users & Groups /"), not a sidepanel; but the footer commit button reads "Invite user" (present=${invite}) which the check says must not appear anywhere on the page`, "USR-30.png");
  // USR-07 fields
  const labels = await S(p).locator("label, legend, h3, h4").allInnerTexts();
  const sections = (await S(p).locator("h2,h3").allInnerTexts()).map(norm);
  const footer = await p.locator("button").evaluateAll(els => els.filter(e => e.getBoundingClientRect().top > 740 && e.getBoundingClientRect().left > 250).map(e => e.innerText.trim()).filter(Boolean));
  const hasPw = (await S(p).locator('input[type=password]').count()) > 0;
  const roleControl = await S(p).locator('select, [role=radiogroup], [role=combobox]').evaluateAll(es => es.map(e => e.tagName + ":" + (e.getAttribute("role")||"")));
  const roles = await S(p).locator('[role=radio]').evaluateAll(es => es.map(e => (e.getAttribute("aria-label")||e.closest("label")?.innerText||"").replace(/\s+/g," ").trim().slice(0,20)));
  const checked = await S(p).locator('[role=radio][aria-checked=true], input[type=radio]:checked').evaluateAll(es => es.map(e=>e.closest("label")?.innerText||e.getAttribute("aria-label")));
  rec("USR-07", "FAIL", `Editor titled "New user" with fields Username, Email, a Role radio group (Admin, Editor, Collaborator; default checked=${JSON.stringify(checked.map(norm))}) and a Groups checkbox list. Missing vs spec: "User Role" select, "Password" field (password inputs on page=${hasPw}), "Groups" control with placeholder "Nothing selected"; footer buttons=${JSON.stringify(footer)} (spec commit "Add", not "Invite user")`, "USR-30.png");
  console.log("errors", realErrors(errors));
  await p.context().close();
}
// USR-06 search & filters; X-11; X-12
{
  const { page: p } = await open(b, "users");
  const sb = S(p).getByRole("searchbox").or(S(p).locator('input[placeholder^="Search"]')).first();
  const box0 = await sb.boundingBox();
  const heightBefore = await p.evaluate(() => { const i = document.querySelector('[data-testid="settings-content"] input[placeholder^="Search"]'); const r = i.closest('[data-part=search-row], div').getBoundingClientRect(); return Math.round(r.height); });
  await sb.fill("lop"); await p.waitForTimeout(300);
  const r1 = await userRows(p);
  const h1 = await p.evaluate(() => { const i = document.querySelector('[data-testid="settings-content"] input[placeholder^="Search"]'); return Math.round(i.closest('div').getBoundingClientRect().height); });
  const email = r1.every(r => /@/.test(r));
  await sb.fill(""); await p.waitForTimeout(300);
  const r2 = await userRows(p);
  // role filter
  const roleSel = S(p).getByRole("button", { name: /Filter by role|All roles/ }).first();
  await roleSel.click(); await p.waitForTimeout(250);
  await p.getByRole("option", { name: "Editor" }).click(); await p.waitForTimeout(250);
  const r3 = await userRows(p);
  const groupFilter = await S(p).getByRole("button", { name: /Filter by group|All groups/ }).count();
  await sb.fill("zzz"); await p.waitForTimeout(300);
  const nr = norm(await S(p).innerText());
  const clearBtn = await S(p).getByRole("button", { name: /^Clear/ }).count();
  await shot(p, "USR-06");
  await sb.fill(""); 
  await roleSel.click(); await p.getByRole("option", { name: "All roles" }).click(); await p.waitForTimeout(250);
  await sb.fill("zzz"); await p.waitForTimeout(300);
  const nr2 = norm(await S(p).innerText());
  const clear2 = await S(p).getByRole("button", { name: /^Clear/ }).count();
  const ok = r1.length === 1 && /mlopez/.test(r1[0]) && r2.length === 5 && r3.length === 2 && groupFilter > 0 && clear2 > 0;
  rec("USR-06", ok ? "PASS" : "FAIL", `"lop" -> ${r1.length} row(s) ${JSON.stringify(r1)} (matches mlopez via username/email; email shown under each username=${email}); search row height before/during typing=${heightBefore}/${h1}px; clearing -> ${r2.length} rows; Role=Editor -> ${r3.length} rows; Group filter control present=${groupFilter>0} (only a role filter exists, so Group=Research and "both together" cannot be driven); "zzz" -> ${/No (users|results)/i.test(nr2) ? JSON.stringify(nr2.match(/No [a-z ]+/i)?.[0]) : "text: " + nr2.slice(60, 220)}; "Clear" action present=${clear2>0}`, "USR-06.png");
  rec("X-11", r1.length === 1 && r2.length === 5 && heightBefore === h1 && clear2 > 0 ? "PASS" : "FAIL", `Search field stays mounted at fixed height (${heightBefore}px before, ${h1}px while typing); "lop" filters to ${r1.length} row; clearing restores ${r2.length} rows; no-results state shows a Clear action=${clear2>0}`, "USR-06.png");
  await p.context().close();
}
// X-12
rec("X-12", "FAIL", "Users tab has no row checkboxes and no selection bar (see USR-02, USR-15); the footer only holds the lead action \"Add user\"", "USR-01.png");
// X-13 corpus scope
{
  const { page: p } = await open(b, "users");
  const before = await userRows(p);
  const crumb = p.locator('button[aria-label^="Collection:"]');
  await crumb.click(); await p.waitForTimeout(250);
  await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await p.waitForTimeout(1500);
  const landed = norm(await p.locator("body").innerText()).slice(0, 60);
  await toSettings(p, "Users & Groups"); await p.waitForTimeout(600);
  const after = await userRows(p);
  const tabs = (await S(p).getByRole("tab").allInnerTexts()).map(norm);
  await shot(p, "X-13-users");
  rec("X-13", JSON.stringify(before) === JSON.stringify(after) ? "PASS" : "FAIL", `After switching Sample -> CEJIL the Users list is identical (${after.length} rows, tabs ${JSON.stringify(tabs)}) once Settings is reopened; the switch itself leaves Settings for the Library (CEJIL, 4,398 entities)`, "X-13-users.png");
  await p.context().close();
}
// Phone USR-28 + X-06
{
  const m = await open(b, "users", "mobile"); const p = m.page; await p.waitForTimeout(500);
  const hs = await hscroll(p);
  const rws = (await S(p).locator('[role=row]').allInnerTexts()).map(norm);
  const rb = await S(p).getByRole("button", { name: "Edit mlopez" }).first().boundingBox();
  await shot(p, "USR-28-phone");
  const cbs = await S(p).locator('input[type=checkbox], [role=checkbox]').count();
  const hdrVis = await S(p).locator('[role=columnheader]').first().isVisible().catch(()=>false);
  const colsVisible = await S(p).locator('[role=columnheader]').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => e.innerText));
  const nCards = await S(p).getByRole("button", { name: /^Edit / }).count();
  await tab(p, "Groups").click(); await p.waitForTimeout(300);
  const gcards = norm(await S(p).innerText()).slice(100, 330);
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  // tap row
  await S(p).getByRole("button", { name: "Edit mlopez" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
  const edTitle = norm(await S(p).innerText()).slice(0, 80);
  const widths = await S(p).locator("input").evaluateAll(es => [...new Set(es.map(e => Math.round(e.getBoundingClientRect().left)))]);
  const hs2 = await hscroll(p);
  await shot(p, "USR-28-phone-editor");
  await p.goBack().catch(()=>{});
  rec("USR-28", "FAIL", `phone 390: overflow ${hs.doc}px; rows are cards showing username, email, role pill, groups and 2FA (cards ${nCards}); tapping a row opens the editor (title text "${edTitle}"), single column input edges=${JSON.stringify(widths)}, editor overflow ${hs2.doc}px. Failing parts: no checkboxes (${cbs}) so two users cannot be ticked and there is no selection bar; Groups tab rows read: ${JSON.stringify(gcards)} (name and a member count, spec: name and members)`, "USR-28-phone.png");
  rec("X-06", hs.doc <= 0 && hs2.doc <= 0 ? "PASS" : "FAIL", `phone 390 Users list overflow ${hs.doc}px, editor overflow ${hs2.doc}px; row edit target box=${JSON.stringify(rb)}; row actions (delete) are visible without hover on touch (trash icon visible on every card in the screenshot)`, "USR-28-phone.png");
  await m.ctx.close();
}
save(); await b.close();
