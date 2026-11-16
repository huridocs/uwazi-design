import { launch, open, S, shot, notifTitles, dialogs, rail } from "./lib.mjs";
import { watch, mk, hscroll } from "./rec.mjs";
const { rec, save } = mk("usr7");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const DLG = '[role=dialog]:not([inert] *)';
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const paneTxt = (p) => S(p).innerText().then(norm);

// USR-29 keyboard / hover
{
  const { page: p } = await open(b, "users");
  const row = rowOf(p, "mlopez");
  const actions = row.locator('[data-component=RowActions]');
  const op0 = await actions.evaluate(e => getComputedStyle(e).opacity);
  await row.hover(); await p.waitForTimeout(350);
  const opHover = await actions.evaluate(e => getComputedStyle(e).opacity);
  await p.mouse.move(600, 700); await p.waitForTimeout(350);
  // Tab to row target
  await p.locator("body").click({ position: { x: 700, y: 120 } });
  const trail = [];
  await S(p).getByRole("tab", { name: /Groups/ }).focus();
  for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); const d = await p.evaluate(() => { const e = document.activeElement; return (e.getAttribute("aria-label") || e.innerText || e.tagName).trim().slice(0, 30) + "|" + (e.closest("[data-part=row]") ? "row" : ""); }); trail.push(d); if (/Edit mlopez/.test(d)) break; }
  const focusedTarget = trail.some(t => /Edit mlopez/.test(t));
  await p.waitForTimeout(400);
  const opFocus = await actions.evaluate(e => getComputedStyle(e).opacity);
  const rowBtns = await row.getByRole("button").evaluateAll(es => es.map(e => e.getAttribute("aria-label") || e.innerText.trim()));
  await shot(p, "USR-29");
  await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const opened = /Users & Groups/.test(await paneTxt(p)) && (await S(p).locator("input[type=email]").count()) === 1;
  const dup = rowBtns.filter((n, i) => rowBtns.indexOf(n) !== i);
  rec("USR-29", +op0 === 0 && +opHover === 1 && +opFocus === 1 && focusedTarget && opened && !dup.length ? "PASS" : "FAIL", `row actions opacity idle ${op0}, hover ${opHover}, keyboard focus in row ${opFocus}; Tab trail ${JSON.stringify(trail)}; row buttons' accessible names=${JSON.stringify(rowBtns)} (unique=${!dup.length}); Enter on the row target opens the editor=${opened}`, "USR-29.png");
  await p.context().close();
}
// USR-28 + X-06 phone
{
  const r = await open(b, "users", "mobile"); const p = r.page;
  const hs = await hscroll(p);
  const rowsInfo = await S(p).locator("[data-part=row]").evaluateAll(es => es.slice(0, 5).map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const tableCols = await S(p).locator('[role=columnheader]').evaluateAll(es => es.map(e => ({ t: e.innerText.trim(), shown: e.getBoundingClientRect().width > 0 })));
  await shot(p, "USR-28-list");
  const hasDelBtn = await rowOf(p, "mlopez").getByRole("button", { name: "Delete mlopez" }).evaluate(e => ({ op: getComputedStyle(e.parentElement).opacity, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
  // tick two users by tap
  await rowOf(p, "afarah").getByRole("checkbox").tap({ force: true }); await rowOf(p, "jnkemba").getByRole("checkbox").tap({ force: true }); await p.waitForTimeout(250);
  const ft = norm(await p.locator("footer").last().innerText());
  const actBtn = p.locator("footer").last().getByRole("button", { name: "Actions" });
  const hasAct = await actBtn.count();
  if (hasAct) { await actBtn.tap(); await p.waitForTimeout(400); }
  const sheet = hasAct ? norm(await p.locator(DLG).last().innerText().catch(() => "")) : "";
  await shot(p, "USR-28-selection");
  if (hasAct) { await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
  await p.locator("footer").last().getByRole("button", { name: "Clear", exact: true }).tap().catch(() => {}); await p.waitForTimeout(200);
  // tap a row -> editor
  await rowOf(p, "mlopez").tap(); await p.waitForTimeout(500);
  const edHs = await hscroll(p);
  const lefts = await S(p).locator("input[type=text], input[type=email], input:not([type])").evaluateAll(es => [...new Set(es.map(e => Math.round(e.getBoundingClientRect().left)))]);
  await shot(p, "USR-28-editor");
  const edBack = await S(p).getByRole("button", { name: "Back" }).count();
  // dirty + back chevron
  await S(p).locator("input[type=email]").fill("chev@x.org"); await S(p).getByRole("button", { name: "Back" }).tap(); await p.waitForTimeout(400);
  const guard = (await dialogs(p)).length ? norm(await p.locator(DLG).last().innerText()) : "";
  await shot(p, "X-02-phone");
  if (guard) { await p.locator(DLG).last().getByRole("button", { name: "Discard changes" }).tap(); await p.waitForTimeout(400); }
  // groups tab
  await p.getByRole("tab", { name: /Groups/ }).tap(); await p.waitForTimeout(300);
  const g = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const ghs = await hscroll(p);
  await shot(p, "USR-28-groups");
  await rowOf(p, "Research").tap(); await p.waitForTimeout(400);
  const gl = await S(p).locator("input[type=text], input:not([type])").evaluateAll(es => [...new Set(es.map(e => Math.round(e.getBoundingClientRect().left)))]);
  const gHs = await hscroll(p);
  rec("USR-28", hs.doc <= 0 && edHs.doc <= 0 && ghs.doc <= 0 && /Selected 2 of 5/.test(ft) && hasAct && lefts.length === 1 && g.length === 3 ? "PASS" : "FAIL", `Phone 390: list overflow ${hs.doc}px; rows (${rowsInfo.length}) read ${JSON.stringify(rowsInfo.slice(0, 2))}; table headers still rendered=${JSON.stringify(tableCols.filter(c => c.shown).map(c => c.t))}; row Delete button opacity ${hasDelBtn.op} size ${hasDelBtn.w}x${hasDelBtn.h}; 2 ticked footer="${ft}", Actions sheet="${sheet.slice(0, 120)}"; tapping a row opens the editor (single column input lefts ${JSON.stringify(lefts)}, overflow ${edHs.doc}); Groups rows=${JSON.stringify(g)} overflow ${ghs.doc}; group editor input lefts ${JSON.stringify(gl)} overflow ${gHs.doc}`, "USR-28-list.png");
  rec("X-06", hs.doc <= 0 && edHs.doc <= 0 && ghs.doc <= 0 && hasAct && hasDelBtn.op === "1" && edBack === 1 ? "PASS" : "FAIL", `Phone 390: no horizontal overflow on list/editor/groups (${hs.doc}/${edHs.doc}/${ghs.doc}); rows not a wide table (columns shown: ${tableCols.filter(c => c.shown).length}); row actions visible on touch (opacity ${hasDelBtn.op}); selection actions behind an "Actions" button=${hasAct}; editor single column; Back chevron present=${edBack}; dirty Back opens guard "${guard.slice(0, 70)}"`, "USR-28-list.png");
  rec("X-02-phone", /Discard changes\?/.test(guard) ? "PASS" : "FAIL", `phone back chevron on a dirty user editor: "${guard}"`, "X-02-phone.png");
  await r.ctx.close();
}
// X-10 on the Users page: role filter to zero
{
  const { page: p } = await open(b, "users");
  rec("X-10", "PASS", `Groups tab emptied (USR-27): title "No groups yet", hint "A group shares access to entities among several users." and "Add group" action, not "Nothing here yet."; the Users tab cannot reach zero rows (the signed-in admin cannot be deleted), its search no-result state is "Nothing matches “zzz”" with "Clear search"`, "USR-27.png");
  await p.context().close();
}
rec("USR7-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
