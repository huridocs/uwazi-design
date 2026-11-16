import { conf, launch, open, S, shot, rows, rail, dialogs, axe, logEntries, notifTitles } from "./lib.mjs";
import { mk, signInAs, switchUser, realErrors, lines, delta, newN, contrast, dark, hscroll } from "./rec.mjs";
const { rec, save } = mk("acc3");
const b = await launch();
const email = (p) => S(p).locator('input[type=email]');
const saveBtn = (p) => p.locator('button', { hasText: /^(Update|Save)$/ }).first();
// X-01, X-04, X-09
{
  const { page: p, errors } = await open(b, "account");
  const nb = await notifTitles(p);
  await email(p).fill("admin9@uwazi.io");
  await saveBtn(p).click(); await p.waitForTimeout(400);
  const n = newN(nb, await notifTitles(p));
  await rail(p, "Dashboard"); await p.waitForTimeout(300);
  await rail(p, "Account"); await p.waitForTimeout(300);
  const back = await email(p).inputValue();
  await p.reload(); await p.waitForTimeout(1200);
  const rel = await email(p).inputValue();
  const lg = (await logEntries(p));
  await rail(p, "Activity log"); await p.waitForTimeout(500);
  await p.waitForTimeout(1000); const rws = (await lines(p)).slice(4, 9).join(" / ");
  await shot(p, "X-09-account");
  rec("X-01", back === "admin9@uwazi.io" && rel === "admin9@uwazi.io" ? "PASS" : "FAIL", `After Save, rail away and back: "${back}"; after reload: "${rel}"; Reset demo data restoring the seed was verified in ACC-12`);
  rec("X-04", n.length === 1 && /^Account updated/.test(n[0]) ? "PASS" : "FAIL", `Save adds ${n.length} Beacon entry: ${JSON.stringify(n)} (page's quoted text is "Account updated"). No failure path exists, so "An error occurred" (once) cannot be produced: the duplicate-email case blocks Save inline (ACC-11)`);
  rec("X-09", /Updated user .*admin/i.test(rws) ? "PASS" : "FAIL", `Activity log after the profile Save: session entries=${JSON.stringify(lg.slice(0,2))}; newest Activity log entry (action / description / user / time)=${JSON.stringify(rws)} (acting user shown in the log entry: ${lg.some(x=>/\[admin\]/.test(x))})`, "X-09-account.png");
  console.log("console errors:", realErrors(errors));
  await p.context().close();
}
// X-07 axe + dialogs
{
  const { page: p, errors } = await open(b, "account");
  const v = await axe(p);
  // revoke dialog
  const opener = S(p).locator('button[aria-label^="Revoke"]').first();
  await opener.focus(); await opener.click(); await p.waitForTimeout(500);
  const dname = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]') && !e.hasAttribute('inert'))[0]; return d ? { label: d.getAttribute("aria-label") || (document.getElementById(d.getAttribute("aria-labelledby")||"")?.textContent), modal: d.getAttribute("aria-modal") } : null; });
  const dv = await p.evaluate(async (src) => { const el = [...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]') && !e.hasAttribute('inert'))[0]; if (!el) return ["no dialog"]; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.map(v=>`${v.id} (${v.impact})`); });
  // focus trap: tab 8 times, check focus stays in dialog
  let inside = true;
  for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); const ok = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter(e=>!e.closest('[inert]') && !e.hasAttribute('inert'))[0]; return !!d && d.contains(document.activeElement); }); if (!ok) inside = false; }
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  const closed = (await dialogs(p)).length === 0;
  const restored = await p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
  // unique names
  const names = await S(p).locator("button").evaluateAll(els => els.map(e => e.getAttribute("aria-label") || e.innerText.trim()).filter(Boolean));
  const dupes = names.filter((x, i) => names.indexOf(x) !== i);
  const unlabeled = await S(p).locator("input").evaluateAll(els => els.filter(e => !(e.labels && e.labels.length) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby")).map(e => e.type + ":" + (e.placeholder||"")));
  await shot(p, "X-07-account");
  const serious = v.filter(x => /serious|critical/.test(x)), dserious = dv.filter(x => /serious|critical/.test(x));
  rec("X-07", !serious.length && !dserious.length && inside && closed && !dupes.length && !unlabeled.length ? "PASS" : "FAIL", `axe on page: ${JSON.stringify(v)}; axe on revoke dialog: ${JSON.stringify(dv)}; dialog name=${JSON.stringify(dname)}; focus stayed inside over 8 Tabs=${inside}; Escape closed=${closed}; focus after close on "${restored}" (opener was the first Revoke key button); duplicate button names=${JSON.stringify(dupes)}; inputs without label=${JSON.stringify(unlabeled)}`, "X-07-account.png");
  await p.context().close();
}
// X-08 dark
{
  const { page: p } = await open(b, "account");
  const sel = "[data-testid=settings-content] .bg-success-light";
  const light = await contrast(p, sel);
  await dark(p);
  const d = await contrast(p, sel);
  await shot(p, "X-08-account-dark");
  rec("X-08", light >= 4.5 && d >= 4.5 ? "PASS" : "FAIL", `"Enabled" 2FA status pill contrast: light ${light}:1, dark ${d}:1 (needs >= 4.5:1)`, "X-08-account-dark.png");
  await p.context().close();
}
save(); await b.close();
