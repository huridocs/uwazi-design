import { createRequire } from "node:module";
const require = createRequire("/Users/juanmnl/Developer/huridocs/uwazi_app/app/package.json");
export const { chromium } = require("playwright");
export const URL = "http://localhost:1437/";
export const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/split-synced-qa";
export async function launch({ sync = false, dark = false, rtl = false, w = 1440, h = 900 } = {}) {
  const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu-rasterization"] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? "dark" : "light" });
  await ctx.addInitScript(({ sync, dark }) => {
    try {
      sessionStorage.setItem("uwazi:libraryLayout", JSON.stringify("split"));
      sessionStorage.setItem("uwazi:librarySyncFilters", JSON.stringify(sync));
    } catch {}
    try { if (dark) localStorage.setItem("theme", "dark"); } catch {}
  }, { sync, dark });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
  return { browser, ctx, page, logs };
}
