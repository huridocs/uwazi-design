import { chromium } from "playwright";
const D = Number(process.env.D||1);
const b = await chromium.launch(D>1?{args:[`--force-device-scale-factor=${D}`,"--window-size=1440,900"]}:{});
const ctx = await b.newContext(D>1?{viewport:null}:{viewport:{width:1440,height:900}});
const p = await ctx.newPage();
await p.goto("http://localhost:1426/"); await p.waitForTimeout(1500);
await p.getByRole("button", { name: /Collection/ }).click(); await p.getByText("CEJIL", {exact:false}).first().click();
await p.getByText("4,398 entities").waitFor({timeout:20000}); await p.waitForTimeout(2500);
await p.getByPlaceholder(/Search/).first().click();
await p.keyboard.type("El Mozote", {delay:30}); await p.keyboard.press("Enter"); await p.waitForTimeout(2500);
await p.mouse.click(885,76); await p.getByText("Passages", {exact:true}).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
await p.locator("button", { hasText: /^p\.33$/ }).first().click();
for (let i=0;i<8;i++){ await p.waitForTimeout(700);
 console.log(D, i, await p.evaluate(()=>{const pg=[...document.querySelectorAll("[data-page-number],[data-page]")].filter(e=>{const r=e.getBoundingClientRect();return r.x>980&&r.bottom>150&&r.top<800}).map(e=>e.getAttribute("data-page-number")||e.getAttribute("data-page")); return pg.join(",")}));}
await b.close();
