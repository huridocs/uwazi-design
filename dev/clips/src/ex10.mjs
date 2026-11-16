import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2500);
await p.locator("button", {hasText:/^Open$/}).nth(2).click(); await p.waitForTimeout(3000);
await p.screenshot({ path: "s20.png" });
await p.getByRole("tab", {name:/ToC/}).or(p.getByText("ToC",{exact:true})).first().click(); await p.waitForTimeout(1200);
await p.screenshot({ path: "s21.png" });
await b.close();
