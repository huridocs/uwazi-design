import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
const card = '[data-component="RefEvidenceCard"]';
const open = async (title, { tree = false, tab = true } = {}) => {
  await p.getByRole("button", { name: "Library", exact: true }).first().click().catch(() => {}); await p.waitForTimeout(500);
  await openByTitle(p, title);
  if (tab) { await p.getByRole("tab", { name: /^Relationships/ }).last().click().catch(() => {}); await p.waitForTimeout(800); }
  if (tree) { await p.getByRole("button", { name: "Tree", exact: true }).last().click(); await p.waitForTimeout(600); }
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
};
const chips = () => p.locator('[data-component="EvidenceStatus"]');
const findChip = async (re) => { const l = await chips().evaluateAll(e => e.map(x => x.getAttribute("aria-label"))); const i = l.findIndex(x => re.test(x)); return i < 0 ? null : chips().nth(i); };
try {
  await pickCollection(p, /Nepal protests/);
  // D2 backdrop
  await open("Sushila Karki sworn in as interim prime minister");
  const c5 = chips().nth(5); await c5.scrollIntoViewIfNeeded(); await c5.click(); await p.waitForTimeout(400);
  log("D1-desktop initial focus in card:", await p.evaluate(() => !!document.activeElement?.closest('[data-component="RefEvidenceCard"]')));
  await p.mouse.click(300, 700); await p.waitForTimeout(400);
  log("D2 backdrop -> card", await p.locator(card).count(), "focus on chip", await c5.evaluate(e => document.activeElement === e));
  // D6 link size
  await c5.click(); await p.waitForTimeout(400);
  log("D6 link boxes", JSON.stringify(await p.locator(card + " [data-part=source] a[href]").evaluateAll(a => a.slice(0, 4).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }))));
  await p.keyboard.press("Escape");
  // D3 month precision
  await open("Death toll: 75 (photo agency caption, about October 2025)");
  await chips().first().click(); await p.waitForTimeout(400);
  log("D3 facts:", await p.locator(card + " [data-part=facts]").first().innerText(), "| source date:", await p.locator(card + " [data-part=source]").first().innerText().then(t => t.split("\n").slice(0, 2).join(" / ")));
  await p.keyboard.press("Escape");
  // D4 outlet fold wording
  await open("Gen Z groups and Mayor Sampang meet the army chief at Army Headquarters");
  const cs = chips(); const n = await cs.count(); let seen = new Set();
  for (let i = 0; i < n; i++) { await cs.nth(i).click(); await p.waitForTimeout(150); const t = await p.locator(card + " [data-part=status] p").first().innerText(); seen.add(t.replace(/\s+/g, " ")); await p.keyboard.press("Escape"); await p.waitForTimeout(80); }
  log("D4 basis sentences on Gen Z groups record:", JSON.stringify([...seen]));
  // D5 mixed aggregate
  await open("Dan Bahadur Karki", { tree: true });
  const mixed = await findChip(/Mixed/);
  await mixed.click(); await p.waitForTimeout(500);
  log("D5 sections:", await p.locator(card + " [data-part=reference]").count(), JSON.stringify(await p.locator(card + " [data-part=reference]").evaluateAll(e => e.map(x => x.getAttribute("aria-label")))));
  log("   head facts:", await p.locator(card + " [data-part=facts]").first().innerText());
  await p.screenshot({ path: "r1-d5-mixed-1440.png" });
  await p.keyboard.press("Escape");
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
