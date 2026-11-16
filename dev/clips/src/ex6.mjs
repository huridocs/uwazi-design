import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2500);
await p.getByPlaceholder(/Search title/).click();
await p.keyboard.type("disappearance", {delay:40}); await p.waitForTimeout(2000);
await p.keyboard.press("Enter"); await p.waitForTimeout(500);
console.log("GROUPED:", await p.evaluate(()=>[...document.querySelectorAll("main button, [role=main] button, button")].filter(b=>b.getBoundingClientRect().x<960&&b.getBoundingClientRect().y>100&&b.getBoundingClientRect().y<750).slice(0,20).map(b=>(b.getAttribute("aria-label")||b.innerText).trim().replace(/\n/g," ").slice(0,60)).join(" || ")));
// click the first snippet in grouped
await p.mouse.click(400,270); await p.waitForTimeout(2500);
await p.screenshot({ path: "s12.png" });
await b.close();
