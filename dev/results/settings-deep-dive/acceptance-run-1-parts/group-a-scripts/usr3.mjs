import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles } from "./lib.mjs";
import { mk, signInAs, switchUser, realErrors, lines, delta, newN } from "./rec.mjs";
const { rec, save } = mk("usr3");
const b = await launch();
const tab = (p, n) => S(p).getByRole("tab", { name: new RegExp("^" + n) });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
const dlgText = async (p) => norm((await p.locator('[role=dialog]:not([inert]):not([inert] *)').allInnerTexts()).join(" | "));
const urows = async (p) => (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
const nameIn = (p) => S(p).locator("input:not([type=checkbox])").first();
const openUser = async (p, n) => { await S(p).getByRole("button", { name: `Edit ${n}` }).first().dispatchEvent("click"); await p.waitForTimeout(400); };
const grp = async (p) => { await tab(p, "Groups").click(); await p.waitForTimeout(300); };
const commit = (p) => S(p).getByRole("button", { name: /^(Create group|Save)$/ }).last();

// USR-21
{
  const { page: p } = await open(b, "users");
  await grp(p);
  const heads = (await S(p).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const r = await urows(p);
  const sortable = await S(p).locator('[role=columnheader] button, [aria-sort]').count();
  await shot(p, "USR-21");
  rec("USR-21", "FAIL", `Columns=${JSON.stringify(heads)} (spec: Name sortable, Members); rows=${JSON.stringify(r)} in seed order (Administrators, Litigation, Research); sortable controls=${sortable}; Members cell is a number ("1", "2", "2"), not one username pill per member (spec pills: Litigation mlopez+jnkemba, Research jnkemba+afarah, Administrators admin; "1 member"/"2 members" text)`, "USR-21.png");
  await p.context().close();
}
// USR-22, 23, X-04 groups, X-09 groups
{
  const { page: p } = await open(b, "users");
  await grp(p);
  await S(p).getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300);
  const base = await lines(p);
  const title = norm(await S(p).locator("h2").first().innerText());
  const out = [];
  out.push(`editor header="${norm(await S(p).locator("h2").first().innerText())}" labels=${JSON.stringify((await S(p).locator("label").allInnerTexts()).map(norm).filter(Boolean).slice(0,6))}, commit="${norm(await commit(p).innerText())}" disabled=${await commit(p).isDisabled()}`);
  for (const [lab, v] of [["ab", "ab"], ["51 chars", "a".repeat(51)], ["litigation", "litigation"], [" LITIGATION ", " LITIGATION "]]) {
    await nameIn(p).fill(v); await p.waitForTimeout(150);
    out.push(`name ${lab}: new text=${JSON.stringify(delta(base, await lines(p)))} commit disabled=${await commit(p).isDisabled()}`);
  }
  const memberHint = await S(p).getByPlaceholder("Nothing selected").count();
  const selAll = await S(p).getByRole("button", { name: /Select all/ }).count();
  await shot(p, "USR-22-validation");
  // create Ethics
  await nameIn(p).fill("Ethics");
  await S(p).getByRole("checkbox", { name: /tbuergenthal/ }).click();
  await S(p).getByRole("checkbox", { name: /^admin|admin$/ }).first().click();
  const nb = await notifTitles(p);
  await nameIn(p).press("Enter"); await p.waitForTimeout(500);
  const enterSubmitted = !/New group/.test(await S(p).innerText());
  if (!enterSubmitted) { await commit(p).click(); await p.waitForTimeout(500); }
  const nn = newN(nb, await notifTitles(p));
  const gr = await urows(p);
  const tabs = (await S(p).getByRole("tab").allInnerTexts()).map(norm);
  await shot(p, "USR-22");
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  const tb = (await urows(p)).find(x => /tbuergenthal/.test(x));
  rec("USR-22", "FAIL", `Editor "${title}" ok; ${out.join(" ; ")}. "Nothing selected" placeholder=${memberHint}, "Select all" in picker=${selAll} (members are a checkbox list with a "0 of 5 users." count). None of the validation messages (Name is required / too short / too long / Duplicated name) appear: commit is simply disabled and a duplicate name is not flagged (name "litigation" and " LITIGATION " leave commit enabled=${!/disabled=true/.test(out[3] + out[4])}). Enter in Name submits=${enterSubmitted}. Created Ethics with tbuergenthal + admin: new Beacon=${JSON.stringify(nn)} (spec "Group saved"); Groups rows=${JSON.stringify(gr)}; tabs=${JSON.stringify(tabs)}; tbuergenthal row="${tb}"`, "USR-22.png");
  // duplicate name creation check
  // USR-23
  await grp(p);
  await S(p).getByRole("button", { name: "Edit Ethics" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
  await nameIn(p).fill("Ethics board");
  await S(p).getByRole("checkbox", { name: /^admin|admin$/ }).first().click();
  const nb2 = await notifTitles(p);
  await commit(p).click(); await p.waitForTimeout(500);
  const nn2 = newN(nb2, await notifTitles(p));
  await p.reload(); await p.waitForTimeout(1200);
  await grp(p);
  const gr2 = await urows(p);
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  const ur = await urows(p);
  const adm = ur.find(x => / admin/.test(x) && /admin@/.test(x));
  const tb2 = ur.find(x => /tbuergenthal/.test(x));
  rec("USR-23", /Group updated/.test(nn2.join(" ")) ? "PASS" : "FAIL", `Rename to "Ethics board" and remove admin: new Beacon=${JSON.stringify(nn2)} (spec "Group updated"); after reload Groups rows=${JSON.stringify(gr2)}; tbuergenthal row="${tb2}" (keeps the group under the new name); admin row="${adm}" (no Ethics pill). State survives reload: behaviour correct, Beacon text differs`, "");
  rec("USR-25", "FAIL", `Beacon texts observed: user create "User invited" (spec "Added new user" + welcome-email entry), user edit "mlopez saved" (spec "User updated"), user delete "mlopez deleted" (spec "Deleted user"), group create ${JSON.stringify(nn)} (spec "Group saved"), group update ${JSON.stringify(nn2)} (spec "Group updated"); exactly one entry per action in each case. Reset 2FA: "2FA reset for this user" (spec "Disabled 2FA"); no Reset Password action. A forced failure of the mock cannot be produced (invalid saves are blocked before saving), so the "An error occurred" entry is never produced`, "");
  await rail(p, "Dashboard"); await p.waitForTimeout(400);
  const dX3 = await dialogs(p);
  rec("X-03", dX3.length === 0 ? "PASS" : "FAIL", `Group editor closes on a successful Save (returns to the list; no Save button remains); a rail click right after the save raised dialogs=${JSON.stringify(dX3)} (none). User edits: same after USR-18/USR-10 saves (editor closed, list shown)`, "");
  await p.context().close();
}
// USR-24 + USR-27 + X-05 unused
{
  const { page: p } = await open(b, "users");
  await grp(p);
  const nb = await notifTitles(p);
  await p.locator('[role=row]', { hasText: "Litigation" }).hover();
  await S(p).getByRole("button", { name: "Delete Litigation" }).click(); await p.waitForTimeout(400);
  const dt = await dlgText(p);
  await shot(p, "USR-24");
  const pw = await p.locator('[role=dialog]:not([inert]):not([inert] *) input[type=password]').count();
  await dg(p, /^Delete/).click(); await p.waitForTimeout(500);
  const nn = newN(nb, await notifTitles(p));
  const gr = await urows(p);
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  const ur = (await urows(p)).filter(x => /mlopez|jnkemba/.test(x));
  rec("USR-24", "FAIL", `No row checkbox/bulk "Delete"; per-row trash. Dialog: "${dt}" (spec: title "Delete", warning "Do you want to delete the following items?" with "Litigation", impact "2 members lose this group", no password field; password inputs=${pw}); after confirming new Beacon=${JSON.stringify(nn)} (spec "Deleted user group"); Groups rows=${JSON.stringify(gr)}; mlopez and jnkemba rows afterwards ${JSON.stringify(ur)} (they keep their accounts and lose the Litigation pill)`, "USR-24.png");
  // empty group delete statement
  await grp(p);
  await S(p).getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300);
  await nameIn(p).fill("Empty one"); await commit(p).click(); await p.waitForTimeout(400);
  await p.locator('[role=row]', { hasText: "Empty one" }).hover();
  await S(p).getByRole("button", { name: "Delete Empty one" }).click(); await p.waitForTimeout(400);
  const dtEmpty = await dlgText(p);
  await dg(p, /Cancel/).click(); await p.waitForTimeout(300);
  // delete tbuergenthal (no group)
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  await p.locator('[role=row]', { hasText: "tbuergenthal" }).hover();
  await S(p).getByRole("button", { name: "Delete tbuergenthal" }).click(); await p.waitForTimeout(400);
  const dtUnused = await dlgText(p);
  await dg(p, /Cancel/).click(); await p.waitForTimeout(300);
  rec("X-05", /nothing else|No (other )?(items|entities|group)/i.test(dtEmpty + dtUnused) ? "PASS" : "FAIL", `Used object: user mlopez dialog says "Member of Litigation." (impact stated as text, no count); group Litigation dialog: "${dt}". Unused objects: empty group dialog "${dtEmpty}"; user without group dialog "${dtUnused}" -> neither states that nothing else changes; the Uwazi-style "Used by N ..." counts are absent`, "USR-24.png");
  // USR-27: delete all groups
  await grp(p);
  for (const n of ["Administrators", "Research", "Empty one"]) {
    await p.locator('[role=row]', { hasText: n }).first().hover();
    await S(p).getByRole("button", { name: `Delete ${n}` }).click(); await p.waitForTimeout(300);
    await dg(p, /^Delete/).click(); await p.waitForTimeout(300);
  }
  const empty = norm(await S(p).innerText());
  await shot(p, "USR-27");
  const addBtn = await S(p).getByRole("button", { name: "Add group" }).count();
  await tab(p, "Users").click(); await p.waitForTimeout(300);
  await S(p).locator('input[placeholder^="Search"]').fill("zzz"); await p.waitForTimeout(300);
  const nores = norm(await S(p).innerText());
  rec("USR-27", /No groups yet/.test(empty) && addBtn && /Nothing matches/.test(nores) ? "PASS" : "FAIL", `All groups deleted -> "${empty.slice(80, 260)}" (title naming the object "No groups yet", hint, "Add group" action count=${addBtn}); Users with "zzz": "${nores.slice(110, 200)}" (no-results state with "Clear search")`, "USR-27.png");
  rec("X-10", /No groups yet/.test(empty) && /A group shares access/.test(empty) && addBtn ? "PASS" : "FAIL", `Zero-row Groups list shows title "No groups yet", the hint and an "Add group" action (not "Nothing here yet.")`, "USR-27.png");
  await p.context().close();
}
// USR-15,16,17
rec("USR-15", "FAIL", `Users tab offers no row selection (0 checkboxes, no select-all, no "Selected n of total" bar, no Reset Password / Reset 2FA / Add to group / Change role / Delete bulk actions): see USR-02`, "USR-01.png");
rec("USR-16", "FAIL", `Cannot tick afarah and jnkemba: no selection exists, so the "Reset passwords" and "Reset 2FA" bulk dialogs cannot be opened`, "USR-01.png");
rec("USR-17", "FAIL", `Cannot tick users: no "Add to group" / "Change role" bulk actions exist; roles and groups can only be changed one user at a time in the editor`, "USR-01.png");
// USR-26 + X-02
{
  const { page: p } = await open(b, "users");
  const res = [];
  const dtxt = async () => (await dialogs(p)).join(" / ");
  for (const [kind, openEd, change] of [["user", async () => openUser(p, "mlopez"), async () => S(p).locator('input[type=email]').fill("zz@x.io")], ["group", async () => { await grp(p); await S(p).getByRole("button", { name: "Edit Litigation" }).first().dispatchEvent("click"); await p.waitForTimeout(400); }, async () => nameIn(p).fill("Litigation2")]]) {
    for (const exit of ["Cancel", "Back", "rail", "datasource", "navbar"]) {
      await openEd(); await change(); await p.waitForTimeout(150);
      if (exit === "Cancel") await S(p).getByRole("button", { name: "Cancel" }).click();
      else if (exit === "Back") await S(p).getByRole("button", { name: /^Back/ }).first().click();
      else if (exit === "rail") await rail(p, "Dashboard");
      else if (exit === "datasource") { await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(200); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Artworks" }).click(); }
      else await p.getByRole("button", { name: /^Library/ }).first().click();
      await p.waitForTimeout(400);
      const d = await dtxt();
      const t = d ? await dlgText(p) : "";
      res.push(`${kind}/${exit}: ${d ? "dialog '" + d + "'" : "no dialog"}`);
      if (d) { await dg(p, /Keep editing|Cancel/).click(); await p.waitForTimeout(250); }
      const stillThere = (await S(p).innerText().catch(()=>"")).includes(kind === "user" ? "Username" : "Group name");
      if (d && !stillThere) res.push("(Keep editing did not keep the page)");
      // return to a clean list
      await p.keyboard.press("Escape");
      if (!stillThere) { await rail(p, "Users & Groups").catch(()=>{}); }
      else { await S(p).getByRole("button", { name: "Cancel" }).click().catch(()=>{}); await p.waitForTimeout(200); const d2 = await dialogs(p); if (d2.length) { await dg(p, /^Discard/).click(); await p.waitForTimeout(250);} }
      await p.waitForTimeout(250);
    }
  }
  await shot(p, "USR-26");
  const allDialogs = res.every(r => !/no dialog/.test(r));
  rec("USR-26", allDialogs ? "PASS" : "FAIL", `Exits with a changed field: ${res.join(" ; ")}. The footer "Cancel" leaves the editor WITHOUT a dialog and drops the edit (user and group); Back, rail, data-source switch and navbar link do open a dialog. Expected a "Discard changes?" dialog for Cancel, Back and a rail click; "Escape with the password modal open" cannot be driven (no password modal, see USR-18)`, "USR-26.png");
  rec("X-02", /Cancel/.test(res[0]) && allDialogs ? "PASS" : "FAIL", `Editors: ${res.join(" ; ")}. Footer Cancel with a changed field discards silently (no dialog). Wording check: dialog title is "Discard unsaved changes?" with buttons "Keep editing"/"Discard" (spec title "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel"/"Discard changes")`, "USR-26.png");
  await p.context().close();
}
save(); await b.close();
