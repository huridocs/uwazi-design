import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, switchUser, newN, hscroll } from "./rec.mjs";
import { openCatalog, backToSettings } from "./devp.mjs";
const { rec, save } = mk("usr4");
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
const gname = (p) => S(p).getByPlaceholder("e.g. Litigation");

// USR-22, USR-23
{
  const { page: p } = await open(b, "users");
  await groupsTab(p);
  await p.getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(400);
  const t0 = await paneTxt(p);
  const labels = await S(p).locator("label").allInnerTexts().then(a => a.map(norm));
  const sel = await S(p).getByText("Select all").count();
  await shot(p, "USR-22");
  const dis0 = await commit(p).isDisabled();
  const msgs = [];
  const probe = async (v) => { await gname(p).fill(v); await p.waitForTimeout(200); const t = await paneTxt(p); return { v: v.length > 10 ? v.length + " chars" : v, dis: await commit(p).isDisabled(), msg: ["Name is required", "Name is too short", "Name is too long", "Duplicated name"].filter(m => t.includes(m)).join("/") || (t.match(/Already exists|already exists/) || [""])[0] }; };
  const pr = [await probe("ab"), await probe("a".repeat(51)), await probe("litigation"), await probe(" LITIGATION ")];
  await gname(p).fill("Ethics"); await S(p).getByRole("checkbox", { name: "tbuergenthal" }).click(); await S(p).getByRole("checkbox", { name: "admin" }).click();
  const b0 = await notifTitles(p);
  await gname(p).press("Enter"); await p.waitForTimeout(500);
  const enterSubmitted = (await S(p).getByRole("tab").count()) > 0;
  if (!enterSubmitted) { await commit(p).click(); await p.waitForTimeout(500); }
  const nb = newN(b0, await notifTitles(p)).filter(t => /Group|group|Ethics/.test(t));
  const rowT = await rowOf(p, "Ethics").innerText().then(norm).catch(() => "(none)");
  const tabs = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  const tbRow = await rowOf(p, "tbuergenthal").innerText().then(norm);
  rec("USR-22", /Name is required/.test(JSON.stringify(pr)) && /Duplicated name/.test(JSON.stringify(pr)) && enterSubmitted && nb.some(t => /Group saved/.test(t)) ? "PASS" : "FAIL", `New group editor: labels=${JSON.stringify(labels)} (spec "Name" + "Members" with placeholder "Nothing selected" and "Select all"; built "Group name" + checkbox list, Select all controls=${sel}); commit disabled when empty=${dis0}; probes=${JSON.stringify(pr)} (no inline error copy: Name is required / too short / too long / Duplicated name); Enter in Name submits=${enterSubmitted}; Beacon=${JSON.stringify(nb.map(s => s.slice(0, 50)))} (spec "Group saved"); Groups list row="${rowT}" (count, not username pills); tabs=${JSON.stringify(tabs)}; tbuergenthal row="${tbRow}"`, "USR-22.png");
  // duplicate actually saved?
  await groupsTab(p);
  const nGroups = await S(p).locator("[data-part=row]").count();
  rec("USR-22-dup", "INFO", `groups listed after Ethics create=${nGroups}`);
  // USR-23
  await rowOf(p, "Ethics").click(); await p.waitForTimeout(400);
  await gname(p).fill("Ethics board"); await S(p).getByRole("checkbox", { name: "admin" }).click();
  const b1 = await notifTitles(p);
  await commit(p).click(); await p.waitForTimeout(500);
  const nb2 = newN(b1, await notifTitles(p)).filter(t => /Group|group|Ethics/.test(t));
  await p.reload(); await p.waitForTimeout(1200);
  await groupsTab(p);
  const renamed = await rowOf(p, "Ethics board").innerText().then(norm).catch(() => "(missing)");
  await rowOf(p, "Ethics board").click(); await p.waitForTimeout(300);
  const mem = [await S(p).getByRole("checkbox", { name: "tbuergenthal" }).isChecked(), await S(p).getByRole("checkbox", { name: "admin" }).isChecked()];
  await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); await p.waitForTimeout(300);
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  const adminRow = await rowOf(p, "admin").innerText().then(norm), tbRow2 = await rowOf(p, "tbuergenthal").innerText().then(norm);
  rec("USR-23", /Group updated/.test(nb2.join()) && /Ethics board/.test(renamed) && mem[0] && !mem[1] ? "PASS" : "FAIL", `Beacon=${JSON.stringify(nb2.map(s => s.slice(0, 50)))} (spec "Group updated"); after reload group row="${renamed}", members tbuergenthal=${mem[0]} admin=${mem[1]}; admin row="${adminRow}"; tbuergenthal row="${tbRow2}"`, "");
  await p.context().close();
}
// USR-24 delete Litigation
{
  const { page: p } = await open(b, "users");
  await groupsTab(p);
  await tick(p, "Litigation").catch(() => {});
  const hasSel = await rowOf(p, "Litigation").getByRole("checkbox").count();
  await rowOf(p, "Litigation").getByRole("button", { name: "Delete Litigation" }).click({ force: true }); await p.waitForTimeout(400);
  const dt = await dlgTxt(p); const title = norm(await p.locator(DLG).last().locator("h2,h3").first().innerText().catch(() => ""));
  await shot(p, "USR-24");
  const b0 = await notifTitles(p);
  await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(500);
  const nb = newN(b0, await notifTitles(p)).filter(t => /group|Group|Litigation/.test(t));
  const rows = await S(p).locator("[data-part=row]").count();
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  const ml = await rowOf(p, "mlopez").innerText().then(norm), jn = await rowOf(p, "jnkemba").innerText().then(norm);
  rec("USR-24", title === "Delete" && /Do you want to delete the following items\?/.test(dt) && /2 members lose this group/.test(dt) && nb.some(t => /Deleted user group/.test(t)) ? "PASS" : "FAIL", `Group rows are selectable (checkbox)=${hasSel} (spec: tick Litigation then Delete; built: row Delete button only); dialog title="${title}", text="${dt}" (spec: "Delete", "Do you want to delete the following items?", "2 members lose this group", no password field); after confirm Beacon=${JSON.stringify(nb.map(s => s.slice(0, 50)))} (spec "Deleted user group"), groups rows=${rows}; mlopez="${ml}", jnkemba="${jn}"`, "USR-24.png");
  // USR-27: delete the rest
  await groupsTab(p);
  for (const g of ["Administrators", "Research"]) { await rowOf(p, g).getByRole("button", { name: "Delete " + g }).click({ force: true }); await p.waitForTimeout(300); await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(400); }
  const empty = await paneTxt(p);
  const addBtn = await S(p).getByRole("button", { name: "Add group" }).count() + await p.locator("footer").getByRole("button", { name: "Add group" }).count();
  await shot(p, "USR-27");
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  const search = S(p).getByPlaceholder(/Search users/); await search.fill("zzz"); await p.waitForTimeout(300);
  const zt = await paneTxt(p);
  rec("USR-27", /No groups yet/.test(empty) && /A group shares access/.test(empty) && addBtn >= 1 && !/NO DATA AVAILABLE|Nothing here yet/.test(empty) && /Nothing matches/.test(zt) ? "PASS" : "FAIL", `Groups tab with all deleted: "${empty.slice(empty.indexOf("No groups"), empty.indexOf("No groups") + 110)}", Add group buttons=${addBtn}; Users + "zzz": "${zt.slice(zt.indexOf("Nothing"), zt.indexOf("Nothing") + 40)}" with Clear search`, "USR-27.png");
  await p.context().close();
}
rec("USR4-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
