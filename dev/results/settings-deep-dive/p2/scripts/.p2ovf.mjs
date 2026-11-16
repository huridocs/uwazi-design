import { chromium } from "playwright";
const S = ["account","dashboard","collection","menu","pages","templates","thesauri","relationship-types","filters","languages","translations","users","preserve","activitylog","customisation","uploads","metadata-extraction","paragraph-extraction"];
const b = await chromium.launch(); const out = [];
for (const s of S) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.addInitScript((s) => { sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); localStorage.setItem("uwazi:settingsSection", JSON.stringify(s)); localStorage.setItem("uwazi:settingsDrilled", "true"); }, s);
  await p.goto("http://localhost:1431/", { waitUntil: "networkidle" }); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const c = document.querySelector('[data-testid="settings-content"]'); const wide = [...(c?.querySelectorAll("*") ?? [])].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== "fixed").length; return { doc: document.documentElement.scrollWidth, wide, comp: c?.getAttribute("data-component") }; });
  out.push(`${s.padEnd(22)} ${r.comp} doc=${r.doc} pastEdge=${r.wide}`);
  await ctx.close();
}
await b.close(); console.log(out.join("\n"));
