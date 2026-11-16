import { launch, open, S, shot, axe } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash } from "./u.mjs";
const lngRows = async (p) => (await p.locator("[data-testid=settings-content] ul li, [data-testid=settings-content] [data-part=row]").allInnerTexts()).map(squash).filter((r) => /\([a-z]{2}\)/.test(r));
const { rec, save } = mk("lng6");
const b = await launch();
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();
const hscroll = (p) => p.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, pane: (() => { const e = document.querySelector("[data-testid=settings-content]"); return e ? [e.scrollWidth, e.clientWidth] : null; })() }));
const box = async (loc) => { const bb = await loc.boundingBox(); return bb && { x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) }; };
const inView = (bb) => bb && bb.x >= -1 && bb.x + bb.w <= 391 && bb.y >= -1 && bb.y + bb.h <= 845;
{
  const { page, errors } = await open(b, "languages", "mobile");
  const rs = await lngRows(page);
  const hs = await hscroll(page);
  await shot(page, "LNG-19-list");
  const menuBtns = await S(page).getByRole("button", { name: /^Actions for/ }).count();
  const btnBoxes = []; for (const n of ["English", "Spanish", "French", "Arabic"]) btnBoxes.push(await box(page.getByRole("button", { name: `Actions for ${n}` })));
  const lead = await box(S(page).getByRole("button", { name: "Install Language(s)" }));
  // row menu by touch
  await page.getByRole("button", { name: "Actions for Spanish" }).tap(); await page.waitForTimeout(500);
  const items = await page.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].map((e) => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const menuEl = await page.evaluate(() => { const m = document.querySelector("[role=menu]"); if (!m) return null; const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), sheet: !!m.closest("[data-component=MobileBottomSheet],[data-component=BottomSheet]") }; });
  await shot(page, "LNG-19-menu");
  const resetItem = page.getByRole("menuitem", { name: "Reset", exact: true });
  await resetItem.tap(); await page.waitForTimeout(500);
  const rd = await box(D(page)); const rdBtns = []; for (const n of ["No, cancel", "Reset"]) rdBtns.push({ n, bb: await box(D(page).getByRole("button", { name: n, exact: true })) });
  await shot(page, "LNG-19-reset");
  await D(page).locator("input").first().tap(); await page.keyboard.type("CONFIRM"); await page.waitForTimeout(200);
  const resetEn = await D(page).locator("[data-part=confirm]").isEnabled();
  await D(page).locator("[data-part=cancel]").tap(); await page.waitForTimeout(400);
  // install modal
  await S(page).getByRole("button", { name: "Install Language(s)" }).tap(); await page.waitForTimeout(500);
  const im = await box(D(page));
  await shot(page, "LNG-19-install");
  await D(page).locator("[data-part=language]").filter({ hasText: "German" }).first().tap(); await page.waitForTimeout(200);
  const instBtn = D(page).locator("[data-part=confirm]"); const ibb = await box(instBtn); const iTxt = await instBtn.innerText();
  await instBtn.tap(); await page.waitForTimeout(500);
  const afterRows = await lngRows(page);
  // uninstall dialog on German (installing -> disabled), wait then act
  await page.waitForTimeout(3600);
  await page.getByRole("button", { name: "Actions for German" }).tap(); await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: "Uninstall", exact: true }).tap(); await page.waitForTimeout(500);
  const ud = await box(D(page)); const udBtns = []; for (const n of ["No, cancel", "Uninstall"]) udBtns.push({ n, bb: await box(D(page).getByRole("button", { name: n, exact: true })) });
  await shot(page, "LNG-19-uninstall");
  const hs2 = await hscroll(page);
  const menuSheet = !!(menuEl && (menuEl.sheet || menuEl.w >= 380));
  const ok06 = rs.length === 4 && rs.every((r) => /\([a-z]{2}\)/.test(r)) && rs.some((r) => /Default/.test(r)) && menuBtns === 4 && btnBoxes.every(inView) && hs.doc <= hs.win && hs2.doc <= hs2.win && items.length === 3 && items.every((i) => i.x >= 0 && i.x + i.w <= 391 && i.y + i.h <= 845) && inView(rd) && rdBtns.every((x) => inView(x.bb)) && resetEn && inView(im) && inView(ibb) && /Install \(1\)/.test(iTxt) && afterRows.some((r) => /German.*Installing/.test(r)) && inView(ud) && udBtns.every((x) => inView(x.bb));
  const ok = ok06 && menuSheet;
  rec("LNG-19", ok ? "PASS" : "FAIL", `rows ${JSON.stringify(rs)}; row-menu buttons=${menuBtns}, boxes ${JSON.stringify(btnBoxes)}; lead button ${JSON.stringify(lead)}; horizontal overflow doc ${hs.doc}/${hs.win} pane ${JSON.stringify(hs.pane)}; tapped menu items ${JSON.stringify(items)} (menu box ${JSON.stringify(menuEl)}: an anchored popover ${menuEl && menuEl.w}px wide, items ${items[0] && items[0].h}px tall, not a sheet=${!menuSheet}); Reset dialog box ${JSON.stringify(rd)} buttons ${JSON.stringify(rdBtns)} typed CONFIRM by touch -> Reset enabled=${resetEn}; install modal box ${JSON.stringify(im)}, Install button "${iTxt}" ${JSON.stringify(ibb)}; install by tap -> German row "${afterRows.find((r) => /German/.test(r))}"; Uninstall dialog box ${JSON.stringify(ud)} buttons ${JSON.stringify(udBtns)}; overflow after dialogs doc ${hs2.doc}/${hs2.win}`, "LNG-19-reset.png");
  rec("lng6-console", "INFO", JSON.stringify(realErr(errors)).slice(0, 500));
  // X-06 on the Translations editor is done in the TRN script; this row covers the Languages page
  rec("X-06", ok06 ? "PASS" : "FAIL", `Languages page at 390x844 with touch: no horizontal scroll (doc ${hs.doc}/${hs.win}); rows list name/key/Default with a row menu; every action reached by tap (menu, install modal, Reset and Uninstall dialogs, row install)`, "LNG-19-list.png");
  await page.context().close();
}
save(); await b.close();
