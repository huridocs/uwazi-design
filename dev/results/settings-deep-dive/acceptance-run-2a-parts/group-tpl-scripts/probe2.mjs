import { launch, open, S, rows, wait, shot } from "./common.mjs";
const b = await launch();
const { page, errors } = await open(b, "templates");
await wait(page, 800);
await page.locator("img.logo-img").first().click();
await wait(page, 800);
await page.getByRole("button",{name:"Return to app"}).click();
await wait(page, 800);
console.log(await page.evaluate(()=>document.body.innerText.slice(0,200)), await page.evaluate(()=>JSON.stringify([sessionStorage.getItem("uwazi:appView"), localStorage.getItem("uwazi:settingsSection")])));
// dev panel component
await page.locator("img.logo-img").first().click(); await wait(page,600);
const dp = page.locator('[data-component=DevPanel]');
console.log(await dp.count(), await dp.first().evaluate(e=>e.innerText.slice(0,300)));
await b.close();
