import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
const card = '[data-component="RefEvidenceCard"]';
const chips = () => p.locator('[data-component="EvidenceStatus"]');
try {
  await pickCollection(p, /Nepal protests/);
  // D7: organisation NHRC Nepal: quotes from the NHRC PDFs with doc line
  await openByTitle(p, "National Human Rights Commission, Nepal");
  await p.getByRole("tab", { name: /^Relationships/ }).last().click().catch(() => {}); await p.waitForTimeout(800);
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
  const n = await chips().count(); let hit = 0;
  for (let i = 0; i < n; i++) {
    await chips().nth(i).click(); await p.waitForTimeout(150);
    const docs = await p.locator(card + " [data-part=quote-doc]").evaluateAll(e => e.map(x => x.textContent.replace(/\s+/g, " ").trim()));
    if (docs.length) { hit++; if (hit === 1) { log("D7 doc line:", JSON.stringify(docs)); await p.screenshot({ path: "r3-d7-doc-1440.png" }); const tagBtn = await p.locator(card + " [data-part=quote-doc] button, " + card + " [data-part=quote] button[aria-label^='Go to page']").count(); log("   jump buttons in card on this record:", tagBtn); } }
    await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  }
  log("D7 cards with a doc line on NHRC Nepal:", hit, "of", n);
  // the action record shows the PDF: tag is a button, jumps
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(500);
  await openByTitle(p, "NHRC urges the government to reconsider the decision to close social media");
  await p.getByRole("tab", { name: /^Relationships/ }).last().click().catch(() => {}); await p.waitForTimeout(800);
  const ex2 = p.getByRole("button", { name: "Expand all" }).first(); if (await ex2.count() && await ex2.isEnabled()) { await ex2.click(); await p.waitForTimeout(500); }
  const n2 = await chips().count(); let jumped = null;
  for (let i = 0; i < n2 && !jumped; i++) {
    await chips().nth(i).click(); await p.waitForTimeout(150);
    const jb = p.locator(card + " button[aria-label^='Go to page']").first();
    if (await jb.count()) { const lab = await jb.getAttribute("aria-label"); await jb.click(); await p.waitForTimeout(800); jumped = { lab, cardAfter: await p.locator(card).count(), pageInputs: await p.evaluate(() => [...document.querySelectorAll("input")].filter(x => /page/i.test(x.getAttribute("aria-label") || "")).map(x => x.getAttribute("aria-label") + "=" + x.value)) }; }
    else await p.keyboard.press("Escape");
  }
  log("D7 jump:", JSON.stringify(jumped));
  // Split pane scope
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Settings" }).click(); await p.waitForTimeout(300);
  await p.getByLabel("Library layout").click(); await p.getByRole("option", { name: /^Split/ }).click(); await p.waitForTimeout(2500);
  const L = p.locator('section[aria-label="Library, left pane"]'), R = p.locator('section[aria-label="Library, right pane"]');
  async function openIn(pane, q, t) {
    await pane.getByPlaceholder(/Search title/).fill(q); await pane.getByPlaceholder(/Search title/).press("Enter"); await p.waitForTimeout(1500);
    const ok = await pane.evaluate((root, t) => { const pv = [...root.querySelectorAll("button")].filter(x => (x.getAttribute("aria-label") || "").startsWith("Preview ")); const op = [...root.querySelectorAll("button")].filter(x => x.textContent.trim() === "Open" && !x.getAttribute("aria-label")); const i = pv.findIndex(x => x.getAttribute("aria-label") === "Preview " + t); if (i < 0 || !op[i]) return false; op[i].click(); return true; }, t);
    await p.waitForTimeout(2200); return ok;
  }
  await openIn(L, "Sushila Karki sworn in", "Sushila Karki sworn in as interim prime minister");
  await L.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
  const exl = L.getByRole("button", { name: "Expand all" }).first(); if (await exl.count() && await exl.isEnabled()) { await exl.click(); await p.waitForTimeout(500); }
  const lc = L.locator('[data-component="EvidenceStatus"]').nth(4); await lc.click(); await p.waitForTimeout(600);
  const ov = await p.evaluate(() => { const c = document.querySelector('[data-component="RefEvidenceCard"]'); const r = c.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), inLeftPane: !!c.closest('[data-library-pane=left]'), vw: innerWidth }; });
  log("Split left card overlay:", JSON.stringify(ov));
  await p.screenshot({ path: "r3-split-left-1440.png" });
  await p.mouse.click(ov.x + 20, 450); await p.waitForTimeout(300);
  log("   click on the overlay (scrim) closes:", await p.locator(card).count() === 0);
  await lc.click(); await p.waitForTimeout(400);
  await p.locator(card + " [data-part=status]").click(); await p.waitForTimeout(200);
  log("   click inside keeps open:", await p.locator(card).count());
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  log("   Esc: card", await p.locator(card).count(), "focus on chip", await lc.evaluate(e => document.activeElement === e));
  // right pane stays interactive while card open in left? open card again, click right pane search
  await lc.click(); await p.waitForTimeout(400);
  const rbox = await R.boundingBox(); await p.mouse.click(rbox.x + 100, rbox.y + 80); await p.waitForTimeout(300);
  log("   click in right pane while left card open -> card", await p.locator(card).count());
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
