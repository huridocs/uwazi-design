import { launch, open, S, rows, shot } from "./lib.mjs";
const b = await launch();
const {page, errors} = await open(b, "languages");
console.log(await rows(page));
await shot(page,"probe-lng");
console.log(await S(page).innerText());
console.log(await page.evaluate(()=>[...document.querySelectorAll("[data-testid=settings-content] [role=row]")].map(r=>r.outerHTML.slice(0,600))[1]));
console.log(errors);
await b.close();
