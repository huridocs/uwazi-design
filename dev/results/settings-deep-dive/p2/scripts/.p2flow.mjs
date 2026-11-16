import { chromium } from "playwright";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/p2/flow";
import fs from "fs"; fs.mkdirSync(OUT, { recursive: true });
const theme = process.argv[2] || "light";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(5000);
const dlg = () => page.locator('[role="dialog"],[role="alertdialog"]').last();
const log = [];
page.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
const go = async (s) => {
  await page.addInitScript(([s, theme]) => {
    if (!sessionStorage.getItem("p2init")) {
      sessionStorage.setItem("p2init", "1");
      sessionStorage.setItem("uwazi:appView", JSON.stringify("settings"));
      localStorage.setItem("theme", theme);
    }
  }, [s, theme]);
};
const nav = async (label) => { await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("button", { name: label, exact: true }).click(); await page.waitForTimeout(300); };
const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${theme}-${n}.png` }); };
const step = async (name, fn) => { try { await fn(); log.push("OK   " + name); } catch (e) { log.push("FAIL " + name + ": " + e.message.split("\n")[0]); await shot("FAIL-" + name.replace(/\W+/g, "_")); } };
await go();
await page.goto("http://localhost:1431/", { waitUntil: "networkidle" });

await step("templates delete shows usage", async () => {
  await nav("Templates");
  const row = page.getByRole("row").filter({ hasText: "Hearing" });
  await row.hover();
  await row.getByRole("button", { name: /Delete Hearing/ }).click();
  await dlg().waitFor();
  await shot("01-template-delete");
  await dlg().getByRole("button", { name: /Cancel|OK/ }).first().click();
});
await step("thesaurus remove value -> undo, guard on back", async () => {
  await nav("Thesauri");
  await page.getByRole("row").filter({ hasText: "Case status" }).getByText("Case status").click();
  await page.waitForTimeout(300);
  const li = page.locator("main li, [data-component=ThesaurusEditor] li").filter({ has: page.getByRole("button", { name: /^Delete / }) }).first();
  await li.hover();
  await li.getByRole("button", { name: /^Delete / }).first().click();
  await shot("02-thesaurus-value-removed-undo");
  const undo = page.getByRole("button", { name: /^Undo/ }).first();
  if (await undo.isVisible().catch(() => false)) { await undo.click(); await shot("03-thesaurus-undone"); log.push("     undo clicked"); }
  else log.push("     undo button not visible in Beacon");
  await page.getByLabel("Thesaurus name").fill("Edited thesaurus");
  await page.getByRole("button", { name: /^Back|Thesauri$/ }).first().click();
  await shot("04-thesaurus-guard");
  await page.keyboard.press("Escape");
});
await step("thesaurus save -> last saved", async () => {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText("Edited thesaurus").click();
  await shot("05-thesaurus-last-saved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});
await step("relationship type delete with reassign", async () => {
  await nav("Relationship types");
  const row = page.getByRole("row").nth(1);
  await row.hover();
  await row.getByRole("button", { name: /^Delete / }).click();
  await dlg().waitFor();
  await shot("06-reltype-delete");
  await dlg().getByRole("button", { name: /Cancel|OK/ }).first().click();
});
await step("filters untick, save, last saved", async () => {
  await nav("Filters");
  await page.getByRole("checkbox", { name: "Show Person" }).click();
  await shot("07-filters-dirty");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await shot("08-filters-saved");
});
await step("account taken username", async () => {
  await nav("Account");
  await page.getByLabel("Username").fill("mlopez");
  await shot("09-account-taken");
  await page.getByRole("button", { name: "Discard changes" }).click();
});
await step("users delete self refused", async () => {
  await nav("Users & Groups");
  const row = page.getByRole("row").filter({ hasText: "admin@uwazi.io" });
  await row.hover();
  await row.getByRole("button", { name: /^Delete admin/ }).click();
  await dlg().waitFor();
  await shot("10-user-delete-self");
  await dlg().getByRole("button", { name: /OK|Cancel/ }).first().click();
});
await step("group delete with members", async () => {
  await page.getByRole("tab", { name: /Groups/ }).click();
  const row = page.getByRole("row").nth(1);
  await row.hover();
  await row.getByRole("button", { name: /^Delete / }).click();
  await dlg().waitFor();
  await shot("11-group-delete");
  await dlg().getByRole("button", { name: /Cancel|OK/ }).first().click();
});
await step("language uninstall", async () => {
  await nav("Languages");
  const row = page.getByRole("row").filter({ hasText: "Spanish" });
  await row.hover();
  await row.getByRole("button", { name: /Uninstall Spanish/ }).click();
  await dlg().waitFor();
  await shot("12-language-uninstall");
  await dlg().getByRole("button", { name: /Cancel|OK/ }).first().click();
});
await step("activity log lists the saves", async () => {
  await nav("Activity log");
  await shot("13-activity-log");
});
await step("template editor property remove -> undo", async () => {
  await nav("Templates");
  await page.getByRole("row").filter({ hasText: "Person" }).getByText("Person", { exact: true }).click();
  await page.waitForTimeout(300);
  const prop = page.locator('[data-part="property"]').first();
  await prop.hover();
  await prop.getByRole("button", { name: /^Delete / }).click();
  await shot("14-template-property-removed");
});
console.log(log.join("\n"));
await browser.close();
