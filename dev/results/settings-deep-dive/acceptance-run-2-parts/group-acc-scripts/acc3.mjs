import { launch, open, S, shot, notifTitles, dialogs, axe, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, realErrors, newN, hscroll, contrast, dark } from "./rec.mjs";
const { rec, save } = mk("acc3");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const upd = (p) => p.getByRole("button", { name: "Update", exact: true });
const email = (p) => p.locator("#account-email");
const modalPw = (p) => p.locator('[role=dialog]:not([inert] *) input[type=password]');
const acceptBtn = (p) => p.getByRole("button", { name: "Accept" });
const logo = (p) => p.locator('[data-part=logo]').click();
const seriousOnly = (v) => v.filter(x => /serious|critical/.test(x));

// ACC-21 desktop + phone
{
  const { page: p } = await open(b, "account");
  const w = await p.evaluate(() => [...document.querySelectorAll('[data-testid="settings-content"] input')].map(i => Math.round(i.getBoundingClientRect().width)));
  const pane = await p.evaluate(() => Math.round(document.querySelector('[data-testid="settings-content"]').getBoundingClientRect().width));
  const maxW = Math.max(...w);
  await email(p).fill("a@b.org"); await upd(p).click(); await p.waitForTimeout(400);
  const mw = await p.evaluate(() => { const i = document.querySelector('[role=dialog]:not([inert] *) input[type=password]'); const d = i.closest('[role=dialog]'); return { input: Math.round(i.getBoundingClientRect().width), dialog: Math.round(d.getBoundingClientRect().width) }; });
  await shot(p, "ACC-21-desktop");
  await p.context().close();
  const m = await open(b, "account", "mobile"); const q = m.page;
  const fields = await q.evaluate(() => [...document.querySelectorAll('[data-testid="settings-content"] input')].map(i => { const r = i.getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width) }; }));
  const hs = await hscroll(q);
  await q.locator("#account-email").fill("a@b.org"); await q.getByRole("button", { name: "Update", exact: true }).click(); await q.waitForTimeout(400);
  const mm = await q.evaluate(() => { const i = document.querySelector('[role=dialog]:not([inert] *) input[type=password]'); const r = i.getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width), vw: innerWidth, sw: document.documentElement.scrollWidth }; });
  await shot(q, "ACC-21-phone");
  const singleCol = new Set(fields.filter(f => f.w > 60).map(f => f.l)).size === 1;
  rec("ACC-21", maxW <= 660 && mw.input <= 660 && hs.doc <= 0 && singleCol && mm.sw <= mm.vw ? "PASS" : "FAIL", `Desktop: pane ${pane}px, input widths ${JSON.stringify(w)} (max ${maxW}px = ${(maxW/16).toFixed(1)}rem, limit ~40rem), password modal input ${mw.input}px; Phone: horizontal overflow ${hs.doc}px, input left edges ${JSON.stringify([...new Set(fields.map(f=>f.l))])} (single column=${singleCol}), modal input ${mm.l}+${mm.w} of ${mm.vw}px`, "ACC-21-phone.png");
  rec("X-06-phone-acc", "INFO", `phone overflow=${hs.doc}`);
  await m.ctx.close();
}
// ACC-22, ACC-23
{
  const r = await open(b, "account"); const p = r.page; const ctx = r.ctx;
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await p.getByLabel("Key name").fill("ci"); await p.getByRole("button", { name: "Generate" }).click(); await p.waitForTimeout(400);
  const fresh = p.locator('[data-part="new-key"]');
  const ft = norm(await fresh.innerText());
  const full = norm(await fresh.locator("code").innerText());
  await fresh.getByRole("button", { name: /Copy key/ }).click(); await p.waitForTimeout(300);
  await p.getByLabel("Key name").fill(""); await p.getByLabel("Key name").focus();
  await p.keyboard.press("Control+V").catch(()=>{});
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  // paste into key-name field via real paste event
  await p.getByLabel("Key name").click(); await p.keyboard.press("Meta+V"); await p.keyboard.press("Control+V");
  const pasted = await p.getByLabel("Key name").inputValue();
  await p.getByLabel("Key name").fill("");
  await shot(p, "ACC-22-fresh");
  await fresh.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(300);
  const listTxt = norm(await S(p).innerText());
  const masked = listTxt.match(/ci uwz_live_••••(\w{4})/);
  const fullShown = listTxt.includes(full);
  await shot(p, "ACC-22");
  rec("ACC-22", /You won't see this again/.test(ft) && clip === full && masked && masked[1] === full.slice(-4) && !fullShown ? "PASS" : "FAIL", `fresh panel="${ft.slice(0,120)}"; clipboard after Copy key equals full key=${clip === full} (pasted into field: ${pasted === full}); after Done list row shows masked "uwz_live_••••${masked?.[1]}" (last4 matches=${masked?.[1] === full.slice(-4)}); full key anywhere on page=${fullShown}`, "ACC-22.png");
  // ACC-23
  const before = await notifTitles(p);
  const revokeBtn = p.getByRole("button", { name: "Revoke API key ci" });
  await revokeBtn.click({ force: true }); await p.waitForTimeout(300);
  const dl = await dialogs(p); const dtxt = norm(await p.locator('[role=dialog]:not([inert] *)').last().innerText());
  await shot(p, "ACC-23");
  await p.locator('[role=dialog]:not([inert] *)').last().getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300);
  const kept = (await S(p).innerText()).includes("ci uwz") || (await S(p).innerText()).includes("ci\nuwz") || /\bci\b/.test(await S(p).innerText());
  await revokeBtn.click({ force: true }); await p.waitForTimeout(300);
  await p.locator('[role=dialog]:not([inert] *)').last().getByRole("button", { name: "Revoke" }).click(); await p.waitForTimeout(500);
  const gone = await p.getByRole("button", { name: "Revoke API key ci" }).count() === 0;
  const after = await notifTitles(p);
  const nn = newN(before, after).filter(t => /API key revoked/.test(t)).length;
  await p.reload(); await p.waitForTimeout(1200);
  const goneAfter = await p.getByRole("button", { name: "Revoke API key ci" }).count() === 0;
  await rail(p, "Activity log"); await p.waitForTimeout(700);
  const logTxt = norm(await S(p).innerText());
  const gen = /Generated API key “ci”/.test(logTxt), rev = /Revoked API key “ci”/.test(logTxt);
  const le = await logEntries(p);
  await shot(p, "ACC-23-log");
  rec("ACC-23", dl.length === 1 && kept && gone && nn === 1 && goneAfter && gen && rev && le.some(x=>/Revoked API key/.test(x)&&/admin/.test(x)) ? "PASS" : "FAIL", `Revoke opens dialog=${JSON.stringify(dl)} ("${dtxt.slice(0,110)}"); Cancel keeps key=${kept}; confirm removes=${gone}; Beacon "API key revoked" entries=${nn}; gone after reload=${goneAfter}; Activity log shows generate=${gen} revoke=${rev}; session log entries=${JSON.stringify(le.slice(0,3))}`, "ACC-23.png");
  await ctx.close();
}
// X-01 / X-03 / X-09 / X-04 success half + reset demo data
{
  const { page: p, errors } = await open(b, "account");
  const e = email(p);
  await e.fill("persist@x.org"); await upd(p).click(); await p.waitForTimeout(300); await modalPw(p).fill("pw"); await acceptBtn(p).click(); await p.waitForTimeout(500);
  const dis = await upd(p).isDisabled();
  await rail(p, "Languages"); await p.waitForTimeout(500);
  const guardAfterSave = (await dialogs(p)).length;
  await rail(p, "Account"); await p.waitForTimeout(500);
  const v1 = await email(p).inputValue();
  await p.reload(); await p.waitForTimeout(1200);
  const v2 = await email(p).inputValue();
  await email(p).fill("persist2@x.org"); await p.waitForTimeout(200);
  const reen = !(await upd(p).isDisabled());
  const le = await logEntries(p);
  await email(p).fill("persist@x.org");
  await shot(p, "X-03");
  rec("X-03", dis && guardAfterSave === 0 && reen ? "PASS" : "FAIL", `After Update: Update disabled=${dis}; rail click showed dialogs=${guardAfterSave}; editing again re-enables=${reen}`, "X-03.png");
  rec("X-09", le.some(x => /UPDATE/.test(x) && /admin/.test(x)) ? "PASS" : "FAIL", `Activity entries after the save: ${JSON.stringify(le.slice(0, 3))}`, "");
  // reset demo data
  await rail(p, "Dashboard"); await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Reset demo data" }).click(); await p.waitForTimeout(400);
  const dd = await dialogs(p);
  const dlgBtns = await p.locator('[role=dialog]:not([inert] *)').last().getByRole("button").allInnerTexts();
  await p.locator('[role=dialog]:not([inert] *)').last().getByRole("button", { name: /Reset|Accept|Confirm/ }).last().click(); await p.waitForTimeout(800);
  await rail(p, "Account"); await p.waitForTimeout(500);
  const v3 = await email(p).inputValue();
  rec("X-01", v1 === "persist@x.org" && v2 === "persist@x.org" && v3 === "admin@uwazi.io" ? "PASS" : "FAIL", `Saved persist@x.org; after leaving and returning="${v1}"; after reload="${v2}"; after Reset demo data (dialog buttons ${JSON.stringify(dlgBtns.map(norm))})="${v3}" (ACC-12 reset half: expects admin@uwazi.io)`, "");
  const real = realErrors(errors);
  rec("ACC-console-3", real.length ? "FAIL" : "PASS", JSON.stringify(real));
  await p.context().close();
}
// X-02 (navbar link, dirty back), no-change no dialog
{
  const { page: p } = await open(b, "account");
  await rail(p, "Languages"); await p.waitForTimeout(400); const nd = (await dialogs(p)).length;
  await rail(p, "Account"); await p.waitForTimeout(400);
  await email(p).fill("dirty@x.org"); await p.waitForTimeout(150);
  await p.locator('button:has-text("Library")').first().click(); await p.waitForTimeout(400);
  const d1 = await dialogs(p); const t1 = d1.length ? norm(await p.locator('[role=dialog]:not([inert] *)').last().innerText()) : "";
  await shot(p, "X-02");
  await p.getByRole("button", { name: "Discard changes" }).last().click(); await p.waitForTimeout(600);
  const onLib = !(await p.locator('[data-testid="settings-content"]').count());
  // return to settings and see the edit gone
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(250);
  await p.getByRole("button", { name: /User settings/ }).click().catch(()=>{}); await p.waitForTimeout(600);
  const back = await email(p).inputValue().catch(() => "n/a");
  rec("X-02", nd === 0 && d1.length === 1 && /Discard changes\?/.test(t1) && /You have unsaved changes\. Do you want to continue\?/.test(t1) && onLib && back === "admin@uwazi.io" ? "PASS" : "FAIL", `No change: rail click dialogs=${nd}; dirty + navbar Library link: dialogs=${JSON.stringify(d1)} text="${t1}"; Discard changes navigated to Library=${onLib}; edit gone on return: email="${back}" (rail item, logout, data-source paths shown in ACC-20)`, "X-02.png");
  await p.context().close();
}
rec("ACC3-console", consoleErrs.length ? "FAIL" : "PASS", `console errors/warnings (atomFamily baseline excluded): ${JSON.stringify(consoleErrs)}`);
save(); await b.close();
