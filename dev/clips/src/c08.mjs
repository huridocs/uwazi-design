import { clip, S } from "./lib.mjs";
await clip("08-timeline-filtering", async c => {
  const p = c.page;
  await p.getByRole("button", { name: /^View:/ }).click(); await p.getByRole("option", { name: "Timeline" }).click(); await c.pause(1000);
  await p.mouse.click(885, 76); await p.getByText("Spine", { exact: true }).click(); await p.keyboard.press("Escape"); await c.pause(1500);
  const strip = { x: 0, y: 756, width: 976, height: 96 };
  c.mark(); await c.pause(900);
  await c.wheel(450, 420, 300, 6, 60); await c.pause(600); await c.wheel(450, 420, -300, 6, 60); await c.pause(500);
  c.zoom(strip, 1.5, 3.4); await c.moveTo(330, 806, 700); await c.pause(1000);
  await c.drag(12, 806, 260, 806, 900); await c.pause(1800);
  c.zoom({ x: 0, y: 100, width: 976, height: 640 }, 1.25, 1.6); await c.pause(1400);
  await c.click(p.getByRole("button", { name: "3m" }), { z: 1.6, hold: 2.4 }); await c.pause(2000);
  await c.click(p.getByRole("button", { name: "All", exact: true }), { z: 1.6, hold: 2 }); await c.pause(1700);
  await p.screenshot({ path: S + "raw/c08-z.png" });
});
