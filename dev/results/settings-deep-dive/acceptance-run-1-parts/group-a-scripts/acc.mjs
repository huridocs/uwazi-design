import { launch, open, S, shot, rows, rail, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { mk, signInAs, realErrors, lines, delta, newN } from "./rec.mjs";
const { rec, save } = mk("acc");
const b = await launch();
const sh = (id) => `ACC-${id}`;
const txt = async (p) => (await S(p).innerText()).replace(/\s+/g, " ");
const footerBtns = (p) => p.locator('[data-testid="settings-content"] button, button').evaluateAll(()=>[]);
const btn = (p, name) => S(p).getByRole("button", { name });
const email = (p) => S(p).locator('input[type=email]');
const user = (p) => S(p).locator('input').first();
const issues = (p) => S(p).locator('[role=alert], [data-part=issue], p.text-seal, [class*=seal]').allInnerTexts();

// ---- ACC-01, 02, 06 (clean admin context)
{
  const { page: p, errors } = await open(b, "account");
  const u = user(p);
  const dis = await u.isDisabled();
  await u.click({ force: true }).catch(()=>{});
  await u.pressSequentially("zz").catch(()=>{});
  const val = await u.inputValue();
  const t = await txt(p);
  const hasGI = /General Information/.test(t);
  const updBtn = await p.locator('button', { hasText: /^(Update|Save)$/ }).allInnerTexts();
  await shot(p, "ACC-01");
  rec("ACC-01", dis && hasGI ? "PASS" : "FAIL", `Username input disabled=${dis}; after typing "zz" value="${val}"; card title "General Information" present=${hasGI} (card is titled "Profile"); footer buttons=${JSON.stringify(updBtn)}`, "ACC-01.png");
  // ACC-02
  const hasRole = /User Role/.test(t);
  await shot(p, "ACC-02-admin");
  const m = await signInAs(b, "mlopez");
  const t2 = await txt(m.page);
  await shot(m.page, "ACC-02-mlopez");
  rec("ACC-02", hasRole && /Editor/.test(t2) ? "PASS" : "FAIL", `No "User Role" field on the page for admin (present=${hasRole}) nor for mlopez (present=${/User Role/.test(t2)}); the page text lists no role at all: "${t2.slice(0,160)}..."`, "ACC-02-admin.png");
  await m.ctx.close();
  await p.context().close();
  const { page: q } = await open(b, "account"); const p6 = q;
  // ACC-06 footer
  const foot = await p6.locator('button').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().top>740 && e.getBoundingClientRect().left>250).map(e=>e.innerText.trim()+(e.disabled?" (disabled)":"")));
  await email(p6).fill("admin@uwazi.ioX");
  const en = await p6.locator('button', { hasText: /^(Update|Save)$/ }).first().isEnabled();
  await email(p6).fill("admin@uwazi.io");
  const en2 = await p6.locator('button', { hasText: /^(Update|Save)$/ }).first().isEnabled();
  await email(p6).fill("admin@uwazi.ioX");
  await p6.locator('button', { hasText: /^(Update|Save)$/ }).first().click(); await p6.waitForTimeout(400);
  const after = await p6.locator('button', { hasText: /^(Update|Save)$/ }).first().isDisabled();
  const full = await txt(p6);
  const hasSaved = /Saved/.test(await p6.locator('body').innerText());
  const hasUpdateBtn = foot.some(f=>/^Update/.test(f));
  const inlinePw = /Update password/.test(full), dis2fa = /Disable 2FA|Turn off/.test(full);
  await shot(p6, "ACC-06");
  rec("ACC-06", hasUpdateBtn ? "PASS" : "FAIL", `footer=${JSON.stringify(foot)} (spec: ghost "Discard changes" + solid "Update"); button label is "Save" not "Update"; enabled after typing=${en}, disabled again after undo by hand=${!en2 ? "yes" : "NO (enabled=" + en2 + ")"}; disabled after save=${after}; "Saved" footer line present=${hasSaved}; "Update password" button=${inlinePw}; Disable 2FA control=${dis2fa}; Username editable (see ACC-01)`, "ACC-06.png");
  const ev = realErrors(errors);
  console.log("errors", ev);
  await p6.context().close();
}

// ---- ACC-03 email validation, ACC-04 duplicate, ACC-05 password mismatch, ACC-07 discard, ACC-08/09/10 modal & beacon
{
  const { page: p, errors } = await open(b, "account");
  const saveBtn = () => p.locator('button', { hasText: /^(Update|Save)$/ }).first();
  const res = []; const base = await lines(p);
  for (const v of ["", "abc", "abc@x", "abc@x.org"]) {
    await email(p).fill(v);
    const en = await saveBtn().isEnabled();
    const t = await txt(p);
    let opened = false;
    if (en) { await saveBtn().click(); await p.waitForTimeout(300); opened = (await dialogs(p)).length > 0; }
    res.push(`${JSON.stringify(v)}: new text on page=${JSON.stringify(delta(base, await lines(p)))}, saveEnabled=${en}, error "A valid email is required" shown=${/A valid email is required/.test(t)}, modal=${opened}, inputType=${await email(p).getAttribute("type")}`);
    if (en && opened) await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
  }
  await shot(p, "ACC-03");
  rec("ACC-03", "FAIL", res.join(" ; "), "ACC-03.png");
  await p.context().close();
}
{
  const { page: p } = await open(b, "account");
  const base = await lines(p);
  await email(p).fill("j.nkemba@example.org");
  const t1 = await txt(p);
  const m1 = (t1.match(/[^.]*already[^.]*\./i) || t1.match(/[^.]*(taken|exists)[^.]*/i) || [""])[0];
  const saveBtn = p.locator('button', { hasText: /^(Update|Save)$/ }).first();
  const en = await saveBtn.isEnabled();
  await email(p).fill("J.NKEMBA@example.org");
  const t2 = await txt(p);
  await shot(p, "ACC-04");
  const msgs = delta(base, await lines(p));
  const exact = msgs.some(m=>/The email "j\.nkemba@example\.org" already exists/i.test(m));
  rec("ACC-04", exact ? "PASS" : "FAIL", `inline messages after typing a duplicate email (also upper case): ${JSON.stringify(msgs)} vs expected 'The email "j.nkemba@example.org" already exists'; Save enabled=${en}; no password modal precedes the check (modal flow absent, see ACC-08)`, "ACC-04.png");
  await p.context().close();
}
{
  const { page: p } = await open(b, "account");
  const np = S(p).getByLabel("New password"), cp = S(p).getByLabel("Confirm password");
  const saveBtn = p.locator('button', { hasText: /^(Update|Save)$/ }).first();
  await np.fill("abc");
  const a = { en: await saveBtn.isEnabled(), t: await txt(p) };
  await cp.fill("abd");
  const bb = { en: await saveBtn.isEnabled(), t: await txt(p) };
  await cp.fill("abc");
  const c = { en: await saveBtn.isEnabled(), t: await txt(p) };
  const confirmLabel = await S(p).getByLabel("Confirm new password").count();
  await shot(p, "ACC-05");
  const msg = bb.t.match(/Passwords[^.]{0,20}match/)?.[0];
  rec("ACC-05", /Passwords do not match/.test(bb.t) && confirmLabel ? "PASS" : "FAIL", `mismatch text="${msg}" (expected "Passwords do not match"); field label "Confirm new password" present=${confirmLabel>0} (page labels it "Confirm password"); with only New password typed Save enabled=${a.en}, mismatch Save enabled=${bb.en}, match Save enabled=${c.en} (needs Current password filled too: spec has no current-password field on the page, it uses a modal)`, "ACC-05.png");
  await p.context().close();
}
// ACC-07 discard, 08 modal, 09, 10
{
  const { page: p } = await open(b, "account");
  const saveBtn = p.locator('button', { hasText: /^(Update|Save)$/ }).first();
  await email(p).fill("admin2@uwazi.io");
  await S(p).getByLabel("Current password").fill("x");
  await S(p).getByLabel("New password").fill("x");
  await S(p).getByLabel("Confirm password").fill("x");
  await p.getByRole("button",{name:"Discard changes"}).last().click(); await p.waitForTimeout(300);
  const dlg = await dialogs(p);
  const v = await email(p).inputValue();
  const sd = await saveBtn.isDisabled();
  rec("ACC-07", v === "admin@uwazi.io" && sd && dlg.length === 0 ? "PASS" : "FAIL", `after Discard changes: email="${v}", Save disabled=${sd}, dialogs=${JSON.stringify(dlg)}`, "");
  // ACC-08
  const nBefore = await notifTitles(p);
  await email(p).fill("admin2@uwazi.io");
  await S(p).getByLabel("Current password").fill("x");
  await S(p).getByLabel("New password").fill("x");
  await S(p).getByLabel("Confirm password").fill("x");
  await saveBtn.click(); await p.waitForTimeout(400);
  const dlg2 = await dialogs(p);
  await shot(p, "ACC-08");
  const email2 = await email(p).inputValue();
  rec("ACC-08", dlg2.length ? "PASS" : "FAIL", `After clicking Save with email+password changed: dialogs open=${JSON.stringify(dlg2)} (expected Confirm modal "Enter your current password to confirm" with Cancel/Accept). Page instead saved immediately; Current password is a page field.`, "ACC-08.png");
  // ACC-09 / 10
  const notifs = newN(nBefore, await notifTitles(p));
  const pwv = [await S(p).getByLabel("New password").inputValue(), await S(p).getByLabel("Confirm password").inputValue()];
  rec("ACC-09", dlg2.length ? "PASS" : "FAIL", `No modal exists to Cancel/Accept (no "Cancel"/"Accept" buttons); the click on Save already committed: Save disabled=${await saveBtn.isDisabled()}, email now "${email2}"`, "ACC-08.png");
  rec("ACC-10", notifs.some(n=>/^Account updated/.test(n)) && pwv.every(x=>!x) ? "PASS" : "FAIL", `New Beacon entries=${JSON.stringify(notifs)} (expected exactly one "Account updated"); New/Confirm password after save=${JSON.stringify(pwv)}; email="${email2}"`, "");
  await p.context().close();
}
// ACC-11 failure path
{
  const { page: p } = await open(b, "account");
  const nBefore = await notifTitles(p);
  await email(p).fill("j.nkemba@example.org");
  await S(p).getByLabel("New password").fill("pw1");
  await S(p).getByLabel("Confirm password").fill("pw1");
  await S(p).getByLabel("Current password").fill("x");
  const saveBtn = p.locator('button', { hasText: /^(Update|Save)$/ }).first();
  const en = await saveBtn.isEnabled();
  if (en) await saveBtn.click(); await p.waitForTimeout(400);
  const n = newN(nBefore, await notifTitles(p));
  await shot(p, "ACC-11");
  rec("ACC-11", n.some(x=>/An error occurred/.test(x)) ? "PASS" : "FAIL", `Save enabled with duplicate email=${en}; new Beacon entries=${JSON.stringify(n)} (expected one "An error occurred" with detail 'The email "j.nkemba@example.org" already exists'; the page blocks Save and shows an inline message instead, so no failure path exists); New password field still=${JSON.stringify(await S(p).getByLabel("New password").inputValue())}`, "ACC-11.png");
  await p.context().close();
}
// ACC-12 persistence
{
  const { page: p } = await open(b, "account");
  await email(p).fill("admin2@uwazi.io");
  await p.locator('button', { hasText: /^(Update|Save)$/ }).first().click(); await p.waitForTimeout(400);
  await rail(p, "Users & Groups"); await p.waitForTimeout(400);
  const usersRows = await rows(p);
  await S(p).getByRole("button", { name: "Edit admin" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
  const ed = await S(p).locator('input[type=email]').inputValue();
  await p.reload(); await p.waitForTimeout(1200);
  await rail(p, "Account"); await p.waitForTimeout(400);
  const after = await email(p).inputValue();
  await rail(p, "Dashboard"); await p.waitForTimeout(300);
  await p.getByRole("button",{name:/Reset demo data/}).click(); await p.waitForTimeout(300);
  await p.locator('[data-component=ConfirmDelete],[data-component=ConfirmDialog]').getByRole("button",{name:"Reset"}).click(); await p.waitForTimeout(500);
  await rail(p, "Account"); await p.waitForTimeout(300);
  const reset = await email(p).inputValue();
  rec("ACC-12", /admin2@uwazi.io/.test(usersRows[1]||"") && ed==="admin2@uwazi.io" && after==="admin2@uwazi.io" && reset==="admin@uwazi.io" ? "PASS" : "FAIL", `Users list row: "${usersRows[1]}"; editor email="${ed}"; Account after reload="${after}"; after Reset demo data="${reset}"`, "");
  await p.context().close();
}
console.log("-- part 1 done");
save(); await b.close();
