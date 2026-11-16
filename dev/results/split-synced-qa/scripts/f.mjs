import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const view = process.argv[2]; // Map | Network
const { browser, page, logs } = await launch({ sync: true });
await page.goto(URL); await page.waitForTimeout(3000);
for (const side of ["left", "right"]) {
  await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^View: / }).click(); await page.waitForTimeout(300);
  await page.getByRole("option", { name: new RegExp("^" + view) }).first().click();
  await page.waitForTimeout(view === "Network" ? 4000 : 2500);
}
const probe = () => page.evaluate(() => {
  const rail = document.querySelector('[data-component=LibraryRail]').getBoundingClientRect();
  const panel = [...document.querySelectorAll('[role=dialog][data-state=open]')][0]?.getBoundingClientRect();
  const hit = (a, b) => b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const out = [];
  for (const side of ["left", "right"]) {
    const pane = document.querySelector(`[data-library-pane=${side}]`);
    const els = [...pane.querySelectorAll('[data-overlay], [data-part=caption], [data-part=bearing-caption], [data-part=breadcrumb], .leaflet-control, .leaflet-control-zoom, .leaflet-top, button')]
      .filter(e => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && getComputedStyle(e).visibility !== 'hidden' && e.closest('[data-part=lane-host]') && e.closest('[data-part=lane-host]').querySelector('canvas, .leaflet-container') && !e.closest('[role=toolbar]') && (e.closest('.leaflet-container, [data-overlay], canvas') || e.matches('[data-overlay],[data-part=caption],[data-part=breadcrumb]')); });
    for (const e of els) { const b = e.getBoundingClientRect(); const name = (e.dataset.part || e.getAttribute('aria-label') || e.className.toString().slice(0,30) || e.tagName); if (hit(b, rail)) out.push({ side, name, vs: 'rail', l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) }); }
  }
  const kinds = {}; for (const side of ["left","right"]) { const pane = document.querySelector(`[data-library-pane=${side}]`); kinds[side] = { leaflet: !!pane.querySelector('.leaflet-container'), canvas: pane.querySelectorAll('canvas').length, text: [...pane.querySelectorAll('[data-part=caption], [data-part=breadcrumb]')].map(e => { const b = e.getBoundingClientRect(); return e.dataset.part + ":" + Math.round(b.left) + "-" + Math.round(b.right); }) }; }
  const overlayRects = [...document.querySelectorAll('[data-library-pane] [data-overlay], [data-library-pane] .leaflet-control')].map(e => { const b = e.getBoundingClientRect(); return (e.dataset.part || e.className.toString().slice(0,24)) + ":" + Math.round(b.left) + "," + Math.round(b.top) + "-" + Math.round(b.right) + "," + Math.round(b.bottom); });
  return { rail: [Math.round(rail.left), Math.round(rail.top), Math.round(rail.right), Math.round(rail.bottom)], overlaps: out, kinds, overlayRects };
});
console.log(view, "sep0", JSON.stringify(await probe()));
await page.screenshot({ path: OUT + `/synced-${view.toLowerCase()}-both.png` });
// move divider to extremes
for (const key of ["Home", "End"]) { await page.locator('[role=separator]').focus(); await page.keyboard.press(key); await page.waitForTimeout(1200); console.log(view, key, JSON.stringify((await probe()).overlaps)); await page.screenshot({ path: OUT + `/synced-${view.toLowerCase()}-${key}.png` }); }
await page.locator('[role=separator]').dblclick(); await page.waitForTimeout(800);
await page.locator('[data-component=LibraryRail] button').first().click(); await page.waitForTimeout(800);
await page.screenshot({ path: OUT + `/synced-${view.toLowerCase()}-filters.png` });
console.log(logs.filter(l => !/atomFamily/.test(l)).slice(0,10));
await browser.close();
