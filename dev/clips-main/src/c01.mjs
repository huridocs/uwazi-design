import { clip } from "./lib.mjs";
await clip("01-library", async c => {
  const p = c.page;
  const view = await c.qa(818, 76);
  const pick = async (n, w) => { await c.click(view, { z: 1.6, hold: 1.8 }); await c.pause(250); await c.click(p.getByRole("option", { name: n, exact: true })); await c.pause(w); };
  const theme = await c.qa(1414, 25);
  const disp = await c.qa(883, 76);
  await c.pause(1200); c.mark();
  await c.pause(300);
  await c.wheel(480, 450, 380, 7, 55); await c.pause(250); await c.wheel(480, 450, -380, 7, 55); await c.pause(250);
  await c.click(disp, { z: 1.7, hold: 2.4 }); await c.pause(400);
  await c.click(p.getByText("Large", { exact: true }).first()); await c.pause(800);
  await c.key("Escape"); await c.pause(250);
  await pick("List", 800); await pick("Map", 1400); await pick("Cards", 500);
  await c.click(theme, { z: 1.6, hold: 1.4 }); await c.pause(1000);
  await c.click(theme); await c.pause(700);
});
