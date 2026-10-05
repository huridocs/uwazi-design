import { chromium } from "playwright";
const W = Number(process.env.W || 1440);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: W < 500 ? 844 : 900 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
const log = (...a) => console.log(W, ...a);
const go = async (src, section, view = "settings") => {
  await page.evaluate(([src, section, view]) => {
    localStorage.setItem("uwazi:dataSource", JSON.stringify(src));
    sessionStorage.setItem("uwazi:appView", JSON.stringify(view));
    localStorage.setItem("uwazi:settingsSection", JSON.stringify(section));
    localStorage.setItem("uwazi:settingsDrilled", "true");
  }, [src, section, view]);
  await page.goto("http://localhost:1436/"); await page.waitForTimeout(1500);
};
const dlg = async () => (await page.waitForTimeout(600), (await page.locator('[role="dialog"]').last().innerText().catch(() => "none")).replace(/\n+/g, " | "));
await page.goto("http://localhost:1436/");

// Relationship types: create, rename, reach the panel registry
await go("mock", "relationship-types");
await page.getByRole("button", { name: "Add relationship type" }).click(); await page.waitForTimeout(300);
await page.getByLabel("Name").fill("  mentions ");
await page.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(300);
log("dup:", await page.locator("text=Already exists").count());
await page.getByLabel("Name").fill("Appealed to");
await page.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(400);
await page.getByRole("button", { name: "Edit Mentions" }).last().click(); await page.waitForTimeout(300);
await page.getByLabel("Name").fill("Mentioned in");
await page.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(400);
log("rows:", (await page.locator('[data-part="cell"]').allInnerTexts()).filter(Boolean).join(" / ").slice(0, 400));
// Move-and-delete + undo
await page.getByRole("button", { name: "Delete Mentioned in" }).click();
log("delete dialog:", await dlg());
await page.getByRole("button", { name: "Move references to" }).click(); await page.waitForTimeout(200);
await page.getByRole("option", { name: "Refers to" }).click();
await page.locator('[data-part="confirm"]').click(); await page.waitForTimeout(400);
log("after delete:", (await page.locator('[data-part="cell"]').allInnerTexts()).filter((t) => /references?$/.test(t)).join(" / "));
await page.getByRole("button", { name: /Notifications/ }).click(); await page.waitForTimeout(500);
await page.locator('[data-part="action"]').first().click(); await page.waitForTimeout(400);
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
log("after undo:", (await page.locator('[data-part="cell"]').allInnerTexts()).filter(Boolean).join(" / ").slice(0, 300));
// Template editor relationship options include the new type
await go("mock", "templates");
await page.getByRole("button", { name: "Edit Court Case" }).last().click(); await page.waitForTimeout(300);
await page.getByRole("button", { name: "Edit Respondent state" }).last().click(); await page.waitForTimeout(400);
await page.getByRole("button", { name: "Relationship type" }).click().catch(() => {}); await page.waitForTimeout(300);
log("template field options:", (await page.getByRole("option").allInnerTexts()).join(" / "));
await page.keyboard.press("Escape"); await page.keyboard.press("Escape");

// CEJIL usage with the corpus loaded
await go("cejil", "library", "library"); await page.waitForTimeout(6000);
await go("cejil", "thesauri"); await page.waitForTimeout(1000);
const desc = page.getByRole("button", { name: /^Delete Descriptores/ }).first();
await desc.click().catch(async () => log("no Descriptores row"));
log("CEJIL descriptores:", await dlg());
await page.getByRole("button", { name: /OK|Cancel/ }).first().click().catch(() => {});
await go("cejil", "templates"); await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Edit Causa" }).last().click(); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Delete País" }).first().click(); await page.waitForTimeout(500);
await page.getByRole("button", { name: /Notifications/ }).click(); await page.waitForTimeout(500);
log("CEJIL remove País notice:", (await page.locator("article").filter({ hasText: "País removed" }).first().innerText().catch(() => "none")).replace(/\n+/g, " | "));
log("ERRORS", errors.slice(0, 3));
await browser.close();
