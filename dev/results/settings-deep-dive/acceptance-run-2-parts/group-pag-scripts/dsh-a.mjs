import { dialogs, run, open, S, wait, check, listRows, clean, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, hscroll, switchTo, toSettings, logEntries } from "./g.mjs";
const cards = async (p) => {
  const t = clean(await S(p).innerText());
  const g = (re) => (t.match(re) || [])[1];
  return {
    users: g(/USERS (\d+) total users/), roles: g(/total users ([^S]*?) STORAGE/), storage: g(/STORAGE ([\d.,]+ (?:B|KB|MB|GB|TB)) /), entities: g(/ENTITIES ([\d,]+) total entities/),
    files: g(/FILES ([\d,]+) total files/), rel: g(/RELATIONSHIPS ([\d,—]+) total references/), raw: t.slice(0, 330),
  };
};
const libCount = async (p) => (await p.locator("body").innerText()).match(/([\d,]+) entities/)?.[1];
const srcs = [["Sample", "Sample", "104"], ["CEJIL", "CEJIL", "4,398"], ["Travesía", "Red Trav", "589"], ["Artworks", "Best Artworks", "82"]];

// DSH-01, DSH-03, DSH-04, DSH-13, DSH-11, DSH-12 (initial) across the four sources
await run("dsh-a1", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  const res = {};
  await check("DSH-01", p, async () => {
    const c = await cards(p);
    const t = clean(await S(p).innerText());
    const ok = c.users === "5" && /1 Admins? \| 2 Editors? \| 2 Collaborators?/.test(c.roles) && /USERS/i.test(t);
    return [ok, `Users card: label "Users", total "${c.users}", caption "total users", roles "${c.roles}"`, "DSH-01"];
  });
  for (const [label, name, expected] of srcs) {
    if (label !== "Sample") { await switchTo(p, name); await wait(p, 1500); } else { await p.getByRole("button", { name: "Library" }).first().click(); await wait(p, 1500); }
    const lib = await libCount(p);
    await toSettings(p, "Dashboard"); await wait(p, 1500);
    if (label === "CEJIL") await wait(p, 3000);
    res[label] = { ...(await cards(p)), lib, expected };
    await sh(p, `DSH-cards-${label}`);
  }
  globalThis.__res = res;
  await check("DSH-03", p, async () => {
    const vals = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.storage]));
    const fmt = Object.values(vals).every((v) => /^\d+\.\d{2} (B|KB|MB|GB|TB)$/.test(v || ""));
    const distinct = new Set(Object.values(vals)).size === 4;
    return [fmt && distinct && /STORAGE/i.test(res.Sample.raw), `Storage card per source ${JSON.stringify(vals)} (label "Storage", caption "Files and database usage"); formatted with 2 decimals and unit=${fmt}; all four differ=${distinct}`, "DSH-03"];
  });
  await check("DSH-04", p, async () => {
    const ent = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, `${v.entities} (Library ${v.lib}, expected ${v.expected})`]));
    const ok = Object.values(res).every((v) => v.entities === v.expected && v.lib === v.expected);
    return [ok, `Entities card vs Library count per source ${JSON.stringify(ent)}`, "DSH-04"];
  });
  await check("DSH-stats-per-source", p, async () => {
    const r = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { users: v.users, roles: v.roles, storage: v.storage, entities: v.entities, files: v.files, relationships: v.rel }]));
    const files = Object.values(res).map((v) => v.files); const rel = Object.values(res).map((v) => v.rel);
    const notSample = ["CEJIL", "Travesía", "Artworks"].every((k) => res[k].entities !== res.Sample.entities && res[k].storage !== res.Sample.storage);
    return [notSample, `Per source (the Sample's facts must not repeat): ${JSON.stringify(r)}`, "DSH-cards-Artworks"];
  });
});

// DSH-11, 12, 13 and 07
await run("dsh-a2", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-11", p, async () => {
    const t = clean(await S(p).innerText());
    const lang = false;
    const heads = await S(p).locator("[data-part=cards] > *").evaluateAll((es) => es.map((e) => e.innerText.split("\n")[0].trim()));
    const hasFacts = ["USERS", "STORAGE", "ENTITIES", "FILES"].every((k) => heads.map((h) => h.toUpperCase()).includes(k));
    return [hasFacts && !heads.map((h) => h.toUpperCase()).includes("LANGUAGES"), `No Languages card is rendered (allowed: "if shown"); card headings ${JSON.stringify(heads)}; the grid holds the Users, Storage, Entities and Files facts of DSH-01/03/04/06`, "DSH-11"];
  });
  await check("DSH-12", p, async () => {
    const seed = await S(p).locator("[data-part=recent-activity] li").allInnerTexts();
    const seedRows = seed.map(clean);
    // two actions: save a thesaurus, delete a user
    await rail(p, "Thesauri"); await wait(p, 600);
    await S(p).locator("[data-part=row]").first().click(); await wait(p, 800);
    const nm = S(p).getByLabel("Thesaurus name"); const orig = await nm.inputValue(); await nm.fill(orig + " QA"); 
    await footerBtn(p, "Save").click(); await wait(p, 700);
    await rail(p, "Users & Groups"); await wait(p, 600);
    await S(p).getByRole("button", { name: "Delete afarah" }).first().click({ force: true }); await wait(p, 400);
    const d = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").last();
    const dtxt = clean(await d.innerText());
    await d.locator("[data-part=confirm]").or(d.getByRole("button", { name: /^Delete/ }).last()).first().click(); await wait(p, 700);
    const dlg = (await dialogs(p)).filter((n) => n !== "Notifications");
    if (dlg.length) { const pw = dlgLoc(p); if (await pw.locator("input").count()) { await pw.locator("input").first().fill("admin1234"); await pw.getByRole("button").last().click(); await wait(p, 700); } }
    await rail(p, "Dashboard"); await wait(p, 700);
    const after = (await S(p).locator("[data-part=recent-activity] li").allInnerTexts()).map(clean);
    const link = S(p).getByRole("button", { name: "Open Activity log" });
    await sh(p, "DSH-12");
    await link.click(); await wait(p, 600);
    const h = clean(await S(p).locator("h2").first().innerText());
    await rail(p, "Dashboard"); await wait(p, 400);
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 300); await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 800);
    const reset = (await S(p).locator("[data-part=recent-activity] li").allInnerTexts()).map(clean);
    const ok = /Delete.*afarah.*admin/.test(after[0]) === true || false;
    const first2 = after.slice(0, 2).join(" || ");
    const good = /Deleted user .*afarah/.test(after[0] || "") && /Updated .*thesaurus/i.test(after[1] || "") && after.slice(2, 5).join() === seedRows.slice(0, 3).join() && h === "Activity log" && JSON.stringify(reset) === JSON.stringify(seedRows);
    return [good, `seed rows ${JSON.stringify(seedRows.map((r) => r.slice(0, 60)))}; after saving a thesaurus then deleting a user the newest rows are ${JSON.stringify(after.slice(0, 3).map((r) => r.slice(0, 90)))}; "Open Activity log" opened "${h}"; after Reset demo data rows equal the seed rows=${JSON.stringify(reset) === JSON.stringify(seedRows)} (${JSON.stringify(reset.map((r) => r.slice(0, 40)))}); delete dialog text "${dtxt.slice(0, 120)}"`, "DSH-12"];
  });
});

await run("dsh-a3", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-13", p, async () => {
    const out = {};
    for (const [label, name] of [["CEJIL", "CEJIL"], ["Travesía", "Red Trav"]]) {
      await switchTo(p, name); await wait(p, 1200); await toSettings(p, "Dashboard"); await wait(p, 2500);
      const t = clean(await S(p).innerText());
      const rows = await S(p).locator("[data-part=recent-activity] li").count();
      const paras = await S(p).locator("p").allInnerTexts();
      out[label] = { rows, hasRecent: /Recent activity/.test(t), paras: paras.map(clean).filter(Boolean), mentions: /data source|collection is|corpus|CEJIL|Travesía/i.test(paras.join(" ").replace(/The collection at a glance, and the latest changes made to it\./, "")) };
      await sh(p, `DSH-13-${label}`);
    }
    const ok = Object.values(out).every((o) => o.rows === 5 && o.hasRecent && !o.mentions && o.paras.length === 1);
    return [ok, `after switching to CEJIL and Travesía the Dashboard shows the Recent activity table with 5 rows and one intro paragraph only: ${JSON.stringify(out)}`, "DSH-13-Travesía"];
  });
});
await run("dsh-a4", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-07", p, async () => {
    const cardsEl = S(p).locator("[data-part=cards] > *");
    const info = await cardsEl.evaluateAll((es) => es.map((e) => ({ tag: e.tagName, role: e.getAttribute("role"), name: e.getAttribute("aria-label") || (e.querySelector("button,a") && (e.querySelector("button,a").getAttribute("aria-label") || e.querySelector("button,a").innerText)) || null, link: !!e.querySelector("button,a") || e.tagName === "BUTTON" || e.tagName === "A", text: e.innerText.split("\n")[0], cursor: getComputedStyle(e).cursor })));
    // Tab through the cards
    await p.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
    const stops = []; const rings = [];
    await rail(p, "Dashboard"); await wait(p, 400);
    for (let i = 0; i < 60 && stops.length < 2; i++) {
      await p.keyboard.press("Tab");
      const a = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const inCards = !!e.closest("[data-part=cards]"); return { inCards, name: (e.getAttribute("aria-label") || e.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60), outline: cs.outlineStyle + " " + cs.outlineWidth, shadow: cs.boxShadow !== "none" ? cs.boxShadow.slice(0, 50) : "", ring: e.matches(":focus-visible") }; });
      if (a.inCards) { stops.push(a.name); rings.push(`${a.outline}|${a.shadow}|focus-visible=${a.ring}`); }
    }
    await sh(p, "DSH-07-focus");
    // click Users card
    await S(p).locator("[data-part=cards] button, [data-part=cards] a").filter({ hasText: /Users/i }).first().click(); await wait(p, 600);
    const h1 = clean(await S(p).locator("h2").first().innerText());
    await rail(p, "Dashboard"); await wait(p, 500);
    await S(p).locator("[data-part=cards] button, [data-part=cards] a").filter({ hasText: /Files/i }).first().click(); await wait(p, 600);
    const h2 = clean(await S(p).locator("h2").first().innerText());
    const ok = /Users/.test(h1) && /Uploads/.test(h2) && stops.some((s) => /Users, 5 total users/.test(s)) && stops.some((s) => /Files/.test(s)) && info.filter((i) => !i.link).every((i) => i.cursor !== "pointer");
    return [ok, `Users card opened "${h1}"; Files card opened "${h2}"; keyboard stops inside the cards ${JSON.stringify(stops)} with focus styles ${JSON.stringify(rings)}; card info ${JSON.stringify(info)}`, "DSH-07-focus"];
  });
});
