import { launch, state, setView, OUT } from "./lib2.mjs";
const port = Number(process.argv[2]);
const run = async (name, fn, sync = false) => {
  const { browser, page, logs } = await launch({ sync, port });
  const rail = (side) => sync ? page.locator('[data-component=LibraryRail]').first() : page.locator(`[data-library-pane=${side}] [data-component=LibraryRail]`);
  const panels = async () => (await state(page)).panels;
  let r; try { r = await fn(page, rail, panels); } catch (e) { r = "ERR " + e.message.split("\n")[0]; }
  console.log(`${port} sync ${sync ? "ON " : "OFF"} ${name.padEnd(48)} ${r}`);
  await browser.close();
};
const esc = async (page, panels) => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); return (await panels()).length; };
for (const sync of [false, true]) {
await run("S2 right Filters closed by X, then left Filters Esc", async (page, rail, panels) => {
  if (sync) return "n/a"; await rail("right").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); await page.getByRole("button", { name: "Close Filters" }).click(); await page.waitForTimeout(600);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S3 left opens record, Back, then left Filters Esc", async (page, rail, panels) => {
  await page.locator('[data-library-pane=left]').getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1500);
  await page.locator('[data-library-pane=left]').getByRole("button", { name: "Go back" }).click(); await page.waitForTimeout(1200);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S4 right shows record, left Filters Esc", async (page, rail, panels) => {
  await page.locator('[data-library-pane=right]').getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1500);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S5 left preview then Filters Esc", async (page, rail, panels) => {
  await page.mouse.click(250, 240); await page.waitForTimeout(900);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S6 left Filters then right Results; two Esc", async (page, rail, panels) => {
  if (sync) return "n/a"; await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600);
  await rail("right").getByRole("button", { name: "Results" }).click({ force: true }).catch(() => {}); await page.waitForTimeout(600);
  const a = (await panels()).map(p => p.slice(0, 8)); const e1 = await esc(page, panels); const p1 = (await panels()).map(p => p.slice(0, 8)); const e2 = await esc(page, panels); return `open ${JSON.stringify(a)} esc1→${JSON.stringify(p1)} esc2→${e2}`; }, sync);
await run("S7 click in panel (checkbox) then Esc", async (page, rail, panels) => {
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600);
  await page.getByRole("checkbox").first().click({ force: true }).catch(() => {}); await page.waitForTimeout(400); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S8 Filters open, click empty Library area, Esc", async (page, rail, panels) => {
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600); await page.mouse.click(60, 120); await page.waitForTimeout(300); return "after click " + (await panels()).length + "→afterEsc " + await esc(page, panels); }, sync);
await run("S9 switch view to Map, Filters, Esc", async (page, rail, panels) => {
  await setView(page, "left", "Map"); await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(800); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
await run("S10 search typed, Enter, Filters, Esc", async (page, rail, panels) => {
  await page.locator('[data-library-pane=left]').getByPlaceholder(/Search title/).fill("causa"); await page.keyboard.press("Enter"); await page.waitForTimeout(1500);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(800); return "open→afterEsc " + (await panels()).length + "→" + await esc(page, panels); }, sync);
}
