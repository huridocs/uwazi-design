/* The evidence card's focus and Escape, driven in headless Chromium against
 * the dev server (QA's D1 and D2, 2026-10-13).
 *
 *   node scripts/check-evidence-card.ts --url http://localhost:5173
 *
 * - Phone (390, touch): a card opened from the preview sheet is a stacked
 *   sheet. Focus must land inside it, and Escape must close it and give focus
 *   back to the status chip. Before the fix the header swap unmounted the
 *   focused Close, focus fell to <body> and Escape did nothing.
 * - Desktop: a press on the scrim closes the card and focus goes back to the
 *   chip, not to <body>.
 *
 * Needs the dev server up. Exits non-zero on a failed check. */
import { chromium, type Page } from "playwright";

const args = process.argv.slice(2);
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:5173";
const QUERY = "Sushila Karki sworn in";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};
const active = (p: Page) =>
  p.evaluate(() => {
    const el = document.activeElement;
    return {
      inCard: !!el?.closest('[data-component="RefEvidenceCard"]'),
      chip: el?.getAttribute("data-component") === "EvidenceStatus",
      tag: el?.tagName ?? "",
    };
  });

async function openNepalRecord(p: Page) {
  await p.goto(url);
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: /^Collection:/ }).first().click();
  await p.waitForTimeout(400);
  await p.getByRole("option", { name: /nepal/i }).or(p.getByRole("menuitemradio", { name: /nepal/i })).first().click();
  await p.waitForTimeout(3500);
  const search = p.getByRole("searchbox").or(p.getByPlaceholder(/search/i)).first();
  await search.fill(QUERY);
  await search.press("Enter");
  await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /^Browse the collection|^Cards/ }).first().click().catch(() => {});
  await p.waitForTimeout(800);
}

const browser = await chromium.launch();
try {
  // Desktop: scrim press returns focus to the chip.
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await openNepalRecord(p);
    await p.getByRole("button", { name: "Open", exact: true }).first().click();
    await p.waitForTimeout(2000);
    await p.getByRole("tab", { name: /^Relationships/ }).first().click();
    await p.waitForTimeout(1500);
    await p.getByRole("button", { name: "Expand all" }).first().click().catch(() => {});
    await p.waitForTimeout(600);
    await p.locator('[data-component="EvidenceStatus"]').first().click();
    await p.waitForTimeout(500);
    await p.mouse.click(8, 450);
    await p.waitForTimeout(400);
    const a = await active(p);
    check("desktop: scrim press closes the card", (await p.locator('[data-component="RefEvidenceCard"]').count()) === 0);
    check("desktop: focus returns to the chip", a.chip, a.tag);
    await p.close();
  }
  // Phone: card stacked on the preview sheet.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
    const p = await ctx.newPage();
    await openNepalRecord(p);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(1200);
    // The card's stretched target, under its content.
    await p.getByRole("button", { name: /^Preview Sushila Karki sworn in/ }).first().click({ force: true });
    await p.waitForTimeout(1500);
    await p.getByRole("tab", { name: /^Relationships/ }).last().click({ force: true });
    await p.waitForTimeout(1200);
    await p.getByRole("button", { name: "Expand all" }).last().click().catch(() => {});
    await p.waitForTimeout(600);
    const chip = p.locator('[data-component="EvidenceStatus"]').first();
    await chip.focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(700);
    const a = await active(p);
    check("phone: focus lands inside the stacked card", a.inCard, a.tag);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
    const b = await active(p);
    check("phone: Escape closes the card", (await p.locator('[data-component="RefEvidenceCard"]').count()) === 0);
    check("phone: focus returns to the chip", b.chip, b.tag);
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
