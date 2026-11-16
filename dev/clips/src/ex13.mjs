import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2000);
await p.locator("button", {hasText:/^Open$/}).nth(2).click(); await p.waitForTimeout(2500);
await p.getByRole("tab", {name:/^Metadata/}).first().click(); await p.waitForTimeout(1500);
await p.screenshot({path:"s31.png"});
await p.getByRole("button",{name:/^Library/}).first().click().catch(()=>{}); await p.waitForTimeout(1000);
await b.close();
