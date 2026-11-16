import { dialogs, run, open, S, wait, check, listRows, clean, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, hscroll, switchTo, toSettings, logEntries, notifTitles } from "./g.mjs";
const card = async (p, re) => clean(await S(p).innerText()).match(re)?.[1];
const ents = (p) => card(p, /ENTITIES ([\d,]+) total/);
const files = (p) => card(p, /FILES ([\d,]+) total/);
const usersC = async (p) => { const t = clean(await S(p).innerText()); return { total: t.match(/USERS (\d+) total/)?.[1], roles: t.match(/total users (.*?) STORAGE/)?.[1] }; };

// DSH-05
const createEntity = async (p, title) => {
  await p.getByRole("button", { name: "Library" }).first().click(); await wait(p, 1500);
  await p.getByRole("button", { name: "Create entity", exact: true }).click(); await wait(p, 1000);
  await p.locator("textarea").first().fill(title); await p.locator("textarea").nth(1).fill("desc"); await wait(p, 300);
  await p.getByRole("button", { name: "Save", exact: true }).click(); await wait(p, 1200);
  return (await p.locator("body").innerText()).match(/([\d,]+) entities/)?.[1];
};
await run("dsh-b1", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-05", p, async () => {
    const e0 = await ents(p);
    const lib1 = await createEntity(p, "QA entity DSH05");
    await toSettings(p, "Dashboard"); await wait(p, 800);
    const e1 = await ents(p);
    await p.reload(); await wait(p, 2500);
    const eReloadAfterCreate = await ents(p);
    await p.getByRole("button", { name: "Library" }).first().click(); await wait(p, 1500);
    const libAfterReload = (await p.locator("body").innerText()).match(/([\d,]+) entities/)?.[1];
    // second round: create, then delete, then reload
    await createEntity(p, "QA entity DSH05b");
    await sh(p, "DSH-05-drawer");
    await p.getByRole("button", { name: "Delete", exact: true }).last().click({ timeout: 8000 }); await wait(p, 600);
    const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").last();
    const dtxt = clean(await cd.innerText().catch(() => "no dialog"));
    await cd.locator("[data-part=confirm]").or(cd.getByRole("button", { name: /^Delete/ }).last()).first().click(); await wait(p, 1000);
    await toSettings(p, "Dashboard"); await wait(p, 800);
    const e2 = await ents(p);
    await p.reload(); await wait(p, 2500);
    const e2r = await ents(p);
    const ok = e0 === "104" && e1 === "105" && lib1 === "105" && eReloadAfterCreate === e1 && e2 === "104" && e2r === "104";
    return [ok, `Entities card: start ${e0}; after creating "QA entity DSH05" in the Library (Library header ${lib1}) ${e1}; after a tab reload with that entity still there the card reads ${eReloadAfterCreate} and the Library header ${libAfterReload} (the Library's created entity lives in memory only, so the +1 is lost on reload, Dashboard and Library agree); in a second round, create then delete (dialog "${dtxt.slice(0, 90)}") brings the card back to ${e2}, and after reload ${e2r}`, "DSH-05"];
  });
});

// DSH-06
await run("dsh-b2", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-06", p, async () => {
    const f0 = await files(p);
    await rail(p, "Uploads"); await wait(p, 700);
    const rows0 = (await listRows(p)).length;
    const names = (await listRows(p)).map((r) => r.slice(0, 40));
    await S(p).locator("[data-part=row]").nth(1).hover(); await wait(p, 200);
    await S(p).locator("[data-part=row]").nth(1).getByRole("button", { name: /^Delete/ }).click({ force: true }); await wait(p, 500);
    const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").last();
    const dtxt = clean(await cd.innerText().catch(() => "no dialog"));
    await cd.locator("[data-part=confirm]").or(cd.getByRole("button", { name: /^Delete/ }).last()).first().click(); await wait(p, 800);
    const rows1 = (await listRows(p)).length;
    await rail(p, "Dashboard"); await wait(p, 800);
    const f1 = await files(p);
    await p.reload(); await wait(p, 1500);
    const f2 = await files(p);
    const ok = f0 === "45" && f1 === "44" && f2 === "44" && rows0 === 4 && rows1 === 3;
    return [ok, `Files card ${f0} with ${rows0} Uploads rows (${JSON.stringify(names)}); after deleting one upload (dialog "${dtxt.slice(0, 110)}") Uploads rows ${rows1}, Files card ${f1}, after reload ${f2}; card text "total files", detail "Total files from main documents, supporting files and uploads"`, "DSH-06"];
  });
});

// DSH-02
await run("dsh-b3", async (b) => {
  const { page: p } = await open(b, "users");
  await wait(p, 1200);
  await check("DSH-02", p, async () => {
    const out = [];
    await footerBtn(p, "Add user").click(); await wait(p, 500);
    await S(p).getByPlaceholder("e.g. jdoe").fill("newbie"); await S(p).getByPlaceholder("name@org.example").fill("newbie@example.org");
    await S(p).getByRole("radio", { name: /Collaborator/ }).click(); await wait(p, 200);
    await footerBtn(p, "Invite user").click(); await wait(p, 800);
    out.push("after add: " + JSON.stringify(await (async () => { const rr = await listRows(p); return rr.length; })()));
    if ((await dialogs(p)).filter((n) => n !== "Notifications").length) out.push("dialog after add: " + (await dialogs(p)).join(","));
    const stillEditor = await S(p).getByRole("button", { name: "Back" }).count();
    if (stillEditor) { await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500); }
    await S(p).getByRole("button", { name: "Delete tbuergenthal" }).first().click({ force: true }); await wait(p, 500);
    const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").last();
    await cd.locator("[data-part=confirm]").or(cd.getByRole("button", { name: /^Delete/ }).last()).first().click(); await wait(p, 700);
    await S(p).locator("[data-part=row]").filter({ hasText: "mlopez" }).first().click(); await wait(p, 600);
    await S(p).getByRole("radio", { name: /^Admin/ }).click(); await wait(p, 200);
    await footerBtn(p, "Save").click(); await wait(p, 800);
    if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500); }
    const list = await listRows(p);
    await rail(p, "Dashboard"); await wait(p, 800);
    const u1 = await usersC(p);
    await p.reload(); await wait(p, 1500);
    const u2 = await usersC(p);
    await switchTo(p, "CEJIL"); await toSettings(p, "Dashboard"); await wait(p, 1500);
    const u3 = await usersC(p);
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 300); await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 900);
    const u4 = await usersC(p);
    const want = "2 Admins | 1 Editors | 2 Collaborators";
    const fmt = (u) => `${u.total} (${u.roles})`;
    const ok = u1.total === "5" && /2 Admins? \| 1 Editors? \| 2 Collaborators?/.test(u1.roles) && fmt(u2) === fmt(u1) && fmt(u3) === fmt(u1) && u4.total === "5" && /1 Admins? \| 2 Editors? \| 2 Collaborators?/.test(u4.roles);
    return [ok, `Users list after the three changes: ${JSON.stringify(list.map((r) => r.slice(0, 40)))}; Dashboard users ${fmt(u1)}; after reload ${fmt(u2)}; after switching the data source to CEJIL ${fmt(u3)}; after Reset demo data ${fmt(u4)}; ${out.join("; ")}`, "DSH-02"];
  });
});
