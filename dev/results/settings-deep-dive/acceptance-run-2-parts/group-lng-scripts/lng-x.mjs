// LNG-19 (phone) and X checks for Languages: X-01, X-04, X-06, X-07, X-08, X-09, X-13 (+ N/A rows)
import { openPhone, launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch, notifTitles, logEntries, axeSerious, contrast, dark, light, hasHScroll, backToSettings, logo } from "./u.mjs";
const { rec, save } = recorder("./lng-x.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|React does not recognize the `%s` prop/.test(e));
const names = (p) => S(p).locator("[role=row], [data-part=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));
const D = (p) => p.locator("[data-component=InstallLanguagesModal]");
const pickMenu = async (p, name, label) => { await S(p).getByRole("button", { name: `Actions for ${name}` }).click(); await p.waitForTimeout(250); await p.locator("[role=menu] button, [role=menuitem]").filter({ hasText: new RegExp(`^${label}$`) }).first().click(); await p.waitForTimeout(400); };
const install = async (p, labels) => { await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await p.waitForTimeout(300); for (const l of labels) await D(p).locator("[data-part=language]").filter({ hasText: l }).click(); await D(p).locator("[data-part=confirm]").click(); };
const typedConfirm = async (p) => { const T = p.locator("[data-component=TypedConfirmModal]"); await T.getByRole("textbox").fill("CONFIRM"); await T.locator("[data-part=confirm]").click(); await p.waitForTimeout(500); };

// ---- X-01 persistence ----
{
  const { page: p, errors } = await open(b, "languages");
  await install(p, ["Korean (ko)"]); await p.waitForTimeout(4200);
  await pickMenu(p, "Spanish", "Make default");
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Make default" }).click(); await p.waitForTimeout(400);
  const r0 = await names(p);
  await section(p, "Collection"); await section(p, "Languages");
  const r1 = await names(p);
  await p.reload(); await p.waitForTimeout(1500);
  const r2 = await names(p);
  // reset demo data
  await section(p, "Dashboard"); await p.waitForTimeout(400);
  await S(p).getByRole("button", { name: /Reset demo data/ }).click(); await p.waitForTimeout(400);
  const dlg = p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").first();
  const btns = await dlg.getByRole("button").allInnerTexts();
  await dlg.getByRole("button", { name: /Reset/ }).last().click(); await p.waitForTimeout(800);
  await section(p, "Languages");
  const r3 = await names(p);
  const s = await sh(p, "X-01-LNG");
  const has = (r) => r.some(x => /Korean/.test(x)) && r.some(x => /Spanish.*Default/.test(x));
  const ok = has(r0) && has(r1) && has(r2) && !r3.some(x => /Korean/.test(x)) && r3.some(x => /English.*Default/.test(x));
  rec("X-01", ok ? "PASS" : "FAIL", `installed Korean + made Spanish default: ${JSON.stringify(r0)}; after rail to Collection and back: ${has(r1)}; after reload: ${has(r2)}; Reset demo data dialog buttons ${JSON.stringify(btns)}; after reset Korean gone and English default=${!r3.some(x => /Korean/.test(x)) && r3.some(x => /English.*Default/.test(x))} (${JSON.stringify(r3)})`, ok ? "" : s);
  rec("_errs-X1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-04 + X-09 ----
{
  const { page: p, errors } = await open(b, "languages");
  await install(p, ["Korean (ko)"]); await p.waitForTimeout(4300);
  await pickMenu(p, "Korean", "Make default");
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Make default" }).click(); await p.waitForTimeout(400);
  await pickMenu(p, "Spanish", "Reset"); await typedConfirm(p);
  await pickMenu(p, "French", "Uninstall"); await typedConfirm(p);
  let un = [];
  for (let i = 0; i < 12 && !un.length; i++) { await p.waitForTimeout(500); un = await notifMatch(p, /Language uninstalled successfully/); }
  const ins = await notifMatch(p, /Languages installed successfully/);
  const def = await notifMatch(p, /Default language change success/);
  const rst = await notifMatch(p, /Language reset success/);
  const s = await sh(p, "X-04-LNG");
  const okSuccess = ins.length === 1 && def.length === 1 && rst.length === 1 && un.length === 1;
  rec("X-04", "FAIL", `success half: install "Languages installed successfully" x${ins.length}, make default "Default language change success" x${def.length}, reset "Language reset success" x${rst.length}, uninstall "Language uninstalled successfully" x${un.length} -> ${okSuccess ? "one each" : "not one each"}. Failure half: Dev panel "Fail next request" (scopes Install or Uninstall, Save, Delete) armed for install, make default, reset and uninstall produced NO "An error occurred" entry and the action succeeded each time (see LNG-09, LNG-17); only the console hook window.__failNextLanguageInstall() fails an install.`, s);
  await section(p, "Activity log"); await p.waitForTimeout(600);
  const txt = (await S(p).innerText()).split("\n").map(t => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  const entries = txt.filter(t => /language/i.test(t) && /“/.test(t));
  const raw = await S(p).locator("tbody tr, [data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => /language/i.test(t)));
  const sa = await sh(p, "X-09-LNG");
  const need = [/Installed language “Korean”/, /default language/, /Reset language “Spanish”/, /Uninstalled language “French”/];
  const okAct = need.every(re => raw.some(t => re.test(t) && /admin/.test(t)));
  rec("X-09", okAct ? "PASS" : "FAIL", `Activity log rows with a user: ${JSON.stringify(raw)}`, okAct ? "" : sa);
  rec("_errs-X4", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-07 axe, dialogs, focus ----
{
  const { page: p, errors } = await open(b, "languages");
  const out = [];
  const pageAx = await axeSerious(p); out.push(`page=${JSON.stringify(pageAx)}`);
  const unique = await S(p).getByRole("button").evaluateAll(es => { const n = es.map(e => e.getAttribute("aria-label") || e.textContent.trim()); return { dup: n.filter((x, i) => n.indexOf(x) !== i) }; });
  out.push(`dup button names=${JSON.stringify(unique.dup)}`);
  const opener = S(p).getByRole("button", { name: "Install Language(s)" });
  // install modal
  await opener.click(); await p.waitForTimeout(400);
  const ax1 = await axeSerious(p, "[data-component=InstallLanguagesModal]"); out.push(`install modal=${JSON.stringify(ax1)}`);
  const name1 = await p.getByRole("dialog", { name: "Install Language(s)" }).count();
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const foc1 = await p.evaluate(() => document.activeElement?.textContent.trim());
  // row menu
  const btn = S(p).getByRole("button", { name: "Actions for Spanish" });
  await btn.click(); await p.waitForTimeout(300);
  const ax2 = await axeSerious(p, "[role=menu]"); out.push(`row menu=${JSON.stringify(ax2)}`);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  // each typed/confirm dialog
  const dl = [["Spanish", "Make default", "ConfirmDialog"], ["Spanish", "Reset", "TypedConfirmModal"], ["French", "Uninstall", "TypedConfirmModal"]];
  const dlgNotes = [];
  for (const [lang, item, comp] of dl) {
    const bt = S(p).getByRole("button", { name: `Actions for ${lang}` });
    await pickMenu(p, lang, item);
    const root = `[data-component=${comp}]`;
    const ax = await axeSerious(p, root); out.push(`${item} dialog=${JSON.stringify(ax)}`);
    const named = await p.locator(`${root} [role=dialog]`).first().evaluate(e => !!(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby")));
    // focus trap
    let esc = false; for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))) { esc = true; break; } }
    await p.keyboard.press("Escape"); await p.waitForTimeout(350);
    const closed = (await p.locator(root).count()) === 0;
    const foc = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    dlgNotes.push(`${item}: named=${named}, trap held=${!esc}, Escape closes=${closed}, focus restored to "${foc}"`);
  }
  out.push(...dlgNotes);
  // labelled inputs: install search, typed confirm
  const s = await sh(p, "X-07-LNG");
  const bad = [pageAx, ax1, ax2].some(a => a.length) || dlgNotes.some(n => /named=false|trap held=false|closes=false/.test(n)) || out.some(o => /dialog=\[".+"\]/.test(o));
  const focusBad = foc1 !== "Install Language(s)" || dlgNotes.some(n => !/focus restored to "Actions for/.test(n));
  rec("X-07", !bad && !focusBad && name1 === 1 && unique.dup.length === 0 ? "PASS" : "FAIL", `serious/critical axe: ${out.join("; ")}; install modal named=${name1}; focus after Escape on install modal="${foc1}"`, "");
  rec("_errs-X7", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-08 contrast + dark visual, desktop and phone ----
for (const vp of ["desktop", "mobile"]) {
  const { page: p, errors } = vp === "mobile" ? await openPhone(b, "languages") : await open(b, "languages");
  // create installing and failed pills
  await p.evaluate(() => window.__failNextLanguageInstall && window.__failNextLanguageInstall());
  await p.locator("body").evaluate(() => {});
  const run = async (mode) => {
    if (mode === "dark") await dark(p); else await light(p);
    await p.waitForTimeout(300);
    return {
      def: await contrast(p, "[data-part=default]", "Default"),
      inst: await contrast(p, "[data-part=installing]", "Installing"),
      fail: await contrast(p, "[data-part=failed]", "failed"),
      name: await contrast(p, "[data-part=row] span.font-medium", "English"),
    };
  };
  if (vp === "desktop") await install(p, ["German (de)"]); else { await S(p).getByRole("button", { name: "Install Language(s)" }).tap(); await p.waitForTimeout(400); await D(p).locator("[data-part=language]").filter({ hasText: "German (de)" }).tap(); await D(p).locator("[data-part=confirm]").tap(); }
  await p.waitForTimeout(500);
  const L1 = await run("light"); const sl = await sh(p, `X-08-LNG-${vp}-light-installing`);
  await run("dark"); const Dk1 = await run("dark"); const sd = await sh(p, `X-08-LNG-${vp}-dark-installing`);
  await p.waitForTimeout(3800);
  await light(p);
  // failed state
  await p.evaluate(() => window.__failNextLanguageInstall && window.__failNextLanguageInstall());
  if (vp === "desktop") await install(p, ["Dutch (nl)"]); else { await S(p).getByRole("button", { name: "Install Language(s)" }).tap(); await p.waitForTimeout(400); await D(p).locator("[data-part=language]").filter({ hasText: "Dutch (nl)" }).tap(); await D(p).locator("[data-part=confirm]").tap(); }
  await p.waitForTimeout(4200);
  const L2 = await run("light"); const sl2 = await sh(p, `X-08-LNG-${vp}-light-failed`);
  const D2 = await run("dark"); const sd2 = await sh(p, `X-08-LNG-${vp}-dark-failed`);
  const nums = [...L1.def, ...L1.inst, ...Dk1.def, ...Dk1.inst, ...L2.fail, ...D2.fail, ...D2.def].map(x => parseFloat(x.split("=")[1]));
  const low = nums.filter(n => n < 4.5);
  rec(`X-08 (${vp})`, low.length === 0 && nums.length >= 6 ? "PASS" : "FAIL", `contrast light: Default ${JSON.stringify(L1.def)} Installing ${JSON.stringify(L1.inst)} Failed ${JSON.stringify(L2.fail)}; dark: Default ${JSON.stringify(Dk1.def)} Installing ${JSON.stringify(Dk1.inst)} Failed ${JSON.stringify(D2.fail)}; values below 4.5: ${JSON.stringify(low)}`, low.length ? sd2 : "");
  rec(`_errs-X8-${vp}`, real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-19 + X-06 (phone) ----
{
  const { page: p, errors } = await openPhone(b, "languages");
  const hs0 = await hasHScroll(p);
  const rowsTxt = await names(p);
  const s0 = await sh(p, "LNG-19-list");
  const rowsHaveMenu = await S(p).getByRole("button", { name: /^Actions for / }).count();
  const vis = await S(p).getByRole("button", { name: /^Actions for / }).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return r.right <= innerWidth && r.width >= 24 && r.height >= 24; }));
  const sizes = await S(p).getByRole("button", { name: /^Actions for / }).first().evaluate(e => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; });
  // row menu (tap)
  await S(p).getByRole("button", { name: "Actions for Spanish" }).tap(); await p.waitForTimeout(500);
  const menuBox = await p.evaluate(() => { const m = [...document.querySelectorAll("[role=menu]")].filter(e => !e.closest("[inert]"))[0]; if (!m) return null; const r = m.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), items: [...m.querySelectorAll("button")].map(x => x.textContent.trim()) }; });
  const s1 = await sh(p, "LNG-19-menu");
  const menuIn = menuBox && menuBox.l >= 0 && menuBox.r <= 390 && menuBox.b <= 844;
  // Reset dialog
  await p.locator("[role=menu] button").filter({ hasText: /^Reset$/ }).tap(); await p.waitForTimeout(700);
  const dBox = await p.locator("[data-component=TypedConfirmModal] [role=dialog]").first().evaluate(e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });
  const s2 = await sh(p, "LNG-19-reset");
  const btnVis = await p.locator("[data-component=TypedConfirmModal] [data-part=confirm]").evaluate(e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.height >= 32; });
  await p.locator("[data-component=TypedConfirmModal]").getByRole("textbox").fill("CONFIRM");
  await p.locator("[data-component=TypedConfirmModal] [data-part=cancel]").tap(); await p.waitForTimeout(400);
  // Uninstall dialog reachable
  await S(p).getByRole("button", { name: "Actions for French" }).tap(); await p.waitForTimeout(400);
  await p.locator("[role=menu] button").filter({ hasText: /^Uninstall$/ }).tap(); await p.waitForTimeout(700);
  const uBox = await p.locator("[data-component=TypedConfirmModal] [role=dialog]").first().evaluate(e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; });
  const uBtn = await p.locator("[data-component=TypedConfirmModal] [data-part=confirm]").evaluate(e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; });
  await p.locator("[data-component=TypedConfirmModal] [data-part=cancel]").tap(); await p.waitForTimeout(400);
  // Install modal
  await S(p).getByRole("button", { name: "Install Language(s)" }).tap(); await p.waitForTimeout(600);
  const iBox = await p.locator("[data-component=InstallLanguagesModal] [role=dialog]").first().evaluate(e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });
  const hs1 = await hasHScroll(p);
  const s3 = await sh(p, "LNG-19-install");
  await D(p).locator("[data-part=language]").filter({ hasText: "German (de)" }).tap();
  const instBtn = await D(p).locator("[data-part=confirm]").evaluate(e => { const r = e.getBoundingClientRect(); return { txt: e.textContent.trim(), ok: r.bottom <= innerHeight && r.right <= innerWidth && !e.disabled }; });
  await D(p).locator("[data-part=confirm]").tap(); await p.waitForTimeout(600);
  const installing = (await names(p)).find(x => /German/.test(x));
  const defBadgeOnRow = rowsTxt.some(x => /English.*Default/.test(x));
  const ok = !hs0.page && !hs0.pane && rowsHaveMenu === 5 && vis.every(Boolean) && defBadgeOnRow && menuIn && dBox.h >= 300 && btnVis && uBtn && iBox.h >= 700 && iBox.w === 390 && !hs1.page && instBtn.ok && /Installing/.test(installing || "");
  rec("LNG-19", ok ? "PASS" : "FAIL", `rows=${JSON.stringify(rowsTxt)}; row menu buttons=${rowsHaveMenu} (${sizes}), all inside viewport=${vis.every(Boolean)}; horizontal scroll page=${hs0.page} pane=${hs0.pane}; row menu box=${JSON.stringify(menuBox)} (inside viewport=${menuIn}); Reset dialog box=${JSON.stringify(dBox)} confirm button reachable=${btnVis}; Uninstall dialog box=${JSON.stringify(uBox)} confirm reachable=${uBtn}; Install modal box=${JSON.stringify(iBox)}, h-scroll=${hs1.page}, Install button=${JSON.stringify(instBtn)}; after tapping Install: "${installing}". Note: the phone context needed a 1px viewport nudge first (useKeyboardInset left --kb at 1189px from the first paint under Playwright emulation, which collapses every full-screen dialog to zero height; see report notes)`, ok ? "" : s2);
  rec("X-06", ok ? "PASS" : "FAIL", `Languages at 390x844 with touch: ${ok ? "rows (name, key, Default badge, action menu), no horizontal scroll, menu/dialogs full screen or sheets and reachable by tap" : "see LNG-19 evidence"}`, ok ? "" : s2);
  rec("_errs-X6", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-13 corpus scope ----
{
  const { page: p, errors } = await open(b, "languages");
  const crumb = p.locator('button[aria-label^="Collection:"]');
  const rowsSample = await names(p);
  const users0 = await (async () => { await section(p, "Users & Groups"); await p.waitForTimeout(500); return (await S(p).innerText()).replace(/\s+/g, " ").slice(0, 200); })();
  await section(p, "Languages");
  const sw = async (name) => { await crumb.click(); await p.waitForTimeout(250); await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: name }).click(); await p.waitForTimeout(1500); await backToSettings(p, "Languages"); };
  await sw("CEJIL");
  const rowsCejil = await names(p); const s = await sh(p, "X-13-LNG-cejil");
  await sw("Best Artworks");
  const rowsArt = await names(p);
  await sw("Red Trav");
  const rowsTrav = await names(p);
  await section(p, "Users & Groups"); await p.waitForTimeout(500);
  const users1 = (await S(p).innerText()).replace(/\s+/g, " ").slice(0, 200);
  await section(p, "Languages");
  await sw("Sample");
  const rowsBack = await names(p);
  const ok = JSON.stringify(rowsSample) !== JSON.stringify(rowsCejil) && users0 === users1 && JSON.stringify(rowsBack) === JSON.stringify(rowsSample);
  rec("X-13", ok ? "PASS" : "FAIL", `Sample=${JSON.stringify(rowsSample)}; CEJIL=${JSON.stringify(rowsCejil)}; Best Artworks=${JSON.stringify(rowsArt)}; Red Trav=${JSON.stringify(rowsTrav)}; Users page identical across sources=${users0 === users1}; back to Sample same as first=${JSON.stringify(rowsBack) === JSON.stringify(rowsSample)}`, ok ? "" : s);
  rec("_errs-X13", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

for (const x of ["X-02", "X-03"]) rec(x, "N/A", "Excluded by the page's Applies line (no form; every action is immediate); LNG-18 drove the absence of a dirty guard and Save button.");
for (const x of ["X-05", "X-10", "X-11", "X-12"]) rec(x, "N/A", x === "X-05" ? "Replaced by LNG-13 and LNG-14 (type-the-word dialogs), both driven." : "Excluded by the page's Applies line (the list always holds the default language; no search or bulk selection).");

save();
await b.close();
