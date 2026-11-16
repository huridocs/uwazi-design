import { clip, S } from "./lib.mjs";
await clip("07-input-data", async c => {
  const p = c.page;
  await p.getByRole("button", { name: /^View:/ }).click().catch(async () => { await p.mouse.click(818, 76); }); await c.pause(300);
  await p.getByRole("option", { name: "List", exact: true }).click(); await c.pause(800);
  await p.getByText("Velásquez Rodríguez Judgment", { exact: true }).first().click(); await c.pause(1200);
  await p.getByRole("button", { name: /View entity/ }).click(); await c.pause(3000);
  await p.getByRole("tab", { name: /^Metadata/ }).first().click(); await c.pause(1500);
  const edit = await c.qa(36, 876);
  c.mark(); await c.pause(500);
  await c.click(edit, { z: 1.5, hold: 1.6 }); await c.pause(1300);
  const series = p.getByLabel(/Series/).first();
  await c.click(series, { z: 1.5, hold: 2.6 }); await p.keyboard.press("End"); await c.pause(200);
  for (const ch of " (Merits)") { await p.keyboard.type(ch); await p.waitForTimeout(80); }
  await c.pause(700);
  const desc = p.getByLabel(/Description/).first();
  await c.click(desc, { z: 1.5, hold: 3 }); await c.pause(400);
  for (const ch of "The Inter-American Commission on Human Rights submitted the instant case to the Court on April 24, 1986.") { await p.keyboard.type(ch); await p.waitForTimeout(28); }
  await c.pause(900);
  await p.screenshot({ path: S + "raw/c07-a.png" });
  await c.click(p.getByRole("button", { name: "Save" }).first(), { z: 1.5, hold: 1.6 }); await c.pause(1500);
  await p.screenshot({ path: S + "raw/c07-b.png" });
  await p.keyboard.press("Control+k"); await c.pause(1200);
  for (const ch of "summarize this case") { await p.keyboard.type(ch); await p.waitForTimeout(80); }
  await c.pause(500); await p.keyboard.press("Enter"); await c.pause(4500);
});
