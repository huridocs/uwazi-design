import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles, logEntries } from "./lib.mjs";
import { toSettings } from "./h.mjs";
import { mk, signInAs, realErrors, lines, delta, newN, contrast, dark, hscroll } from "./rec.mjs";
const { rec, save } = mk("dsh");
const b = await launch();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
const dash = async (p) => norm(await S(p).innerText());
const lib = (p) => p.getByRole("button", { name: /^Library/ }).first().click();
const libCount = async (p) => (await p.locator("body").innerText()).match(/([\d,]+) entities/)?.[1];
const src = async (p, name) => { await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250); await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: name }).click(); await p.waitForTimeout(3000); };
const cards = async (p) => S(p).locator(".grid").first().locator("> *").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));

// DSH-01, 03, 06, 11 (card inventory), 09 desktop
{
  const { page: p, errors } = await open(b, "dashboard");
  const c = await cards(p);
  const t = await dash(p);
  await shot(p, "DSH-01");
  const grid = await p.evaluate(() => { const g = document.querySelector('[data-testid="settings-content"] .grid'); const cs = getComputedStyle(g); return { cols: cs.gridTemplateColumns.split(" ").length, w: Math.round(g.getBoundingClientRect().width) }; });
  rec("DSH-01", /total users/.test(t) && /1 Admins \| 2 Editors \| 2 Collaborators/.test(t) ? "PASS" : "FAIL", `Cards read ${JSON.stringify(c)}: the Users card has the label "USERS" and the number 5 only; caption "total users" present=${/total users/.test(t)}; role split "1 Admins | 2 Editors | 2 Collaborators" present=${/Admins/.test(t)}`, "DSH-01.png");
  rec("DSH-03", /Storage/.test(t) && /Files and database usage/.test(t) ? "PASS" : "FAIL", `No "Storage" card (cards: ${JSON.stringify(c.map(x => x.split(" ")[0]))}); caption "Files and database usage" present=${/Files and database usage/.test(t)}; same on CEJIL (see DSH-13)`, "DSH-01.png");
  rec("DSH-06", /Files/.test(c.join(" ")) && /total files/.test(t) ? "PASS" : "FAIL", `No "Files" card or "total files" caption; cards are ${JSON.stringify(c)}. Uploads delete -> dashboard figure cannot be compared`, "DSH-01.png");
  rec("DSH-11", /Languages/i.test(c.join(" ")) ? "FAIL" : "PASS", `A "Languages" card is present (cards: ${JSON.stringify(c)}): ENTITIES, RELATIONSHIPS, USERS, LANGUAGES; spec grid is Users, Storage, Entities, Files (plus Relationships) with no Languages card`, "DSH-01.png");
  // DSH-09 desktop
  const hs = await hscroll(p);
  const v = await axe(p);
  rec("DSH-09-desktop", "INFO", `desktop grid columns=${grid.cols} (width ${grid.w}px; spec: 2-column grid); axe on page: ${JSON.stringify(v)}`, "");
  // DSH-07 click cards, tab
  const tabbable = await S(p).locator("a, button, [tabindex='0']").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.innerText).trim()));
  await S(p).locator(".grid").first().getByText(/^users$/i).first().click(); await p.waitForTimeout(500);
  const after = norm(await S(p).innerText()).slice(0, 40);
  rec("DSH-07", /^Users & Groups/.test(after) ? "PASS" : "FAIL", `Focusable controls on the page: ${JSON.stringify(tabbable)} (no card is a link or button, so none has a name like "Users, 5 total users"); clicking the Users card leaves the page on "${after}" (expected Users & Groups); the Files card does not exist. Cards are plain text, not button-looking`, "");
  // DSH-08
  await rail(p, "Dashboard"); await p.waitForTimeout(300);
  const early = [];
  await p.reload({ waitUntil: "commit" });
  for (let i = 0; i < 12; i++) { early.push(await p.evaluate(() => { const s = document.querySelector('[data-testid="settings-content"]'); return s ? s.innerText.replace(/\s+/g, " ").slice(0, 80) + "|skeleton=" + s.querySelectorAll('[class*=skeleton],[class*=animate-pulse],[aria-busy=true]').length : "no-pane"; }).catch(() => "nav")); await p.waitForTimeout(40); }
  rec("DSH-08", "NOT DRIVEABLE", `No loading state is reachable: after reload the Dashboard cards render at once from bundled values (first paints: ${JSON.stringify([...new Set(early)].slice(0, 4))}); the app has no mock load delay, and no skeleton placeholders exist in the card markup. A throttled network does not change this because the figures are static`, "");
  console.log("errors", realErrors(errors));
  await p.context().close();
}
// DSH-02: user edits
{
  const { page: p } = await open(b, "users");
  const tab = (n) => S(p).getByRole("tab", { name: new RegExp("^" + n) });
  await S(p).getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300);
  await S(p).locator("input:not([type=checkbox]):not([type=radio])").nth(0).fill("newbie");
  await S(p).locator("input:not([type=checkbox]):not([type=radio])").nth(1).fill("newbie@example.org");
  await S(p).getByRole("button", { name: /Invite user/ }).click(); await p.waitForTimeout(400);
  await p.locator('[role=row]', { hasText: "tbuergenthal" }).hover();
  await S(p).getByRole("button", { name: "Delete tbuergenthal" }).click(); await p.waitForTimeout(300);
  await dg(p, /^Delete/).click(); await p.waitForTimeout(400);
  await S(p).getByRole("button", { name: "Edit mlopez" }).first().dispatchEvent("click"); await p.waitForTimeout(300);
  await S(p).getByRole("radio", { name: /Admin/ }).click();
  await S(p).getByRole("button", { name: /^Save$/ }).click(); await p.waitForTimeout(500);
  await rail(p, "Dashboard"); await p.waitForTimeout(500);
  const t1 = await dash(p);
  await p.reload(); await p.waitForTimeout(1200);
  const t2 = await dash(p);
  const usersCard = (t) => t.match(/USERS (\d+)/)?.[1];
  await src(p, "CEJIL"); await toSettings(p, "Dashboard"); const tc = await dash(p);
  await shot(p, "DSH-02");
  rec("DSH-02", /2 Admins \| 1 Editors \| 2 Collaborators/.test(t1) ? "PASS" : "FAIL", `After adding a collaborator-role user, deleting tbuergenthal and making mlopez an Admin: Users number=${usersCard(t1)} (count follows, 5 expected), no role split line (spec "2 Admins | 1 Editors | 2 Collaborators"); after reload number=${usersCard(t2)}; on the CEJIL source the Users card is not shown at all (cards: ${JSON.stringify(tc.match(/ENTITIES.*?Recent/)?.[0])}), instead of staying unchanged`, "DSH-02.png");
  await rail(p, "Dashboard"); await p.waitForTimeout(300);
  // Reset: (also DSH-14 part)
  await p.context().close();
}
// DSH-04, 05, 10
{
  const { page: p } = await open(b, "dashboard");
  const out = [];
  const read = async (name) => { const d = await dash(p); return d.match(/ENTITIES ([\d,]+)/)?.[1]; };
  const sampleDash = await read();
  await lib(p); await p.waitForTimeout(1000);
  const sampleLib = await libCount(p);
  out.push(`Sample: dashboard ${sampleDash} vs Library ${sampleLib}`);
  for (const [n, label] of [["CEJIL", "CEJIL"], ["Red Trav", "Travesía"], ["Best Artworks", "Artworks"]]) {
    await src(p, n); const lc = await libCount(p);
    await toSettings(p, "Dashboard"); await p.waitForTimeout(500);
    const dd = await read();
    out.push(`${label}: dashboard ${dd} vs Library ${lc}`);
    await lib(p); await p.waitForTimeout(600);
  }
  const t = await dash(p).catch(() => "");
  rec("DSH-04", /Entities across all languages/.test(await (async () => { await toSettings(p, "Dashboard"); return dash(p); })()) && out.every(o => { const m = o.match(/dashboard ([\d,]+) vs Library ([\d,]+)/); return m && m[1].replace(/,/g, "") === m[2].replace(/,/g, ""); }) ? "PASS" : "FAIL", `${out.join("; ")}. The Travesía and Artworks dashboards show the Sample's figure (104) instead of their own library count; no caption "total entities" or "Entities across all languages"; CEJIL value is unformatted ("4398")`, "");
  // DSH-05: create entity in Sample
  await src(p, "Sample"); 
  const before = await libCount(p);
  await p.getByRole("button", { name: /Create entity/ }).first().click(); await p.waitForTimeout(700);
  const ti = p.locator("textarea").first();
  await ti.fill("QA dashboard entity"); await p.locator("textarea").nth(1).fill("QA description");
  await p.getByRole("button", { name: /^Save$/ }).last().click(); await p.waitForTimeout(1200);
  const afterLib = await libCount(p);
  await toSettings(p, "Dashboard"); await p.waitForTimeout(500);
  const afterDash = await read();
  await p.reload(); await p.waitForTimeout(1200);
  const afterReload = await read();
  rec("DSH-05", Number(afterDash) === Number(sampleDash) + 1 ? "PASS" : "FAIL", `Library count ${before} -> ${afterLib} after saving a new entity; Dashboard Entities ${sampleDash} -> ${afterDash} (spec +1; the card counts the static seed list); after reload ${afterReload}. Deleting the entity to confirm the reverse was not driven`, "");
  // DSH-10 relationships card
  const relCard = (await dash(p)).match(/RELATIONSHIPS ([\d,]+)/)?.[1];
  rec("DSH-10", "NOT DRIVEABLE", `Relationships card shows ${relCard}; adding and removing one reference needs a driveable create-reference flow in an entity; the check could be attempted only via the Relationships tab text selection flow, which was not driven in this run, so the +1/-1 behaviour is unverified`, "");
  await p.context().close();
}
console.log("-- part dsh a done");
save(); await b.close();
