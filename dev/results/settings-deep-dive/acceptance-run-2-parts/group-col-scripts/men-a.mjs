import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries } from "./lib.mjs";
import { save, bodyText, added, clean, heads, addedHeads } from "./common.mjs";
import * as M from "./menu.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("men-a");
const b = await launch();
const PANEL_SW = "[data-component=MenuItemPanel] [role=radio], [data-component=MenuItemPanel] [role=tab]";

await run(r, "MEN-01", async () => {
  const { page, errors } = await open(b, "menu");
  const title = await S(page).locator("h2").first().textContent();
  const tt = await M.titles(page); const uu = await M.urls(page);
  const nav = await M.navbar(page);
  const rowsN = await S(page).locator("[data-part=row]").count();
  const checks = await S(page).locator("[data-part=row] input[type=checkbox],[data-part=row] [role=checkbox]").count();
  const grips = await S(page).locator("[data-part=row] [data-component=ReorderGrip]").count();
  const edits = await S(page).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => !![...r.querySelectorAll("button")].find((b) => /^Edit /.test(b.getAttribute("aria-label") || ""))));
  const heads2 = (await S(page).locator("[role=row]").first().innerText()).replace(/\n+/g, " ");
  const topOnly = tt.filter((x) => !x.startsWith("  "));
  const grp = tt.slice(tt.indexOf("Resources") + 1, tt.indexOf("Resources") + 3);
  await shot(page, "MEN-01");
  const ok = title === "Menu" && JSON.stringify(topOnly) === JSON.stringify(nav) && checks === rowsN && grips === rowsN && edits.every(Boolean) && /label/i.test(heads2) && /url/i.test(heads2) && JSON.stringify(grp) === '["  Methodology","  Contact"]';
  r.add("MEN-01", pf(ok), `title "${title}"; rows (indent = two spaces) ${JSON.stringify(tt)} with URLs ${JSON.stringify(uu)}; navbar order ${JSON.stringify(nav)}; per row: checkbox ${checks}/${rowsN}, grip ${grips}/${rowsN}, Edit button on every row=${edits.every(Boolean)}; header "${heads2}"; Resources group followed by its two own links, indented=${JSON.stringify(grp) === '["  Methodology","  Contact"]'}; console errors ${JSON.stringify(noise(errors))}`, "MEN-01");
  await page.context().close();
});

await run(r, "MEN-02", async () => {
  const { page } = await open(b, "menu");
  const foot = await S(page).locator("footer").first().evaluate((f) => [...f.querySelectorAll("button")].map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().left), b.disabled || b.getAttribute("aria-disabled") === "true"])).catch(() => null);
  const btns = await S(page).getByRole("button").evaluateAll((bs) => bs.map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().left), b.disabled]).filter((x) => /^(Add link|Add group|Save)$/.test(x[0])));
  const sw = await S(page).getByRole("radio").count() + (await S(page).getByRole("tab").count());
  await M.openAdd(page, "link"); const h1 = await M.panelHeading(page); const sw1 = await page.locator(PANEL_SW).count();
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const bg = await M.saveBtn(page).evaluate((e) => getComputedStyle(e).backgroundColor);
  await shot(page, "MEN-02");
  const ok = JSON.stringify(btns.map((x) => x[0])) === '["Add link","Add group","Save"]' && btns[0][1] < btns[2][1] && btns[2][3 - 3 + 2] === true && sw === 0;
  r.add("MEN-02", pf(ok && btns[2][2]), `footer buttons left to right ${JSON.stringify(btns)} (Add link/Add group at the left, Save at the right, Save disabled=${btns[2][2]}); Save background ${bg}; Link/Group switch controls on the page ${sw}, in the panel ${sw1}`, "MEN-02");
  await page.context().close();
});

await run(r, "MEN-03", async () => {
  const { page } = await open(b, "menu");
  await M.openAdd(page, "link");
  const h = await M.panelHeading(page); const t = (await page.locator(M.PANEL).innerText()).replace(/\n+/g, " | ").replace(/\u00a0/g, " ");
  const origin = await page.evaluate(() => location.origin);
  const labels = await page.locator(`${M.PANEL} label`).allInnerTexts();
  await page.locator("#menu-item-group").click(); await page.waitForTimeout(250);
  const opts = (await page.getByRole("option").allInnerTexts()).map((x) => x.trim());
  await page.keyboard.press("Escape");
  const btns = await page.locator(`${M.PANEL} footer button, ${M.PANEL} button`).allInnerTexts();
  await shot(page, "MEN-03");
  const ok = h === "NEW LINK" && t.includes("Using URLs") && t.includes("If it is an external URL, use a fully formed URL. Ie. http://www.uwazi.io.") && t.includes("If it is an internal URL within this website, be sure to delete the first part (" + origin + "), leaving only a relative URL starting with a slash character. Ie. /some_url.") && ["Title", "URL", "Group"].every((l) => labels.some((x) => x.trim() === l)) && JSON.stringify(opts) === '["No Group","Resources"]' && btns.map((x) => x.trim()).includes("Add") && btns.map((x) => x.trim()).includes("Cancel");
  r.add("MEN-03", pf(ok), `panel heading "${h}"; text "${t.slice(0, 520)}" (origin printed in place of <origin>: ${origin}; the space in Ie. /some_url. is a non-breaking space in the DOM); labels ${JSON.stringify(labels.map((x) => x.trim()))}; Group options ${JSON.stringify(opts)}; buttons ${JSON.stringify(btns.map((x) => x.trim()).filter(Boolean))}`, "MEN-03");
  await page.context().close();
});

await run(r, "MEN-04", async () => {
  const { page } = await open(b, "menu");
  await M.openAdd(page, "link");
  const msgs = () => page.locator(M.PANEL).evaluate((p) => [...p.querySelectorAll(".text-seal-label,[role=alert],[data-part=message]")].map((x) => x.textContent.trim()));
  const isOpen = async () => (await dialogs(page)).includes("NEW LINK") || (await page.locator(M.PANEL).count()) > 0;
  await M.submit(page, "Add"); const e1 = await msgs(); const o1 = await isOpen();
  await M.fill(page, { title: "Only title" }); await M.submit(page, "Add"); const e2 = await msgs(); const o2 = await isOpen();
  await M.fill(page, { title: "", url: "/only-url" }); await M.submit(page, "Add"); const e3 = await msgs(); const o3 = await isOpen();
  const rowsN = (await M.titles(page)).length;
  const redBorder = await page.locator(M.PANEL).getByLabel("Title").evaluate((e) => getComputedStyle(e).borderColor);
  await shot(page, "MEN-04");
  await M.fill(page, { title: "Plain", url: "abc" }); await M.submit(page, "Add");
  const after = await M.titles(page);
  const ok = e1.length >= 2 && e2.length >= 1 && e3.length >= 1 && o1 && o2 && o3 && rowsN === 5 && after.includes("Plain");
  r.add("MEN-04", pf(ok), `both empty: messages ${JSON.stringify(e1)}, panel open=${o1}; title only: ${JSON.stringify(e2)}, open=${o2}; URL only: ${JSON.stringify(e3)}, open=${o3}; rows still ${rowsN} after the three attempts; Title border colour ${redBorder}; then "Plain" with URL "abc" accepted: rows ${JSON.stringify(after)}`, "MEN-04");
  await page.context().close();
});

await run(r, "MEN-05", async () => {
  const { page } = await open(b, "menu");
  await M.addLink(page, { title: "Docs", url: "/page/abc", group: "No Group" });
  await M.addLink(page, { title: "Ext", url: "http://www.uwazi.io", group: "Resources" });
  const t = await M.titles(page);
  const en = !(await M.saveBtn(page).isDisabled());
  const stored = await M.storedMenu(page);
  await M.addGroup(page, "Draftgroup");
  await M.openAdd(page, "link"); await page.locator("#menu-item-group").click(); await page.waitForTimeout(250);
  const opts = (await page.getByRole("option").allInnerTexts()).map((x) => x.trim());
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await shot(page, "MEN-05");
  const ok = JSON.stringify(t) === JSON.stringify(["Library", "About", "Resources", "  Methodology", "  Contact", "  Ext", "Docs"]) && en && (stored === null || !JSON.stringify(stored).includes("Docs")) && opts.includes("Draftgroup");
  r.add("MEN-05", pf(ok), `order after adding Docs (No Group) and Ext (Resources): ${JSON.stringify(t)}; Save enabled=${en}; store still holds Docs=${stored !== null && JSON.stringify(stored).includes("Docs")}; unsaved group "Draftgroup" appears in the next Group select: ${JSON.stringify(opts)}`, "MEN-05");
  await page.context().close();
});

await run(r, "MEN-06", async () => {
  const { page } = await open(b, "menu");
  await M.addLink(page, { title: "Docs", url: "/page/abc" });
  await M.edit(page, "Docs");
  const h = await M.panelHeading(page);
  const v = [await page.locator(M.PANEL).getByLabel("Title").inputValue(), await page.locator(M.PANEL).getByLabel("URL").inputValue(), (await page.locator("#menu-item-group").innerText()).trim()];
  const btns = (await page.locator(`${M.PANEL} button`).allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  await M.fill(page, { group: "Resources" }); await M.submit(page, "Update");
  const t1 = await M.titles(page);
  await M.edit(page, "Docs"); const grp = (await page.locator("#menu-item-group").innerText()).trim();
  await M.fill(page, { group: "No Group" }); await M.submit(page, "Update");
  const t2 = await M.titles(page);
  await M.edit(page, "Docs"); await M.fill(page, { title: "Changed" }); await submit2(page);
  const t3 = await M.titles(page);
  async function submit2(p) { await p.locator(M.PANEL).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300); }
  const ok = h === "EDIT LINK" && v[0] === "Docs" && v[1] === "/page/abc" && v[2] === "No Group" && btns.includes("Update") && btns.includes("Cancel") && t1.at(-1) === "  Docs" && grp === "Resources" && t2.at(-1) === "Docs" && JSON.stringify(t3) === JSON.stringify(t2);
  r.add("MEN-06", pf(ok), `panel "${h}" prefilled ${JSON.stringify(v)}; buttons ${JSON.stringify(btns)}; Group -> Resources + Update gives ${JSON.stringify(t1)}; reopened Group shows "${grp}"; Group -> No Group gives ${JSON.stringify(t2)}; Cancel after renaming leaves ${JSON.stringify(t3)}`);
  await page.context().close();
});

await run(r, "MEN-07", async () => {
  const { page } = await open(b, "menu");
  await M.openAdd(page, "group");
  const h = await M.panelHeading(page);
  const fields = await page.locator(`${M.PANEL} label`).allInnerTexts(); const hasUrl = await page.locator(M.PANEL).getByLabel("URL").count(); const hasGroup = await page.locator("#menu-item-group").count();
  await M.fill(page, { title: "Newgroup" }); await M.submit(page, "Add");
  const t = await M.titles(page);
  const hint = await M.rowOf(page, "Newgroup").innerText();
  await M.edit(page, "Newgroup");
  const h2 = await M.panelHeading(page); const f2 = await page.locator(`${M.PANEL} label`).allInnerTexts(); const u2 = await page.locator(M.PANEL).getByLabel("URL").count(); const g2 = await page.locator("#menu-item-group").count();
  await shot(page, "MEN-07");
  const ok = h === "NEW GROUP" && fields.length === 1 && !hasUrl && !hasGroup && t.at(-1) === "Newgroup" && /No links/.test(hint) && h2 === "EDIT GROUP" && !u2 && !g2;
  r.add("MEN-07", pf(ok), `panel "${h}" labels ${JSON.stringify(fields.map((x) => x.trim()))} (URL field ${hasUrl}, Group field ${hasGroup}); after Add rows end with "${t.at(-1)}", row text "${hint.replace(/\n+/g, " / ")}"; Edit opens "${h2}" labels ${JSON.stringify(f2.map((x) => x.trim()))} (URL ${u2}, Group ${g2})`, "MEN-07");
  await page.context().close();
});

await run(r, "MEN-08", async () => {
  const { page } = await open(b, "menu");
  await M.addGroup(page, "Second");
  const before = await M.titles(page);
  const grip = (t) => M.rowOf(page, t).locator("[data-component=ReorderGrip]");
  await grip("Second").dragTo(M.rowOf(page, "Resources")); await page.waitForTimeout(400);
  const t1 = await M.titles(page);
  await grip("Second").dragTo(M.rowOf(page, "Methodology")); await page.waitForTimeout(400);
  const t2 = await M.titles(page);
  // keyboard / buttons: a group never goes under a group
  await M.openAdd(page, "link"); await page.locator("#menu-item-group").click(); await page.waitForTimeout(250);
  const opts = (await page.getByRole("option").allInnerTexts()).map((x) => x.trim());
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  const sec = (x) => x.filter((y) => y.trim() === "Second").map((y) => y.startsWith("  "));
  const ok = JSON.stringify(t1.filter((x) => !x.startsWith("  "))) === JSON.stringify(before.filter((x) => !x.startsWith("  "))) || sec(t1)[0] === false;
  const nested = sec(t1)[0] === true || sec(t2)[0] === true;
  r.add("MEN-08", pf(!nested && opts[0] === "No Group" && JSON.stringify([...opts.slice(1)].sort()) === '["Resources","Second"]'), `rows ${JSON.stringify(before)}; after dragging group "Second" onto group "Resources": ${JSON.stringify(t1)}; onto its link "Methodology": ${JSON.stringify(t2)} (Second indented under a group=${nested}; a drop of a group on a group row reorders it above that group, a drop on a link row changes nothing); Group select options ${JSON.stringify(opts)} (groups only, no links)`, "MEN-08");
  await page.context().close();
});

r.save();
await b.close();
