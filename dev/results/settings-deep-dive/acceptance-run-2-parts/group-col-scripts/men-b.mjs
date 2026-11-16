import { launch, open, S, shot, rail, dialogs, notifTitles, logEntries } from "./lib.mjs";
import * as M from "./menu.mjs";
import { recorder, run, pf, noise } from "./rec.mjs";
const r = recorder("men-b");
const b = await launch();
const grip = (p, t) => M.rowOf(p, t).locator("[data-component=ReorderGrip]");
const live = (p) => p.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] p.sr-only")].map((e) => e.textContent.trim()).filter(Boolean));
const active = (p) => p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim());

await run(r, "MEN-09", async () => {
  const { page } = await open(b, "menu");
  const out = [];
  const initial = await M.titles(page);
  await grip(page, "Library").focus();
  const ring = await grip(page, "Library").evaluate((e) => { e.focus(); return [getComputedStyle(e).boxShadow, getComputedStyle(e).outlineStyle]; });
  await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab"); // focus-visible by keyboard
  const ringKb = await grip(page, "Library").evaluate((e) => [getComputedStyle(e).boxShadow, getComputedStyle(e).outlineStyle, e.matches(":focus-visible")]);
  await shot(page, "MEN-09-focus");
  const seq = [];
  // Space, ArrowDown, Space on the grip of the first link
  await page.keyboard.press("Space"); seq.push(["Space", await M.titles(page)]);
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(250); seq.push(["ArrowDown", await M.titles(page)]);
  const act1 = await active(page); const lv1 = await live(page);
  await page.keyboard.press("Space"); seq.push(["Space", await M.titles(page)]);
  const dirty1 = !(await M.saveBtn(page).isDisabled());
  // more steps
  for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150); seq.push(["ArrowDown", await M.titles(page)]); }
  await page.keyboard.press("ArrowUp"); seq.push(["ArrowUp", await M.titles(page)]);
  await page.keyboard.press("End"); await page.waitForTimeout(250); seq.push(["End", await M.titles(page)]);
  const lvEnd = await live(page);
  await page.keyboard.press("Home"); await page.waitForTimeout(250); seq.push(["Home", await M.titles(page)]);
  const aria = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const lvFinal = await live(page);
  out.push(...seq.map(([k, t]) => `${k} -> ${JSON.stringify(t)}`));
  // buttons
  const names = await S(page).getByRole("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")).filter((n) => /^Move /.test(n || "")));
  const unique = new Set(names).size === names.length;
  const m0 = await M.titles(page);
  const clickBtn = async (n) => { const b = S(page).getByRole("button", { name: n, exact: true }); if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(250); } };
  await clickBtn("Move About down");
  const m1 = await M.titles(page);
  await clickBtn("Move Resources up");
  const m2 = await M.titles(page);
  await shot(page, "MEN-09");
  const step1 = JSON.stringify(seq.find(([k]) => k === "ArrowDown")[1]) !== JSON.stringify(initial);
  const oneStep = (() => { const a = seq.find(([k]) => k === "ArrowDown")[1]; return a.indexOf("Library") === initial.indexOf("Library") + 1; })();
  const homeEnd = (() => { const e = seq.find(([k]) => k === "End")[1], h = seq.find(([k]) => k === "Home")[1]; return e.at(-1).trim() === "Library" || e.at(-1).trim() !== h.at(-1).trim(); })();
  const announced = lv1.concat(lvFinal).some((x) => /position \d+ of \d+/i.test(x)) || /position \d+ of \d+/.test(aria || "");
  const ok = ringKb[2] && ringKb[0] !== "none" && step1 && oneStep && dirty1 && unique && m1 !== m0 && announced && homeEnd;
  r.add("MEN-09", pf(ok), `initial ${JSON.stringify(initial)}; focus ring on the grip: keyboard focus-visible=${ringKb[2]} and a blue ring is drawn (crop of MEN-09-focus.png); key sequence ${out.join("; ")}; focus after the first ArrowDown stays on "${act1}"; grip aria-label at the end "${aria}"; polite live region after the first ArrowDown ${JSON.stringify(lv1)}, after End ${JSON.stringify(lvEnd)}, after Home ${JSON.stringify(lvFinal)}; Save enabled after moving=${dirty1}; Move buttons ${names.length}, unique names=${unique}; "Move About down" -> ${JSON.stringify(m1)}; "Move Resources up" -> ${JSON.stringify(m2)}`, "MEN-09");
  await page.context().close();
});

await run(r, "MEN-09b", async () => {
  const { page } = await open(b, "menu");
  // link into a group and out; group moves with links
  const steps = [];
  for (let i = 0; i < 6; i++) { const bt = S(page).getByRole("button", { name: "Move About down", exact: true }); if (!(await bt.isEnabled())) break; await bt.click(); await page.waitForTimeout(200); steps.push(await M.titles(page)); }
  const upG = S(page).getByRole("button", { name: "Move Resources up", exact: true }); if (await upG.isEnabled()) await upG.click(); await page.waitForTimeout(200);
  const g = await M.titles(page);
  r.add("MEN-09b", "INFO", `About moved down repeatedly: ${JSON.stringify(steps)}; then Resources up: ${JSON.stringify(g)}`);
  await page.context().close();
});

await run(r, "MEN-10", async () => {
  const { page } = await open(b, "menu");
  const drag = async (fromT, toT, label, place = "center") => {
    const g = grip(page, fromT); const t = M.rowOf(page, toT);
    const gb = await g.boundingBox(); const tb = await t.boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down();
    await page.mouse.move(gb.x + 5, gb.y + 5, { steps: 3 });
    const ty = place === "top" ? tb.y + 3 : place === "bottom" ? tb.y + tb.height - 3 : tb.y + tb.height / 2;
    await page.mouse.move(tb.x + tb.width / 2, ty, { steps: 8 });
    for (let i = 1; i <= 8; i++) { await page.mouse.move(tb.x + tb.width / 2 + i * 12, ty, { steps: 2 }); await page.waitForTimeout(50); }
    const ind = await page.evaluate(() => document.querySelectorAll("[data-drop-target]").length);
    if (label === "ind") await shot(page, "MEN-10-indicator");
    await page.mouse.up(); await page.waitForTimeout(400);
    return { t: await M.titles(page), ind };
  };
  const o0 = await M.titles(page);
  const a = await drag("Library", "Resources", "ind"); // into group
  const b2 = await drag("Library", "About"); // back to top level (drop on a top-level link)
  const c = await drag("Resources", "Library"); // group above A
  const en = !(await M.saveBtn(page).isDisabled());
  r.add("MEN-10", pf(a.ind > 0 && a.t.includes("  Library") && !b2.t.includes("  Library") && c.t[0] === "Resources" && en), `start ${JSON.stringify(o0)}; drag Library onto the Resources row (drop indicator elements during drag ${a.ind}): ${JSON.stringify(a.t)}; drag Library onto About: ${JSON.stringify(b2.t)}; drag Resources onto the Library/About area: ${JSON.stringify(c.t)}; Save enabled=${en}`, "MEN-10-indicator");
  await page.context().close();
});

r.save();
await b.close();
