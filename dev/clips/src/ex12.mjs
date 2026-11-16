import { chromium } from "playwright";
const b = await chromium.launch();
for (const [qn, i] of [["Bayarri",0],["Niños de la calle",0],["Vélez Restrepo",0],["Masacres de El Mozote",0],["Herrera Ulloa",0],["Gelman",0]]) {
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:1426/"); await p.waitForTimeout(1500);
await p.getByRole("button", { name: /Collection/ }).click(); await p.getByText("CEJIL", {exact:false}).first().click();
await p.getByText("4,398 entities").waitFor({timeout:20000});
await p.getByPlaceholder(/Search/).first().click();
await p.keyboard.type(qn, {delay:20}); await p.keyboard.press("Enter"); await p.waitForTimeout(2000);
const btn = p.getByRole("button", {name:new RegExp("^"+qn.split(" ")[0])}).first();
if (!(await btn.count())) { console.log(qn,"no result button"); await p.close(); continue; }
await btn.click(); await p.waitForTimeout(1200);
const ty = await p.locator("text=/^(CAUSA|Causa)/").first().innerText().catch(()=>"?");
await p.getByRole("button", {name:/View entity/}).click(); await p.waitForTimeout(2000);
await p.getByRole("tab", {name:/^Metadata/}).first().click(); await p.waitForTimeout(1500);
const t = await p.evaluate(()=>document.body.innerText);
console.log(qn, "| title:", (await p.locator("text=/CAUSA|SENTENCIA|RESOLUCI|MEDIDA/").first().innerText().catch(()=>"?")), "| jueces:", /Jueces firmantes/i.test(t), "| tables:", await p.locator("table").count());
await p.screenshot({path:`s30-${qn.split(" ")[0]}.png`});
await p.close();
}
await b.close();
