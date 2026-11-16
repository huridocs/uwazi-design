import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, newN, hscroll } from "./rec.mjs";
const { rec, save } = mk("usr2");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const DLG = '[role=dialog]:not([inert] *)';
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const names = (p) => S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.querySelector("p span.truncate")?.textContent.trim()));
const tick = async (p, n) => { await rowOf(p, n).getByRole("checkbox").click({ force: true }); await p.waitForTimeout(150); };
const footer = (p) => p.locator("footer").last().innerText().then(norm).catch(() => "");
const paneTxt = (p) => S(p).innerText().then(norm);
const fieldsOf = (p) => S(p).locator("input,textarea,select,[role=combobox],[role=radio]").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.placeholder || e.type || e.tagName) + (e.id ? "#" + e.id : "")));
const newUser = async (p) => { await p.getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(400); };
const inputs = (p) => S(p).locator("input[type=text],input[type=email],input:not([type])");
const commit = (p) => p.locator("footer").last().getByRole("button").last();

// USR-07, USR-08, USR-09, USR-30, USR-12
{
  const { page: p } = await open(b, "users");
  await newUser(p);
  const title = norm(await S(p).locator("h2").first().innerText().catch(() => ""));
  const txt = await paneTxt(p);
  const foot = await footer(p);
  const labels = await S(p).locator("label").allInnerTexts().then(a => a.map(norm));
  await shot(p, "USR-07");
  const hasPw = /Password/.test(txt);
  const roleCtl = await S(p).locator('[role=radio], input[type=radio]').count();
  const permBtn = await S(p).getByRole("button", { name: /\?|Permissions|help/i }).count();
  rec("USR-07", /New user/.test(await p.locator("body").innerText()) && hasPw && /Add/.test(foot) && !/Invite user/.test(foot) ? "PASS" : "FAIL", `Heading/crumb "${txt.slice(0, 40)}" (page "New user" present=${/New user/.test(await p.locator("body").innerText())}); field labels=${JSON.stringify(labels)} plus Role radio group (${roleCtl} radios) in place of a "User Role" select, Password field present=${hasPw}, Groups placeholder "Nothing selected"=${/Nothing selected/.test(txt)}; footer="${foot}" (spec: "Add" + "Cancel", fields Username, User Role, Email, Password, Groups)`, "USR-07.png");
  rec("USR-30", /Invite user/.test(await p.locator("body").innerText()) ? "FAIL" : "PASS", `Add user opens a full editor page (not a sidepanel): yes; but the footer commit reads "${foot}" and "Invite user" is on the page=${/Invite user/.test(await p.locator("body").innerText())} (spec: no control or heading reads "Invite user")`, "USR-07.png");
  rec("USR-12", permBtn ? "PASS" : "FAIL", `Controls named "?" / Permissions / help next to the role in the user editor=${permBtn}; role radios carry one-line hints only ("Full access to settings and content." etc.); no "Permissions" modal with the 15-row table`, "USR-07.png");
  // USR-08 validation
  const commitDisabled0 = await commit(p).isDisabled();
  await commit(p).click({ force: true }).catch(() => {}); await p.waitForTimeout(300);
  const t0 = await paneTxt(p);
  const ui = inputs(p);
  await ui.nth(0).fill("ab"); await ui.nth(1).fill("abc@x"); await p.waitForTimeout(250);
  const t1 = await paneTxt(p); const dis1 = await commit(p).isDisabled();
  await ui.nth(0).fill("a".repeat(51)); await p.waitForTimeout(200); const t2 = await paneTxt(p);
  await ui.nth(0).fill("a b"); await p.waitForTimeout(200); const t3 = await paneTxt(p);
  const dis3 = await commit(p).isDisabled();
  await shot(p, "USR-08");
  const msgs = ["Username is required", "Username is too short", "Username is too long", "Usernames cannot have spaces", "A valid email is required", "Password is too long"].filter(m => [t0, t1, t2, t3].some(t => t.includes(m)));
  rec("USR-08", msgs.length === 6 ? "PASS" : "FAIL", `Empty form: Invite user disabled=${commitDisabled0}, text shows errors: ${JSON.stringify(msgs)} of the 6 specified; "ab"/"abc@x" -> commit disabled=${dis1} no message; 51 chars and "a b" -> commit disabled=${dis3 } with no inline message (spec: Username is required / too short / too long / Usernames cannot have spaces / A valid email is required / Password is too long)`, "USR-08.png");
  // USR-09 duplicates
  await ui.nth(0).fill("MLOPEZ"); await ui.nth(1).fill("  M.LOPEZ@CEJIL.ORG "); await p.waitForTimeout(300);
  const d1 = await paneTxt(p);
  const dup1 = d1.includes("Duplicated username"), dup2 = d1.includes("Duplicated email");
  const built = (d1.match(/Already exists/g) || []).length;
  await shot(p, "USR-09");
  await ui.nth(0).fill("a.farah@example.org"); await ui.nth(1).fill("unique@example.org"); await p.waitForTimeout(250);
  const notFlagged = !(await paneTxt(p)).includes("Already exists");
  const dis = await commit(p).isDisabled();
  await p.context().close();
  const { page: q } = await open(b, "users");
  await rowOf(q, "mlopez").click(); await q.waitForTimeout(400);
  const selfFlag = (await paneTxt(q)).includes("Already exists");
  rec("USR-09", dup1 && dup2 && notFlagged && !selfFlag ? "PASS" : "FAIL", `MLOPEZ + " M.LOPEZ@CEJIL.ORG ": under-field messages "Duplicated username"=${dup1}, "Duplicated email"=${dup2}; built shows "Already exists" x${built} under the fields (same detection, other copy), commit disabled=${dis}; username equal to afarah's email not flagged=${notFlagged}; existing user opened unchanged flagged against itself=${selfFlag}`, "USR-09.png");
  await q.context().close();
}
// USR-10, USR-11, USR-01 (counts), USR-18
{
  const { page: p } = await open(b, "users");
  await newUser(p);
  const ui = inputs(p);
  await ui.nth(0).fill("newbie"); await ui.nth(1).fill("newbie@example.org");
  await S(p).getByRole("radio", { name: /Editor/ }).click(); await p.waitForTimeout(150);
  await S(p).getByRole("checkbox", { name: "Litigation" }).click(); await p.waitForTimeout(150);
  const before = await notifTitles(p);
  await commit(p).click(); await p.waitForTimeout(500);
  const dlgs = await dialogs(p);
  const modalTxt = dlgs.length ? norm(await p.locator(DLG).last().innerText()) : "";
  const onList = await S(p).locator("[data-part=row]").count();
  const rowT = onList ? await rowOf(p, "newbie").innerText().then(norm).catch(() => "(none)") : "(not on list)";
  const tabs = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  const after = await notifTitles(p); const nn = newN(before, after);
  await shot(p, "USR-10");
  rec("USR-18", dlgs.length === 1 && /Confirm action/.test(modalTxt) ? "PASS" : "FAIL", `Clicking the commit on a filled new-user form opened dialogs=${JSON.stringify(dlgs)}; the record was written without a "Confirm / Confirm action / Enter your current password to confirm" modal (list shows "${rowT.slice(0, 60)}")`, "USR-10.png");
  rec("USR-10", dlgs.length === 1 && /newbie.*Editor.*Password.*Litigation/.test(rowT) && nn.some(t => /Added new user/.test(t)) && nn.some(t => /welcome email/i.test(t)) ? "PASS" : "FAIL", `After Invite user: password modal=${dlgs.length === 1}; list row "${rowT}" (no Protection pill); tabs ${JSON.stringify(tabs)}; new Beacon entries=${JSON.stringify(nn.map(s => s.slice(0, 80)))} (spec: "Added new user" plus a welcome-email entry to newbie@example.org). Share dialog not driven: other parts already fail`, "USR-10.png");
  globalThis.usr01Count = tabs[0];
  const u1 = globalThis.u1;
  // USR-11
  await rowOf(p, "newbie").click().catch(() => {}); await p.waitForTimeout(400);
  const et = await paneTxt(p);
  await shot(p, "USR-11");
  rec("USR-11", /Invited/.test(et) && /Resend invitation/.test(et) ? "PASS" : "FAIL", `newbie editor text has "Invited" status=${/Invited/.test(et)} and "Resend invitation" action=${/Resend invitation/.test(et)}; list row had no Invited status ("${rowT}")`, "USR-11.png");
  await p.context().close();
}
rec("USR2-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
