import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, switchUser, newN, hscroll } from "./rec.mjs";
const { rec, save } = mk("usr3");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const DLG = '[role=dialog]:not([inert] *)';
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const tick = async (p, n) => { await rowOf(p, n).getByRole("checkbox").click({ force: true }); await p.waitForTimeout(150); };
const footer = (p) => p.locator("footer").last().innerText().then(norm).catch(() => "");
const paneTxt = (p) => S(p).innerText().then(norm);
const commit = (p) => p.locator("footer").last().getByRole("button").last();
const dlgTxt = async (p) => norm(await p.locator(DLG).last().innerText());
const modalPw = (p) => p.locator(DLG + " input[type=password]");

// USR-13 groups control
{
  const { page: p } = await open(b, "users");
  await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400);
  const search = await S(p).locator('input[placeholder*="Nothing selected" i], input[role=combobox], [role=combobox]').count();
  const pillRemove = await S(p).getByRole("button", { name: /remove/i }).count();
  const cl = S(p).getByRole("checkbox", { name: "Litigation" }), ca = S(p).getByRole("checkbox", { name: "Administrators" }), cr = S(p).getByRole("checkbox", { name: "Research" });
  await cl.click(); await ca.click(); await cr.click(); await p.waitForTimeout(200);
  const states = [await cl.isChecked(), await ca.isChecked(), await cr.isChecked()];
  await commit(p).click(); await p.waitForTimeout(500);
  const row = await rowOf(p, "jnkemba").innerText().then(norm);
  await rowOf(p, "jnkemba").click(); await p.waitForTimeout(300);
  const re = [await S(p).getByRole("checkbox", { name: "Litigation" }).isChecked(), await S(p).getByRole("checkbox", { name: "Administrators" }).isChecked(), await S(p).getByRole("checkbox", { name: "Research" }).isChecked()];
  await shot(p, "USR-13");
  rec("USR-13", search > 0 ? "PASS" : "FAIL", `Groups is a checkbox list (Administrators/Litigation/Research with member counts), searchable multi-select controls=${search}, pills with remove=${pillRemove} (spec: searchable multi-select, "res" narrows, pills, "Nothing selected"). Behaviour part: after untick Litigation + Research and tick Administrators then save, list row="${row}", reopened checks (Lit/Admin/Res)=${JSON.stringify(re)}`, "USR-13.png");
  await p.context().close();
}
// USR-14 security area
{
  const { page: p } = await open(b, "users");
  await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400);
  const t = await paneTxt(p);
  const resetPw = await S(p).getByRole("button", { name: /Reset Password/ }).count();
  const r2 = S(p).getByRole("button", { name: "Reset 2FA" });
  const r2dis = await r2.isDisabled();
  const unlockJ = await S(p).getByRole("button", { name: "Unlock account" }).count();
  const secArea = /Security/.test(t);
  await shot(p, "USR-14-jnkemba");
  await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); await p.waitForTimeout(400);
  await rowOf(p, "tbuergenthal").click(); await p.waitForTimeout(400);
  const unlockT = await S(p).getByRole("button", { name: "Unlock account" }).count();
  const unlockCls = unlockT ? await S(p).getByRole("button", { name: "Unlock account" }).evaluate(e => e.className.includes("seal") ? "seal outline" : e.className.slice(0, 60)) : "";
  await shot(p, "USR-14-locked");
  const before = await notifTitles(p);
  await S(p).getByRole("button", { name: "Unlock account" }).click(); await p.waitForTimeout(400);
  const pwModal = await dlgTxt(p);
  await modalPw(p).fill("pw"); await p.getByRole("button", { name: "Accept" }).click(); await p.waitForTimeout(500);
  const after = await notifTitles(p); const nn = newN(before, after);
  const stillOpen = await S(p).getByRole("button", { name: "Unlock account" }).count();
  await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); await p.waitForTimeout(400);
  const lockIcon = await rowOf(p, "tbuergenthal").locator('[aria-label="Account locked"]').count();
  // mlopez reset 2FA
  await rowOf(p, "mlopez").click(); await p.waitForTimeout(400);
  const b2 = await notifTitles(p);
  await S(p).getByRole("button", { name: "Reset 2FA" }).click(); await p.waitForTimeout(400);
  const m2 = await dlgTxt(p);
  await modalPw(p).fill("pw"); await p.getByRole("button", { name: "Accept" }).click(); await p.waitForTimeout(500);
  const a2 = await notifTitles(p); const n2 = newN(b2, a2);
  // new user: none
  await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); await p.waitForTimeout(400);
  const mrow = await rowOf(p, "mlopez").innerText().then(norm);
  await p.getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  const newNone = (await S(p).getByRole("button", { name: /Reset|Unlock/ }).count()) === 0;
  rec("USR-14", secArea && resetPw && unlockJ === 0 && nn.some(t => /Account unlocked successfully/.test(t)) && n2.some(t => /Disabled 2FA/.test(t)) ? "PASS" : "FAIL", `jnkemba editor: "Security" area=${secArea}, "Reset Password" button=${resetPw}, "Reset 2FA" present, disabled for a 2FA-off user=${r2dis} (spec: opens the password modal even when 2FA is off), "Unlock account" for non-locked=${unlockJ}; locked tbuergenthal editor: "Unlock account" buttons=${unlockT} (${unlockCls}); unlock -> modal "${pwModal.slice(0, 60)}", new Beacon=${JSON.stringify(nn.map(s => s.slice(0, 50)))}, button after=${stillOpen}, lock icon in list after=${lockIcon}; mlopez Reset 2FA modal="${m2.slice(0, 120)}", Beacon=${JSON.stringify(n2.map(s => s.slice(0, 50)))} (spec "Disabled 2FA"); list row after="${mrow}"; New user shows none of them=${newNone}`, "USR-14-locked.png");
  await p.context().close();
}
// USR-15, 16, 17
{
  const { page: p } = await open(b, "users");
  await tick(p, "tbuergenthal"); await tick(p, "afarah");
  const f2 = await footer(p);
  const bar = p.locator("footer").last();
  const w2 = await bar.locator("*").first().evaluate(e => 0).catch(() => 0);
  const cnt = async () => p.evaluate(() => { const el = [...document.querySelectorAll("footer *")].find(e => /^Selected \d+ of \d+$/.test(e.textContent.trim()) && e.children.length === 0); return el ? Math.round(el.getBoundingClientRect().width) + "@" + Math.round(el.getBoundingClientRect().left) : null; });
  const cw2 = await cnt();
  await shot(p, "USR-15");
  await S(p).locator('[role=columnheader] [role=checkbox], [role=columnheader] input[type=checkbox]').first().click({ force: true }); await p.waitForTimeout(250);
  const f5 = await footer(p); const cw5 = await cnt();
  const barStyle = await bar.evaluate(e => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, border: cs.borderTopWidth }; });
  await p.locator("footer").last().getByRole("button", { name: "Clear", exact: true }).click(); await p.waitForTimeout(250);
  const f0 = await footer(p);
  rec("USR-15", /Selected 2 of 5/.test(f2) && /Reset Password/.test(f2) && /Reset 2FA/.test(f2) && /Selected 5 of 5/.test(f5) && /Add user/.test(f0) ? "PASS" : "FAIL", `2 ticked footer="${f2}"; all ticked="${f5}"; cleared="${f0}"; count label width/left 2->${cw2}, 5->${cw5}; bar bg ${barStyle.bg}, top border ${barStyle.border}. Missing vs spec: ghost "Reset Password" and "Reset 2FA" buttons`, "USR-15.png");
  // USR-16
  await tick(p, "afarah"); await tick(p, "jnkemba");
  const resetBtns = await p.locator("footer").last().getByRole("button", { name: /Reset/ }).count();
  rec("USR-16", resetBtns > 0 ? "PASS" : "FAIL", `With afarah and jnkemba ticked the bar has ${resetBtns} "Reset Password"/"Reset 2FA" buttons (footer="${await footer(p)}"); the "Reset passwords" and "Reset 2FA" bulk dialogs cannot be opened`, "USR-15.png");
  await p.locator("footer").last().getByRole("button", { name: "Clear", exact: true }).click(); await p.waitForTimeout(250);
  // USR-17: afarah + tbuergenthal
  await tick(p, "afarah"); await tick(p, "tbuergenthal");
  const b0 = await notifTitles(p);
  await p.getByRole("button", { name: "Add to group", exact: true }).click(); await p.waitForTimeout(400);
  const gm = await dlgTxt(p);
  await p.locator(DLG).last().getByRole("button", { name: /Research/ }).click().catch(async () => { await p.locator(DLG).last().getByText("Research").click(); }); await p.waitForTimeout(250);
  const gm2 = await dlgTxt(p);
  await shot(p, "USR-17-group");
  await p.locator(DLG).last().getByRole("button", { name: "Add to group" }).last().click(); await p.waitForTimeout(500);
  const afRow = await rowOf(p, "afarah").innerText().then(norm), tbRow = await rowOf(p, "tbuergenthal").innerText().then(norm);
  const nb1 = newN(b0, await notifTitles(p)).filter(t => /added to/.test(t));
  // change role
  await tick(p, "afarah"); await tick(p, "tbuergenthal");
  await p.getByRole("button", { name: "Change role", exact: true }).click(); await p.waitForTimeout(400);
  await p.locator(DLG).last().getByText("Editor", { exact: true }).click(); await p.waitForTimeout(250);
  const rm = await dlgTxt(p);
  await p.locator(DLG).last().getByRole("button", { name: "Change role" }).last().click(); await p.waitForTimeout(500);
  const afRow2 = await rowOf(p, "afarah").innerText().then(norm), tbRow2 = await rowOf(p, "tbuergenthal").innerText().then(norm);
  // admin ticked
  await tick(p, "admin");
  await p.getByRole("button", { name: "Change role", exact: true }).click(); await p.waitForTimeout(300);
  await p.locator(DLG).last().getByText("Editor", { exact: true }).click(); await p.waitForTimeout(250);
  const adminRole = await dlgTxt(p);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(300);
  const adminDel = await dlgTxt(p);
  await shot(p, "USR-17-admin");
  rec("USR-17", /Research/.test(afRow) && /Research/.test(tbRow) && nb1.length === 1 && /Editor/.test(afRow2) && /Editor/.test(tbRow2) && /Cannot change own role/.test(adminRole) && /Users cannot delete themselves/.test(adminDel) ? "PASS" : "FAIL", `Add to group dialog="${gm.slice(0, 80)}", readback="${gm2.slice(-70)}"; afterwards afarah="${afRow}", tbuergenthal="${tbRow}"; new Beacon=${JSON.stringify(nb1.map(s => s.slice(0, 60)))}; Change role readback="${rm.slice(-60)}", rows now "${afRow2}" / "${tbRow2}"; with admin ticked: role dialog says "${adminRole.slice(-110)}" (spec "Cannot change own role"), delete dialog says "${adminDel.slice(-120)}" (spec "Users cannot delete themselves")`, "USR-17-admin.png");
  await p.context().close();
}
// USR-19, USR-20
{
  const { page: p } = await open(b, "users");
  await tick(p, "mlopez");
  await p.getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(400);
  const dt = await dlgTxt(p); const pwf = await modalPw(p).count();
  const title = norm(await p.locator(DLG).last().locator("h2,h3").first().innerText().catch(() => ""));
  await shot(p, "USR-19");
  const b0 = await notifTitles(p);
  await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(500);
  const nb = newN(b0, await notifTitles(p));
  const tabs = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  const rowsAfter = await S(p).locator("[data-part=row]").count();
  await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(300);
  await rowOf(p, "Litigation").click(); await p.waitForTimeout(400);
  const lit = (await S(p).getByRole("checkbox", { name: "mlopez" }).count()) ? "mlopez still listed" : "mlopez absent";
  rec("USR-19", title === "Delete" && /Do you want to delete the following items\?/.test(dt) && /1 group/.test(dt) && pwf === 1 && nb.some(t => /Deleted user/.test(t)) ? "PASS" : "FAIL", `dialog title="${title}", text="${dt}", password field=${pwf} (spec: title "Delete", "Do you want to delete the following items?", "1 group" line, password field); after confirm: Beacon=${JSON.stringify(nb.map(s => s.slice(0, 50)))} (spec "Deleted user"), tabs=${JSON.stringify(tabs)} rows=${rowsAfter}; Litigation members: ${lit}; Share dialog not driven`, "USR-19.png");
  await p.context().close();
}
{
  const { page: p } = await open(b, "users");
  await tick(p, "admin");
  await p.getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(300);
  const dt = await dlgTxt(p);
  const confirmDis = await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().isDisabled().catch(() => null);
  await shot(p, "USR-20");
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  const rowDelete = await rowOf(p, "admin").getByRole("button", { name: "Delete admin" }).count();
  await rowOf(p, "admin").getByRole("button", { name: "Delete admin" }).click({ force: true }); await p.waitForTimeout(300);
  const dt2 = await dlgTxt(p);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  await rowOf(p, "admin").click(); await p.waitForTimeout(400);
  const ed = await paneTxt(p);
  const radios = await S(p).getByRole("radio").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.closest("label")?.innerText.split("\n")[0]) + ":" + (e.disabled ? "disabled" : "enabled")));
  await shot(p, "USR-20-editor");
  rec("USR-20", /Users cannot delete themselves/.test(dt) && /Cannot change own role/.test(ed) && /Cannot remove the last remaining admin/.test(ed) ? "PASS" : "FAIL", `Tick admin + Delete: dialog "${dt.slice(0, 200)}" (confirm disabled=${confirmDis}); row delete: "${dt2.slice(0, 160)}"; admin editor role radios=${JSON.stringify(radios)}, note text present: "${(ed.match(/This is the last admin[^.]*\./) || [""])[0]}"; spec copy: "Users cannot delete themselves", "Cannot change own role", "Cannot remove the last remaining admin"`, "USR-20-editor.png");
  await p.context().close();
}
rec("USR3-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
