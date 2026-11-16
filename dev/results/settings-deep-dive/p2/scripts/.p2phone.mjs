import { chromium } from "playwright";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/p2/flow";
const browser = await chromium.launch();
const log = [];
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
  await page.addInitScript((theme) => { if (!sessionStorage.getItem("p2")) { sessionStorage.setItem("p2","1"); sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); localStorage.setItem("uwazi:settingsSection", JSON.stringify("templates")); localStorage.setItem("uwazi:settingsDrilled", "true"); localStorage.setItem("theme", theme);} }, theme);
  await page.goto("http://localhost:1431/", { waitUntil: "networkidle" });
  const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/390-${theme}-${n}.png` }); };
  const step = async (name, fn) => { try { await fn(); log.push(`OK   ${theme} ${name}`); } catch (e) { log.push(`FAIL ${theme} ${name}: ` + e.message.split("\n")[0]); await shot("FAIL-" + name.replace(/\W+/g, "_")); } };
  const overflow = async (n) => { const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > 390) log.push(`     OVERFLOW ${n}: ${w}px`); };
  await step("templates list", async () => { await shot("p01-templates"); await overflow("templates"); });
  await step("template editor", async () => { await page.getByText("Person", { exact: true }).first().click(); await shot("p02-template-editor"); await overflow("template editor"); await page.getByRole("button", { name: "Cancel", exact: true }).click(); });
  await step("template delete dialog", async () => {
    await page.getByRole("button", { name: /Delete Hearing/ }).click();
    await shot("p03-template-delete"); await page.getByRole("button", { name: "OK" }).click();
  });
  console.log(log.splice(0).join("\n"));
  await ctx.close();
}
await browser.close();
