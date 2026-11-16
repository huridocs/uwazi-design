import { launch, state, OUT } from "./lib2.mjs";
const geo = () => document.querySelector('[role=dialog][data-state=open]') ? (() => { const d = document.querySelector('[role=dialog][data-state=open]').getBoundingClientRect(); const s = document.querySelector('[aria-label="Resize panes"]').getBoundingClientRect(); return { panelCx: Math.round(d.left + d.width / 2), sepCx: Math.round(s.left + s.width / 2) }; })() : null;
for (const mode of ["light", "dark", "rtl", "darkrtl"]) {
  const { browser, page, logs } = await launch({ sync: true, dark: mode.includes("dark") }); page.setDefaultTimeout(10000);
  if (mode.includes("rtl")) { await page.locator('[data-library-pane=left]').getByText("EN", { exact: true }).first().click(); await page.waitForTimeout(300); await page.getByText("AR", { exact: true }).first().click(); await page.waitForTimeout(1500); }
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  await L.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  await R.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  const st = await state(page);
  const rail = page.locator('[data-component=LibraryRail]');
  const res = { dir: await page.evaluate(() => document.documentElement.dir), L: st.left.entityOpen, R: st.right.entityOpen, rails: await rail.count() };
  await rail.getByRole("button").first().click(); await page.waitForTimeout(700); res.panel = await page.evaluate(geo);
  await page.screenshot({ path: OUT + "/records-both-filters-" + mode + ".png" });
  await page.keyboard.press("Escape"); await page.waitForTimeout(500); res.afterEsc = (await state(page)).panels.length;
  // strip: click a preset
  const before = await page.evaluate(() => document.querySelector('[data-part=split-brush]')?.innerText.slice(0, 30));
  await page.locator('[data-part=split-brush]').getByRole("button", { name: "10y" }).click().catch(() => {}); await page.waitForTimeout(800);
  res.strip = { before, after: await page.evaluate(() => document.querySelector('[data-part=split-brush]')?.innerText.slice(0, 30)) };
  // divider key in RTL
  await page.locator('[aria-label="Resize panes"]').focus(); await page.keyboard.press("Home"); await page.waitForTimeout(600);
  res.afterHome = await page.evaluate(() => { const a = [...document.querySelectorAll('[data-library-pane]')].map(p => Math.round(p.getBoundingClientRect().width) + "@" + Math.round(p.getBoundingClientRect().left)); return { panes: a, sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  console.log(mode.padEnd(8), JSON.stringify(res), logs.length ? logs : "");
  await browser.close();
}
