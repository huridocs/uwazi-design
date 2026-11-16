import { launch, pickCollection, openByTitle, phonePickCollection, phoneOpen } from "./lib.mjs";
import fs from "node:fs";
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const log = (...a) => console.log(...a);
// RTL desktop
{
  const { b, p, errs } = await launch();
  try {
    await pickCollection(p, /Nepal protests/);
    await openByTitle(p, "Death toll: 17 killed in Kathmandu on 8 Sep");
    await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
    await p.getByRole("button", { name: "Settings" }).click(); await p.waitForTimeout(300);
    await p.getByRole("button", { name: /Test RTL layout/ }).click(); await p.waitForTimeout(800); await p.keyboard.press("Escape");
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
    await p.screenshot({ path: "p2-rtl-headers-1440.png" });
    log("RTL header overflow:", await p.evaluate(() => [...document.querySelectorAll('button[aria-expanded][aria-label*="reference"]')].slice(0, 6).map(b => { const s = b.parentElement.querySelector("[data-part=shape-line]"); const r = b.getBoundingClientRect(); const l = s?.getBoundingClientRect(); return l ? [Math.round(r.left), Math.round(r.right), Math.round(l.left), Math.round(l.right), s.scrollWidth > s.clientWidth + 1] : null; })));
    const chip = p.locator('[data-component="EvidenceStatus"]').first(); await chip.click(); await p.waitForTimeout(500);
    await p.screenshot({ path: "p2-rtl-card-1440.png" });
    await p.evaluate(AXE);
    log("RTL axe card:", JSON.stringify(await p.evaluate(async () => (await axe.run(document.querySelector('[data-component="RefEvidenceCard"]'))).violations.map(v => v.id))));
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(500);
    await p.screenshot({ path: "p2-rtl-filters-1440.png" });
  } catch (e) { log("RTL ERR", e.message.split("\n")[0]); }
  log("errs", JSON.stringify(errs)); await b.close();
}
// phone rows with headers, light + dark, Nepal and Vegas
for (const [corp, title, name, dark] of [["nepal", "Sushila Karki sworn in as interim prime minister", "p2-headers-nepal-390-light", false], ["nepal", "Sushila Karki sworn in as interim prime minister", "p2-headers-nepal-390-dark", true], ["vegas", "Taxi dash video · 22:09:50", "p2-headers-vegas-390-dark", true]]) {
  const { b, p, errs } = await launch({ w: 390, h: 844, dark });
  try {
    await phonePickCollection(p, corp === "nepal" ? /Nepal protests/ : /Las Vegas/);
    await phoneOpen(p, title);
    await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(900);
    const info = await p.evaluate(() => [...document.querySelectorAll('button[aria-expanded][aria-label*="reference"]')].slice(0, 6).map(b => { const s = b.parentElement.querySelector("[data-part=shape-line]"); return { h: Math.round(b.getBoundingClientRect().height), track: !!b.parentElement.querySelector("[data-part=span] .relative"), spanText: b.parentElement.querySelector("[data-part=span]")?.textContent.trim(), over: s ? s.scrollWidth > s.clientWidth + 1 : null }; }));
    log(name, "dark", await p.evaluate(() => document.documentElement.classList.contains("dark")), JSON.stringify(info.slice(0, 4)), "page h-overflow:", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await p.screenshot({ path: name + ".png" });
  } catch (e) { log(name, "ERR", e.message.split("\n")[0]); }
  if (errs.length) log("errs", JSON.stringify(errs));
  await b.close();
}
