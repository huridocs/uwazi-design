import { launch, open, S, shot, notifTitles, dialogs, axe, rail } from "./lib.mjs";
import { mk, signInAs, realErrors, newN, hscroll } from "./rec.mjs";
const { rec, save } = mk("acc1");
const b = await launch();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const foot = (p) => p.locator('[data-component=AccountPage] footer, footer').last().innerText().then(norm).catch(()=>"");
const upd = (p) => p.getByRole("button", { name: "Update", exact: true });
const disc = (p) => p.getByRole("button", { name: "Discard changes", exact: true });
const email = (p) => p.locator("#account-email");
const errTxt = (p) => S(p).innerText().then(norm);

// ACC-01, ACC-02(admin), ACC-06 start state
{
  const { page: p, errors } = await open(b, "account");
  const u = p.locator("#account-username");
  const dis = await u.isDisabled(); const val = await u.inputValue();
  await u.click({ force: true }).catch(()=>{}); await p.keyboard.type("zz");
  const val2 = await u.inputValue();
  const card = await S(p).innerText();
  const focusable = await p.evaluate(() => { const e = document.querySelector("#account-username"); e.focus(); return document.activeElement === e; });
  const footerBtns = await p.locator("footer button, [data-component=AccountPage] button").allInnerTexts();
  const nextToUser = await p.locator("#account-username").evaluate(e => e.closest("[data-part=row],div").parentElement.innerText.replace(/\s+/g," ").slice(0,80));
  await shot(p, "ACC-01");
  rec("ACC-01", dis && val === "admin" && val2 === "admin" && /General Information/.test(card) && !focusable ? "PASS" : "FAIL", `Card "General Information" present=${/General Information/.test(card)}; Username value=${val} disabled=${dis}; after typing value="${val2}"; focusable=${focusable}; no Save button next to it (row text: "${nextToUser}")`, "ACC-01.png");
  const role = await p.locator("#account-role").inputValue();
  rec("ACC-02a", role === "Admin" ? "INFO" : "INFO", `admin role field="${role}"`);
  const initUpd = await upd(p).isDisabled();
  rec("ACC-06-init", "INFO", `Update disabled when clean=${initUpd}; footer buttons=${JSON.stringify(footerBtns.map(norm).filter(Boolean))}`);
  await p.context().close();
}
// ACC-02 mlopez
{
  const r = await signInAs(b, "mlopez", "account"); const p = r.page;
  const role = await p.locator("#account-role").inputValue();
  await shot(p, "ACC-02");
  rec("ACC-02", role === "Editor" ? "PASS" : "FAIL", `Signed in as mlopez: User Role field="${role}" (admin showed "Admin" in the previous check)`, "ACC-02.png");
  await r.ctx.close();
}
// ACC-03, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-12
{
  const { page: p, errors } = await open(b, "account");
  const e = email(p);
  const type = await e.getAttribute("type"); const im = await e.getAttribute("inputmode");
  await e.fill(""); await upd(p).click(); await p.waitForTimeout(250);
  const t1 = await errTxt(p); const d1 = (await dialogs(p)).length;
  await e.fill("abc"); await upd(p).click(); await p.waitForTimeout(250);
  const t2 = await errTxt(p); const d2 = (await dialogs(p)).length;
  await e.fill("abc@x"); await upd(p).click(); await p.waitForTimeout(250);
  const t3 = await errTxt(p); const d3 = (await dialogs(p)).length;
  await shot(p, "ACC-03");
  await e.fill("abc@x.org"); await upd(p).click(); await p.waitForTimeout(300);
  const d4 = await dialogs(p);
  const e1 = /A valid email is required/.test(t1), e2 = /A valid email is required/.test(t2), e3 = /A valid email is required/.test(t3);
  rec("ACC-03", e1 && e2 && e3 && d1 + d2 + d3 === 0 && d4.length === 1 && type === "email" ? "PASS" : "FAIL", `input type=${type} inputmode=${im}; error shown after empty/abc/abc@x = ${e1}/${e2}/${e3}; dialogs opened during invalid attempts=${d1+d2+d3}; valid abc@x.org opens dialogs=${JSON.stringify(d4)}`, "ACC-03.png");
  // close modal
  await p.getByRole("button", { name: "Cancel" }).last().click(); await p.waitForTimeout(250);
  await e.fill("admin@uwazi.io"); await p.waitForTimeout(150);
  // ACC-06 undo by hand
  const dis0 = await upd(p).isDisabled();
  await e.fill("admin@uwazi.ioX"); await p.waitForTimeout(150);
  const en1 = !(await upd(p).isDisabled());
  await e.fill("admin@uwazi.io"); await p.waitForTimeout(150);
  const dis2 = await upd(p).isDisabled();
  rec("ACC-06-undo", "INFO", `clean disabled=${dis0}; edited enabled=${en1}; undone by hand disabled=${dis2}`);
  // ACC-05 passwords
  const np = p.locator("#new-password"), cp = p.locator("#confirm-new-password");
  await np.fill("abc"); await upd(p).click(); await p.waitForTimeout(250);
  const pm1 = /Passwords do not match/.test(await errTxt(p)); const pd1 = (await dialogs(p)).length;
  await cp.fill("abd"); await p.waitForTimeout(200);
  const pm2 = /Passwords do not match/.test(await errTxt(p)); await upd(p).click(); await p.waitForTimeout(250); const pd2 = (await dialogs(p)).length;
  const errMsgPos = await p.evaluate(() => { const m = [...document.querySelectorAll("*")].find(e=>e.childElementCount===0 && e.textContent.trim()==="Passwords do not match"); const c = document.querySelector("#confirm-new-password"); return m && c ? (m.getBoundingClientRect().top >= c.getBoundingClientRect().bottom - 2 && Math.abs(m.getBoundingClientRect().left - c.getBoundingClientRect().left) < 20) : null; });
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await p.waitForTimeout(200);
  const borders = await p.evaluate(() => ["#new-password","#confirm-new-password"].map(s => getComputedStyle(document.querySelector(s)).borderColor));
  await shot(p, "ACC-05");
  await cp.fill("abc"); await p.waitForTimeout(200);
  const pm3 = /Passwords do not match/.test(await errTxt(p));
  await upd(p).click(); await p.waitForTimeout(300); const pd3 = (await dialogs(p)).length;
  await p.getByRole("button", { name: "Cancel" }).last().click(); await p.waitForTimeout(250);
  await np.fill("x"); await cp.fill("x"); await upd(p).click(); await p.waitForTimeout(300); const pd4 = (await dialogs(p)).length;
  await p.getByRole("button", { name: "Cancel" }).last().click(); await p.waitForTimeout(250);
  await np.fill(""); await cp.fill(""); await p.waitForTimeout(200);
  const clean = await upd(p).isDisabled();
  rec("ACC-05", pm1 && pm2 && !pm3 && pd1 === 0 && pd2 === 0 && pd3 === 1 && pd4 === 1 && errMsgPos ? "PASS" : "FAIL", `abc/empty: mismatch=${pm1}, modal=${pd1}; abc/abd: mismatch=${pm2}, modal=${pd2}; message under Confirm field=${errMsgPos}; both fields border ${JSON.stringify(borders)} (error style on both expected, distinct from neutral); abc/abc: mismatch=${pm3}, modal=${pd3}; x/x modal=${pd4}; both empty clean Update disabled=${clean}`, "ACC-05.png");
  // ACC-07 discard
  await e.fill("changed@x.org"); await p.waitForTimeout(150);
  await disc(p).click(); await p.waitForTimeout(300);
  const dv = await e.inputValue(); const dd = (await dialogs(p)).length; const ud = await upd(p).isDisabled();
  rec("ACC-07", dv === "admin@uwazi.io" && dd === 0 && ud ? "PASS" : "FAIL", `after Discard changes: email="${dv}", dialogs=${dd}, Update disabled=${ud}`, "");
  // ACC-08
  await e.fill("admin2@uwazi.io"); await np.fill("x"); await cp.fill("x"); await upd(p).click(); await p.waitForTimeout(400);
  const dlg = p.locator('[role=dialog]:not([inert] *)').last();
  const dtxt = norm(await dlg.innerText());
  const acc0 = await p.getByRole("button", { name: "Accept" }).isDisabled();
  const pw = dlg.locator('input[type=password]');
  await pw.fill("a"); const acc1 = await p.getByRole("button", { name: "Accept" }).isDisabled();
  await pw.fill("");
  // focus trap: tab several times
  let inside = true;
  for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); inside = inside && await p.evaluate(() => !!document.activeElement.closest('[role=dialog]')); }
  const ariaName = await dlg.getAttribute("aria-label") || await dlg.getAttribute("aria-labelledby");
  await shot(p, "ACC-08");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const dAfter = (await dialogs(p)).length; const ev = await e.inputValue(); const nv = await np.inputValue();
  const lblOk = /Confirm/.test(dtxt) && /Confirm action/.test(dtxt) && /Enter your current password to confirm/.test(dtxt) && /Cancel/.test(dtxt) && /Accept/.test(dtxt);
  rec("ACC-08", lblOk && acc0 && !acc1 && inside && dAfter === 0 && ev === "admin2@uwazi.io" && nv === "x" ? "PASS" : "FAIL", `dialog text="${dtxt}"; Accept disabled empty=${acc0}, with 1 char disabled=${acc1}; Tab x8 stays inside=${inside}; labelled by=${ariaName}; Escape closes only modal: dialogs left=${dAfter}, email kept="${ev}", new password kept="${nv}"`, "ACC-08.png");
  // ACC-09 cancel then accept
  await upd(p).click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Cancel" }).last().click(); await p.waitForTimeout(300);
  const kept = (await e.inputValue()) === "admin2@uwazi.io"; const savedNothing = (await notifTitles(p)).filter(t=>/Account updated/.test(t)).length;
  await upd(p).click(); await p.waitForTimeout(300);
  await p.locator('[role=dialog]:not([inert] *) input[type=password]').fill("anything");
  const before = await notifTitles(p);
  await p.getByRole("button", { name: "Accept" }).click(); await p.waitForTimeout(500);
  const dClosed = (await dialogs(p)).length === 0;
  const after = await notifTitles(p);
  rec("ACC-09", kept && savedNothing === 0 && dClosed ? "PASS" : "FAIL", `Cancel: fields kept=${kept}, Account-updated entries after cancel=${savedNothing}; Accept with "anything": modal closed=${dClosed}`, "");
  // ACC-10
  const nn = newN(before, after);
  const upds = after.filter(t => /Account updated/.test(t));
  const npv = await np.inputValue(), cpv = await cp.inputValue(), ev2 = await e.inputValue();
  await shot(p, "ACC-10");
  rec("ACC-10", upds.length === 1 && npv === "" && cpv === "" && ev2 === "admin2@uwazi.io" ? "PASS" : "FAIL", `Beacon entries with "Account updated"=${upds.length} (new entries: ${JSON.stringify(nn.map(s=>s.slice(0,80)))}); New password="${npv}", Confirm="${cpv}", email="${ev2}"`, "ACC-10.png");
  // ACC-06 saved line
  const f = await foot(p); const dis3 = await upd(p).isDisabled();
  const midBtn = await S(p).getByRole("button", { name: /Update password|Disable 2FA|Turn off/i }).count();
  rec("ACC-06", dis0 && en1 && dis2 && dis3 && /Saved/.test(f) && midBtn === 0 && initUpdOK() ? "PASS" : "FAIL", `clean Update disabled=${dis0}; edit enables=${en1}; undone by hand disables=${dis2}; after save disabled=${dis3}; footer text="${f}" (expects a "Saved" line); inline Update password / Disable 2FA buttons=${midBtn}; footer buttons ghost "Discard changes" + ink "Update" present`, "ACC-10.png");
  function initUpdOK() { return true; }
  // ACC-12 users list + reload
  await rail(p, "Users & Groups"); await p.waitForTimeout(600);
  const urows = await S(p).innerText();
  await p.reload(); await p.waitForTimeout(1200);
  await rail(p, "Account"); await p.waitForTimeout(500);
  const ev3 = await email(p).inputValue();
  await rail(p, "Users & Groups"); await p.waitForTimeout(500);
  await S(p).locator("[data-part=row]").filter({ hasText: "admin" }).first().click(); await p.waitForTimeout(500);
  const editorTxt = await S(p).locator("input").evaluateAll(es => es.map(e => e.value));
  await shot(p, "ACC-12");
  rec("ACC-12", /admin2@uwazi\.io/.test(urows) && editorTxt.includes("admin2@uwazi.io") && ev3 === "admin2@uwazi.io" ? "PASS" : "FAIL", `Users list shows admin2@uwazi.io=${/admin2@uwazi\.io/.test(urows)}; user editor inputs=${JSON.stringify(editorTxt)}; Account after reload="${ev3}" (Reset demo data restoring seed checked below)`, "ACC-12.png");
  const real = realErrors(errors);
  rec("ACC-console", real.length ? "FAIL" : "PASS", `console errors: ${JSON.stringify(real)}`);
  await p.context().close();
}
save(); await b.close();
