import { run, open, S, wait, clean, sh, toPanel, panelEdit, panelCreate, panelSave, toSettings, dataRows } from "./g.mjs";
await run("probe", async (b) => {
  const { page } = await open(b, "relationship-types");
  await toPanel(page); await panelEdit(page);
  await panelCreate(page, "Case 12.045", "Cites"); await panelSave(page);
  await panelEdit(page);
  await page.getByRole("button", { name: /Expand all/ }).first().click(); await wait(page, 500);
  await sh(page, "gE-probe-rel7");
  console.log((await page.locator("input[type=checkbox]:visible, [role=checkbox]:visible").evaluateAll(e=>e.map(b=>b.getAttribute("aria-label")))).join(" | "));
  console.log((await page.locator("button:visible").evaluateAll(e=>e.map(b=>b.getAttribute("aria-label")||b.innerText.trim().slice(0,40)).filter(Boolean))).slice(-14).join(" | "));
});
