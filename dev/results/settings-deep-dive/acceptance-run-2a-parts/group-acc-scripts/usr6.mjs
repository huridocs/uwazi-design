import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries, axeSrc } from "./lib.mjs";
import { watch, mk, signInAs, switchUser, newN, hscroll, contrast, dark } from "./rec.mjs";
import { openCatalog, backToSettings } from "./devp.mjs";
const { rec, save } = mk("usr6");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const DLG = '[role=dialog]:not([inert] *)';
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const tick = async (p, n) => { await rowOf(p, n).getByRole("checkbox").click({ force: true }); await p.waitForTimeout(150); };
const footer = (p) => p.locator("footer").last().innerText().then(norm).catch(() => "");
const paneTxt = (p) => S(p).innerText().then(norm);
const commit = (p) => p.locator("footer").last().getByRole("button").last();
const dlgTxt = async (p) => norm(await p.locator(DLG).last().innerText());
const groupsTab = async (p) => { await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(300); };
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const r = await window.axe.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`); }, sel); };

// USR-01 + USR-25 beacon texts
{
  const { page: p } = await open(b, "users");
  const tabs0 = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  const msgs = {};
  const act = async (label, fn) => { const b0 = await notifTitles(p); await fn(); await p.waitForTimeout(500); msgs[label] = newN(b0, await notifTitles(p)).filter(t => !/Uwazi is available|Some fields|Entity saved|Uploading|Processing|Batch|Storage|Scheduled|Failed to save/.test(t)).map(s => s.slice(0, 70)); };
  await act("create user", async () => { await p.getByRole("button", { name: "Add user" }).click(); await p.waitForTimeout(300); await S(p).locator("input").first().fill("newbie"); await S(p).locator("input[type=email]").fill("newbie@example.org"); await commit(p).click(); });
  const tabs1 = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  await act("2FA reset", async () => { await rowOf(p, "mlopez").click(); await p.waitForTimeout(300); await S(p).getByRole("button", { name: "Reset 2FA" }).click(); await p.waitForTimeout(300); await p.locator(DLG + " input[type=password]").fill("x"); await p.getByRole("button", { name: "Accept" }).click(); await p.waitForTimeout(300); await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); });
  await act("unlock", async () => { await rowOf(p, "tbuergenthal").click(); await p.waitForTimeout(300); await S(p).getByRole("button", { name: "Unlock account" }).click(); await p.waitForTimeout(300); await p.locator(DLG + " input[type=password]").fill("x"); await p.getByRole("button", { name: "Accept" }).click(); await p.waitForTimeout(300); await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); });
  await act("user update", async () => { await rowOf(p, "afarah").click(); await p.waitForTimeout(300); await S(p).locator("input[type=email]").fill("af2@x.org"); await commit(p).click(); });
  await groupsTab(p);
  await act("group create", async () => { await p.getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300); await S(p).getByPlaceholder("e.g. Litigation").fill("Ethics"); await commit(p).click(); });
  await act("group update", async () => { await rowOf(p, "Ethics").click(); await p.waitForTimeout(300); await S(p).getByPlaceholder("e.g. Litigation").fill("Ethics board"); await commit(p).click(); });
  await act("group delete", async () => { await rowOf(p, "Ethics board").getByRole("button", { name: "Delete Ethics board" }).click({ force: true }); await p.waitForTimeout(300); await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); });
  const tabs2 = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  rec("USR-01", /Users\s*5/.test(tabs0[0]) && /Groups\s*3/.test(tabs0[1]) && /Users\s*6/.test(tabs1[0]) && /Groups\s*3/.test(tabs2[1]) ? "PASS" : "FAIL", `seed tabs=${JSON.stringify(tabs0)} (counts equal rows: users 5, groups 3, Users active by default, header "Users & Groups"); after adding a user=${JSON.stringify(tabs1)}; after creating then deleting a group=${JSON.stringify(tabs2)}; counts are derived from the stores, no stored memberCount shown (Members column shows a derived count)`, "");
  rec("USR-25", Object.values(msgs).every(a => a.length === 1) && /Added new user/.test(msgs["create user"][0]) && /Disabled 2FA/.test(msgs["2FA reset"][0]) && /Group saved/.test(msgs["group create"][0]) && /Group updated/.test(msgs["group update"][0]) && /Deleted user group/.test(msgs["group delete"][0]) ? "PASS" : "FAIL", `Beacon entries per action (each exactly one, text as built): ${JSON.stringify(msgs)}; spec text: "Added new user", "Disabled 2FA", "Account unlocked successfully", "Group saved", "Group updated", "Deleted user group"`, "");
  await p.context().close();
}
// X-04 failure half + USR-25 failure
{
  const { page: p } = await open(b, "users");
  await openCatalog(p);
  await p.getByRole("button", { name: "Arm", exact: true }).scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(200);
  await backToSettings(p, "System settings", "Users & Groups");
  await groupsTab(p);
  await p.getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300);
  await S(p).getByPlaceholder("e.g. Litigation").fill("FailGroup");
  const b0 = await notifTitles(p);
  await commit(p).click(); await p.waitForTimeout(600);
  const nb = newN(b0, await notifTitles(p)).filter(t => !/Uwazi is available|Some fields|Entity saved|Uploading|Processing|Batch|Storage|Scheduled/.test(t));
  const stayed = (await S(p).getByPlaceholder("e.g. Litigation").count()) === 1;
  const errs = nb.filter(t => /An error occurred/.test(t));
  await shot(p, "X-04-users-save");
  // Delete scope
  await openCatalog(p);
  await p.getByRole("combobox", { name: "Failure scope" }).or(p.getByLabel("Failure scope")).first().click().catch(() => {});
  await p.getByRole("option", { name: "Delete", exact: true }).click().catch(() => {}); await p.waitForTimeout(150);
  await p.getByRole("button", { name: "Arm", exact: true }).click(); await p.waitForTimeout(200);
  const armed = norm(await p.locator('[role=status]').filter({ hasText: /Armed|Not armed/ }).first().innerText());
  await backToSettings(p, "System settings", "Users & Groups");
  await groupsTab(p);
  const b1 = await notifTitles(p);
  await rowOf(p, "Research").getByRole("button", { name: "Delete Research" }).click({ force: true }); await p.waitForTimeout(300);
  await p.locator(DLG).last().getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(600);
  const nb2 = newN(b1, await notifTitles(p)).filter(t => !/Uwazi is available|Some fields|Entity saved|Uploading|Processing|Batch|Storage|Scheduled/.test(t));
  const errs2 = nb2.filter(t => /An error occurred/.test(t));
  const stillThere = await rowOf(p, "Research").count();
  await shot(p, "X-04-users-delete");
  rec("X-04-fail", errs.length === 1 && errs2.length === 1 ? "PASS" : "FAIL", `Save armed -> create group "FailGroup": new Beacon=${JSON.stringify(nb.map(s => s.slice(0, 60)))}, "An error occurred" entries=${errs.length}, editor stayed open=${stayed}; Delete armed (${armed}) -> group row delete: new Beacon=${JSON.stringify(nb2.map(s => s.slice(0, 60)))}, errors=${errs2.length}, group still listed=${stillThere > 0}`, "X-04-users-save.png");
  rec("USR-25-fail", "INFO", "see X-04-fail");
  await p.context().close();
}
// X-07 axe + dialogs; X-08 dark; X-11; X-12; X-13
{
  const { page: p } = await open(b, "users");
  const results = {};
  results.list = await axeOn(p, '[data-testid="settings-content"]');
  const names = await S(p).locator("button, [role=button]").evaluateAll(es => es.map(e => (e.getAttribute("aria-label") || e.innerText).trim()).filter(Boolean));
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  const unlabeled = await S(p).locator("input").evaluateAll(es => es.filter(i => !(i.labels && i.labels.length) && !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby")).map(i => i.type + (i.placeholder ? ":" + i.placeholder : "")));
  await rowOf(p, "mlopez").getByRole("button", { name: "Delete mlopez" }).click({ force: true }); await p.waitForTimeout(400);
  results.deleteDlg = await axeOn(p, DLG);
  const role = await p.locator(DLG).last().getAttribute("role");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const focusBack = await p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim());
  await tick(p, "afarah");
  await p.getByRole("button", { name: "Change role", exact: true }).click(); await p.waitForTimeout(400);
  results.bulkDlg = await axeOn(p, DLG);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const focusBack2 = await p.evaluate(() => document.activeElement?.textContent?.trim());
  await p.locator("footer").last().getByRole("button", { name: "Clear", exact: true }).click(); await p.waitForTimeout(200);
  await rowOf(p, "mlopez").click(); await p.waitForTimeout(400);
  results.editor = await axeOn(p, '[data-testid="settings-content"]');
  await S(p).getByRole("button", { name: "Reset 2FA" }).click(); await p.waitForTimeout(400);
  results.pwDlg = await axeOn(p, DLG);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const focusBack3 = await p.evaluate(() => document.activeElement?.textContent?.trim());
  await S(p).getByRole("button", { name: "Users & Groups", exact: true }).click(); await p.waitForTimeout(300);
  await groupsTab(p); await rowOf(p, "Research").click(); await p.waitForTimeout(300);
  results.groupEditor = await axeOn(p, '[data-testid="settings-content"]');
  const bad = Object.entries(results).flatMap(([k, v]) => v.filter(x => /serious|critical/.test(x)).map(x => k + ": " + x));
  rec("X-07", !bad.length && !dup.length && !unlabeled.length && role === "dialog" ? "PASS" : "FAIL", `axe: ${JSON.stringify(results)}; serious/critical=${JSON.stringify(bad)}; duplicate button names on the list=${JSON.stringify(dup)}; unlabelled inputs=${JSON.stringify(unlabeled)}; dialog role=${role}; focus after Escape: delete dialog -> "${focusBack}", bulk modal -> "${focusBack2}", password modal -> "${focusBack3}"`, "");
  await p.context().close();
}
{
  const { page: p } = await open(b, "users");
  const sel = 'main [data-part=row] span.rounded-md.font-semibold, [data-testid="settings-content"] [data-part=row] span.rounded-md.font-semibold';
  const rolePills = async () => p.evaluate((sel) => { const norm = (c) => { const cv = document.createElement("canvas").getContext("2d"); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; }; const lum = (c) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const out = []; for (const el of document.querySelectorAll(sel)) { const fg = norm(getComputedStyle(el).color); let n = el, base = [255, 255, 255]; const layers = []; while (n) { const c = norm(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; n = n.parentElement; } if (layers.length && layers[layers.length - 1][3] >= 1) base = layers.pop().slice(0, 3); while (layers.length) { const l = layers.pop(); base = base.map((v, i) => l[i] * l[3] + v * (1 - l[3])); } const f = fg.slice(0, 3).map((v, i) => v * fg[3] + base[i] * (1 - fg[3])); const L1 = lum(f), L2 = lum(base); out.push(el.textContent.trim() + ":" + ((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)).toFixed(2)); } return out; }, sel);
  const light = await rolePills();
  const grp = async () => p.evaluate(() => { const el = document.querySelector('[data-testid="settings-content"] [data-part=row] span.bg-warm.text-ink-secondary'); return el ? el.textContent : null; });
  const lg = await contrast(p, '[data-testid="settings-content"] [data-part=row] span.bg-warm.text-meta');
  await dark(p);
  const dk = await rolePills();
  const dg = await contrast(p, '[data-testid="settings-content"] [data-part=row] span.bg-warm.text-meta');
  await shot(p, "X-08-users");
  const min = (a) => Math.min(...a.map(x => +x.split(":")[1]));
  rec("X-08", min(light) >= 4.5 && min(dk) >= 4.5 && lg >= 4.5 && dg >= 4.5 ? "PASS" : "FAIL", `Role pill contrast light ${JSON.stringify(light)}, dark ${JSON.stringify(dk)}; group pill light ${lg}:1, dark ${dg}:1 (need >= 4.5:1)`, "X-08-users.png");
  await p.context().close();
}
{
  const { page: p } = await open(b, "users");
  // X-11 on both tabs
  const hts = [];
  const sbox = () => S(p).getByPlaceholder(/Search/).first();
  const h = async () => sbox().evaluate(e => Math.round(e.closest("div").getBoundingClientRect().height));
  hts.push(await h()); await sbox().fill("zzz"); await p.waitForTimeout(250); hts.push(await h()); await sbox().fill(""); await p.waitForTimeout(250);
  const restored = await S(p).locator("[data-part=row]").count();
  await groupsTab(p);
  hts.push(await h()); await sbox().fill("lit"); await p.waitForTimeout(250); const gr = await S(p).locator("[data-part=row]").count(); hts.push(await h()); await sbox().fill(""); await p.waitForTimeout(250); const gr2 = await S(p).locator("[data-part=row]").count();
  rec("X-11", hts.every(x => x === hts[0]) && restored === 5 && gr === 1 && gr2 === 3 ? "PASS" : "FAIL", `search row height across typing on both tabs=${JSON.stringify(hts)}; Users clear restores ${restored} rows; Groups "lit" -> ${gr} row, cleared -> ${gr2}`, "");
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  // X-12
  await tick(p, "afarah");
  const barInfo = await p.locator('[data-component=SettingsSelectionBar]').evaluate(e => { const cs = getComputedStyle(e); const st = e.querySelector('[role=status]'); return { bg: cs.backgroundColor, border: cs.borderTopWidth + "/" + (cs.outlineStyle === "none" ? "0px" : cs.outlineWidth) + "/" + cs.boxShadow, count: st.textContent.trim(), w: Math.round(st.getBoundingClientRect().width) }; });
  const parentBg = await p.locator('[data-component=SettingsSelectionBar]').evaluate(e => getComputedStyle(e.parentElement).backgroundColor);
  const leadHidden = (await p.locator("footer").last().getByRole("button", { name: "Add user" }).count()) === 0;
  await tick(p, "jnkemba"); await tick(p, "admin"); await tick(p, "mlopez"); await tick(p, "tbuergenthal");
  const w5 = await p.locator('[data-component=SettingsSelectionBar] [role=status]').evaluate(e => Math.round(e.getBoundingClientRect().width) + ":" + e.textContent.trim());
  await p.locator("footer").last().getByRole("button", { name: "Clear", exact: true }).click(); await p.waitForTimeout(250);
  const leadBack = (await p.locator("footer").last().getByRole("button", { name: "Add user" }).count()) === 1;
  await shot(p, "X-12");
  rec("X-12", barInfo.count === "Selected 1 of 5" && leadHidden && leadBack && barInfo.bg === "rgba(0, 0, 0, 0)" && /^0px\/0px\/none$/.test(barInfo.border) ? "PASS" : "FAIL", `Footer swaps "Add user" for "${barInfo.count}" (fixed-width slot ${barInfo.w}px; with 5 selected ${w5}) and the bulk actions; lead hidden while selecting=${leadHidden}, restored after Clear=${leadBack}; bar bg ${barInfo.bg} (parent ${parentBg}), border/outline/shadow ${barInfo.border}`, "X-12.png");
  // X-13
  const before = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim())).then(a => JSON.stringify(a));
  await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250);
  await p.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await p.waitForTimeout(2500);
  const landed = norm((await p.locator("body").innerText()).slice(0, 40));
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(250); await p.getByRole("button", { name: "System settings", exact: true }).click(); await p.waitForTimeout(600); await rail(p, "Users & Groups"); await p.waitForTimeout(500);
  const onUsers = /Users & Groups/.test(await S(p).innerText());
  const after = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim())).then(a => JSON.stringify(a));
  await rail(p, "Account"); await p.waitForTimeout(400);
  const accEmail = await p.locator("#account-email").inputValue();
  rec("X-13", before === after && accEmail === "admin@uwazi.io" ? "PASS" : "FAIL", `Switching Sample -> CEJIL (the app lands on the Library, "${landed}"); back in Settings > Users & Groups=${onUsers}; user rows identical=${before === after}; Account email="${accEmail}"`, "");
  await p.context().close();
}
rec("USR6-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
