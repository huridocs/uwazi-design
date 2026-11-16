import { chromium } from "playwright";
export const BASE = "http://localhost:1435/";
export async function launch({ w = 1440, h = 900, dark = false, rtl = false, touch = false } = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? "dark" : "light", ...(w < 500 ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console.error: " + m.text().slice(0, 300)); });
  await p.goto(BASE);
  await p.waitForTimeout(1500);
  if (dark) await ensureDark(p, w < 500);
  return { b, ctx, p, errs };
}
export async function pickCollection(p, re) {
  await p.getByRole("button", { name: /^Collection: / }).click();
  await p.locator("[role=menuitem],[role=option],[role=menuitemradio]").filter({ hasText: re }).first().click();
  await p.waitForTimeout(2500);
}
export async function openRecord(p, query, titleRe) {
  await p.getByPlaceholder(/Search title/).fill(query);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1200);
  await p.getByRole("button", { name: titleRe }).first().click();
  await p.waitForTimeout(1500);
}
export async function openByTitle(p, title) {
  await p.getByPlaceholder(/Search title/).fill(title.split(" · ")[0]);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  const ok = await p.evaluate((t) => {
    const previews = [...document.querySelectorAll("button")].filter((x) => (x.getAttribute("aria-label") || "").startsWith("Preview "));
    const opens = [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Open" && !x.getAttribute("aria-label"));
    const i = previews.findIndex((x) => x.getAttribute("aria-label") === "Preview " + t);
    if (i < 0 || !opens[i]) return false;
    opens[i].click(); return true;
  }, title);
  if (!ok) throw new Error("not opened: " + title);
  await p.waitForTimeout(2000);
}
export async function phonePickCollection(p, re) {
  await p.getByRole("button", { name: "Open menu" }).click();
  await p.waitForTimeout(500);
  await p.locator('[data-component="MobileBottomSheet"] button[aria-label^="Collection:"]').click();
  await p.waitForTimeout(300);
  await p.locator("[role=option],[role=menuitem],[role=menuitemradio]").filter({ hasText: re }).first().click();
  await p.waitForTimeout(500);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  const x = p.getByRole("button", { name: /^Close/ }).first();
  await x.click({ timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(2500);
}
export async function phoneOpen(p, title) {
  const q = title.split(" · ")[0];
  await p.getByLabel("Search entities").fill(q);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  const ok = await p.evaluate((t) => {
    const previews = [...document.querySelectorAll("button")].filter((x) => (x.getAttribute("aria-label") || "").startsWith("Preview "));
    const x = previews.find((x) => x.getAttribute("aria-label") === "Preview " + t);
    if (!x) return false;
    x.click(); return true;
  }, title);
  if (!ok) throw new Error("phone: no preview for " + title);
  await p.waitForTimeout(1500);
}

export async function ensureDark(p, phone) {
  const isDark = () => p.evaluate(() => document.documentElement.classList.contains("dark"));
  if (await isDark()) return true;
  if (phone) {
    await p.getByRole("button", { name: "Open menu" }).click(); await p.waitForTimeout(400);
    await p.getByText("Theme", { exact: true }).click(); await p.waitForTimeout(300);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.getByRole("button", { name: /^Close/ }).first().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(300);
  } else {
    for (let i = 0; i < 3 && !(await isDark()); i++) { await p.getByRole("button", { name: /^Theme:/ }).click(); await p.waitForTimeout(300); }
  }
  return await isDark();
}
