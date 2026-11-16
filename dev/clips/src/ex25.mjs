import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2000);
await p.getByRole("button", { name: /^View:/ }).click(); await p.getByRole("option", { name: "Timeline" }).click(); await p.waitForTimeout(1000);
await p.mouse.click(885,76); await p.getByText("Spine", {exact:true}).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
await p.screenshot({path:"s82.png"});
await p.mouse.click(868,772); await p.waitForTimeout(1500);   // 6m preset
await p.screenshot({path:"s83.png"});
await p.mouse.click(948,772); await p.waitForTimeout(1000);   // All
await p.mouse.move(120,806); await p.mouse.down(); await p.mouse.move(330,806,{steps:12}); await p.mouse.up(); await p.waitForTimeout(1500);
await p.screenshot({path:"s84.png"});
await b.close();
