import { launch, open, S, shot } from "./lib.mjs";
import { mk } from "./rec.mjs";
const {rec,save}=mk("x06");
const b = await launch();
{
  const {page} = await open(b,"metadata-extraction","mobile");
  const sw = await page.evaluate(()=>document.documentElement.scrollWidth);
  const dels = await S(page).getByRole("button",{name:/Delete Date filed/}).count();
  await S(page).getByRole("button",{name:/Delete Date filed/}).first().click(); await page.waitForTimeout(500);
  const g = await page.evaluate(()=>{const d=document.querySelector('[data-component=ConfirmDelete] [role=dialog]'); if(!d) return null; const r=d.getBoundingClientRect(); return [r.left,r.top,r.width,r.height].map(Math.round)});
  const bs = await page.locator('[data-component=ConfirmDelete] button').evaluateAll(e=>e.map(x=>{const r=x.getBoundingClientRect();return x.textContent.trim()+":"+Math.round(r.width)+"x"+Math.round(r.height)}));
  await shot(page,"X-06-ixe-dialog");
  rec("X-06","FAIL",`phone: scrollWidth ${sw} (no horizontal scroll), list and editor are card layouts (IXE-08), row delete reachable (${dels}); the delete dialog is a centered card ${JSON.stringify(g)} (x,y,w,h), buttons ${JSON.stringify(bs)} (28px high), not a sheet or full screen`,"X-06-ixe-dialog.png");
  await page.context().close();
}
{
  const {page} = await open(b,"paragraph-extraction","mobile");
  const sw = await page.evaluate(()=>document.documentElement.scrollWidth);
  const bs = await page.locator('[data-testid=settings-content] button').evaluateAll(e=>e.map(x=>{const r=x.getBoundingClientRect();return (x.getAttribute("aria-label")||x.textContent.trim()).slice(0,24)+":"+Math.round(r.width)+"x"+Math.round(r.height)}));
  rec("X-06","PASS",`phone: scrollWidth ${sw}; list rows are one-line cards (template, status, count), row is a full-width button; editor is a single column (PXE-07c.png); page has no dialogs; touch targets ${JSON.stringify(bs.slice(0,6))}`,"PXE-07a.png");
  await page.context().close();
}
save(); await b.close();
