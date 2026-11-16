// Dev panel helpers (component catalog, reached by the navbar logo).
export const toCatalog = async (p) => { await p.locator("header button").first().click(); await p.waitForTimeout(500); await p.locator("#dev-panel").scrollIntoViewIfNeeded(); };
export const toApp = async (p) => { await p.getByRole("button",{name:"Return to app"}).click(); await p.waitForTimeout(700); };
import { toSettings } from "./h.mjs";
export const backTo = async (p, item) => { await toApp(p); await toSettings(p, item); };
export async function arm(p, scopeLabel, reason, item) {
  await toCatalog(p);
  const dp = p.locator("#dev-panel");
  await dp.locator('button[aria-label^="Failure scope"]').click(); await p.waitForTimeout(150);
  await p.getByRole("option", { name: scopeLabel, exact: true }).click(); await p.waitForTimeout(100);
  if (reason) await dp.locator('input[aria-label="Failure reason"]').fill(reason);
  await dp.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(100);
  const st = await dp.locator("[role=status]").first().innerText();
  await backTo(p, item);
  return st;
}
export async function emptyDomain(p, label, item) {
  await toCatalog(p);
  await p.locator("#dev-panel").getByRole("button", { name: label, exact: true }).click(); await p.waitForTimeout(200);
  await backTo(p, item);
}
