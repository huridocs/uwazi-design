import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("ERR", e.stack?.split("\n").slice(0,4).join("\n")));
await page.goto("http://localhost:1436/"); await page.waitForTimeout(2000);
console.log("loaded:", (await page.locator("body").innerText()).length > 100);
await browser.close();
