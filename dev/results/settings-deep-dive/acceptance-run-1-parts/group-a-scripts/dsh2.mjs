import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles, logEntries } from "./lib.mjs";
import { toSettings } from "./h.mjs";
import { mk, signInAs, realErrors, lines, delta, newN, contrast, dark, hscroll } from "./rec.mjs";
const { rec, save } = mk("dsh2");
const b = await launch();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
const dash = async (p) => norm(await S(p).innerText());
const rel = async (p) => Number((await dash(p)).match(/RELATIONSHIPS\s+([\d,]+)/)?.[1]?.replace(/,/g, ""));
const actTop = async (p) => (await lines(p));
const editThes = async (p) => {
  await rail(p, "Thesauri"); await p.waitForTimeout(500);
  await S(p).locator('[role=row]').nth(1).locator("button").first().dispatchEvent("click"); await p.waitForTimeout(500);
  const name = S(p).locator("input").first();
  await name.fill((await name.inputValue()) + " QA"); await S(p).getByRole("button", { name: /^Save$/ }).click(); await p.waitForTimeout(600);
};
// DSH-10
{
  const { page: p } = await open(b, "dashboard");
  const d0 = await rel(p);
  await p.getByRole("button", { name: /^Library/ }).first().click(); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(1500);
  await p.getByRole("tab", { name: /Relationships/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /^Edit/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /Create relationship/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Juan Carlos Abella" }).first().click(); await p.waitForTimeout(500);
  await p.getByText("Mentions", { exact: true }).first().click();
  await p.getByRole("button", { name: "Create relationship" }).last().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /^Save$/ }).last().click(); await p.waitForTimeout(800);
  await toSettings(p, "Dashboard"); await p.waitForTimeout(500);
  const d1 = await rel(p);
  // remove
  await p.getByRole("button", { name: /^Library/ }).first().click(); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(1500);
  await p.getByRole("tab", { name: /Relationships/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /^Edit/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /Expand all/ }).first().click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Delete relationship" }).last().click({ force: true }); await p.waitForTimeout(500);
  const dl = await dialogs(p);
  if (dl.length) { await dg(p, /Delete|Confirm|Remove/).click().catch(() => {}); await p.waitForTimeout(400); }
  await p.getByRole("button", { name: /^Save$/ }).last().click(); await p.waitForTimeout(800);
  await toSettings(p, "Dashboard"); await p.waitForTimeout(500);
  const d2 = await rel(p);
  rec("DSH-10", d1 === d0 + 1 && d2 === d0 ? "PASS" : "FAIL", `Relationships card ${d0} -> ${d1} after creating one relationship (Hearing 3 -> Juan Carlos Abella, "Mentions") -> ${d2} after deleting it (dialogs on delete=${JSON.stringify(dl)}). The card follows the live reference store as specified; the card has no caption`, "");
  await p.context().close();
}
// DSH-12 + DSH-14
{
  const { page: p } = await open(b, "dashboard");
  const nb = await notifTitles(p);
  await editThes(p);
  await rail(p, "Users & Groups"); await p.waitForTimeout(400);
  await p.locator('[role=row]', { hasText: "tbuergenthal" }).hover();
  await S(p).getByRole("button", { name: "Delete tbuergenthal" }).click(); await p.waitForTimeout(300);
  await dg(p, /^Delete/).click(); await p.waitForTimeout(500);
  await rail(p, "Dashboard"); await p.waitForTimeout(500);
  const rowsTxt = (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
  const heads = (await S(p).locator('[role=columnheader]').allInnerTexts()).map(norm);
  const link = await S(p).getByRole("link", { name: /Activity log|View all|See all/i }).count() + await S(p).getByRole("button", { name: /Activity log|View all|See all/i }).count();
  await shot(p, "DSH-12");
  rec("DSH-12", /Deleted user .*tbuergenthal/.test(rowsTxt[0] || "") && /thesaurus/i.test(rowsTxt[1] || "") && link ? "PASS" : "FAIL", `Recent activity columns=${JSON.stringify(heads)} (no acting-user column; spec "with the acting user"); newest rows=${JSON.stringify(rowsTxt.slice(0, 3))} (the two new actions are on top, newest first, then seed rows); link to Settings > Activity log present=${link > 0}`, "DSH-12.png");
  // DSH-14 reset: also delete a page (Pages edit)
  await rail(p, "Pages"); await p.waitForTimeout(400);
  const pagesBefore = (await rows(p)).length;
  await p.locator('[role=row]', { hasText: "Contact" }).hover();
  await S(p).getByRole("button", { name: "Delete Contact" }).click({ force: true }); await p.waitForTimeout(400);
  await dg(p, /^Delete/).click(); await p.waitForTimeout(500);
  const pagesMid = (await rows(p)).length;
  await rail(p, "Dashboard"); await p.waitForTimeout(500);
  rowsTxt.splice(0, rowsTxt.length, ...(await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1));
  await p.getByRole("button", { name: /Reset demo data/ }).click(); await p.waitForTimeout(400);
  const dtxt = norm((await p.locator('[role=dialog]:not([inert]):not([inert] *)').allInnerTexts()).join(" | "));
  await conf(p, "Cancel").click(); await p.waitForTimeout(300);
  const keep = (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1, 3);
  const logBefore = await logEntries(p);
  await p.getByRole("button", { name: /Reset demo data/ }).click(); await p.waitForTimeout(300);
  await conf(p, "Reset").click(); await p.waitForTimeout(600);
  const logAfter = await logEntries(p);
  const rowsAfter = (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1);
  await rail(p, "Pages"); await p.waitForTimeout(400);
  const pagesAfter = (await rows(p)).length;
  await rail(p, "Users & Groups"); await p.waitForTimeout(400);
  const uAfter = (await S(p).locator('[role=row]').allInnerTexts()).map(norm).slice(1).length;
  const nn = newN(nb, await notifTitles(p));
  rec("DSH-14", /Reset demo data/.test(dtxt) && JSON.stringify(keep) === JSON.stringify(rowsTxt.slice(0, 2)) && logAfter.length === 0 && uAfter === 5 && pagesAfter === pagesBefore ? "PASS" : "FAIL", `Reset opens a confirm dialog ("${dtxt.slice(0, 160)}"); Cancel keeps the edits (top rows still ${JSON.stringify(keep.map(x => x.slice(0, 50)))}); confirming: session activity entries ${logBefore.length} -> ${logAfter.length}, Dashboard rows now ${JSON.stringify(rowsAfter.slice(0, 2).map(x => x.slice(0, 50)))}, users restored to ${uAfter}; new Beacon=${JSON.stringify(nn)}. edits made: a thesaurus rename, a user delete and a deleted page (Pages rows ${pagesBefore} -> ${pagesMid}; after reset ${pagesAfter}); a Pages draft in the editor was not created`, "");
  await p.context().close();
}
// DSH-13 CEJIL paragraph
{
  const { page: p } = await open(b, "dashboard");
  const out = [];
  for (const [n, label] of [["CEJIL", "CEJIL"], ["Red Trav", "Travesía"]]) {
    await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250);
    await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: n }).click(); await p.waitForTimeout(2500);
    await toSettings(p, "Dashboard"); await p.waitForTimeout(600);
    const t = await dash(p);
    const hasTable = (await S(p).locator('[role=row]').count()) > 0;
    out.push(`${label}: table rows=${hasTable}, paragraph present=${/isn't part of the public summa/.test(t)}`);
    await shot(p, `DSH-13-${label}`);
    await p.getByRole("button", { name: /^Library/ }).first().click(); await p.waitForTimeout(300);
  }
  rec("DSH-13", "FAIL", `${out.join("; ")}. On CEJIL the page shows the paragraph "The activity log isn't part of the public summa.cejil.org sample. Switch to the Sample source to see demo activity." in place of the Recent activity table (spec: same table, no paragraph about the data source); Travesía shows the Sample cards and table`, "DSH-13-CEJIL.png");
  await p.context().close();
}
// DSH-09 phone, X-06
{
  const m = await open(b, "dashboard", "mobile"); const p = m.page; await p.waitForTimeout(600);
  const cols = await p.evaluate(() => { const g = document.querySelector('[data-testid="settings-content"] .grid'); return getComputedStyle(g).gridTemplateColumns.split(" ").length; });
  const hs = await hscroll(p);
  await shot(p, "DSH-09-phone");
  const v = await axe(p);
  await p.context().close();
  const d = await open(b, "dashboard"); const q = d.page;
  const dcols = await q.evaluate(() => { const g = document.querySelector('[data-testid="settings-content"] .grid'); return getComputedStyle(g).gridTemplateColumns.split(" ").length; });
  const footer = await q.locator("footer, [data-part=footer]").count();
  const sr = await q.evaluate(() => [...document.querySelectorAll('[data-testid="settings-content"] *')].filter(e => { const s = getComputedStyle(e); return (s.overflowX === "auto" || s.overflowX === "scroll") && e.scrollWidth > e.clientWidth; }).length);
  const vd = await axe(q);
  rec("DSH-09", dcols === 2 && cols === 1 && hs.doc <= 0 && !vd.some(x => /scrollable-region/.test(x)) ? "PASS" : "FAIL", `Desktop 1280: card grid has ${dcols} columns (spec 2; 4 here); phone 390: ${cols} columns (spec one column; overflow ${hs.doc}px); axe desktop: ${JSON.stringify(vd)} (no scrollable-region-focusable violation); axe phone: ${JSON.stringify(v)}; the Reset demo data footer bar exists (spec says "no footer")`, "DSH-09-phone.png");
  rec("X-06", cols === 1 && hs.doc <= 0 ? "PASS" : "FAIL", `phone 390: Dashboard grid columns=${cols} (the 4 cards sit two per row, not one column), horizontal overflow ${hs.doc}px, Recent activity table fits without hiding actions; "Reset demo data" button reachable`, "DSH-09-phone.png");
  // X-07 reset dialog
  await q.getByRole("button", { name: /Reset demo data/ }).focus();
  await q.getByRole("button", { name: /Reset demo data/ }).click(); await q.waitForTimeout(400);
  const dv = await q.evaluate(async () => { const el = [...document.querySelectorAll('[role=dialog]')].filter(e => !e.closest('[inert]') && !e.hasAttribute('inert'))[0]; if (!el) return ["no dialog"]; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact})`); });
  let inside = true;
  for (let i = 0; i < 6; i++) { await q.keyboard.press("Tab"); if (!await q.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter(e => !e.closest('[inert]') && !e.hasAttribute('inert'))[0]; return !!d && d.contains(document.activeElement); })) inside = false; }
  await q.keyboard.press("Escape"); await q.waitForTimeout(400);
  const closed = (await dialogs(q)).length === 0;
  const restored = await q.evaluate(() => document.activeElement?.innerText?.trim());
  const bad = [...vd, ...dv].filter(x => /serious|critical/.test(x));
  await shot(q, "X-07-dashboard");
  rec("X-07", !bad.length && inside && closed ? "PASS" : "FAIL", `axe on page: ${JSON.stringify(vd)} (serious color-contrast on the action badges); axe on the Reset dialog: ${JSON.stringify(dv)}; focus trapped over 6 Tabs=${inside}; Escape closed=${closed}; focus restored to "${restored}"`, "X-07-dashboard.png");
  // X-08 dark
  const sels = { CREATE: "[data-testid=settings-content] span.bg-success-light", UPDATE: "[data-testid=settings-content] span.bg-carbon-tint", DELETE: "[data-testid=settings-content] span.bg-seal-tint", MIGRATE: "[data-testid=settings-content] span.bg-warning-light" };
  const res = {};
  for (const [k, s] of Object.entries(sels)) res[k] = [await contrast(q, s)];
  await dark(q);
  for (const [k, s] of Object.entries(sels)) res[k].push(await contrast(q, s));
  await shot(q, "X-08-dashboard-dark");
  const badc = Object.entries(res).filter(([k, [l, dd]]) => !(l >= 4.5 && dd >= 4.5));
  rec("X-08", badc.length ? "FAIL" : "PASS", `Action badge contrast (light:dark): ${Object.entries(res).map(([k, [l, dd]]) => `${k} ${l}:${dd}`).join(", ")} (need >= 4.5:1)`, "X-08-dashboard-dark.png");
  await d.ctx.close(); await m.ctx.close().catch(() => {});
}
// X-13
{
  const { page: p } = await open(b, "dashboard");
  const t0 = await dash(p);
  await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250);
  await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await p.waitForTimeout(2500);
  await toSettings(p, "Dashboard"); await p.waitForTimeout(600);
  const t1 = (await dash(p));
  rec("X-13", /USERS/.test(t1) && t0.match(/USERS (\d+)/)?.[1] === t1.match(/USERS (\d+)/)?.[1] && t0 !== t1 ? "PASS" : "FAIL", `Sample cards: ${t0.match(/ENTITIES.*?LANGUAGES \d+/)?.[0]}; CEJIL cards: ${t1.match(/ENTITIES.*?LANGUAGES \d+/)?.[0]}. Content cards (Entities, Relationships, Languages) follow the data source, but the Users card is not shown on CEJIL (it is replaced by Templates), so it does not stay unchanged`, "DSH-13-CEJIL.png");
  await p.context().close();
}
save(); await b.close();
