import { S, rail, title } from "./lib.mjs";
export const log=(k,ok,ev="")=>console.log((ok===true?"PASS":ok===false?"FAIL":"INFO"),"|",k,"|",ev);
export const crumb = (p) => p.locator('button[aria-label^="Collection:"]');
export const switchTo = async (p, name) => { await crumb(p).click(); await p.waitForTimeout(250); await p.locator('[data-part=collection-menu] [role=option]').filter({hasText:name}).click(); await p.waitForTimeout(1500); };
export const toSettings = async (p, item) => { await p.locator('button[data-part=settings-trigger]').click(); await p.waitForTimeout(250); await p.getByText("System settings",{exact:true}).first().click(); await p.waitForTimeout(600); if (item) await rail(p, item); await p.waitForTimeout(400); };
export const viewLabel = (p) => p.evaluate(()=>{ const b=[...document.querySelectorAll("button")].find(x=>/^(Cards|Table|List|Map|Timeline|Results)\b/i.test(x.innerText.trim()) && x.getBoundingClientRect().top<120); return b?b.innerText.trim():null; });
export const facetTemplates = (p) => p.evaluate(()=>{ const cards=[...document.querySelectorAll("*")].filter(e=>e.children.length&&/^Template$/.test((e.firstElementChild?.innerText||"").trim())); return null; });
export const templateFacetText = (p) => p.evaluate(()=>{ const h=[...document.querySelectorAll("h2,h3,div,span")].find(e=>e.childElementCount===0 && e.textContent.trim()==="Template"); if(!h) return null; let c=h.closest("[data-component=FacetCard]")||h.parentElement.parentElement; return c.innerText.replace(/\n+/g," | "); });
export const facet = (p) => p.evaluate(() => {
  const h = [...document.querySelectorAll("*")].find(e => e.childElementCount === 0 && e.textContent.trim() === "Template");
  if (!h) return null;
  let card = h; while (card && card.querySelectorAll('[role=checkbox],input[type=checkbox]').length < 1) card = card.parentElement;
  const lines = (el) => el ? el.innerText.split("\n").map(s => s.trim()).filter(s => s && !/^\d[\d,]*$/.test(s) && s !== "Template") : [];
  const next = card.nextElementSibling;
  return { card: lines(card), next: lines(next).slice(0, 12) };
});
export const entityFilterRows = (p, S) => S(p).locator('[data-part=row]').evaluateAll(e => e.map(x => ({ name: x.innerText.split("\n")[0].trim(), on: !!x.querySelector('[role=checkbox][aria-checked=true],input[type=checkbox]:checked') })));
