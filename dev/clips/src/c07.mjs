import { clip, S } from "./lib.mjs";
await clip("07-input-data", async c => {
  const p = c.page;
  await p.getByRole("button", { name: /^View:/ }).click(); await p.getByRole("option", { name: "List" }).click(); await c.pause(800);
  await p.getByText("Velásquez Rodríguez Judgment", { exact: true }).first().click(); await c.pause(1200);
  await p.getByRole("button", { name: /View entity/ }).click(); await c.pause(3000);
  const edit = await c.qa(925, 876);
  c.mark(); await c.pause(500);
  await c.click(edit, { z: 1.5, hold: 1.6 }); await c.pause(1300);
  await c.click(p.getByLabel(/Series/).first(), { z: 1.5, hold: 2.6 }); await p.keyboard.press("End"); await c.pause(200);
  for (const ch of " (Merits)") { await p.keyboard.type(ch); await p.waitForTimeout(80); }
  await c.pause(700);
  await c.click(p.getByLabel(/Description/).first(), { z: 1.5, hold: 2.4 }); await c.pause(900);
  await c.wheel(400, 500, 380, 8, 50); await c.pause(500);
  await c.zoom({ x: 60, y: 380, width: 700, height: 120 }, 1.5, 3);
  await c.drag(108, 426, 690, 482, 800); await c.pause(800);
  await p.screenshot({ path: S + "raw/c07-a.png" });
  await c.click(p.getByRole("button", { name: /^Fill/ }).or(p.getByText(/^Fill Description/)).first(), { z: 1.6, hold: 2 }); await c.pause(1500);
  await p.screenshot({ path: S + "raw/c07-b.png" });
  await c.click(p.getByRole("button", { name: "Save" }).first(), { z: 1.5, hold: 1.6 }); await c.pause(1500);
  await p.keyboard.press("Control+k"); await c.pause(1200);
  for (const ch of "summarize this case") { await p.keyboard.type(ch); await p.waitForTimeout(80); }
  await c.pause(500); await p.keyboard.press("Enter"); await c.pause(5000);
});
