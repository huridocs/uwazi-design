import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", e => console.log("ERR", e.message));
await p.goto("http://localhost:1426/");
await p.waitForTimeout(4000);
await p.screenshot({ path: "s1.png" });
console.log(await p.evaluate(() => document.body.innerText.slice(0, 600)));
await b.close();
