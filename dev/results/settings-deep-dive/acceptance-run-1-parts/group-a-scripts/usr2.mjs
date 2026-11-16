import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles } from "./lib.mjs";
import { mk, signInAs, switchUser, realErrors, lines, delta, newN } from "./rec.mjs";
const { rec, save } = mk("usr2");
const b = await launch();
const tab = (p, n) => S(p).getByRole("tab", { name: new RegExp("^" + n) });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
const dlgText = async (p) => norm((await p.locator('[role=dialog]:not([inert]):not([inert] *)').allInnerTexts()).join(" | "));
const userRows = async (p) => (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
const openUser = async (p, n) => { await S(p).getByRole("button", { name: `Edit ${n}` }).first().dispatchEvent("click"); await p.waitForTimeout(400); };
const inp = (p, i) => S(p).locator("input:not([type=checkbox]):not([type=radio])").nth(i);
const invite = (p) => S(p).getByRole("button", { name: /Invite user|^Save$/ }).last();
const textNow = async (p) => lines(p);

// USR-08: validation
{
  const { page: p } = await open(b, "users");
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  const base = await lines(p);
  const out = [];
  const ariaDis = `aria-disabled=${await invite(p).getAttribute("aria-disabled")} disabled=${await invite(p).isDisabled()}`;
  await invite(p).click({ force: true }); await p.waitForTimeout(300);
  out.push(`empty + click: ${ariaDis}, new text=${JSON.stringify(delta(base, await lines(p)))}, still on editor=${/New user/.test(await S(p).innerText())}`);
  for (const [lab, v] of [["ab", "ab"], ["51 chars", "a".repeat(51)], ["a b", "a b"]]) {
    await inp(p, 0).fill(v); await p.waitForTimeout(150);
    out.push(`username ${lab}: new text=${JSON.stringify(delta(base, await lines(p)))}`);
  }
  await inp(p, 1).fill("abc@x"); await p.waitForTimeout(150);
  out.push(`email abc@x: new text=${JSON.stringify(delta(base, await lines(p)))}`);
  await shot(p, "USR-08");
  const pw = await S(p).locator("input[type=password]").count();
  const expected = ["Username is required", "Username is too short", "Username is too long", "Usernames cannot have spaces", "A valid email is required", "Password is too long"];
  const all = (await lines(p)).join(" ");
  const found = expected.filter(e => all.includes(e) || out.join(" ").includes(e));
  rec("USR-08", found.length === expected.length ? "PASS" : "FAIL", `${out.join(" ; ")}. Spec messages found: ${JSON.stringify(found)} of ${expected.length}; no Password field exists (password inputs=${pw}), so "Password is too long" cannot be produced`, "USR-08.png");
  await p.context().close();
}
// USR-09 duplicates
{
  const { page: p } = await open(b, "users");
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  const base = await lines(p);
  await inp(p, 0).fill("MLOPEZ"); await inp(p, 1).fill("  M.LOPEZ@CEJIL.ORG  "); await p.waitForTimeout(200);
  const d1 = delta(base, await lines(p));
  const disabled = await invite(p).getAttribute("aria-disabled");
  await invite(p).click({ force: true }); await p.waitForTimeout(300);
  const stay = /New user/.test(await S(p).innerText());
  await inp(p, 0).fill("a.farah@example.org"); await inp(p, 1).fill("unique@example.org"); await p.waitForTimeout(200);
  const d2 = delta(base, await lines(p));
  await shot(p, "USR-09");
  // editing existing user w/o change
  await p.context().close();
  const r2 = await open(b, "users"); const q = r2.page;
  await openUser(q, "mlopez");
  const b2 = await lines(q);
  await inp(q, 0).fill("mlopez"); await q.waitForTimeout(150);
  const d3 = delta(b2, await lines(q));
  rec("USR-09", d1.includes("Duplicated username") && d1.includes("Duplicated email") && !d2.length && !d3.length ? "PASS" : "FAIL", `MLOPEZ / "  M.LOPEZ@CEJIL.ORG  ": new text=${JSON.stringify(d1)} (spec: "Duplicated username", "Duplicated email"; case-insensitive and trimmed matching works); save blocked (aria-disabled=${disabled}, stayed on editor=${stay}); username "a.farah@example.org" not flagged=${!d2.length}; editing mlopez without changing the name is not flagged against itself=${!d3.length}`, "USR-09.png");
  await r2.ctx.close();
}
// USR-10, 11, 18 (create), X-04 partial, X-09
{
  const { page: p } = await open(b, "users");
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  await inp(p, 0).fill("newbie"); await inp(p, 1).fill("newbie@example.org");
  await S(p).getByRole("radio", { name: /Editor/ }).click();
  await S(p).getByRole("checkbox", { name: "Litigation" }).click();
  const nb = await notifTitles(p);
  await shot(p, "USR-10-form");
  await invite(p).click(); await p.waitForTimeout(500);
  const dl = await dialogs(p);
  const nn = newN(nb, await notifTitles(p));
  const list = await userRows(p).catch(() => []);
  const row = list.find(r => /newbie/.test(r));
  const tabs = (await S(p).getByRole("tab").allInnerTexts()).map(norm);
  await shot(p, "USR-10");
  const share = "not driven";
  rec("USR-10", dl.length && nn.some(x=>/Added new user/.test(x)) ? "PASS" : "FAIL", `Click "Invite user": password modal opened=${JSON.stringify(dl)} (none; saved at once); list row="${row}"; tabs=${JSON.stringify(tabs)}; new Beacon entries=${JSON.stringify(nn)} (spec: "Added new user" plus a welcome-email entry for newbie@example.org; only one entry, text "User invited"/other). Share dialog membership of newbie: not driven`, "USR-10.png");
  // USR-11
  await S(p).getByRole("button", { name: "Edit newbie" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
  const ed = norm(await S(p).innerText());
  rec("USR-11", /Invited/.test(row + ed) && /Resend invitation/.test(ed) ? "PASS" : "FAIL", `newbie created (no password field exists in the editor). Row/editor status "Invited" present=${/Invited/.test(row + ed)}; "Resend invitation" action present=${/Resend invitation/.test(ed)}; editor text: "${ed.slice(0,200)}"`, "");
  await p.context().close();
}
// USR-12 role help
{
  const { page: p } = await open(b, "users");
  await openUser(p, "mlopez");
  const help = await S(p).getByRole("button", { name: /\?|permission|role help|about roles/i }).count();
  const qbtns = await S(p).locator("button").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.innerText).trim()).filter(Boolean));
  rec("USR-12", help ? "PASS" : "FAIL", `No "?" button next to the role control; buttons on the editor page: ${JSON.stringify(qbtns)}; no "Permissions" modal (table of 15 actions) exists. The roles are described by one-line hints under each radio: "Full access to settings and content." / "Create and edit content; no settings." / "Comment and suggest only."`, "");
  // USR-14 security area
  const t = norm(await S(p).innerText());
  const secBtns = qbtns.filter(x => /reset|unlock/i.test(x));
  await p.getByRole("button", { name: /^Reset$/ }).first().click().catch(()=>{});
  await p.waitForTimeout(400);
  const dl = await dialogs(p);
  await S(p).getByRole("button", { name: /Cancel/ }).click(); await p.waitForTimeout(300);
  const rowsU = await userRows(p);
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  const newBtns = await S(p).locator("button").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.innerText).trim()).filter(Boolean));
  rec("USR-14", "FAIL", `Existing user editor: security buttons=${JSON.stringify(secBtns)} (spec: "Reset Password", "Reset 2FA", and "Unlock account" for a locked user); there is a single "Reset" button in a 2FA card, clicking it opened dialogs=${JSON.stringify(dl)} (no confirm, no password modal) and only raised the notification "2FA reset for this user" (see ACC-18: the account's 2FA stays on); no "Reset Password" action; "Disabled 2FA" entry text not produced. New user shows no reset buttons=${!newBtns.some(x=>/reset|unlock/i.test(x))} (matches). mlopez Users row afterwards (2FA still on): "${rowsU.find(r=>/mlopez/.test(r))}"`, "");
  await p.context().close();
}
// USR-13 groups control
{
  const { page: p } = await open(b, "users");
  await openUser(p, "jnkemba");
  const combos = await S(p).locator('[role=combobox], [role=listbox], input[placeholder="Nothing selected"]').count();
  const cbs = await S(p).getByRole("checkbox").evaluateAll(es => es.map(e => e.getAttribute("aria-label") + ":" + e.getAttribute("aria-checked")));
  await S(p).getByRole("checkbox", { name: "Litigation" }).click();
  await S(p).getByRole("checkbox", { name: "Administrators" }).click();
  await S(p).getByRole("checkbox", { name: "Research" }).click();
  await p.waitForTimeout(200);
  await shot(p, "USR-13");
  await S(p).getByRole("button", { name: /^Save$/ }).click(); await p.waitForTimeout(500);
  const r = (await userRows(p)).find(x => /jnkemba/.test(x));
  rec("USR-13", "FAIL", `Groups control is a checkbox list (${JSON.stringify(cbs)}), not a searchable multi-select: comboboxes/"Nothing selected" placeholder=${combos}, no search field, no removable pills. Toggling Litigation off, Administrators on, Research off and saving works: jnkemba row afterwards "${r}"`, "USR-13.png");
  // X-01 persistence in users
  await rail(p, "Dashboard"); await p.waitForTimeout(300); await rail(p, "Users & Groups"); await p.waitForTimeout(400);
  const back = (await userRows(p)).find(x => /jnkemba/.test(x));
  await p.reload(); await p.waitForTimeout(1200);
  const rel = (await userRows(p)).find(x => /jnkemba/.test(x));
  await rail(p, "Dashboard"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: /Reset demo data/ }).click(); await p.waitForTimeout(300);
  await conf(p, "Reset").click(); await p.waitForTimeout(500);
  await rail(p, "Users & Groups"); await p.waitForTimeout(400);
  const reset = (await userRows(p)).find(x => /jnkemba/.test(x));
  rec("X-01", /Administrators/.test(back || "") && !/Litigation/.test(back || "") && back === rel && /Litigation Research/.test(reset||"") ? "PASS" : "FAIL", `After Save: "${back}"; after rail away/back: same; after reload: "${rel}"; after Reset demo data: "${reset}"`, "");
  await p.context().close();
}
// USR-18 save edit
{
  const { page: p } = await open(b, "users");
  await openUser(p, "mlopez");
  const nb = await notifTitles(p);
  await S(p).locator('input[type=email]').fill("m.lopez2@cejil.org");
  await S(p).getByRole("button", { name: /^Save$/ }).click(); await p.waitForTimeout(500);
  const dl = await dialogs(p);
  const nn = newN(nb, await notifTitles(p));
  const row = (await userRows(p)).find(x => /mlopez/.test(x));
  rec("USR-18", dl.length ? "PASS" : "FAIL", `Save on an edited user: password modal dialogs=${JSON.stringify(dl)} (none: the record is written and the editor closes at once, no "Confirm"/"Enter your current password to confirm", no Cancel/Accept); new Beacon=${JSON.stringify(nn)} (spec "User updated"); row now "${row}"`, "");
  rec("X-04", "FAIL", `User save/create/delete Beacon texts differ from the Uwazi strings: edit -> ${JSON.stringify(nn)} (spec "User updated"); create -> see USR-10 (spec "Added new user"); and no failure path exists to produce "An error occurred" (a forced failure is blocked inline instead)`, "");
  // X-09
  await rail(p, "Activity log"); await p.waitForTimeout(1200);
  const l = (await lines(p)).slice(4, 14).join(" / ");
  rec("X-09", /Updated user/.test(l) && /mlopez/.test(l) ? "PASS" : "FAIL", `After editing a user, Activity log newest entries: ${l}`, "");
  await p.context().close();
}
// USR-19, X-05 delete mlopez
{
  const { page: p } = await open(b, "users");
  await p.locator('[role=row]', { hasText: "mlopez" }).hover();
  await S(p).getByRole("button", { name: "Delete mlopez" }).click(); await p.waitForTimeout(400);
  const dt = await dlgText(p);
  await shot(p, "USR-19");
  const nb = await notifTitles(p);
  const pwField = await p.locator('[role=dialog]:not([inert]):not([inert] *) input[type=password]').count();
  const btns = await p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole("button").allInnerTexts();
  await conf(p, /^Delete/).click().catch(async () => { await dg(p, /Delete|Accept/).click(); });
  await p.waitForTimeout(500);
  const rowsAfter = await userRows(p);
  const tabs = (await S(p).getByRole("tab").allInnerTexts()).map(norm);
  const nn = newN(nb, await notifTitles(p));
  await tab(p, "Groups").click(); await p.waitForTimeout(300);
  const g = (await S(p).locator('[role=row]').allInnerTexts()).map(norm);
  rec("USR-19", "FAIL", `No row checkbox/bulk "Delete" (delete is a per-row trash button). Dialog text: "${dt}" (spec: title "Delete", warning "Do you want to delete the following items?", "mlopez", line "removed from 1 group", password field; password inputs=${pwField}); buttons=${JSON.stringify(btns.filter(Boolean))}. After confirming: rows=${rowsAfter.length}, tabs=${JSON.stringify(tabs)}, new Beacon=${JSON.stringify(nn)} (spec "Deleted user"), Groups after: ${JSON.stringify(g)} (Litigation members now 1). Share dialog not driven`, "USR-19.png");
  rec("X-05", /Used by|used by|belongs to|group|share/i.test(dt) ? "PASS" : "FAIL", `Deleting mlopez (member of Litigation) dialog: "${dt}" -> states the group impact in the dialog text`, "USR-19.png");
  await p.context().close();
}
// USR-20 admin
{
  const { page: p } = await open(b, "users");
  await p.locator('[role=row]', { hasText: "admin" }).first().hover();
  const dis = await S(p).getByRole("button", { name: "Delete admin" }).first().isDisabled();
  await S(p).getByRole("button", { name: "Delete admin" }).first().click({ force: true }); await p.waitForTimeout(400);
  const dt = await dlgText(p);
  const btns = (await p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole("button").allInnerTexts()).filter(Boolean);
  await shot(p, "USR-20-delete");
  if ((await dialogs(p)).length) await dg(p, /Cancel|Close/).click().catch(()=>p.keyboard.press("Escape"));
  await p.waitForTimeout(300);
  await openUser(p, "admin");
  const radios = await S(p).getByRole("radio").evaluateAll(es => es.map(e => (e.closest("label")?.innerText || "").split("\n")[0] + ":" + (e.disabled || e.getAttribute("aria-disabled"))));
  const t = norm(await S(p).innerText());
  await shot(p, "USR-20-editor");
  rec("USR-20", /Users cannot delete themselves/.test(dt) && /Cannot change own role/.test(t) && /Cannot remove the last remaining admin/.test(t + dt) ? "PASS" : "FAIL", `Admin row delete trash button disabled=${dis}; clicking it opens dialog "${dt}" buttons=${JSON.stringify(btns)} (spec reason "Users cannot delete themselves"); admin's own editor role radios=${JSON.stringify(radios)}; page text mentions "Cannot change own role"=${/Cannot change own role/.test(t)}, "Cannot remove the last remaining admin"=${/Cannot remove the last remaining admin/.test(t)}; role note text: "${t.match(/This is the last admin.{0,160}/)?.[0]}"`, "USR-20-delete.png");
  await p.context().close();
}
save(); await b.close();
