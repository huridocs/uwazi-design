import { run, openFast, rec, S, wait, clean, sh, dataRows, toSettings } from "./g.mjs";
await run("THS-06", async (b) => {
  // Library on Sample, then switch to Travesia from the navbar, go to Settings > Thesauri, with CPU/network throttling
  const { page, ctx } = await openFast(b, "thesauri");
  const cdp = await ctx.newCDPSession(page);
  await page.waitForSelector('[data-testid=settings-content]', { timeout: 60000 });
  await wait(page, 3000);
  const states = []; let last = ""; const t0 = Date.now();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 300 * 1024, uploadThroughput: 300 * 1024 });
  // switch source in place
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 500);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Red Trav" }).click();
  await wait(page, 300);
  await page.locator('button:has-text("Settings")').first().click(); await wait(page, 250);
  await page.getByRole("button", { name: /System settings/ }).click();
  const t1 = Date.now();
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Thesauri" }).first().click();
  while (Date.now() - t1 < 30000) {
    const st = await page.evaluate(() => {
      const c = document.querySelector('[data-testid=settings-content]');
      if (!c) return "no settings content";
      const loading = !!c.querySelector('[data-state=loading]');
      const empty = /No thesauri yet/.test(c.innerText);
      const n = [...c.querySelectorAll("[role=row]")].filter((r) => !r.querySelector("[role=columnheader]")).length;
      return `settings loading=${loading} emptyMsg=${empty} rows=${n}`;
    }).catch(() => "nav");
    if (st !== last) { states.push(`${Date.now() - t1}ms ${st}`); last = st; }
    if (/rows=98/.test(st) && /loading=false/.test(st)) break;
    await page.waitForTimeout(40);
  }
  const sk = states.some((x) => /loading=true/.test(x)); const em = states.some((x) => /emptyMsg=true/.test(x));
  rec("THS-06", sk && !em ? "PASS" : "FAIL", `with CPU 4x and network throttled, Settings > Thesauri on Travesia after switching the source: states ${JSON.stringify(states)}; skeleton rows (data-state=loading, aria-busy) shown=${sk}; "No thesauri yet" shown while loading=${em}. Switching the source from the navbar leaves Settings for the Library (the checklist's in-place switch is not possible), so Settings was reopened after the switch`, await sh(page, "THS-06"));
  await sh(page, "THS-06-b");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});
