import { launch, pickCollection, openByTitle } from "./lib.mjs";
import fs from "node:fs";
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
async function axeCard(tag) {
  await p.evaluate(AXE);
  const r = await p.evaluate(async () => {
    const el = document.querySelector('[data-component="RefEvidenceCard"]');
    const res = await axe.run(el, { resultTypes: ["violations", "incomplete"] });
    return { violations: res.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(0, 3).join(" / ").slice(0, 200)) })), incomplete: res.incomplete.map(v => ({ id: v.id, n: v.nodes.length, nodes: v.nodes.slice(0, 2).map(n => n.target.join(" ")) })) };
  });
  log(`AXE ${tag}: violations ${r.violations.length}`, JSON.stringify(r.violations, null, 1), "incomplete", JSON.stringify(r.incomplete));
}
try {
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
await p.getByRole("button", { name: "Expand all" }).first().click(); await p.waitForTimeout(500);
// three cards: 7-source confirmed, disputed with note, single source
const chips = p.locator('[data-component="EvidenceStatus"]');
const n = await chips.count();
const pick = [5, 24, 2];
for (const i of pick) {
  await chips.nth(i).scrollIntoViewIfNeeded(); await chips.nth(i).click(); await p.waitForTimeout(500);
  await axeCard(`light chip#${i} (${await chips.nth(i).getAttribute("aria-label")})`);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
}
// dark via the app toggle
await p.getByRole("button", { name: /^Theme:/ }).click(); await p.waitForTimeout(500);
log("theme button now:", await p.getByRole("button", { name: /^Theme:/ }).getAttribute("aria-label"), "root.dark", await p.evaluate(() => document.documentElement.classList.contains("dark")));
for (const i of pick) {
  await chips.nth(i).scrollIntoViewIfNeeded(); await chips.nth(i).click(); await p.waitForTimeout(500);
  await axeCard(`dark chip#${i}`);
  if (i === 5) await p.screenshot({ path: "axe-dark-card-5.png" });
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
}
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
