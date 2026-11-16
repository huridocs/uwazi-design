import { dialogs, run, open, S, wait, check, listRows, clean, footerBtn, dlgLoc, rail, rec, sh, switchTo, toSettings, logEntries, notifTitles, nlist, newNotifs } from "./g.mjs";
const signIn = async (p, user, section) => {
  await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("login")); });
  await p.reload(); await wait(p, 800);
  await p.locator('input[placeholder="e.g. admin"]').fill(user); await p.locator('input[type=password]').fill("passw0rd"); await p.keyboard.press("Enter"); await wait(p, 800);
  await p.evaluate((s) => { sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); localStorage.setItem("uwazi:settingsSection", JSON.stringify(s)); }, section);
  await p.reload(); await wait(p, 1200);
};
await run("dsh-d1", async (b) => {
  const { page: p } = await open(b, "users");
  await wait(p, 1200);
  await check("DSH-14", p, async () => {
    const out = [];
    // edit users: add newbie (Admin) and change mlopez to Admin
    await footerBtn(p, "Add user").click(); await wait(p, 500);
    await S(p).getByPlaceholder("e.g. jdoe").fill("newbie"); await S(p).getByPlaceholder("name@org.example").fill("newbie@example.org");
    await S(p).getByRole("radio", { name: /^Admin/ }).click(); await footerBtn(p, "Invite user").click(); await wait(p, 800);
    if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500); }
    await S(p).locator("[data-part=row]").filter({ hasText: "mlopez" }).first().click(); await wait(p, 600);
    await S(p).getByRole("radio", { name: /^Admin/ }).click(); await footerBtn(p, "Save").click(); await wait(p, 800);
    if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500); }
    const users1 = (await listRows(p)).map((r) => r.slice(0, 34));
    // sign in as newbie (created this visit), then go to Dashboard
    await signIn(p, "newbie", "thesauri");
    // thesaurus (edited after the sign-in reload: a thesaurus rename does not survive a tab reload)
    await rail(p, "Thesauri"); await wait(p, 600);
    
    await S(p).locator("[data-part=row]").first().click(); await wait(p, 800);
    const nm = S(p).getByLabel("Thesaurus name"); const orig = await nm.inputValue(); await nm.fill(orig + " EDITED"); await footerBtn(p, "Save").click(); await wait(p, 700);
    // pages draft
    await rail(p, "Pages"); await wait(p, 600);
    await S(p).getByRole("button", { name: "Edit Methodology" }).last().click(); await wait(p, 700);
    await S(p).getByLabel("Title", { exact: true }).fill("Methodology EDITED"); await footerBtn(p, "Save").click(); await wait(p, 700);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    const pg1 = (await listRows(p)).map((r) => r.slice(0, 30));
    await rail(p, "Dashboard"); await wait(p, 600);
        const act1 = (await logEntries(p)).length;
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 400);
    const dlg = await p.locator("[data-component=ConfirmDelete]").count();
    const dtxt = clean(await p.locator("[data-component=ConfirmDelete]").innerText());
    await sh(p, "DSH-14-dialog");
    await p.locator("[data-component=ConfirmDelete] [data-part=cancel]").or(p.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" })).first().click(); await wait(p, 500);
    const kept = { users: (await (async () => { await rail(p, "Users & Groups"); await wait(p, 500); return listRows(p); })()).length, };
    await rail(p, "Thesauri"); await wait(p, 500); const thK = (await listRows(p)).map((r) => r.slice(0, 30));
    await rail(p, "Pages"); await wait(p, 500); const pgK = (await listRows(p)).map((r) => r.slice(0, 30));
    await rail(p, "Dashboard"); await wait(p, 500);
    const before = await nlist(p);
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 400);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 900);
    const n = await newNotifs(p, before);
    const rec5 = (await S(p).locator("[data-part=recent-activity] li").allInnerTexts()).map(clean);
    await rail(p, "Users & Groups"); await wait(p, 500); const u2 = (await listRows(p)).map((r) => r.slice(0, 34));
    await rail(p, "Thesauri"); await wait(p, 500); const thR = (await listRows(p)).map((r) => r.slice(0, 30));
    await rail(p, "Pages"); await wait(p, 500); const pgR = (await listRows(p)).map((r) => r.slice(0, 30));
    await rail(p, "Account"); await wait(p, 500); const acct = "username field " + JSON.stringify(await S(p).locator("input").first().inputValue());
    await rail(p, "Activity log"); await wait(p, 700); const alog = clean(await S(p).innerText());
    const sessEntries = (await logEntries(p)).length;
    const ok = dlg === 1 && /Reset demo data/.test(dtxt) && /EDITED/.test(thK.join()) && /EDITED/.test(pgK.join()) && kept.users === 6 &&
      u2.length === 5 && /mlopez.*Editor/.test(u2[1]) && !/newbie/.test(u2.join()) && !/EDITED/.test(thR.join()) && !/EDITED/.test(pgR.join()) && /"admin"/.test(acct) && n.some((t) => /Demo data reset\. newbie no longer exists, so you are signed in as admin\./.test(t)) && sessEntries === 0;
    return [ok, `edits made: users ${JSON.stringify(users1)}, thesaurus renamed "... EDITED", Methodology page title saved; signed in as newbie (an admin created this visit); Reset dialog "${dtxt}"; after Cancel: Users rows ${kept.users}, thesauri ${JSON.stringify(thK)}, pages ${JSON.stringify(pgK)} (edits kept); after confirming: notification ${JSON.stringify(n)}; Users ${JSON.stringify(u2)}; thesauri ${JSON.stringify(thR)}; pages ${JSON.stringify(pgR)}; Account page "${acct}"; session activity entries left ${sessEntries}; Dashboard recent activity is the seed ${JSON.stringify(rec5.map((r) => r.slice(0, 38)))}`, "DSH-14"];
  });
});
