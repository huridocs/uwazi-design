import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { compareAll, expandAll } from "./cmp.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch();
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
// --- main Relationships tab
await p.getByRole("tab", { name: /^Relationships/ }).first().click();
await p.waitForTimeout(1500);
await expandAll(p);
let r = await compareAll(p, "nepal", T, { max: 33 });
console.log("MAIN TAB: buttons", r.n, "mismatch", r.mismatches.length, "focusFail", r.focusFail.length);
await p.locator('[data-component="EvidenceStatus"]').nth(5).click();
await p.waitForTimeout(500);
await p.screenshot({ path: "surf4-main-tab-card.png" });
await p.keyboard.press("Escape");
// tree leaf in main tab
await p.getByRole("button", { name: "Tree", exact: true }).last().click();
await p.waitForTimeout(800);
await expandAll(p);
r = await compareAll(p, "nepal", T, { aggregate: true, max: 60 });
console.log("MAIN TAB TREE: buttons", r.n, "mismatch", r.mismatches.length, "focusFail", r.focusFail.length);
await p.locator('[data-component="EvidenceStatus"]').nth(3).click();
await p.waitForTimeout(500);
await p.screenshot({ path: "surf4-main-tab-tree-card.png" });
await p.keyboard.press("Escape");
// Library preview
await p.getByRole("button", { name: "Library", exact: true }).first().click();
await p.waitForTimeout(1000);
await p.getByPlaceholder(/Search title/).fill("Sushila Karki sworn in");
await p.keyboard.press("Enter");
await p.waitForTimeout(1200);
await p.evaluate((t) => { const x=[...document.querySelectorAll("button")].find(e=>e.getAttribute("aria-label")==="Preview "+t); x.click(); }, T);
await p.waitForTimeout(1500);
await p.screenshot({ path: "surf4-library-preview.png" });
console.log(await p.$$eval("button,[role=tab]", els => els.map(e => (e.getAttribute("aria-label")||e.textContent||"").trim().slice(0,30)).filter(Boolean).filter(x=>/Relationships|Metadata|Open entity|Files|Results|Filters/.test(x)).slice(0,20)));
console.log(errs);
await b.close();
