import { launch, pickCollection, openByTitle, phonePickCollection, phoneOpen } from "./lib.mjs";
import fs from "node:fs";
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const cfgs = [
  { name: "nepal 1440 light", corp: "nepal", title: "Death toll: 17 killed in Kathmandu on 8 Sep", w: 1440 },
  { name: "nepal 1440 dark", corp: "nepal", title: "Death toll: 17 killed in Kathmandu on 8 Sep", w: 1440, dark: true },
  { name: "nepal 1440 dark (source, Disputed by)", corp: "nepal", title: "At least eight dead as police use force to disperse Gen Z protesters", w: 1440, dark: true },
  { name: "vegas 1440 dark", corp: "vegas", title: "Taxi dash video · 22:09:50", w: 1440, dark: true },
  { name: "vegas 390 dark", corp: "vegas", title: "Taxi dash video · 22:09:50", w: 390, dark: true },
  { name: "nepal 390 dark", corp: "nepal", title: "Death toll: 17 killed in Kathmandu on 8 Sep", w: 390, dark: true },
  { name: "nepal 390 light", corp: "nepal", title: "Sushila Karki sworn in as interim prime minister", w: 390 },
];
for (const c of cfgs) {
  const { b, p, errs } = await launch({ w: c.w, h: c.w < 500 ? 844 : 900, dark: !!c.dark });
  const out = { cfg: c.name, dark: null };
  try {
    if (c.w < 500) {
      await phonePickCollection(p, c.corp === "nepal" ? /Nepal protests/ : /Las Vegas/);
      await phoneOpen(p, c.title);
    } else { await pickCollection(p, c.corp === "nepal" ? /Nepal protests/ : /Las Vegas/); await openByTitle(p, c.title); }
    await p.getByRole("tab", { name: /^Relationships/ }).first().click().catch(() => {}); await p.waitForTimeout(900);
    await p.evaluate(AXE);
    const panel = await p.evaluate(async () => { const el = [...document.querySelectorAll('[data-component="RelationshipsPanelBody"]')].find(e => e.getClientRects().length); const r = await axe.run(el); return { n: r.violations.length, v: r.violations.map(v => v.id + ":" + v.nodes.length + " " + v.nodes[0].target.join(" ").slice(0, 80)), inc: r.incomplete.map(v => v.id + ":" + v.nodes.length) }; });
    out.panelCollapsed = panel;
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
    out.panelExpanded = await p.evaluate(async () => { const el = [...document.querySelectorAll('[data-component="RelationshipsPanelBody"]')].find(e => e.getClientRects().length); const r = await axe.run(el); return { n: r.violations.length, v: r.violations.map(v => v.id + ":" + v.nodes.length + " " + v.nodes[0].target.join(" ").slice(0, 80)) }; });
    const chips = p.locator('[data-component="EvidenceStatus"]');
    const labels = await chips.evaluateAll(e => e.map(x => x.getAttribute("aria-label")));
    const i = Math.max(0, labels.findIndex(l => /ontested|Disputed/.test(l)));
    await chips.nth(i).scrollIntoViewIfNeeded(); await chips.nth(i).click(); await p.waitForTimeout(600);
    out.card = await p.evaluate(async () => { const el = document.querySelector('[data-component="RefEvidenceCard"]'); const r = await axe.run(el); return { n: r.violations.length, v: r.violations.map(v => v.id + ":" + v.nodes.length + " " + v.nodes[0].target.join(" ").slice(0, 80)), inc: r.incomplete.map(v => v.id + ":" + v.nodes.length) }; });
    out.chipLabel = labels[i]; out.dark = await p.evaluate(() => document.documentElement.classList.contains("dark"));
  } catch (e) { out.err = e.message.split("\n")[0]; }
  out.errs = errs;
  console.log(JSON.stringify(out));
  await b.close();
}
