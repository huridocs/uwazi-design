import { launch, state, setView, OUT } from "./lib2.mjs";
for (const layout of ["drawer", "full"]) {
  const { browser, page, logs } = await launch({ sync: false, layout });
  // scroll cards, remember
  await page.evaluate(() => { const e = [...document.querySelectorAll("*")].find(x => x.scrollHeight > x.clientHeight + 200 && getComputedStyle(x).overflowY !== "visible" && x.clientHeight > 300); if (e) e.scrollTop = 500; });
  const sc0 = await page.evaluate(() => [...document.querySelectorAll("*")].filter(e => e.scrollTop > 0).map(e => Math.round(e.scrollTop)));
  await page.getByRole("button", { name: /^Open$/ }).nth(1).click(); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ split: !!document.querySelector('[data-component=LibrarySplit]'), panes: document.querySelectorAll('[data-library-pane]').length, h: [...document.querySelectorAll('h1,h2,[data-part=entity-title]')].map(h => h.textContent.trim().slice(0, 40)).slice(0, 2), breadcrumb: document.querySelector('nav')?.textContent.slice(0, 80), tabs: [...document.querySelectorAll('[role=tab][aria-selected=true]')].map(t => t.textContent.trim()).slice(0, 3) }));
  console.log(layout, "after Open:", JSON.stringify(st), "scroll before", sc0);
  await page.screenshot({ path: OUT + `/outside-split-${layout}-entity.png` });
  const back = page.getByRole("button", { name: /Go back|Back/ }).first();
  const bn = await back.count(); console.log(" back button count", bn);
  if (bn) await back.click(); else await page.getByRole("button", { name: "Library" }).first().click();
  await page.waitForTimeout(2000);
  const st2 = await page.evaluate(() => ({ library: !!document.querySelector('[data-part=lane-host], [data-component=LibraryView]') || document.body.innerText.includes("entities"), text: document.body.innerText.match(/[\d,]+ entities/)?.[0], scroll: [...document.querySelectorAll("*")].filter(e => e.scrollTop > 0).map(e => Math.round(e.scrollTop)) }));
  console.log(layout, "after Back:", JSON.stringify(st2));
  await page.screenshot({ path: OUT + `/outside-split-${layout}-back.png` });
  console.log(logs);
  await browser.close();
}
