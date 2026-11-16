import { clip, S } from "./lib.mjs";
await clip("08-timeline-filtering", async c => {
  const p = c.page;
  await c.pause(1200); c.mark(); await c.pause(500);
  await c.moveTo(1200, 500, 500); await c.wheel(1200, 500, 900, 6, 60); await c.pause(700);
  c.zoom({ x: 990, y: 690, width: 440, height: 200 }, 1.7, 3.2); await c.pause(900);
  await c.click(p.getByText("Last year", { exact: true }), { z: 1.9, hold: 2.6 }); await c.pause(1600);
  c.zoom({ x: 0, y: 60, width: 990, height: 700 }, 1.2, 1.6); await c.pause(1600);
  await c.click(p.getByRole("button", { name: /Clear/, exact: true }).last(), { z: 1.7, hold: 2 }); await c.pause(1400);
});
