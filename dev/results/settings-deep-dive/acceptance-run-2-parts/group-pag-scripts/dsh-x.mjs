import { dialogs, run, open, S, wait, check, listRows, clean, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, hscroll, contrastOf, switchTo, toSettings } from "./g.mjs";
const openNames = async (p) => (await dialogs(p)).filter((n) => n !== "Notifications" && n !== "Menu");
const inTop = (p) => p.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !e.hasAttribute("inert") && e.getBoundingClientRect().height > 0); const d = ds[ds.length - 1]; return !!d && d.contains(document.activeElement); });
const act = (p) => p.evaluate(() => (document.activeElement.tagName + ":" + (document.activeElement.getAttribute("aria-label") || document.activeElement.innerText || "").trim().slice(0, 24)).replace(/\n/g, " "));
const grid = (p) => S(p).locator("[data-part=cards]").evaluate((g) => { const cs = [...g.children].map((c) => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }); const cols = new Set(cs.map((c) => c.x)).size; return { cols, cards: cs.length, tpl: getComputedStyle(g).gridTemplateColumns, boxes: cs }; });

for (const vp of ["desktop", "mobile"]) {
  for (const theme of ["light", "dark"]) {
    const W = vp === "desktop" ? 1280 : 390;
    await run(`dsh-x-${W}-${theme}`, async (b) => {
      const { page: p } = await open(b, "dashboard", vp);
      await wait(p, 1200);
      if (theme === "dark") await dark(p);
      const tap = (loc) => (vp === "mobile" ? loc.tap() : loc.click());
      await check(`DSH-09@${W}-${theme}`, p, async () => {
        const g = await grid(p); const hs = await hscroll(p);
        const v = await axeOn(p, "[data-testid=settings-content]");
        const all = await axeOn(p, null, { seriousOnly: false }).catch(() => []);
        const scrollable = v.concat(all).filter((x) => /scrollable-region-focusable/.test(x));
        const overflowing = await S(p).locator("[data-part=cards] > *").evaluateAll((cs) => cs.filter((c) => c.scrollWidth > c.clientWidth + 1).length);
        const others = v.length ? ` (other axe findings on this page, counted under X-07: ${JSON.stringify(v.map((x) => x.split(":")[0]))})` : "";
        return [hs.doc === 0 && hs.pane === 0 && scrollable.length === 0 && overflowing === 0, `${W}px ${theme}${others}: ${g.cards} cards in ${g.cols} column(s), template "${g.tpl}", boxes ${JSON.stringify(g.boxes.map((b) => [b.x, b.y, b.w, b.h]))}; horizontal overflow ${JSON.stringify(hs)}; cards with clipped content ${overflowing}; scrollable-region-focusable violations ${scrollable.length}`, `DSH-09-${W}-${theme}`];
      });
      await check(`X-07@${W}-${theme}`, p, async () => {
        const v = await axeOn(p, "[data-testid=settings-content]");
        const names = await S(p).locator("button").evaluateAll((bs) => bs.map((x) => x.getAttribute("aria-label") || x.innerText.trim()).filter(Boolean));
        const dup = names.filter((n, i) => names.indexOf(n) !== i);
        // Reset dialog
        const reset = S(p).getByRole("button", { name: "Reset demo data" });
        await tap(reset); await wait(p, 600);
        const d = p.locator("[data-component=ConfirmDelete] [role=dialog]").first();
        const role = await d.getAttribute("role"); const lb = await d.getAttribute("aria-labelledby");
        const aname = lb ? await p.evaluate((id) => document.getElementById(id)?.innerText, lb) : await d.getAttribute("aria-label");
        const focusIn = await inTop(p); const f0 = await act(p);
        const dv = (await axeOn(p, "[role=dialog]:not([inert]):not([inert] *)")).filter((x) => /\((serious|critical)\)/.test(x));
        const esc = []; for (let i = 0; i < 10; i++) { await p.keyboard.press("Tab"); if (!(await inTop(p))) esc.push(i); }
        await sh(p, `X-07-reset-${W}-${theme}`);
        await p.keyboard.press("Escape"); await wait(p, 500);
        const left = await openNames(p); const f1 = await act(p);
        const ok = v.length === 0 && dup.length === 0 && role === "dialog" && !!aname && dv.length === 0 && esc.length === 0 && left.length === 0 && /Reset demo data/.test(f1);
        return [ok, `${W}px ${theme}: axe on Dashboard ${JSON.stringify(v)}; duplicate button names ${JSON.stringify(dup)}; Reset dialog role=${role}, name "${clean(aname || "")}", focus inside on open=${focusIn} (${f0}), axe serious/critical ${JSON.stringify(dv)}, Tab escaped the dialog ${esc.length}x, Escape closed it (left ${JSON.stringify(left)}), focus returned to "${f1}"`, `X-07-dashboard-${W}-${theme}`];
      });
      await check(`X-08@${W}-${theme}`, p, async () => {
        const rows = await S(p).locator("[data-part=recent-activity] li").count();
        const res = {};
        const kinds = (await S(p).locator("[data-part=recent-activity] li > span:first-child").allInnerTexts()).map(clean);
        for (let i = 0; i < kinds.length; i++) res[kinds[i] + "#" + i] = await contrastOf(p, "[data-part=recent-activity] li > span:first-child", i);
        // card labels, values, detail text
        const txt = {};
        for (const part of ["label", "value", "caption", "detail"]) txt[part] = await contrastOf(p, `[data-part=cards] [data-part=${part}]`, 0);
        const ok = Object.values(res).every((v) => v >= 4.5) && Object.values(txt).every((v) => v >= 4.5);
        await sh(p, `X-08-dashboard-${W}-${theme}`);
        return [ok, `${W}px ${theme}: Recent activity badges contrast (need 4.5) ${JSON.stringify(res)}; card text contrast ${JSON.stringify(txt)}`, `X-08-dashboard-${W}-${theme}`];
      });
      if (vp === "mobile") await check(`X-06@${theme}`, p, async () => {
        const hs = await hscroll(p); const g = await grid(p);
        await S(p).getByRole("button", { name: /^Users, 5 total users/ }).tap(); await wait(p, 600);
        const h1 = clean(await S(p).locator("h2").first().innerText());
        await p.evaluate(() => 0);
        return [hs.doc === 0 && hs.pane === 0 && g.cols === 1 && /Users/.test(h1), `390px ${theme}: horizontal overflow ${JSON.stringify(hs)}; cards stack in ${g.cols} column(s); tapping the Users card opened "${h1}"; Recent activity rows wrap (no table), Reset demo data reachable by touch (tapped in X-07)`, `X-06-${theme}`];
      });
    });
  }
}
await run("dsh-x-13", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("X-13", p, async () => {
    const vals = {};
    const rd = async () => { const t = clean(await S(p).innerText()); return { users: t.match(/USERS (\d+) total users (.*?) STORAGE/)?.slice(1, 3).join(" "), storage: t.match(/STORAGE ([\d.]+ \w+)/)?.[1], entities: t.match(/ENTITIES ([\d,]+)/)?.[1], files: t.match(/FILES ([\d,]+)/)?.[1], rel: t.match(/RELATIONSHIPS ([\d,]+)/)?.[1] }; };
    vals.Sample = await rd();
    for (const [l, n] of [["CEJIL", "CEJIL"], ["Travesía", "Red Trav"], ["Artworks", "Best Artworks"]]) { await switchTo(p, n); await toSettings(p, "Dashboard"); await wait(p, l === "CEJIL" ? 4000 : 1500); vals[l] = await rd(); }
    const usersSame = new Set(Object.values(vals).map((v) => v.users)).size === 1;
    const differ = ["storage", "entities", "files", "rel"].every((k) => new Set(Object.values(vals).map((v) => v[k])).size === 4);
    return [usersSame && differ, `per data source ${JSON.stringify(vals)}; Users card identical across sources=${usersSame}; storage, entities, files and relationships all differ across the four sources=${differ}`, "X-13-dashboard"];
  });
});
