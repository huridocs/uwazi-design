import { launch, open, S, shot, rail, notifTitles, logEntries, axe, dialogs } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { recorder, run, pass } from "./rec.mjs";
const r = recorder("PRV");
const b = await launch();
const mine = async (p) => (await notifTitles(p)).filter((t) => !/^(Uploading document batch|Processing PDFs|Some fields could|A new version|Entity saved|Failed to save entity|Batch import|Storage usage|Scheduled export)/.test(t));

await run(r, "PRV-01", async () => {
  const { page } = await open(b, "preserve");
  const railOK = (await page.locator('nav[aria-label="Settings navigation"] button').allInnerTexts()).includes("Preserve");
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  const btn = await S(page).getByRole("button", { name: "Request token" }).count();
  const field = await S(page).getByLabel("Extension Token").count();
  await shot(page, "PRV-01");
  r("PRV-01", "FAIL", `Rail item "Preserve" shown: ${railOK}. Page is titled "Preserve" (expected "Preserve Extension") and shows a table of capture sources: "${t.slice(0, 230)}"; no "Preserve Extension" card, no "1. Install the browser extension." / "2. Request and copy the Extension Token below..." lines, "Request token" buttons ${btn}, "Extension Token" fields ${field}`, "PRV-01");
  r("PRV-02", "FAIL", `The page still has the multi-source editor Decision G9 removes: token list columns Source/Token/Captured/Last run, "Add token" action and per-row "Revoke the token for ..." (see shot); expected only the single token card`, "PRV-01");
  await S(page).getByRole("button", { name: "Add token" }).first().click(); await page.waitForTimeout(400);
  const ed = (await S(page).innerText()).replace(/\n+/g, " | ");
  await shot(page, "PRV-02-editor");
  r("PRV-02", "FAIL", `The page still has the multi-source editor Decision G9 removes: table of sources (Source, Token, Captured, Last run), "Add token", per-row "Revoke the token for ...". "Add token" opens an editor with: "${ed.slice(0, 230)}" (Source URL, Authentication, Capture schedule, "Add source"). Expected only the single "Preserve Extension" token card`, "PRV-02-editor");
  await page.context().close();
});

await run(r, "PRV-03", async () => {
  const { page } = await open(b, "preserve");
  const n = await S(page).getByRole("button", { name: "Request token" }).count();
  r("PRV-03", "FAIL", `No "Request token" button (count ${n}); nothing to click, no busy state or token field`);
  r("PRV-04", "FAIL", `Cannot request a token (no button); the page shows two seeded sources with masked tokens "pk_live_a1b2…f9" and "pk_live_c3d4…2a" shared by every user. A second-user token flow cannot be driven`);
  r("PRV-05", "FAIL", `No "Extension Token" field and no copy button on the page (labels: ${(await S(page).getByLabel("Extension Token").count())}, buttons named Copy: ${await S(page).getByRole("button", { name: /copy/i }).count()})`);
  r("PRV-06", "SKIP", `Needs F3 and a forced request failure; there is no Request token action and no failure hook. Not driven`);
  r("PRV-08", "FAIL", `Cannot request a token. Revoking a source records with log:false; Activity log has no Preserve entry to read`);
  await page.context().close();
});

await run(r, "PRV-07", async () => {
  const { page } = await open(b, "preserve");
  await rail(page, "Menu"); await page.waitForTimeout(300); const d1 = (await dialogs(page)).length;
  await rail(page, "Preserve"); await page.waitForTimeout(300);
  await page.locator('nav, header').getByText("Library", { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(500);
  const d2 = (await dialogs(page)).length;
  await toSettings(page, "Preserve");
  await switchTo(page, "CEJIL"); const d3 = (await dialogs(page)).length;
  await toSettings(page, "Preserve");
  const bu = await page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  const foot = await S(page).getByRole("button", { name: /^(Save|Cancel|Discard changes)$/ }).count();
  r("PRV-07", pass(d1 === 0 && d2 === 0 && d3 === 0 && !bu && foot === 0), `dialogs after rail click ${d1}, navbar Library ${d2}, data-source switch ${d3}; beforeunload prevented ${bu}; Save/Cancel/Discard footer buttons ${foot}`);
  r("X-02", "N/A", `Preserve has no form (page's Applies line excludes X-02); PRV-07 confirms no dialog`);
  r("X-03", "N/A", `Applies line excludes X-03`);
  await page.context().close();
});

await run(r, "PRV-09", async () => {
  const { page } = await open(b, "preserve", "mobile");
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  const t = (await S(page).innerText()).replace(/\n+/g, " | ");
  await shot(page, "PRV-09");
  r("PRV-09", "FAIL", `phone: no horizontal scroll (${sw[0]}/${sw[1]}) but the page shows source rows, not the card: "${t.slice(0, 160)}"; no instructions, token field, copy button or "Request token"`, "PRV-09");
  r("X-06", pass(sw[0] <= sw[1]), `phone: no horizontal scroll (${sw[0]}/${sw[1]}); rows stack with actions reachable; the card elements the checks name do not exist`, "PRV-09");
  await page.context().close();
});

await run(r, "X-01", async () => {
  const { page } = await open(b, "preserve");
  await S(page).getByRole("button", { name: "Revoke the token for NGO bulletins" }).click(); await page.waitForTimeout(300);
  await page.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: /Revoke/ }).last().click(); await page.waitForTimeout(400);
  const n = await mine(page);
  const log = await logEntries(page);
  await rail(page, "Menu"); await rail(page, "Preserve"); await page.waitForTimeout(300);
  const back = (await S(page).innerText()).includes("NGO bulletins");
  r("X-01", "FAIL", `Token request not available. The stand-in action (revoking a seeded token) is not kept: after a rail round trip "NGO bulletins" is back: ${back}`);
  r("X-04", "FAIL", `Beacon after revoking a source: ${JSON.stringify(n)}; no token request action exists to produce the expected "Preserve token" entry (or an "An error occurred" on failure)`);
  r("X-09", "FAIL", `Activity log after the revoke: ${JSON.stringify(log)} (recorded with log:false); no readable Preserve token entry`);
  await page.context().close();
});

await run(r, "X-07", async () => {
  const { page } = await open(b, "preserve");
  const v = await axe(page);
  await S(page).getByRole("button", { name: "Revoke the token for Court press releases" }).click(); await page.waitForTimeout(400);
  const dn = await dialogs(page); const v2 = await axe(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const f = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const all = [...v, ...v2];
  r("X-07", all.some((x) => /serious|critical/.test(x)) ? "FAIL" : "PASS", `axe page: ${v.join(" ; ") || "none"}; revoke dialog ${JSON.stringify(dn)}: ${v2.join(" ; ") || "none"}; focus after Escape "${f}"`);
  await page.context().close();
});

await run(r, "X-08", async () => {
  const { page } = await open(b, "preserve");
  await page.evaluate(() => document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const v = await axe(page); await shot(page, "X-08-PRV");
  r("X-08", v.some((x) => /color-contrast/.test(x)) ? "FAIL" : "PASS", `dark mode axe on Preserve: ${v.join(" ; ") || "no violations"}; the page has no status pills (token chips only)`, "X-08-PRV");
  await page.context().close();
});
await b.close();
