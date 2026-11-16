import { launch, open, S, shot, rail } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, goto, openCtx, cell, saveEd, beacon, newBeacon, activity } from "./u.mjs";
const { rec, save } = mk("trn1");
const b = await launch();
const listRows = async (p) => (await p.locator("[data-testid=settings-content] [data-part=row]").allInnerTexts()).map(squash);
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();

// ---------- TRN-01, TRN-02, TRN-PO1(part)
{
  const { page, errors } = await open(b, "translations");
  const h2 = await S(page).locator("h2").first().innerText();
  const secs = await S(page).locator("h3").allInnerTexts();
  const heads = (await S(page).locator("[role=columnheader]").allInnerTexts()).map(squash);
  const secEls = await S(page).locator("section").evaluateAll((e) => e.map((s) => ({ h: s.querySelector("h3")?.innerText, rows: [...s.querySelectorAll("[data-part=row]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()) })));
  await shot(page, "TRN-01");
  const sys = secEls.find((s) => /System/.test(s.h || "")), con = secEls.find((s) => /Content/.test(s.h || ""));
  const sysNames = (sys?.rows || []).map((r) => r.split(" ")[0] + (r.startsWith("User Interface") ? " Interface" : ""));
  const sysTxt = (sys?.rows || []).map((r) => r.replace(/\d.*/, "").trim());
  const conTxt = (con?.rows || []).map((r) => r.replace(/\d.*/, "").trim());
  // expected content rows: 9 templates, 6 thesauri, 14 relationship types? read from the stores
  await goto(page, "Templates"); const nT = (await listRows(page)).length;
  await goto(page, "Thesauri"); const nTh = (await listRows(page)).length;
  await goto(page, "Relationship types"); const nRt = (await listRows(page)).length;
  await goto(page, "Translations");
  rec("TRN-01", h2 === "Translations" && secs.includes("System translations") && secs.includes("Content translations") && sys && con && heads.some((x) => /^NAME$/i.test(x)) && heads.some((x) => /^TYPE$/i.test(x)) && sysTxt.some((x) => /^User Interface/.test(x)) && sysTxt.some((x) => /^Menu/.test(x)) && con.rows.length === nT + nTh + nRt ? "PASS" : "FAIL",
    `title "${h2}"; h3 ${JSON.stringify(secs)}; column headers ${JSON.stringify([...new Set(heads)])}; System rows ${JSON.stringify(sysTxt)} (User Interface, Menu present; Filters context is absent because the Sample has no filter group, see TRN-07); Content rows ${con?.rows.length} = ${nT} templates + ${nTh} thesauri + ${nRt} relationship types (${nT + nTh + nRt}): ${con?.rows.length === nT + nTh + nRt}`, "TRN-01.png");

  // TRN-02
  const names = async (sec) => (await page.locator("[data-testid=settings-content] section").nth(sec).locator("[data-part=row]").allInnerTexts()).map((r) => squash(r).replace(/(User interface|Menu|Filters|Template|Thesaurus|Relationship type).*$/, "").trim());
  const asc = (a) => JSON.stringify(a) === JSON.stringify([...a].sort((x, y) => x.localeCompare(y)));
  const c0 = await names(1); const defaultAsc = asc(c0);
  const nameBtn = page.locator("[data-testid=settings-content] section").nth(1).locator("[role=columnheader] button[data-part=sort]").first();
  await nameBtn.click(); await page.waitForTimeout(250);
  const c1 = await names(1); const desc = JSON.stringify(c1) === JSON.stringify([...c0].reverse());
  const typeBtn = page.locator("[data-testid=settings-content] section").nth(1).locator("[role=columnheader] button[data-part=sort]").nth(1);
  await typeBtn.click(); await page.waitForTimeout(250);
  const typeRows = (await page.locator("[data-testid=settings-content] section").nth(1).locator("[data-part=row]").allInnerTexts()).map(squash);
  const types = typeRows.map((r) => (r.match(/(Template|Thesaurus|Relationship type)/) || [])[1]);
  const typeSorted = JSON.stringify(types) === JSON.stringify([...types].sort((x, y) => x.localeCompare(y)));
  const translateBtn = await S(page).getByRole("button", { name: /^Translate$/ }).count();
  const pills = await S(page).locator("[data-part=row] span.rounded-md").evaluateAll((e) => e.map((x) => ({ t: x.innerText.trim(), cls: x.className.replace(/\s+/g, " ") })).filter((x) => /^(User interface|Menu|Filters|Template|Thesaurus|Relationship type|Uwazi UI)$/.test(x.t)));
  const clsSet = [...new Set(pills.map((p) => p.cls))];
  const uwazi = pills.some((p) => /Uwazi UI/.test(p.t));
  await page.locator("[data-testid=settings-content] section").nth(0).locator("[data-part=row]").first().click(); await page.waitForTimeout(500);
  const opened = await page.locator("[data-component=TranslationEditor]").count();
  await shot(page, "TRN-02");
  rec("TRN-02", defaultAsc && desc && typeSorted && !translateBtn && !uwazi && clsSet.length === 1 && opened === 1 ? "PASS" : "FAIL",
    `Content group default order ascending=${defaultAsc}; Name header click reverses=${desc}; Type header click sorts=${typeSorted} (${JSON.stringify([...new Set(types)])}); separate "Translate" buttons=${translateBtn}; pills ${JSON.stringify([...new Set(pills.map((p) => p.t))])} ("Uwazi UI" shown=${uwazi}); distinct pill classes=${clsSet.length}; row click opens editor=${opened === 1}`, "TRN-02.png");
  rec("trn1-console", "INFO", JSON.stringify(realErr(errors)).slice(0, 400));
  await page.context().close();
}
save(); await b.close();
