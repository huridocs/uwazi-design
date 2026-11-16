import { launch, open, S, shot, rail, axe } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, goto, openCtx, cell, saveEd, beacon, newBeacon, activity, installLang, contrastOf } from "./u.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { arm, emptyDomain } from "./dev.mjs";
const { rec, save } = mk("trn4");
const b = await launch();
const nRows = (p) => S(p).locator("[data-part=row]").count();
const dlgs = (p) => p.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.replace(/\s+/g, " ").trim()));
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();

// ---------- TRN-18
{
  const { page } = await open(b, "translations");
  await openCtx(page, "Cites");
  for (const l of ["Spanish", "French", "Arabic"]) await cell(page, "Cites", l).fill(`${l} Cites`);
  await saveEd(page);
  await S(page).getByRole("checkbox", { name: /Untranslated/ }).first().check(); await page.waitForTimeout(300);
  const t = squash(await S(page).innerText());
  const msg = /There are no untranslated terms/.test(t);
  const blank = (await nRows(page)) === 0;
  await shot(page, "TRN-18");
  // a context without keys: Menu emptied removes the context; try to find any context with 0 keys
  await page.locator("[data-component=TranslationEditor]").getByRole("button", { name: /Translations/ }).first().click(); await page.waitForTimeout(400);
  const zeroKeys = (await S(page).locator("[data-part=row]").allInnerTexts()).map(squash).filter((r) => /\b0 ES|Keys 0|\s0\s+(ES|es)/.test(r) && !/%/.test(r.split(" ").slice(-3).join("")));
  rec("TRN-18", msg ? "PASS" : "FAIL", `Cites (1 key) translated in es, fr, ar and saved; "Untranslated only" on shows "There are no untranslated terms"=${msg} (rows ${await Promise.resolve(blank ? 0 : "?")}, not a blank area). The second half (a context with no keys) is not reachable: contexts are built from keys, so a template, thesaurus or relationship type always has at least its name key and Menu/Filters vanish at zero links; the "This context has no keys" empty state exists in code but no seed or Dev panel action reaches it`, "TRN-18.png");
  await page.context().close();
}

// ---------- TRN-19
{
  const { page } = await open(b, "translations");
  await openCtx(page, "User Interface");
  const top = await nRows(page);
  const tot = squash(await S(page).innerText()).match(/of (\d+)/)?.[1];
  const sentinelTxt = await page.locator("[data-part=more]").innerText();
  const domAll = await page.evaluate(() => document.querySelectorAll("[data-testid=settings-content] [data-part=row]").length);
  // scroll to end progressively
  const counts = [top];
  for (let i = 0; i < 12; i++) { await page.evaluate(() => { const m = document.querySelector("[data-part=more]"); if (m) m.scrollIntoView(); }); await page.waitForTimeout(250); counts.push(await nRows(page)); }
  const end = await nRows(page);
  const lastKey = (await S(page).locator("[data-part=row] td:first-child").last().innerText()).trim();
  // search off-screen key
  await page.evaluate(() => document.querySelector("[data-testid=settings-content]")?.scrollTo(0, 0));
  await goto(page, "Translations"); await openCtx(page, "User Interface");
  const top2 = await nRows(page);
  const sb = S(page).locator('input[placeholder^="Search keys"]').first();
  await sb.fill("Done extracting files"); await page.waitForTimeout(500);
  const found = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  await shot(page, "TRN-19");
  rec("TRN-19", top < 100 && end === Number(tot) && found.includes("Done extracting files") && /Showing \d+ of \d+ keys/.test(sentinelTxt) ? "PASS" : "FAIL", `context lists ${tot} keys; rows in the DOM at the top=${top} ("${sentinelTxt.trim()}"); scrolling to the end adds rows in steps ${JSON.stringify([...new Set(counts)])} to ${end}; last key "${lastKey}"; reopened (top rows ${top2}) and searched "Done extracting files" (an off-screen key, index ~400) -> ${JSON.stringify(found)}`, "TRN-19.png");
  await page.context().close();
}

// ---------- TRN-20, X-06
{
  const { page, errors } = await open(b, "translations", "mobile");
  const cb = page.getByRole("button", { name: "Translate Person" }); await cb.scrollIntoViewIfNeeded(); const cardBox = await cb.boundingBox(); await page.touchscreen.tap(cardBox.x + 40, cardBox.y + 16); await page.waitForTimeout(800);
  await shot(page, "TRN-20");
  const hs = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, pane: (() => { const e = document.querySelector("[data-testid=settings-content]"); return e ? [e.scrollWidth, e.clientWidth] : null; })() }));
  const rows = await S(page).locator("[data-part=row]").count();
  const first = await S(page).locator("[data-part=row]").first().evaluate((r) => ({ inputs: r.querySelectorAll("input").length, txt: r.innerText.replace(/\s+/g, " ").trim(), w: Math.round(r.getBoundingClientRect().width), dots: r.querySelectorAll("span.rounded-full, span[class*=rounded-md]").length }));
  const inpBox = await S(page).locator("[data-part=row]").first().locator("input").first().boundingBox();
  const lbls = await S(page).locator("[data-part=row]").first().locator("input").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  // stacked language rows: inputs have distinct y
  const ys = await S(page).locator("[data-part=row]").first().locator("input").evaluateAll((e) => e.map((x) => Math.round(x.getBoundingClientRect().top)));
  const stacked = new Set(ys).size === ys.length;
  await S(page).locator("[data-part=row]").first().locator("input").first().tap(); await page.keyboard.type(" movil"); await page.waitForTimeout(200);
  const val = await S(page).locator("[data-part=row]").first().locator("input").first().inputValue();
  const saveBtn = page.getByRole("button", { name: "Save", exact: true }); const cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });
  const sbb = await saveBtn.boundingBox(), cbb = await cancelBtn.boundingBox();
  const sEn = await saveBtn.isEnabled();
  await saveBtn.tap(); await page.waitForTimeout(500);
  const sDis = await saveBtn.isDisabled();
  await shot(page, "TRN-20-after");
  const inV = (bb) => bb && bb.x >= 0 && bb.x + bb.width <= 391 && bb.y >= 0 && bb.y + bb.height <= 845;
  rec("TRN-20", rows === 9 && stacked && first.inputs === 3 && hs.doc <= hs.win && inV(sbb) && inV(cbb) && sEn && sDis && /movil/.test(val) ? "PASS" : "FAIL", `phone: ${rows} cards for 9 keys; first card text "${first.txt}", inputs=${first.inputs} stacked vertically=${stacked} (y ${JSON.stringify(ys)}), card width ${first.w}px, labels ${JSON.stringify(lbls)}; no horizontal overflow doc ${hs.doc}/${hs.win} pane ${JSON.stringify(hs.pane)}; typed by touch "${val}"; Save at ${JSON.stringify(sbb)} Cancel at ${JSON.stringify(cbb)}; Save enabled then disabled after tap=${sEn}/${sDis}`, "TRN-20.png");
  rec("X-06", rows === 9 && stacked && hs.doc <= hs.win && inV(sbb) && inV(cbb) ? "PASS" : "FAIL", `Translations at 390x844 with touch: list is cards (see TRN-20 shot), editor is single column of cards, no horizontal scroll (doc ${hs.doc}/${hs.win}), Save and Cancel reachable by tap`, "TRN-20.png");
  rec("trn4-console-m", "INFO", JSON.stringify(realErr(errors)).slice(0, 400));
  await page.context().close();
}
save(); await b.close();
