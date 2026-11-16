// TED-33, 108, 109 (phone 390x844, touch) and the phone half of X-02 / X-06
import { launch, open, openEditorPhone, openPhone, S, rec, wait, strip, shot, openEditor, saveBtn, propRows, propNames, dlg, openAdd, guardFor, ONLY, dialogs, errs, rail } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const scrollers = (p) => p.evaluate(() => [...document.querySelectorAll("*")].filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 100; }).map(e => ({ tag: e.tagName + (e.getAttribute("data-testid") ? "[" + e.getAttribute("data-testid") + "]" : e.getAttribute("data-component") ? "[" + e.getAttribute("data-component") + "]" : ""), top: e.scrollTop })));
const vp = (p) => p.evaluate(() => ({ w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth, sy: scrollY, bodyOverflow: getComputedStyle(document.body).overflow }));

await guard("TED-33", async () => {
  const em = await openEditor(b, "Court Case", "mobile"); const ep = em.page;
  await S(ep).getByRole("button", { name: "Add property" }).tap(); await wait(ep, 600);
  const emul = await ep.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog][data-part=panel]")].find(x => !x.closest("[inert]")); const r = d.getBoundingClientRect(); return { kb: getComputedStyle(document.documentElement).getPropertyValue("--kb").trim(), innerH: innerHeight, vvH: visualViewport.height, rect: [Math.round(r.y), Math.round(r.height)] }; });
  await shot(ep, "TED-33-isMobile-emulation"); await em.ctx.close();
  const c = await openEditorPhone(b, "Court Case"); const p = c.page;
  const v = await vp(p);
  await S(p).getByRole("button", { name: "Add property" }).tap(); await wait(p, 600);
  const d = dlg(p);
  const r = await d.boundingBox();
  const closeBtn = d.getByRole("button", { name: "Close" });
  const cb = await closeBtn.boundingBox();
  const foot = await d.getByRole("button", { name: /^(Cancel|Add property)$/ }).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; }));
  const before = await scrollers(p);
  await p.mouse.move(195, 40); await p.mouse.wheel(0, 500); await wait(p, 300);
  const after = await scrollers(p);
  const sy = await vp(p);
  const lockOk = JSON.stringify(before.filter(s => !/dialog|panel/i.test(s.tag))) === JSON.stringify(after.filter(s => !/dialog|panel/i.test(s.tag)));
  await shot(p, "TED-33-add");
  await d.getByRole("button", { name: "Cancel" }).tap(); await wait(p, 500);
  const back = (await S(p).locator("#template-name-input").count()) === 1 && (await p.locator("[role=dialog][data-part=panel]:not([inert])").count()) === 0;
  await S(p).getByRole("button", { name: "Edit Case number", exact: true }).tap(); await wait(p, 600);
  const r2 = await dlg(p).boundingBox();
  const cb2 = await dlg(p).getByRole("button", { name: "Close" }).count();
  await shot(p, "TED-33-edit");
  await dlg(p).getByRole("button", { name: "Cancel" }).tap(); await wait(p, 400);
  const full = r.width >= v.w - 1 && r.height >= v.h - 40;
  const full2 = r2.width >= v.w - 1 && r2.height >= v.h - 40;
  const footOk = foot.length === 2 && foot.every(f => f.bottom <= v.h && f.top >= 0 && f.r <= v.w);
  rec("TED-33", full && full2 && cb && cb.y >= 0 && cb.y < 80 && footOk && lockOk && back ? "PASS" : "FAIL", `With Chromium isMobile emulation (the harness open(...,"mobile")) the panel measures y/height ${JSON.stringify(emul.rect)} because --kb is stuck at ${emul.kb} while innerHeight ${emul.innerH} equals visualViewport.height ${emul.vvH} (useKeyboardInset ran during load and never ran again), so no dialog on a phone is visible in that mode (the Dashboard Reset demo data confirm collapses the same way); screenshot TED-33-isMobile-emulation. Re-run in a 390x844 touch viewport without isMobile: Phone ${v.w}x${v.h}. Tap Add property: panel ${Math.round(r.width)}x${Math.round(r.height)} at (${Math.round(r.x)},${Math.round(r.y)}) (full screen=${full}); Close control at y=${cb && Math.round(cb.y)}; footer buttons ${JSON.stringify(foot)}. Wheel scroll at the page behind: scrollers before ${JSON.stringify(before.map(s => s.top))} after ${JSON.stringify(after.map(s => s.top))} (unchanged=${lockOk}), window scrollY ${sy.sy}. Cancel returns to the editor=${back}. Tapping the Case number row opens "${Math.round(r2.width)}x${Math.round(r2.height)}" panel (full screen=${full2}), Close buttons ${cb2}.`, "TED-33-add");
  await c.ctx.close();
});

await guard("TED-108", async () => {
  const c = await openEditorPhone(b, "Court Case"); const p = c.page;
  const v = await vp(p);
  const info = await p.evaluate(() => {
    const pane = document.querySelector("[data-testid=settings-content]");
    const rows = [...pane.querySelectorAll("[data-part=property]")];
    const rowInfo = rows.slice(0, 8).map(r => { const name = r.querySelector("button[aria-label^='Edit ']"); const nr = name.getBoundingClientRect(); return { name: name.innerText.trim(), truncated: name.scrollWidth > name.clientWidth + 1 || [...name.querySelectorAll("*")].some(x => x.scrollWidth > x.clientWidth + 1), left: Math.round(nr.left), right: Math.round(nr.right), lock: !!r.querySelector("svg.lucide-lock"), svgs: r.querySelectorAll("svg").length, text: r.innerText.replace(/\s+/g, " ").trim() }; });
    const allTrunc = rows.filter(r => { const n = r.querySelector("button[aria-label^='Edit ']"); return n.scrollWidth > n.clientWidth + 1; }).length;
    const overflowX = [...pane.querySelectorAll("*")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).length;
    return { rowInfo, allTrunc, total: rows.length, paneScrollW: pane.scrollWidth, paneClientW: pane.clientWidth, docScrollW: document.documentElement.scrollWidth, overflowX };
  });
  const foot = await S(p).locator("footer").getByRole("button", { name: /^(Cancel|Save)$/ }).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const row = await propRows(p).nth(3).evaluate(r => r.innerHTML.slice(0, 1500));
  await shot(p, "TED-108");
  await propRows(p).nth(8).scrollIntoViewIfNeeded(); await shot(p, "TED-108-b");
  const commonLocks = info.rowInfo.slice(0, 3).every(r => r.lock);
  const okNoScroll = info.docScrollW <= v.w && info.paneScrollW <= info.paneClientW + 1;
  rec("TED-108", okNoScroll && info.allTrunc === 0 && commonLocks && foot.length === 2 && foot.every(f => f.h >= 28 && f.bottom <= v.h) ? "PASS" : "FAIL", `Phone Court Case editor: first rows ${JSON.stringify(info.rowInfo.slice(0, 5).map(r => ({ n: r.name, lock: r.lock, svgs: r.svgs, text: r.text.slice(0, 50) })))}; names truncated ${info.allTrunc}/${info.total}; pane scrollWidth ${info.paneScrollW} vs clientWidth ${info.paneClientW}, document scrollWidth ${info.docScrollW}, elements past the right edge ${info.overflowX}; common rows keep lock=${commonLocks}; footer ${JSON.stringify(foot)}.`, "TED-108");
  await c.ctx.close();
});

await guard("TED-109", async () => {
  const c = await openEditorPhone(b, "Court Case"); const p = c.page;
  await S(p).locator("#template-name-input").fill("Court Case draft");
  await S(p).getByRole("button", { name: "Add thesaurus" }).tap(); await wait(p, 600);
  const d = dlg(p); const r = await d.boundingBox(); const v = await vp(p);
  const act = await d.getByRole("button").allInnerTexts();
  await shot(p, "TED-109-sheet");
  await d.getByRole("button", { name: "Cancel" }).tap(); await wait(p, 500);
  const closed = (await p.locator("[role=dialog][data-part=panel]:not([inert])").count()) === 0;
  const stillDraft = (await S(p).locator("#template-name-input").inputValue()) === "Court Case draft";
  await S(p).getByRole("button", { name: "Back", exact: true }).tap(); await wait(p, 600);
  const dl = await dialogs(p);
  const dr = await p.locator("[data-component=ConfirmDialog] [role=dialog],[role=alertdialog],[role=dialog]:not([data-part=panel])").first().boundingBox().catch(() => null);
  const txt = strip(await p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").first().innerText().catch(() => ""));
  await shot(p, "TED-109-discard");
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }).tap().catch(() => {}); await wait(p, 400);
  const keep = (await S(p).locator("#template-name-input").inputValue().catch(() => "")) === "Court Case draft";
  // Add relationship type as the second dialog
  await S(p).getByRole("button", { name: "Add relationship type" }).tap(); await wait(p, 500);
  const r2 = await dlg(p).boundingBox();
  await dlg(p).getByRole("button", { name: "Cancel" }).tap(); await wait(p, 400);
  const fullS = r.width >= v.w - 1 && (r.y + r.height) >= v.h - 4;
  rec("TED-109", fullS && closed && stillDraft && dl.some(x => /Discard changes/.test(x)) && keep ? "PASS" : "FAIL", `Phone, name changed to a draft. "Add thesaurus" opens ${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.y)} of ${v.h} (buttons ${JSON.stringify(act.map(strip))}); Cancel closes it=${closed}, draft kept=${stillDraft}. Tapping the Back chevron opens ${JSON.stringify(dl)} (${dr ? Math.round(dr.width) + "x" + Math.round(dr.height) : "no box"}): "${txt.slice(0, 160)}"; its Cancel keeps the draft=${keep}. "Add relationship type" opens ${Math.round(r2.width)}x${Math.round(r2.height)}.`, "TED-109-discard");
  await c.ctx.close();
});
await b.close();
