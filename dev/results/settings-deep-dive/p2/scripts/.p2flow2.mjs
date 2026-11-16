import { chromium } from "playwright";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/p2/flow";
const theme = process.argv[2] || "light";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage(); page.setDefaultTimeout(5000);
const log = []; page.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
await page.addInitScript((theme) => { if (!sessionStorage.getItem("p2")) { sessionStorage.setItem("p2","1"); sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); localStorage.setItem("theme", theme);} }, theme);
await page.goto("http://localhost:1431/", { waitUntil: "networkidle" });
const nav = async (l) => { await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("button", { name: l, exact: true }).click(); await page.waitForTimeout(300); };
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${theme}-${n}.png` }); };
const step = async (name, fn) => { try { await fn(); log.push("OK   " + name); } catch (e) { log.push("FAIL " + name + ": " + e.message.split("\n")[0]); await shot("FAIL2-" + name.replace(/\W+/g, "_")); } };
const beacon = () => page.locator('[data-component="Beacon"] button, button[data-component="Beacon"]').first();
await step("thesaurus remove -> undo from drawer", async () => {
  await nav("Thesauri");
  await page.getByText("Case status", { exact: true }).click();
  const li = page.locator("li").filter({ hasText: "Open" }).filter({ has: page.getByRole("button", { name: /^Delete / }) }).first();
  await li.hover(); await li.getByRole("button", { name: /^Delete / }).click();
  await beacon().click();
  await shot("15-undo-in-drawer");
  await page.getByRole("button", { name: /Undo/ }).first().click();
  await page.keyboard.press("Escape");
  await shot("16-value-restored");
});
await step("guard on back with unsaved name", async () => {
  await page.getByLabel("Thesaurus name").fill("Case status edited");
  await page.getByRole("button", { name: /back/i }).first().click();
  await shot("17-guard");
  const stay = page.getByRole("button", { name: /Keep editing|Stay|Cancel/ }).last();
  await stay.click();
});
await step("thesaurus save -> last saved line", async () => {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText("Case status edited", { exact: true }).click();
  await shot("18-last-saved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});
await step("template property remove -> undo", async () => {
  await nav("Templates");
  await page.getByText("Person", { exact: true }).click();
  const prop = page.locator('[data-part="property"]').nth(1);
  await prop.hover(); await prop.getByRole("button", { name: /^Delete / }).click();
  await shot("19-property-removed");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});
await step("relationship type confirm delete with reassign + undo", async () => {
  await nav("Relationship types");
  const row = page.getByRole("row").nth(1); const label = (await row.innerText()).split("\n")[0];
  await row.hover(); await row.getByRole("button", { name: /^Delete / }).click();
  const d = page.locator('[role="dialog"]').last();
  await d.getByRole("button", { name: /Delete/ }).last().click();
  await shot("20-reltype-deleted");
  log.push("     deleted " + label);
});
await step("activity log after saves", async () => { await nav("Activity log"); await shot("21-activity-log"); });
console.log(log.join("\n")); await browser.close();
