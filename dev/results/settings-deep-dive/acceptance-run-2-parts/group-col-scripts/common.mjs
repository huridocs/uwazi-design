import { S, rail, notifTitles, shot } from "./lib.mjs";
export const FILES = new URL("./files/", import.meta.url).pathname;
export const f = (n) => FILES + n;
export const save = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
/** Add files to Settings > Uploads through "Import asset", then return to `back`. */
export async function addUploads(p, names, back) {
  await rail(p, "Uploads"); await p.waitForTimeout(500);
  await S(p).getByRole("button", { name: "Import asset" }).first().click(); await p.waitForTimeout(400);
  await p.locator('[data-component=ImportAssetModal] input[type=file]').setInputFiles(names.map(f));
  await p.waitForTimeout(300);
  await p.locator('[data-component=ImportAssetModal]').getByRole("button", { name: "Add", exact: true }).click(); await p.waitForTimeout(800);
  if (back) { await rail(p, back); await p.waitForTimeout(500); }
}
export const bodyText = async (p) => (await S(p).innerText()).replace(/\n+/g, " | ");
export const notifs = (p) => notifTitles(p);
import { toSettings } from "./h.mjs";
export { toSettings };
export const dark = (p) => p.evaluate(() => document.documentElement.classList.add("dark"));
export const light = (p) => p.evaluate(() => document.documentElement.classList.remove("dark"));
/** Arm "Fail next request" in the Dev panel, return to the app and to Settings > item. */
export async function devArm(p, scopeName, reason, item) {
  await p.locator('button[data-part=logo]').click(); await p.waitForTimeout(700);
  await p.getByRole("button", { name: /^Failure scope/ }).click(); await p.waitForTimeout(250);
  await p.getByRole("option", { name: new RegExp("^" + scopeName) }).click(); await p.waitForTimeout(200);
  await p.getByLabel("Failure reason").fill(reason);
  await p.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(300);
  const status = await p.locator('[data-component=DevPanel] [role=status]').first().innerText();
  await p.getByRole("button", { name: /Return to app/ }).click(); await p.waitForTimeout(600);
  await toSettings(p, item);
  return status;
}
export async function resetDemo(p) {
  await rail(p, "Dashboard"); await p.waitForTimeout(500);
  await p.getByRole("button", { name: /Reset demo data/ }).first().click(); await p.waitForTimeout(500);
  const d = p.locator('[data-component=ConfirmDelete],[data-component=ConfirmDialog]');
  if (await d.count()) { await d.getByRole("button", { name: /Reset|Confirm|Yes/ }).last().click(); await p.waitForTimeout(800); }
}
/** Notifications added since `before` (an earlier notifs() result). */
export const added = async (p, before) => { const now = await notifTitles(p); const b = [...before]; return now.filter((t) => { if (/^(Uploading document batch|Processing PDFs)/.test(t)) return false; const i = b.indexOf(t); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
export const th = (o) => o; 
export const clean = (arr) => arr.map((t) => t.replace(/\s*(just now|\d+ (sec|min|hours?|days?) ago)\s*$/, ""));
/** Delete uploads by name through Uploads > tick rows > Delete. Returns to `back`. */
export async function deleteUploads(p, names, back) {
  await rail(p, "Uploads"); await p.waitForTimeout(500);
  for (const n of names) {
    const row = S(p).locator("[data-part=row]").filter({ hasText: n }).first();
    await row.getByRole("checkbox").first().click({ force: true }); await p.waitForTimeout(100);
  }
  await S(p).getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(400);
  await p.locator('[data-component=ConfirmDelete]').getByRole("button", { name: "Delete", exact: true }).click(); await p.waitForTimeout(600);
  if (back) { await rail(p, back); await p.waitForTimeout(500); }
}
export const storedCol = (p) => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("uwazi:settings:v2:collection:mock")); } catch { return null; } });
export const field = (p, label) => S(p).locator("[data-component=SettingsField]").filter({ hasText: label }).first();
export const toggleRow = (p, label) => S(p).locator("[data-part=toggle]").filter({ hasText: label });
export const isOn = (p, label) => toggleRow(p, label).locator("input[type=checkbox],[role=checkbox]").first().evaluate((e) => (e.tagName === "INPUT" ? e.checked : e.getAttribute("aria-checked") === "true"));

/** First line of each Beacon notification (its title), without the detail line. */
export const heads = (p) => p.locator("article").evaluateAll((els) => els.map((e) => e.innerText.split("\n")[0].trim()));
export const addedHeads = async (p, before) => { const now = await heads(p); const b = [...before]; return now.filter((t) => { if (/^(Uploading document batch|Processing PDFs)/.test(t)) return false; const i = b.indexOf(t); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
/** `--kb` on :root (the keyboard inset published by useKeyboardInset). */
export const kbVar = (p) => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--kb").trim());
/** Resize the viewport by 1 px and back, which fires visualViewport "resize" and makes the app recompute `--kb`. */
export async function kbFix(p) { const v = p.viewportSize(); await p.setViewportSize({ width: v.width, height: v.height - 1 }); await p.waitForTimeout(250); await p.setViewportSize(v); await p.waitForTimeout(400); }
