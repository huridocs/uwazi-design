import { launch, open, S, shot, rail, dialogs } from "./lib.mjs";
import { squash, modalTxt } from "./u.mjs";
const b = await launch(); const {page}=await open(b,"menu");
await S(page).getByRole("button",{name:"Delete Library"}).click(); await page.waitForTimeout(400);
console.log(await dialogs(page), await modalTxt(page));
await shot(page,"probe-menu-del");
console.log(await page.evaluate(()=>[...document.querySelectorAll("[role=dialog] button, [data-component=ConfirmDelete] button")].filter(b=>!b.closest("[inert]")).map(b=>b.innerText.trim())));
await b.close();
