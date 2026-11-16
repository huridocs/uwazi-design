import { launch, open, S, shot } from "./lib.mjs";
const b = await launch(); const {page}=await open(b,"translations","mobile");
const btn = page.getByRole("button",{name:"Translate Person"});
await btn.scrollIntoViewIfNeeded();
const bb = await btn.boundingBox(); console.log(bb);
const pts = [[bb.x+80, bb.y+bb.height-12]];
for (const [x,y] of pts){
  const el = await page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y); return e? e.tagName+"."+(e.getAttribute("data-part")||"")+" "+e.className.toString().slice(0,40):null},[x,y]);
  await page.touchscreen.tap(x,y); await page.waitForTimeout(500);
  const open = await page.locator("[data-component=TranslationEditor]").count();
  console.log(Math.round(x),Math.round(y), el, "editor", open);
  if (open) break;
}
await b.close();
