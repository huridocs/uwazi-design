import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2000);
await p.getByRole("button", { name: /^View:/ }).click(); await p.getByRole("option", { name: "List" }).click(); await p.waitForTimeout(800);
await p.getByText("Velásquez Rodríguez Judgment", {exact:true}).first().click(); await p.waitForTimeout(1200);
await p.getByRole("button", {name:/View entity/}).click(); await p.waitForTimeout(3500);
await p.screenshot({path:"s60.png"});
await p.mouse.move(819,333); await p.waitForTimeout(600); await p.screenshot({path:"s63.png"}); await p.mouse.click(819,171); await p.waitForTimeout(800); await p.screenshot({path:"s64.png"}); await p.mouse.click(819,171); await p.waitForTimeout(500);
// select passage: drag over paragraph 1 text
await p.mouse.move(108,810); await p.mouse.down(); await p.mouse.move(690,838,{steps:15}); await p.mouse.up(); await p.waitForTimeout(800);
await p.screenshot({path:"s61.png"});
await p.getByText("Create relationship").click(); await p.waitForTimeout(1500);
await p.keyboard.type("Case 11", {delay:40}); await p.waitForTimeout(700);
await p.screenshot({path:"s62.png"});
await p.getByText(/Case 11\.137/).first().click(); await p.waitForTimeout(1500);
await p.screenshot({path:"s65.png"});
await b.close();
