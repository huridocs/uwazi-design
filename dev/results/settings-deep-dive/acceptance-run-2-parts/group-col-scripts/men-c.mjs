import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries } from "./lib.mjs";
import { heads, addedHeads, devArm } from "./common.mjs";
import * as M from "./menu.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("men-c");
const b = await launch();
const tick = async (p, t) => { await M.rowOf(p, t).locator("input[type=checkbox],[role=checkbox]").first().click({ force: true }); await p.waitForTimeout(150); };
const footInfo = (p) => S(p).locator("footer").first().evaluate((f) => { const bs = [...f.querySelectorAll("button")].map((b) => { const cs = getComputedStyle(b); return { t: b.textContent.trim(), color: cs.color, bg: cs.backgroundColor, border: cs.borderTopWidth + " " + cs.borderTopStyle, w: Math.round(b.getBoundingClientRect().width) }; }); const bar = f.firstElementChild; return { buttons: bs, bg: getComputedStyle(f).backgroundColor, border: getComputedStyle(f).borderTopWidth }; });
const isRed = (c) => { const n = (c.match(/[\d.]+/g) || []).map(Number); if (/srgb/.test(c)) return n[0] > 0.4 && n[1] < 0.3 && n[2] < 0.3; return n[0] > 150 && n[1] < 90 && n[2] < 90; };
const sealColor = (p) => p.evaluate(() => { const d = document.createElement("span"); d.className = "text-seal"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });

await run(r, "MEN-11", async () => {
  const { page } = await open(b, "menu");
  await M.addGroup(page, "E");
  const t0 = await M.titles(page);
  const f0 = await footInfo(page);
  await tick(page, "Library"); await tick(page, "E");
  const st = (await M.selText(page).innerText()).trim();
  const f1 = await footInfo(page);
  const w2 = await M.selText(page).evaluate((e) => Math.round(e.getBoundingClientRect().width));
  const lead = await S(page).getByRole("button", { name: /^Add (link|group)$/ }).count();
  const seal = await sealColor(page);
  await shot(page, "MEN-11");
  await tick(page, "Library"); const w1 = await M.selText(page).evaluate((e) => Math.round(e.getBoundingClientRect().width)); const st1 = (await M.selText(page).innerText()).trim();
  await tick(page, "E");
  const gone = await M.selText(page).count();
  const lead2 = await S(page).getByRole("button", { name: /^Add (link|group)$/ }).count();
  await tick(page, "Resources");
  const stG = (await M.selText(page).innerText()).trim();
  const checked = await S(page).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => { const c = r.querySelector("input[type=checkbox],[role=checkbox]"); return (r.querySelector(".font-medium").textContent.trim()) + ":" + (c.checked ?? c.getAttribute("aria-checked")); }));
  const del = f1.buttons.find((x) => x.t === "Delete");
  const ok = t0.length === 6 && st === "Selected 2 of 6" && del && isRed(del.color) && del.border.startsWith("0") && (del.bg === "rgba(0, 0, 0, 0)" || /\/ 0\)|transparent/.test(del.bg)) && lead === 0 && gone === 0 && lead2 === 2 && /Selected 3 of 6/.test(stG) && f1.bg === f0.bg && w1 === w2;
  r.add("MEN-11", pf(ok), `rows ${JSON.stringify(t0)}; ticked Library and E: "${st}"; footer buttons ${JSON.stringify(f1.buttons.map((x) => [x.t, x.color, x.border, x.bg]))} (red text token; the plain seal token is ${seal}, the label variant is used for text); lead actions while selecting ${lead}; footer background clean ${f0.bg} vs selecting ${f1.bg} (border ${f0.border}/${f1.border}); selection text width with 2 selected ${w2}px, with 1 ("${st1}") ${w1}px; after untick both: selection text count ${gone}, Add link/Add group back ${lead2}; ticking Resources: "${stG}", checked rows ${JSON.stringify(checked)}`, "MEN-11");
  r.add("X-12", pf(ok), `selection bar: "Selected n of total" fixed width (${w1}px/${w2}px), Delete (seal text) plus count replace Add link/Add group, clearing restores them, footer not tinted (${f0.bg} -> ${f1.bg}), no border (${del && del.border})`, "MEN-11");
  await page.context().close();
});

await run(r, "MEN-12", async () => {
  const { page } = await open(b, "menu");
  await tick(page, "Resources");
  await S(page).getByRole("button", { name: "Delete", exact: true }).click(); await page.waitForTimeout(500);
  const dl = await dialogs(page); const t = await M.titles(page);
  const en = !(await M.saveBtn(page).isDisabled());
  const stored = await M.storedMenu(page);
  await M.openBeacon(page);
  const art = await page.locator("article").evaluateAll((a) => a.map((x) => x.innerText.replace(/\n+/g, " | ")).filter((x) => /Deleted/.test(x)));
  const undo = await page.locator("article", { hasText: /Deleted/ }).getByRole("button", { name: "Undo" }).count();
  await shot(page, "MEN-12");
  await M.closeBeacon(page);
  await page.reload(); await page.waitForTimeout(1500);
  const back = await M.titles(page);
  r.add("MEN-12", pf(!dl.length && JSON.stringify(t) === '["Library","About"]' && en && art.length >= 1 && undo === 1 && back.length === 5), `after ticking Resources and Delete: rows ${JSON.stringify(t)}, dialogs ${JSON.stringify(dl)}, Save enabled=${en}; store untouched (stored menu still holds Resources: ${JSON.stringify(stored).includes("Resources")}); Beacon entries ${JSON.stringify(art)} with Undo buttons ${undo}; after reload before Save rows ${JSON.stringify(back)}`, "MEN-12");
  await page.context().close();
});

await run(r, "MEN-13", async () => {
  const { page } = await open(b, "menu");
  const t0 = await M.titles(page);
  await tick(page, "Resources"); await S(page).getByRole("button", { name: "Delete", exact: true }).click(); await page.waitForTimeout(400);
  await M.openBeacon(page);
  await page.locator("article", { hasText: /Deleted/ }).getByRole("button", { name: "Undo" }).first().click(); await page.waitForTimeout(500);
  await M.closeBeacon(page);
  const t1 = await M.titles(page);
  const dis = await M.saveBtn(page).isDisabled();
  r.add("MEN-13", pf(JSON.stringify(t1) === JSON.stringify(t0) && dis), `rows before ${JSON.stringify(t0)}; after Delete then Undo ${JSON.stringify(t1)}; Save disabled again=${dis}`);
  // second delete: undo after the tree changed
  await page.context().close();
});

await run(r, "MEN-14", async () => {
  const { page } = await open(b, "menu");
  const bgLead = await M.saveBtn(page).evaluate((e) => getComputedStyle(e).backgroundColor);
  const before = await heads(page);
  await S(page).getByRole("button", { name: "Move About up", exact: true }).click(); await page.waitForTimeout(250);
  const t1 = await M.titles(page); const en1 = !(await M.saveBtn(page).isDisabled());
  const bgEn = await M.saveBtn(page).evaluate((e) => getComputedStyle(e).backgroundColor);
  await S(page).getByRole("button", { name: "Move About down", exact: true }).click(); await page.waitForTimeout(250);
  const dis2 = await M.saveBtn(page).isDisabled();
  await S(page).getByRole("button", { name: "Move About up", exact: true }).click(); await page.waitForTimeout(250);
  const h0 = await S(page).locator("[data-part=last-saved]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const foot0 = await S(page).locator("footer").first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const ls0 = await S(page).locator("[data-part=last-saved]").innerText();
  await M.saved(page);
  const added = await addedHeads(page, before);
  const ls1 = await S(page).locator("[data-part=last-saved]").innerText();
  const foot1 = await S(page).locator("footer").first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const dis3 = await M.saveBtn(page).isDisabled();
  // revert by hand: back to stored tree -> disabled? then edit and revert
  await S(page).getByRole("button", { name: "Move About down", exact: true }).click(); await page.waitForTimeout(250);
  const en4 = !(await M.saveBtn(page).isDisabled());
  await S(page).getByRole("button", { name: "Move About up", exact: true }).click(); await page.waitForTimeout(250);
  const dis4 = await M.saveBtn(page).isDisabled();
  const status = await devArm(page, "Save", "Disk full", "Menu");
  const hb = await heads(page);
  await S(page).getByRole("button", { name: "Move About down", exact: true }).click(); await page.waitForTimeout(250);
  await M.saved(page);
  const fadd = await addedHeads(page, hb);
  const draftKept = !(await M.saveBtn(page).isDisabled());
  const failOk = fadd.length === 1 && /^An error occurred/.test(fadd[0]) && draftKept;
  await shot(page, "MEN-14");
  const ok = failOk && en1 && dis2 && /^Saved .+ by admin$/.test(ls1.trim()) && foot0 === foot1 && added.includes("Updated") && dis3 && en4 && dis4;
  r.add("X-03", pf(dis3 && en4), `after a successful Save the Save button is disabled=${dis3}; the next edit enables it=${en4}; reverting to the stored tree disables it again=${dis4}`);
  r.add("MEN-14", pf(ok), `Save background clean ${bgLead} / enabled ${bgEn}; after moving About up Save enabled=${en1}; moved back by hand Save disabled=${dis2}; moved again and Save: last-saved line before "${ls0}" -> after "${ls1}" (line height ${h0}, footer height ${foot0} -> ${foot1}); Beacon new entries ${JSON.stringify(added)}; Save disabled after Save=${dis3}; edit then revert to the stored tree: enabled ${en4} then disabled ${dis4}; failure path (${status}) then a Save: new entries ${JSON.stringify(fadd)} (expected one An error occurred and the draft kept; Save still enabled=${draftKept}, the save went through instead)`, "MEN-14");
  await page.context().close();
});

await run(r, "MEN-15", async () => {
  const { page } = await open(b, "menu");
  await S(page).getByRole("button", { name: "Move About up", exact: true }).click(); await page.waitForTimeout(250);
  await rail(page, "Collection"); await page.waitForTimeout(500);
  const i = async () => { const d = await dialogs(page); const t = d.length ? await page.locator("[data-component=ConfirmDialog] [role=dialog]").first().innerText().catch(() => "") : ""; return { d, t: t.replace(/\n+/g, " / ") }; };
  const i1 = await i();
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300);
  const stay = (await S(page).locator("h2").first().textContent()) === "Menu" && (await M.titles(page))[0] === "About";
  await rail(page, "Collection"); await page.waitForTimeout(500);
  const i2 = await i();
  const dsw = { before: null };
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Discard changes" }).click(); await page.waitForTimeout(600);
  await rail(page, "Menu"); await page.waitForTimeout(500);
  const back = await M.titles(page);
  // navbar and data source triggers
  await S(page).getByRole("button", { name: "Move About up", exact: true }).click(); await page.waitForTimeout(250);
  await page.locator("button[data-part=library]").click(); await page.waitForTimeout(500); const dn = await dialogs(page);
  if (dn.length) await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300);
  await page.locator('button[aria-label^="Collection:"]').click(); await page.waitForTimeout(250);
  await page.locator("[data-part=collection-menu] [role=option]").filter({ hasText: "CEJIL" }).click(); await page.waitForTimeout(700);
  const dd = await dialogs(page); if (dd.length) await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300);
  await M.saved(page); await rail(page, "Collection"); await page.waitForTimeout(400);
  const dClean = await dialogs(page);
  const ok = i1.d.some((x) => /Discard changes\?/.test(x)) && /You have unsaved changes\. Do you want to continue\?/.test(i1.t) && stay && i2.d.length === 1 && back[0] === "Library" && dn.length === 1 && dd.length === 1 && !dClean.length;
  r.add("MEN-15", pf(ok), `rail click with one edit: ${JSON.stringify(i1.d)} "${i1.t}"; Cancel keeps page and draft=${stay}; second attempt dialogs ${JSON.stringify(i2.d)}; Discard changes -> returning shows stored order ${JSON.stringify(back)}; navbar Library link: ${JSON.stringify(dn)}; data source switch: ${JSON.stringify(dd)}; after Save a rail click opens ${JSON.stringify(dClean)}`);
  r.add("X-02", pf(ok), `Menu dirty guard: rail ${JSON.stringify(i1.d)}, navbar ${JSON.stringify(dn)}, data source switch ${JSON.stringify(dd)}, Cancel keeps draft, Discard changes drops it, clean page opens no dialog (phone back chevron: see MEN-20)`);
  await page.context().close();
});

r.save();
await b.close();
