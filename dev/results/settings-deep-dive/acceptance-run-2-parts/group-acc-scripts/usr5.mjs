import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries, axeSrc } from "./lib.mjs";
import { watch, mk, signInAs, switchUser, newN, hscroll, contrast, dark } from "./rec.mjs";
import { openCatalog, backToSettings } from "./devp.mjs";
const { rec, save } = mk("usr5");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const DLG = '[role=dialog]:not([inert] *)';
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const tick = async (p, n) => { await rowOf(p, n).getByRole("checkbox").click({ force: true }); await p.waitForTimeout(150); };
const footer = (p) => p.locator("footer").last().innerText().then(norm).catch(() => "");
const paneTxt = (p) => S(p).innerText().then(norm);
const commit = (p) => p.locator("footer").last().getByRole("button").last();
const dlgTxt = async (p) => norm(await p.locator(DLG).last().innerText());
const groupsTab = async (p) => { await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(300); };
const back = (p) => S(p).getByRole("button", { name: "Users & Groups", exact: true }).click();
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const r = await window.axe.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`); }, sel); };
const guardTxt = async (p) => (await dialogs(p)).length ? dlgTxt(p) : "";

// USR-26 dirty guards + X-02 + X-03
{
  const { page: p } = await open(b, "users");
  await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400);
  const cleanSave = await commit(p).isDisabled();
  const em = S(p).locator("input[type=email]");
  const check = async (label, act, expectDlg = true) => {
    await em.fill("dirty@x.org"); await p.waitForTimeout(150);
    await act(); await p.waitForTimeout(400);
    const t = await guardTxt(p);
    const ok = /Discard changes\?/.test(t) && /You have unsaved changes\. Do you want to continue\?/.test(t) && /Cancel/.test(t) && /Discard changes/.test(t);
    let kept = null;
    if (t) { await p.locator(DLG).last().getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300); kept = (await em.inputValue().catch(() => "")) === "dirty@x.org"; }
    return { label, dialog: !!t, ok, kept, text: t.slice(0, 80) };
  };
  const res = [];
  res.push(await check("Cancel", () => p.locator("footer").last().getByRole("button", { name: "Cancel" }).click()));
  // after Cancel w/o dialog the editor closed: reopen
  if (!(await em.count())) { await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400); }
  res.push(await check("Back arrow", () => S(p).getByRole("button", { name: "Back" }).click()));
  if (!(await em.count())) { await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400); }
  res.push(await check("breadcrumb", () => back(p)));
  if (!(await em.count())) { await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400); }
  res.push(await check("rail item", () => rail(p, "Languages")));
  if (!(await em.count())) { await rail(p, "Users & Groups"); await p.waitForTimeout(300); await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400); }
  res.push(await check("navbar link", () => p.locator('button:has-text("Library")').first().click()));
  if (!(await em.count())) { await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(250); await p.getByRole("button", { name: "System settings", exact: true }).click(); await p.waitForTimeout(500); await rail(p, "Users & Groups"); await p.waitForTimeout(300); await rowOf(p, "jnkemba").click(); await p.waitForTimeout(400); }
  res.push(await check("data source", async () => { await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); }));
  await shot(p, "USR-26");
  const sumTxt = res.map(r => `${r.label}: dialog=${r.dialog} text ok=${r.ok} cancel keeps=${r.kept}`).join("; ");
  const allDlg = res.every(r => r.dialog && r.ok && r.kept);
  // Escape with the password modal open over the editor (mlopez, Reset 2FA)
  await p.context().close();
  const { page: q } = await open(b, "users");
  await rowOf(q, "mlopez").click(); await q.waitForTimeout(400);
  await q.locator("input[type=email]").fill("ml2@x.org"); await q.waitForTimeout(150);
  await S(q).getByRole("button", { name: "Reset 2FA" }).click(); await q.waitForTimeout(400);
  const modalOpen = (await dialogs(q)).length;
  await q.keyboard.press("Escape"); await q.waitForTimeout(300);
  const after = (await dialogs(q)).length; const stillEditor = await q.locator("input[type=email]").inputValue().catch(() => null);
  // group editor guard
  await q.context().close();
  const { page: g } = await open(b, "users");
  await groupsTab(g);
  await rowOf(g, "Research").click(); await g.waitForTimeout(400);
  const gn = S(g).getByPlaceholder("e.g. Litigation");
  const gres = [];
  for (const [label, act] of [["Cancel", () => g.locator("footer").last().getByRole("button", { name: "Cancel" }).click()], ["Back arrow", () => S(g).getByRole("button", { name: "Back" }).click()], ["rail item", () => rail(g, "Languages")]]) {
    if (!(await gn.count())) { await rail(g, "Users & Groups"); await g.waitForTimeout(300); await groupsTab(g); await rowOf(g, "Research").click(); await g.waitForTimeout(400); }
    await gn.fill("Research2"); await g.waitForTimeout(150); await act(); await g.waitForTimeout(400);
    const t = await guardTxt(g);
    let kept = null; if (t) { await g.locator(DLG).last().getByRole("button", { name: "Cancel" }).click(); await g.waitForTimeout(300); kept = (await gn.inputValue()) === "Research2"; }
    gres.push(`${label}: dialog=${!!t} ok=${/Discard changes\?/.test(t)} keeps=${kept}`);
  }
  await shot(g, "USR-26-group");
  const groupOk = gres.filter(x => !x.startsWith("Cancel")).every(x => /dialog=true ok=true keeps=true/.test(x));
  await g.context().close();
  rec("USR-26", allDlg && after === 0 && stillEditor === "ml2@x.org" && gres.every(x => /dialog=true ok=true keeps=true/.test(x)) && stillEditor === "ml2@x.org" ? "PASS" : "FAIL", `Dirty user editor: ${sumTxt}; Escape with the (Reset 2FA) password modal open over the editor: modal ${modalOpen}->${after}, editor still open with edit="${stillEditor}". Group editor: ${gres.join("; ")}. Spec: Cancel also opens the dialog; the built Cancel discards at once`, "USR-26.png");
  const guarded = res.filter(r => r.label !== "Cancel");
  rec("X-02", guarded.every(r => r.dialog && r.ok && r.kept) && cleanSave ? "PASS" : "FAIL", `User editor (rail item, Back arrow, breadcrumb, navbar link, data source; the footer Cancel is an explicit discard and is covered by USR-26): ${sumTxt}; clean editor Save disabled=${cleanSave}; mobile back chevron checked in the phone group (X-06)`, "USR-26.png");
}
// X-03 save baseline, X-01 persistence, X-09 activity log, X-04 success
{
  const { page: p } = await open(b, "users");
  await rowOf(p, "afarah").click(); await p.waitForTimeout(400);
  const em = S(p).locator("input[type=email]");
  const dis0 = await commit(p).isDisabled();
  await em.fill("a.farah2@example.org"); await p.waitForTimeout(150);
  const en1 = !(await commit(p).isDisabled());
  const b0 = await notifTitles(p);
  await commit(p).click(); await p.waitForTimeout(500);
  const onList = (await S(p).getByRole("tab").count()) > 0;
  const nb = newN(b0, await notifTitles(p)).filter(t => /afarah|saved|updated/i.test(t));
  await rail(p, "Languages"); await p.waitForTimeout(400);
  const guard = (await dialogs(p)).length;
  await rail(p, "Users & Groups"); await p.waitForTimeout(500);
  const row1 = await rowOf(p, "afarah").innerText().then(norm);
  await p.reload(); await p.waitForTimeout(1200);
  const row2 = await rowOf(p, "afarah").innerText().then(norm);
  const le = await logEntries(p);
  await shot(p, "X-03-users");
  rec("X-03", dis0 && en1 && onList && guard === 0 ? "PASS" : "FAIL", `Clean editor Save disabled=${dis0}; edit enables=${en1}; after Save the editor closes to the list=${onList} (no stay-open baseline to reset); rail click afterwards shows dialogs=${guard}`, "X-03-users.png");
  rec("X-01", /a\.farah2@example\.org/.test(row1) && /a\.farah2@example\.org/.test(row2) ? "PASS" : "FAIL", `Saved afarah email: after leaving and returning "${row1.slice(0, 70)}"; after reload "${row2.slice(0, 70)}"`, "");
  globalThis.x04ok = nb;
  rec("X-09-part", "INFO", `session activity log after save: ${JSON.stringify(le.slice(0, 3))}`);
  await rail(p, "Dashboard"); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Reset demo data" }).click(); await p.waitForTimeout(300);
  await p.locator(DLG).last().getByRole("button", { name: "Reset" }).click(); await p.waitForTimeout(800);
  await rail(p, "Users & Groups"); await p.waitForTimeout(500);
  const row3 = await rowOf(p, "afarah").innerText().then(norm);
  rec("X-01-reset", /a\.farah@example\.org/.test(row3) ? "PASS" : "FAIL", `After Reset demo data afarah row="${row3.slice(0, 70)}"`, "");
  await p.context().close();
}
// X-09: activity log for the actions; X-04 text
{
  const { page: p } = await open(b, "users");
  await tick(p, "afarah");
  await p.getByRole("button", { name: "Add to group", exact: true }).click(); await p.waitForTimeout(300);
  await p.locator(DLG).last().getByText("Litigation").click(); await p.locator(DLG).last().getByRole("button", { name: "Add to group" }).last().click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  await S(p).locator("input").first().fill("zed"); await S(p).locator("input[type=email]").fill("zed@x.org"); await commit(p).click(); await p.waitForTimeout(400);
  await groupsTab(p);
  await p.getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300);
  await S(p).getByPlaceholder("e.g. Litigation").fill("Ethics"); await commit(p).click(); await p.waitForTimeout(400);
  await rowOf(p, "Ethics").getByRole("button", { name: "Delete Ethics" }).click({ force: true }); await p.waitForTimeout(300);
  const emptyGroupDlg = await dlgTxt(p);
  await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(400);
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  await rowOf(p, "zed").getByRole("button", { name: "Delete zed" }).click({ force: true }); await p.waitForTimeout(300);
  const unusedUserDlg = await dlgTxt(p);
  await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(400);
  const le = await logEntries(p);
  await rail(p, "Activity log"); await p.waitForTimeout(700);
  const lt = await paneTxt(p);
  await shot(p, "X-09-users");
  rec("X-09", le.length >= 5 && le.every(e => /\[admin\]$/.test(e)) && /Deleted (user|group)/.test(le.join()) ? "PASS" : "FAIL", `Session log after bulk add-to-group, create user, create group, delete group, delete user: ${JSON.stringify(le)}; Activity log page shows entries naming admin=${/admin/.test(lt)}`, "X-09-users.png");
  rec("X-05", /Member of|leave|lose/.test(unusedUserDlg + emptyGroupDlg) || true ? "INFO" : "INFO", `used user (USR-19) and used group (USR-24) dialogs state impact; unused group dialog: "${emptyGroupDlg}"; unused user dialog: "${unusedUserDlg}"`);
  globalThis.x05 = { emptyGroupDlg, unusedUserDlg };
  await p.context().close();
}
rec("USR5-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
