import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--force-device-scale-factor=2", "--window-size=1440,900"] });
const ctx = await b.newContext({ viewport: null, recordVideo: { dir: "tmp/v2", size: { width: 2880, height: 1800 } } });
const p = await ctx.newPage();
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => [devicePixelRatio, innerWidth, innerHeight]));
await ctx.close(); await b.close();
