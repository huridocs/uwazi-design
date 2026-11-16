import { S } from "./lib.mjs";
export const logo = (p) => p.locator('header img, nav img, [aria-label*="Uwazi"]').first();
export const catalogErrors = [];
export async function toDev(p) {
  p.__mark = p.__errors ? p.__errors.length : 0;
  await logo(p).click(); await p.waitForTimeout(400);
  await p.getByText("Dev panel", { exact: true }).first().click(); await p.waitForTimeout(400);
}
import { toSettings } from "./h.mjs";
export async function backToSettings(p, item) {
  await p.getByRole("button", { name: /Return to app/ }).click(); await p.waitForTimeout(700);
  await toSettings(p, item);
  // console output made while the catalog was open belongs to the catalog, not to the Settings page under test
  if (p.__errors) for (const e of p.__errors.splice(p.__mark)) catalogErrors.push(e);
}
export async function arm(p, scopeLabel, reason, item) {
  await toDev(p);
  const dp = p.locator("[data-component=DevPanel]");
  // scope select
  await dp.locator('button[aria-label^="Failure scope"]').click();
  await p.getByRole("option", { name: scopeLabel, exact: true }).click();
  if (reason) await dp.getByLabel("Failure reason").fill(reason);
  await dp.getByRole("button", { name: "Arm", exact: true }).click();
  const st = await dp.locator("[role=status]").first().innerText();
  await backToSettings(p, item);
  return st;
}
export async function devButton(p, name) {
  await toDev(p);
  await p.locator("[data-component=DevPanel]").getByRole("button", { name }).click();
  await p.waitForTimeout(300);
}
export async function devSlow(p, on) {
  await toDev(p);
  const cb = p.locator("[data-component=DevPanel]").getByRole("checkbox", { name: "Slow load (2 s)" });
  if ((await cb.isChecked()) !== on) await cb.click();
}
