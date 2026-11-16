import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { corpus } from "./expect.mjs";
const C = corpus("vegas");
const log = (...a) => console.log(...a);
const { b, p, errs } = await launch();
const pad = (n) => String(n).padStart(2, "0");
const fmtOff = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
const fmtClock = (s) => { const d = new Date(s * 1000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
try {
  await pickCollection(p, /Las Vegas/);
  for (const [title, id] of [["Taxi dash video · 22:09:50", null], ["From a car along Mandalay Bay Road · 22:09:44", null]]) {
    await openByTitle(p, title);
    await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
    const ent = (C.byTitle.get(title) ?? [])[0];
    const refs = C.refs.filter((r) => (r.from === ent.sharedId || r.to === ent.sharedId) && r.media);
    const expected = refs.map((r) => `${r.media.label ?? ""}${r.media.clock !== undefined ? " · " + fmtClock(r.media.clock) : ""}|${fmtOff(r.media.offset)}|${r.media.recording}`).sort();
    const chips = p.locator('[data-component="EvidenceStatus"]');
    const n = await chips.count();
    const got = [];
    for (let i = 0; i < n; i++) {
      await chips.nth(i).click(); await p.waitForTimeout(250);
      const t = await p.evaluate(() => { const c = document.querySelector('[data-component="RefEvidenceCard"]'); const li = c.querySelector('[data-part=passages] li'); if (!li) return null; const tt = li.querySelector('[data-component=TimeTag]'); return { text: li.querySelector("p")?.textContent.trim() ?? "", tag: tt?.textContent.trim(), aria: tt?.getAttribute("aria-label"), title: tt?.getAttribute("title"), rec: [...li.querySelectorAll("button")].map(x => x.textContent.trim())[0], tagEl: tt?.tagName }; });
      if (t) got.push(t);
      await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    }
    const gotKeys = got.map((g) => `${g.text}|${g.tag}`).sort();
    const wantKeys = refs.map((r) => `${r.media.label ?? ""}${r.media.clock !== undefined ? " · " + fmtClock(r.media.clock) : ""}|${fmtOff(r.media.offset)}`).sort();
    log(title, "anchors expected", refs.length, "cards with anchor", got.length, "match", JSON.stringify(gotKeys) === JSON.stringify(wantKeys));
    if (JSON.stringify(gotKeys) !== JSON.stringify(wantKeys)) { log(" got ", JSON.stringify(gotKeys.slice(0, 6))); log(" want", JSON.stringify(wantKeys.slice(0, 6))); }
    log(" sample tag:", JSON.stringify(got[0]));
    await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(600);
  }
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
