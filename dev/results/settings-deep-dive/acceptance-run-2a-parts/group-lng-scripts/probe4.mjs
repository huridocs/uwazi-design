import { launch, open, S, shot } from "./lib.mjs";
import { toCatalog, toApp } from "./dev.mjs";
const b = await launch();
const {page, errors} = await open(b, "languages");
await toCatalog(page); await toApp(page);
console.log(await page.evaluate(()=>sessionStorage.getItem("uwazi:appView")+" "+localStorage.getItem("uwazi:settingsSection")));
await shot(page,"probe-ret");
await b.close();
