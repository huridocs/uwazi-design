import { clip, S } from "./lib.mjs";
await clip("03-entity", async c => {
  const p = c.page;
  await c.pause(1200); c.mark(); await c.pause(400);
  await c.click(p.locator("button", { hasText: /^Open$/ }).nth(2), { z: 1.6, hold: 2.2 }); await c.pause(1800);
  await c.click(p.getByRole("button", { name: "ToC" }).or(p.getByText("ToC", { exact: true })).first(), { z: 1.6, hold: 1.8 }); await c.pause(900);
  await c.click(p.locator("text=/VI\\. STATE RESPONSIBILITY/i").locator("visible=true"), { z: 1.5, hold: 3 }); await c.pause(2200);
  const main = n => p.getByRole("button", { name: new RegExp("^" + n) }).or(p.getByRole("tab", { name: new RegExp("^" + n) })).first();
  await c.click(main("Metadata").first(), { z: 1.6, hold: 2 }); await c.pause(1900);
  await c.click(main("Relationships").first(), { z: 1.6, hold: 2 }); await c.pause(2200);
  await c.click(main("Files").first(), { z: 1.6, hold: 2 }); await c.pause(2000);
});
