import { clip, S } from "./lib.mjs";
await clip("04-relationship-fields", async c => {
  const p = c.page;
  await p.getByRole("button", { name: /Collection/ }).click(); await p.getByText("CEJIL", { exact: false }).first().click();
  await p.getByText("4,398 entities").waitFor({ timeout: 20000 }); await c.pause(2500);
  await p.getByPlaceholder(/Search/).first().click();
  await p.keyboard.type("Caballero Delgado y Santana", { delay: 20 }); await p.keyboard.press("Enter"); await c.pause(2500);
  await p.getByRole("button", { name: /^Caballero Delgado/ }).first().click(); await c.pause(1200);
  await p.getByRole("button", { name: /View entity/ }).click(); await c.pause(2000);
  await p.getByRole("tab", { name: /^Metadata/ }).first().click(); await c.pause(2500);
  c.mark(); await c.pause(700);
  await c.wheel(430, 500, 700, 10, 60); await c.pause(500);
  c.zoom({ x: 12, y: 322, width: 850, height: 366 }, 1.5, 3);
  await c.moveTo(650, 350, 700); await c.pause(1000);
  await c.moveTo(680, 190, 600); await c.pause(700);
  await c.click(p.getByText("Hernán Salgado Pesantes", { exact: true }), { z: 1.5, hold: 1.6 }); await c.pause(1400);
  c.zoom({ x: 880, y: 52, width: 560, height: 800 }, 1.3, 1.6); await c.pause(1500);
  await c.key("Escape"); await c.pause(1000);
});
