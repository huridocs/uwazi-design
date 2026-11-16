import { launch, phonePickCollection, phoneOpen } from "./lib.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch({ w: 390, h: 844 });
const log = (...a) => console.log(...a);
try {
await phonePickCollection(p, /Nepal protests/);
await phoneOpen(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click();
await p.waitForTimeout(1000);
const ex = p.getByRole("button", { name: "Expand all" }).first();
if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
const del = p.getByRole("button", { name: /^Delete relationship/ }).first();
console.log("delete buttons", await p.getByRole("button", { name: /^Delete relationship/ }).count());
await del.click({ force: true }); await p.waitForTimeout(700);
const dlgs = await p.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getBoundingClientRect().top < innerHeight - 5).map(d => d.getAttribute("data-component") + "|" + (d.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 30)));
log("dialogs", JSON.stringify(dlgs));
log("active", await p.evaluate(() => { const a = document.activeElement; return (a?.getAttribute("aria-label") || a?.tagName) + " dlg=" + !!a?.closest("[role=dialog][aria-modal=true]"); }));
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("after Esc dialogs", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getBoundingClientRect().top < innerHeight - 5).map(d => d.getAttribute("data-component") + "|" + (d.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 30)))));
} catch (e) { log("ERR", e.message.split("\n")[0]); }
await b.close();
