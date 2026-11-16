import { launch, open, S, shot } from "./lib.mjs";
const b = await launch();
const {page} = await open(b,"languages");
console.log(await page.evaluate(()=>[...document.querySelectorAll("button,select,[role=combobox],[role=menuitem]")].filter(e=>!e.closest('[inert]')&&e.getBoundingClientRect().top<60).map(e=>(e.getAttribute("aria-label")||e.textContent.trim()).slice(0,40))));
console.log(await page.evaluate(()=>[...document.querySelectorAll("*")].filter(e=>e.childElementCount===0&&/^(EN|ES|FR|AR)$/.test(e.textContent.trim())).map(e=>e.outerHTML.slice(0,100))));
await b.close();
