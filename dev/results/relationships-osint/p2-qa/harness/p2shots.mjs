import { launch, pickCollection, openByTitle } from "./lib.mjs";
const card = '[data-component="RefEvidenceCard"]';
async function run({ corp, title, match, name, dark = false, w = 1440, h = 900, tab = true, all = false, after }) {
  const { b, p, errs } = await launch({ dark, w, h });
  if (dark) console.log("dark class:", await p.evaluate(() => document.documentElement.classList.contains("dark")));
  try {
    if (w < 500) { const { phonePickCollection, phoneOpen } = await import("./lib.mjs"); await phonePickCollection(p, corp === "nepal" ? /Nepal protests/ : /Las Vegas/); await phoneOpen(p, title); }
    else { await pickCollection(p, corp === "nepal" ? /Nepal protests/ : /Las Vegas/); await openByTitle(p, title); }
    if (tab) await p.getByRole("tab", { name: /^Relationships/ }).first().click().catch(() => {});
    await p.waitForTimeout(800);
    for (let k = 0; k < 10; k++) { const m = p.getByRole("button", { name: /^Load \d+ more$/ }); if (!(await m.count())) break; await m.first().click(); await p.waitForTimeout(150); }
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
    const chips = p.locator('[data-component="EvidenceStatus"]');
    const n = await chips.count();
    let hit = -1, text = "";
    for (let i = 0; i < n; i++) {
      await chips.nth(i).scrollIntoViewIfNeeded(); await chips.nth(i).click(); await p.waitForSelector(card, { timeout: 3000 });
      text = await p.locator(card).innerText();
      if (match.test(text)) { hit = i; break; }
      await p.keyboard.press("Escape"); await p.waitForTimeout(80);
    }
    console.log(`#### ${name} (chips ${n}, hit ${hit})\n` + (hit >= 0 ? text.slice(0, 1800) : "NOT FOUND"));
    if (hit >= 0) { await p.waitForTimeout(300); await p.screenshot({ path: name + ".png" }); }
    if (after && hit >= 0) await after(p);
  } catch (e) { console.log("ERR", name, e.message.split("\n")[0]); }
  if (errs.length) console.log("errs", JSON.stringify(errs));
  await b.close();
}
const jobs = process.argv[2];
const J = {
  claim: { corp: "nepal", title: "Death toll: 17 killed in Kathmandu on 8 Sep", match: /claim contested/i, name: "p2-nepal-claim-contested-1440-light" },
  unexplained: { corp: "nepal", title: "Gen Z protests in Kathmandu and other cities, 8 September 2025", match: /no reason recorded/i, name: "p2-nepal-no-reason-1440-light" },
  disputedby: { corp: "nepal", title: "At least eight dead as police use force to disperse Gen Z protesters", match: /disputed by/i, name: "p2-nepal-disputed-by-1440-dark", dark: true },
  contestedby: { corp: "nepal", title: "Cabinet withdraws the social media ban", match: /contested by/i, name: "p2-nepal-contested-by-1440-light" },
  vclock: { corp: "vegas", title: "Taxi dash video · 22:09:50", match: /sync\s+check allows/i, name: "p2-vegas-clock-card-1440-dark", dark: true },
  vclock390: { corp: "vegas", title: "Taxi dash video · 22:09:50", match: /sync\s+check allows/i, name: "p2-vegas-clock-card-390-dark", dark: true, w: 390, h: 844 },
  vfig: { corp: "vegas", title: "More than 1,100 rounds (sheriff)", match: /conflicts with/i, name: "p2-vegas-figures-1440-light" },
  vrepl: { corp: "vegas", title: "60 killed (official count, October 2020)", match: /replaces/i, name: "p2-vegas-replaces-1440-light" },
  corrected: { corp: "nepal", title: "2,660 verified injured", match: /on review/i, name: "p2-nepal-corrected-link-1440-light" },
  himal: { corp: "nepal", title: "Education minister resigned over a rift on teachers' demands", match: /himal press/i, name: "p2-nepal-new-opposing-himal-1440-light" },
  nclaim390: { corp: "nepal", title: "Death toll: 17 killed in Kathmandu on 8 Sep", match: /claim contested/i, name: "p2-nepal-claim-contested-390-dark", dark: true, w: 390, h: 844 },
};
await run(J[jobs]);
