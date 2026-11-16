import { launch, pickCollection } from "./lib.mjs";
import { compareAll, expandAll } from "./cmp.mjs";
const corp = process.argv[2];
const MODE = process.env.MODE || "list";
const titles = process.argv.slice(3);
const COL = { nepal: /Nepal protests/, vegas: /Las Vegas/ };
const { b, p, errs } = await launch();
await pickCollection(p, COL[corp]);
for (const title of titles) {
  await p.getByPlaceholder(/Search title/).fill(title.split(" · ")[0]);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  const ok = await p.evaluate((t) => {
    const previews = [...document.querySelectorAll("button")].filter((x) => (x.getAttribute("aria-label") || "").startsWith("Preview "));
    const opens = [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Open" && !x.getAttribute("aria-label"));
    const i = previews.findIndex((x) => x.getAttribute("aria-label") === "Preview " + t);
    if (i < 0 || !opens[i]) return false;
    opens[i].click(); return true;
  }, title);
  if (!ok) { console.log("NOT OPENED", title); continue; }
  await p.waitForTimeout(2000);
  if (!(await p.locator('[data-component="EvidenceStatus"]').count())) {
    const tabs = p.getByRole("tab", { name: /^Relationships/ });
    const nt = await tabs.count();
    if (nt) await tabs.nth(nt - 1).click(); else await p.getByRole("button", { name: /^Relationships/ }).last().click();
    await p.waitForTimeout(800);
  }
  if (MODE === "tree") { await p.getByRole("button", { name: "Tree", exact: true }).last().click(); await p.waitForTimeout(800); }
  // expand + load all
  await expandAll(p);
  for (let k = 0; k < 40; k++) {
    const more = p.getByRole("button", { name: /^Load \d+ more$/ });
    if (!(await more.count())) break;
    await more.first().click(); await p.waitForTimeout(250);
  }
  await p.waitForTimeout(500);
  const r = await compareAll(p, corp, title, { aggregate: MODE === "tree" });
  console.log("==", title, "buttons", r.n, "checked", r.checked, "mismatch", r.mismatches.length, "focusFail", r.focusFail.length, "unmatched", r.rows.filter(x => !x.matched).length);
  for (const m of r.mismatches.slice(0, 6)) console.log("  ", JSON.stringify(m).slice(0, 700));
  // go back to library
  await p.getByRole("button", { name: "Library", exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(800);
}
console.log("errs", errs);
await b.close();
