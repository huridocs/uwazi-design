import { launch, open, S, shot, notifTitles, dialogs, axeSrc, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, realErrors, newN, hscroll, contrast, dark } from "./rec.mjs";
const { rec, save } = mk("acc4");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const upd = (p) => p.getByRole("button", { name: "Update", exact: true });
const email = (p) => p.locator("#account-email");
const modalPw = (p) => p.locator('[role=dialog]:not([inert] *) input[type=password]');
const acceptBtn = (p) => p.getByRole("button", { name: "Accept" });
import { openCatalog, backToSettings } from './devp.mjs';
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const r = await window.axe.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0,2).map(n=>n.target.join(" ").slice(0,60)).join(" | ")}`); }, sel); };
const DLG = '[role=dialog]:not([inert] *)';

// X-04 failure half: arm Save, then update Account
{
  const { page: p, errors } = await open(b, "account");
  await openCatalog(p);
  const panelTxt = norm(await p.locator("body").innerText());
  const hasDev = /Fail next request/.test(panelTxt);
  await p.getByRole("button", { name: "Arm", exact: true }).scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(200);
  const armedTxt = norm(await p.locator('[role=status]').filter({ hasText: /Armed|Not armed/ }).first().innerText());
  await backToSettings(p, 'User settings');
  const onAccount = await p.locator("#account-email").count();
  const before = await notifTitles(p);
  await email(p).fill("fail@x.org"); await upd(p).click(); await p.waitForTimeout(300); await modalPw(p).fill("pw"); await acceptBtn(p).click(); await p.waitForTimeout(600);
  const after = await notifTitles(p);
  const nn = newN(before, after);
  const errs = nn.filter(t => /An error occurred/.test(t));
  const kept = await email(p).inputValue();
  const tasksRunning = await p.locator("body").innerText().then(t => /tasks? running/.test(t));
  await shot(p, "X-04-fail");
  rec("X-04-fail", errs.length === 1 && /did not answer in time/.test(errs[0]) && kept === "fail@x.org" ? "PASS" : "FAIL", `Dev panel present=${hasDev}; status after Arm="${armedTxt}"; back on Account=${onAccount === 1}; after Update+Accept with Save armed: new Beacon entries=${JSON.stringify(nn.map(s=>s.slice(0,100)))}; "An error occurred" entries=${errs.length}; email kept="${kept}"`, "X-04-fail.png");
  const nn2 = nn.filter(t => /Account updated/.test(t)).length;
  rec("X-04-note", "INFO", `"Account updated" success entries during the armed save=${nn2}`);
  await p.context().close();
}
// X-04 success half is ACC-10; X-07
{
  const { page: p, errors } = await open(b, "account");
  const pageAxe = await axeOn(p, '[data-testid="settings-content"]');
  const footAxe = await axeOn(p, 'footer');
  // names unique, labels
  const names = await p.locator('[data-testid="settings-content"] button, [data-testid="settings-content"] [role=button]').evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.innerText).trim()));
  const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
  const unlabeled = await p.evaluate(() => [...document.querySelectorAll('[data-testid="settings-content"] input')].filter(i => !(i.labels && i.labels.length) && !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby")).map(i => i.id || i.type));
  // password modal
  const opener = upd(p);
  await email(p).fill("x@y.org"); await opener.click(); await p.waitForTimeout(400);
  const d1 = await axeOn(p, DLG);
  const role = await p.locator(DLG).last().getAttribute("role"); const nm = await p.locator(DLG).last().getAttribute("aria-label") || await p.locator(DLG).last().getAttribute("aria-labelledby");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const restored = await p.evaluate(() => document.activeElement?.textContent?.trim());
  // revoke dialog
  await p.getByRole("button", { name: "Revoke API key Nightly export" }).click({ force: true }); await p.waitForTimeout(400);
  const d2 = await axeOn(p, DLG);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const restored2 = await p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim());
  await shot(p, "X-07");
  // 2FA modal needs jnkemba
  const r = await signInAs(b, "jnkemba", "account"); const q = r.page;
  const en = q.getByRole("button", { name: "Enable", exact: true });
  await en.click(); await q.waitForTimeout(500);
  const d3 = await axeOn(q, DLG);
  const nm3 = await q.locator(DLG).last().getAttribute("aria-labelledby");
  await q.keyboard.press("Escape"); await q.waitForTimeout(300);
  const dlAfter = (await dialogs(q)).length;
  const restored3 = await q.evaluate(() => document.activeElement?.textContent?.trim());
  await r.ctx.close();
  const bad = [...pageAxe, ...footAxe, ...d1, ...d2, ...d3].filter(x => /serious|critical/.test(x));
  rec("X-07", !bad.length && !dupNames.length && !unlabeled.length && role === "dialog" && restored === "Update" && /Revoke/.test(restored2 || "") && dlAfter === 0 && restored3 === "Enable" ? "PASS" : "FAIL", `axe page=${JSON.stringify(pageAxe)}; footer=${JSON.stringify(footAxe)}; password modal=${JSON.stringify(d1)}; revoke dialog=${JSON.stringify(d2)}; 2FA modal=${JSON.stringify(d3)}; duplicate button names=${JSON.stringify(dupNames)}; unlabelled inputs=${JSON.stringify(unlabeled)}; modal role=${role}, name ref=${nm}; focus after Escape: password modal -> "${restored}", revoke dialog -> "${restored2}", 2FA modal -> "${restored3}"`, "X-07.png");
  await p.context().close();
}
// X-08 dark
{
  const { page: p } = await open(b, "account");
  const sel = '[data-part="2fa"] button';
  const l = await contrast(p, sel); const gl = await contrast(p, '[data-part=logout]');
  const lr = await contrast(p, 'main td span, [data-component=AccountPage] [role=row] span');
  await dark(p);
  const d = await contrast(p, sel); const gd = await contrast(p, '[data-part=logout]');
  await shot(p, "X-08");
  rec("X-08", l >= 4.5 && d >= 4.5 ? "PASS" : "FAIL", `"Activated" status button text contrast light ${l}:1, dark ${d}:1 (need >= 4.5:1; it is a disabled-state button); Logout label light ${gl}:1, dark ${gd}:1`, "X-08.png");
  await p.context().close();
}
// X-06 phone: modals as sheets/full screen, actions reachable
{
  const r = await open(b, "account", "mobile"); const p = r.page;
  const hs0 = await hscroll(p);
  await p.locator("#account-email").fill("p@x.org");
  const btn = await p.getByRole("button", { name: "Update", exact: true }).boundingBox();
  await p.getByRole("button", { name: "Update", exact: true }).tap(); await p.waitForTimeout(500);
  const box = await p.locator(DLG).last().boundingBox();
  await shot(p, "X-06-phone-modal");
  const rowBtns = await p.getByRole("button", { name: /Revoke API key/ }).first().boundingBox().catch(()=>null);
  const vis = await p.evaluate(() => { const b = document.querySelector('[aria-label^="Revoke API key"]'); return b ? getComputedStyle(b.parentElement).opacity : null; });
  rec("X-06", hs0.doc <= 0 && box && box.width >= 380 && rowBtns && vis === "1" && btn.height >= 28 ? "PASS" : "FAIL", `Phone 390: page overflow=${hs0.doc}px; footer Update ${Math.round(btn.width)}x${Math.round(btn.height)}; password modal box ${JSON.stringify(box && {x:Math.round(box.x),y:Math.round(box.y),w:Math.round(box.width),h:Math.round(box.height)})} (sheet/full width); API key table row action visible on touch (opacity ${vis}), size ${rowBtns && Math.round(rowBtns.width)}x${rowBtns && Math.round(rowBtns.height)}; Logout/Update reachable by tap`, "X-06-phone-modal.png");
  await r.ctx.close();
}
for (const [id, why] of [["X-05","no delete of a used object on Account (applies line excludes it)"],["X-10","no list"],["X-11","no list"],["X-12","no list"],["X-13","account is global"]]) rec(id, "N/A", `Account "Applies:" excludes ${id}: ${why}`);
rec("ACC4-console", consoleErrs.length ? "FAIL" : "PASS", `console errors/warnings (atomFamily baseline excluded): ${JSON.stringify(consoleErrs)}`);
save(); await b.close();
