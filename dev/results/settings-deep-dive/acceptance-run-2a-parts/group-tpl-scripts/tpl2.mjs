import { watch, launch, open, S, rows, wait, shot, init, rec, realErrors, names, rowsData, goLibrary, toSettingsItem, axe, notifTitles, addTemplate, openRow, addRelProp, activityRows, beaconTexts, tooltipText, tickRow, devArm, devReturn, libTypeFacet, DIR } from "./common.mjs";
init("tpl2");
const b = await launch();
const badgeCount = (p) => S(p).locator("[data-column=name]").evaluateAll((e) => e.filter((x) => /Default/.test(x.innerText)).length);
const starStates = (p) => S(p).locator("[role=row]").evaluateAll((rs) => rs.filter((r) => r.querySelector("[data-column=name] .font-medium")).map((r) => [r.querySelector("[data-column=name] .font-medium").textContent.trim(), r.querySelector("button[aria-label='Set as default']").disabled]));
const defaultName = async (p) => (await rowsData(p)).find((r) => r.def)?.name;

// ---------- Defaults: TPL-10, X-01, X-04, X-09
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const before = await beaconTexts(page);
  await S(page).locator("[role=row]").filter({ hasText: "Hearing" }).first().locator("button[aria-label='Set as default']").click();
  await wait(page, 60);
  const sync = { badge: await defaultName(page), stars: await starStates(page) };
  await wait(page, 500);
  const after = await beaconTexts(page);
  const newN = after.filter((t) => !before.includes(t) && !/Running/.test(t));
  const s = await shot(page, "TPL-10");
  const act = await activityRows(page);
  await toSettingsItem(page, "Templates");
  const persistNav = await defaultName(page);
  await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const persistReload = await defaultName(page);
  const docStar = (await starStates(page)).find((x) => x[0] === "Document")[1];
  const hearStar = (await starStates(page)).find((x) => x[0] === "Hearing")[1];
  const hit = act.find((r) => /Set default template/.test(r));
  const beaconOk = newN.some((t) => /Default template set successfully\./.test(t));
  rec("TPL-10", sync.badge === "Hearing" && beaconOk && hit && /Hearing/.test(hit) && persistReload === "Hearing" && !docStar && hearStar ? "PASS" : "FAIL", `60ms after click default badge on "${sync.badge}"; Hearing star disabled=${hearStar}, Document star disabled=${docStar}; new Beacon entries ${JSON.stringify(newN)}; Activity log top rows ${JSON.stringify(act.slice(0, 2))}; after rail nav default=${persistNav}, after reload default=${persistReload}`, s);
  rec("X-01", persistNav === "Hearing" && persistReload === "Hearing" ? "PASS" : "FAIL", `Set default to Hearing -> rail to Activity log and back: ${persistNav}; reload: ${persistReload}; Reset demo data checked below`, "TPL-10");
  rec("X-04", beaconOk && newN.length === 1 ? "PASS" : "FAIL", `success half: set default added exactly ${newN.length} Beacon entry ${JSON.stringify(newN)}; failure half in TPL-X04-fail`, "TPL-10");
  rec("X-09-default", hit && /admin/.test(hit) && /Hearing/.test(hit) ? "PASS" : "FAIL", `Activity log row ${JSON.stringify(hit)}`, "");
  // reset demo data
  await toSettingsItem(page, "Dashboard");
  await page.getByRole("button", { name: /Reset demo data/ }).first().click(); await wait(page, 400);
  const dlg = page.locator("[role=dialog]:not([inert] *)");
  if (await dlg.count()) { await dlg.getByRole("button", { name: /Reset/ }).last().click(); await wait(page, 800); }
  await toSettingsItem(page, "Templates");
  const afterReset = await defaultName(page);
  rec("X-01-reset", afterReset === "Document" ? "PASS" : "FAIL", `after Reset demo data default=${afterReset} (seed default Document)`, "");
  await page.context().close();
}
// ---------- TPL-11
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const seq = [];
  for (const n of ["Person", "Right", "Country"]) {
    await S(page).locator("[role=row]").filter({ hasText: n }).first().locator("button[aria-label='Set as default']").click(); await wait(page, 300);
    const st = await starStates(page);
    seq.push(`${n}: badges ${await badgeCount(page)}, disabled stars ${st.filter((x) => x[1]).length} (${st.filter((x) => x[1]).map((x) => x[0])})`);
  }
  const okAll = seq.every((x) => /badges 1,/.test(x) && /disabled stars 1 /.test(x));
  rec("TPL-11", okAll ? "PASS" : "FAIL", seq.join("; "), await shot(page, "TPL-11"));
  await page.context().close();
}
// ---------- TPL-12 default -> New entity template
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const createdTemplate = async () => {
    await goLibrary(page);
    await page.getByRole("button", { name: /Create (entity|\w+)/ }).first().click(); await wait(page, 700);
    const t = await page.evaluate(() => { const l = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && /^Template\*?$/.test(e.textContent.trim())); const sel = l?.closest("div")?.parentElement; return sel ? sel.innerText.replace(/\s+/g, " ").slice(0, 120) : null; });
    return t;
  };
  await S(page).locator("[role=row]").filter({ hasText: "Hearing" }).first().locator("button[aria-label='Set as default']").click(); await wait(page, 300);
  const t1 = await createdTemplate(); await shot(page, "TPL-12");
  await toSettingsItem(page, "Templates");
  await S(page).locator("[role=row]").filter({ hasText: "Document" }).first().locator("button[aria-label='Set as default']").click(); await wait(page, 300);
  const t2 = await createdTemplate();
  rec("TPL-12", /Hearing/.test(t1 || "") && /Document/.test(t2 || "") ? "PASS" : "FAIL", `default Hearing: Create entity form template field reads ${JSON.stringify(t1)}; default back to Document: ${JSON.stringify(t2)}`, "TPL-12");
  await page.context().close();
}

// ---------- Delete flows
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  for (const n of ["QA Unused A", "QA Unused B", "QA Target", "QA Via"]) await addTemplate(page, n);
  mon.skip();
  const createdAct = (await activityRows(page)).slice(0, 5);
  await toSettingsItem(page, "Templates");
  const all = await names(page);
  rec("X-09-create", createdAct.some((r) => /Created template/.test(r) && /QA Via/.test(r)) ? "PASS" : "FAIL", `Activity log after four creations: ${JSON.stringify(createdAct)}`, "");
  const total0 = all.length;
  // TPL-14: reasons on keyboard focus
  const reasons = {};
  for (const n of ["Document", "Hearing", "QA Unused A"]) {
    const cb = S(page).locator(`input[aria-label="Select ${n}"]`);
    const aria = await cb.evaluate((e) => ({ ad: e.getAttribute("aria-disabled"), dis: e.disabled }));
    await page.mouse.move(0, 0);
    // keyboard focus: Tab from the previous row's checkbox
    await S(page).getByRole("textbox", { name: /Search templates/ }).focus();
    let reached = false;
    for (let i = 0; i < 60; i++) { await page.keyboard.press("Tab"); if (await cb.evaluate((e) => e === document.activeElement)) { reached = true; break; } }
    await wait(page, 350);
    reasons[n] = { aria, reached, tip: await tooltipText(page) };
  }
  await shot(page, "TPL-14");
  const d = reasons["Document"], h = reasons["Hearing"], u = reasons["QA Unused A"];
  const bothJoined = /A default template cannot be deleted\./.test(d.tip) && /This template is in use by existing entities and cannot be deleted\./.test(d.tip);
  rec("TPL-14", d.reached && h.reached && u.reached && bothJoined && /This template is in use by existing entities and cannot be deleted\./.test(h.tip) && !/cannot be deleted/.test(u.tip) && u.aria.ad !== "true" ? "PASS" : "FAIL", `keyboard focus on Select Document: reached=${d.reached} tooltip ${JSON.stringify(d.tip)}; Hearing: reached=${h.reached} ${JSON.stringify(h.tip)}; QA Unused A (0 entities, not default): reached=${u.reached} aria-disabled=${u.aria.ad} tooltip ${JSON.stringify(u.tip)}`, "TPL-14");
  // TPL-21
  rec("TPL-21", /A default template cannot be deleted\./.test(d.tip) && /Set another template as the default first/.test(d.tip) ? "PASS" : "FAIL", `reason on the default row (keyboard focus): ${JSON.stringify(d.tip)}; way forward text "Set another template as the default first." ${/Set another template as the default first/.test(d.tip)}`, "TPL-14");
  // TPL-22: reason names the rule and entity count; way forward opens Change template dialog
  const hearTip = h.tip;
  const hasCount = /48 entities use it/.test(hearTip);
  const hearCb = S(page).locator('input[aria-label="Select Hearing"]');
  await hearCb.focus(); await wait(page, 300);
  const tipLinks = await page.evaluate(() => [...document.querySelectorAll("[role=tooltip] button, [role=tooltip] a")].map((e) => e.innerText));
  await hearCb.click({ force: true }); await wait(page, 400);
  const dl = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.slice(0, 120)));
  await shot(page, "TPL-22");
  rec("TPL-22", hasCount && (tipLinks.length > 0 || dl.length > 0) ? "PASS" : "FAIL", `reason on Hearing: ${JSON.stringify(hearTip)} (names the rule and "48 entities use it": ${hasCount}); interactive way forward in the tooltip: ${JSON.stringify(tipLinks)}; after clicking the disabled checkbox dialogs: ${JSON.stringify(dl)}; no Change template dialog is offered`, "TPL-22");
  // TPL-15 select all
  await page.keyboard.press("Escape");
  const headCb = S(page).locator('input[aria-label="Select all"]');
  await headCb.check(); await wait(page, 200);
  const ticked1 = await S(page).locator('input[aria-label^="Select "][type=checkbox]:checked').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  await S(page).locator('input[aria-label="Select QA Via"]').uncheck(); await wait(page, 200);
  const indet = await headCb.evaluate((e) => ({ indeterminate: e.indeterminate, checked: e.checked, aria: e.getAttribute("aria-checked") }));
  await shot(page, "TPL-15");
  const want = ["Select QA Target", "Select QA Unused A", "Select QA Unused B", "Select QA Via"];
  const tickedRows = ticked1.filter((x) => x !== "Select all");
  rec("TPL-15", JSON.stringify([...tickedRows].sort()) === JSON.stringify(want) && indet.indeterminate ? "PASS" : "FAIL", `after Select all ticked: ${JSON.stringify(tickedRows)} (enabled rows only: ${JSON.stringify(want)}); after unticking QA Via header ${JSON.stringify(indet)}`, "TPL-15");
  // TPL-16 footer
  for (const n of ["QA Target", "QA Via", "QA Unused A", "QA Unused B"]) { const c = S(page).locator(`input[aria-label="Select ${n}"]`); if (await c.isChecked()) await c.uncheck(); }
  await wait(page, 150);
  const footer = S(page).locator('[data-part=footer], footer').last();
  const fh = async () => page.evaluate(() => { const bar = [...document.querySelectorAll("[data-testid=settings-content] *")].find((e) => e.textContent.trim() === "Add template" && e.tagName === "BUTTON"); const f = (bar || document.querySelector("[data-component=SettingsSelectionBar]"))?.closest("[data-part=footer],footer,div"); return null; });
  const barInfo = async () => page.evaluate(() => { const f = document.querySelector("[data-testid=settings-content] footer[data-part=footer]"); const c = getComputedStyle(f); const slot = [...f.querySelectorAll("*")].find((e) => /^Selected \d+ of \d+$/.test(e.textContent.trim()) && e.childElementCount === 0); const btns = [...f.querySelectorAll("button")]; return { footerH: Math.round(f.getBoundingClientRect().height), borderTop: c.borderTopWidth, borderBottom: c.borderBottomWidth, bg: c.backgroundColor, slot: slot ? slot.textContent.trim() : null, slotW: slot ? Math.round(slot.getBoundingClientRect().width) : null, lead: btns.some((e) => e.textContent.trim() === "Add template"), buttons: btns.map((e) => e.textContent.trim()), delColor: btns.filter((e) => e.textContent.trim() === "Delete").map((e) => getComputedStyle(e).color) }; });
  const none = await barInfo();
  await tickRow(page, "QA Unused A"); const one = await barInfo();
  await tickRow(page, "QA Unused B"); const two = await barInfo();
  await shot(page, "TPL-16");
  const N = total0;
  await S(page).getByRole("button", { name: /Clear/ }).first().click().catch(() => {}); await wait(page, 200);
  const cleared = await barInfo();
  rec("TPL-16", two.slot === `Selected 2 of ${N}` && !two.lead && two.delColor.length === 1 && none.footerH === two.footerH && none.bg === two.bg && none.borderTop === two.borderTop && cleared.lead ? "PASS" : "FAIL", `none ${JSON.stringify(none)}; 1 ticked ${JSON.stringify(one)}; 2 ticked ${JSON.stringify(two)} (expected "Selected 2 of ${N}"); the page footer keeps its one 1px top rule in every state, the selection adds no tint or border; after Clear ${JSON.stringify(cleared)}`, "TPL-16");
  rec("X-12", one.slotW === two.slotW && one.slotW > 0 && two.borderTop === none.borderTop && two.footerH === none.footerH && cleared.lead ? "PASS" : "FAIL", `selection slot width with 1 ticked ${one.slotW}px, 2 ticked ${two.slotW}px (fixed); footer height ${none.footerH} -> ${one.footerH} -> ${two.footerH}; bg ${none.bg} -> ${two.bg}; top border ${none.borderTop} -> ${two.borderTop}; lead action restored after clear: ${cleared.lead}`, "TPL-16");
  await page.context().close();
}
await b.close();
