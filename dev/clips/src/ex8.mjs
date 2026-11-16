import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(2000);
await p.getByRole("button", { name: /Collection/ }).click(); await p.getByText("CEJIL", {exact:false}).first().click();
await p.getByText("4,398 entities").waitFor({timeout:20000});
await p.getByPlaceholder(/Search/).first().click();
await p.keyboard.type("desaparición forzada", {delay:30}); await p.keyboard.press("Enter"); await p.waitForTimeout(2500);
await p.mouse.click(885,76); await p.getByText("Passages", {exact:true}).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
const tags = p.locator("button", { hasText: /^p\.\d+$/ });
const n = Math.min(await tags.count(), 12);
for (let i=0;i<n;i++){
  await tags.nth(i).scrollIntoViewIfNeeded(); const txt=(await tags.nth(i).innerText());
  const row = await tags.nth(i).evaluate(e=>e.closest("li,div[class*=border]")?.innerText.replace(/\n/g," ").slice(-90));
  await tags.nth(i).click(); await p.waitForTimeout(2500);
  const st = await p.evaluate(()=>[...document.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().x>980&&e.scrollHeight>e.clientHeight+50&&getComputedStyle(e).overflowY!="visible").map(e=>Math.round(e.scrollTop)+"/"+e.scrollHeight));
  const title = await p.evaluate(()=>document.body.innerText.match(/INFORME DE FONDO\n.*|DOCUMENT\n.*|SENTENCIA[^\n]*\n.*/)?.[0]);
  console.log(i, txt, "|", row, "| scroll", st.join(","));
}
await b.close();
