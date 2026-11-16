import { clip, S } from "./lib.mjs";
await clip("02-search", async c => {
  const p = c.page;
  await p.getByRole("button", { name: /Collection/ }).click(); await p.getByText("CEJIL", { exact: false }).first().click();
  await p.getByText("4,398 entities").waitFor({ timeout: 20000 }); await c.pause(2500);
  c.mark(); await c.pause(500);
  await c.type(p.getByPlaceholder(/Search/).first(), "El Mozote", { z: 1.5, hold: 2.6 });
  await p.keyboard.press("Enter"); await c.pause(1800);
  c.zoom({ x: 0, y: 100, width: 976, height: 640 }, 1.25, 1.6); await c.pause(1400);
  await c.click(p.getByText("Passages", { exact: true }), { z: 1.6, hold: 2.2 }); await c.pause(1500);
  c.zoom({ x: 980, y: 130, width: 460, height: 700 }, 1.4, 2.2); await c.pause(1600);
  await c.click(p.getByText("Grouped", { exact: true }), { z: 1.6, hold: 2 }); await c.pause(1400);
  await c.click(p.getByText("Passages", { exact: true }), { z: 1.6, hold: 1.6 }); await c.pause(900);
  const tag = p.locator("*", { hasText: /^p\.3$/i }).last();
  await c.click(tag, { z: 1.8, hold: 2.4 }); await c.pause(3000);
  c.zoom({ x: 980, y: 150, width: 460, height: 560 }, 1.6, 2.2); await c.pause(2000);
});
