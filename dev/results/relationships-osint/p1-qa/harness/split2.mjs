import { launch, pickCollection } from "./lib.mjs";
import { compareAll } from "./cmp.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const T2 = "Dissolution demanded before the oath, carried out after it";
const { b, p, errs } = await launch();
await pickCollection(p, /Nepal protests/);
await p.getByRole("button", { name: "Settings" }).click();
await p.waitForTimeout(300);
await p.getByLabel("Library layout").click();
await p.getByRole("option", { name: /^Split/ }).click();
await p.waitForTimeout(2500);
const L = p.locator('section[aria-label="Library, left pane"]');
const R = p.locator('section[aria-label="Library, right pane"]');
async function openIn(pane, query, title) {
  await pane.getByPlaceholder(/Search title/).fill(query);
  await pane.getByPlaceholder(/Search title/).press("Enter");
  await p.waitForTimeout(1500);
  const ok = await pane.evaluate((root, t) => {
    const previews = [...root.querySelectorAll("button")].filter((x) => (x.getAttribute("aria-label") || "").startsWith("Preview "));
    const opens = [...root.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Open" && !x.getAttribute("aria-label"));
    const i = previews.findIndex((x) => x.getAttribute("aria-label") === "Preview " + t);
    if (i < 0 || !opens[i]) return false; opens[i].click(); return true;
  }, title);
  console.log("opened", title.slice(0, 30), ok);
  await p.waitForTimeout(2200);
}
await openIn(L, "Sushila Karki sworn in", T);
await p.screenshot({ path: "split2-left-open.png" });
const tabsL = await L.getByRole("tab").evaluateAll(e => e.map(x => x.textContent.trim()));
console.log("left tabs", tabsL);
await L.getByRole("tab", { name: /^Relationships/ }).first().click();
await p.waitForTimeout(1000);
const ex = L.getByRole("button", { name: "Expand all" }).first();
if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
const chipsL = L.locator('[data-component="EvidenceStatus"]');
console.log("left chips", await chipsL.count());
await chipsL.nth(4).click(); await p.waitForTimeout(500);
const cardBox = await p.locator('[data-component="RefEvidenceCard"]').boundingBox();
console.log("left card box", JSON.stringify(cardBox), "left pane", JSON.stringify(await L.boundingBox()));
await p.screenshot({ path: "split2-left-card.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
console.log("left esc: card", await p.locator('[data-component="RefEvidenceCard"]').count(), "focus chip", await chipsL.nth(4).evaluate(e => document.activeElement === e));
// compare cards in left pane
const r = await compareAll(p, "nepal", T, { scope: L, max: 33 });
console.log("SPLIT LEFT: buttons", r.n, "mismatch", r.mismatches.length, "focusFail", r.focusFail.length);
// right pane
await openIn(R, "Dissolution demanded before", T2);
await R.getByRole("tab", { name: /^Relationships/ }).first().click().catch(()=>{});
await p.waitForTimeout(1000);
const ex2 = R.getByRole("button", { name: "Expand all" }).first();
if (await ex2.count() && await ex2.isEnabled()) { await ex2.click(); await p.waitForTimeout(600); }
const chipsR = R.locator('[data-component="EvidenceStatus"]');
console.log("right chips", await chipsR.count());
if (await chipsR.count()) {
  await chipsR.first().click(); await p.waitForTimeout(500);
  console.log("right card box", JSON.stringify(await p.locator('[data-component="RefEvidenceCard"]').boundingBox()), "right pane", JSON.stringify(await R.boundingBox()));
  await p.screenshot({ path: "split2-right-card.png" });
  await p.keyboard.press("Escape");
}
const r2 = await compareAll(p, "nepal", T2, { scope: R, max: 40 });
console.log("SPLIT RIGHT: buttons", r2.n, "mismatch", r2.mismatches.length, "focusFail", r2.focusFail.length, JSON.stringify(r2.mismatches).slice(0, 400));
console.log(errs);
await b.close();
