import { launch } from "./lib.mjs";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
async function probe(label, re, query, dark = false) {
  await p.getByRole("button", { name: /^Collection: / }).click();
  await p.locator("[role=menuitem],[role=option],[role=menuitemradio]").filter({ hasText: re }).first().click();
  await p.waitForTimeout(2500);
  if (query) { await p.getByPlaceholder(/Search title/).fill(query); await p.keyboard.press("Enter"); await p.waitForTimeout(1500); } else { await p.getByRole("button", { name: "Browse the collection" }).click().catch(() => {}); await p.waitForTimeout(1500); }
  const opens = p.getByRole("button", { name: "Open", exact: true });
  for (let i = 0; i < 12; i++) {
    await opens.nth(i).click(); await p.waitForTimeout(1500);
    const t = await p.getByRole("tab", { name: /^Relationships/ }).first().innerText().catch(() => "");
    const m = t.match(/(\d+)/);
    if (m && +m[1] > 3) break;
    await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(700);
  }
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(1000);
  const hs = await p.evaluate(() => [...document.querySelectorAll('button[aria-expanded][aria-label*="reference"]')].slice(0, 6).map(b => { const s = b.parentElement; return { label: b.getAttribute("aria-label").slice(0, 200), h: Math.round(b.getBoundingClientRect().height), members: !!s.querySelector("[data-part=members]"), span: !!s.querySelector("[data-part=span]"), anchor: !!s.querySelector("[data-part=anchor]"), mix: !!s.querySelector("[data-part=evidence-mix]"), dir: !!s.querySelector("[data-part=shape-end] svg") }; }));
  log(label, JSON.stringify(hs, null, 0));
  await p.screenshot({ path: `r4-hdr-${label}.png` });
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(700);
}
try { await probe("cejil", /CEJIL/, "Corte"); await probe("sample", /Inter-American Human Rights Archive/, ""); } catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
