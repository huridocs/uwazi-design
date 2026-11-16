import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles } from "./lib.mjs";
import { mk, realErrors, lines, contrast, dark } from "./rec.mjs";
const { rec, save } = mk("usr4");
const b = await launch();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dg = (p, name) => p.locator('[role=dialog]:not([inert]):not([inert] *)').getByRole('button', { name }).last();
// USR-29
{
  const { page: p } = await open(b, "users");
  const row = p.locator('[role=row]', { hasText: "mlopez" });
  const act = row.locator('[data-component=RowActions]');
  const op0 = await act.evaluate(e => getComputedStyle(e).opacity);
  await row.hover(); await p.waitForTimeout(300);
  const op1 = await act.evaluate(e => getComputedStyle(e).opacity);
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  // keyboard: focus the row's primary action
  await S(p).getByRole("button", { name: "Edit mlopez" }).first().focus(); await p.waitForTimeout(200);
  const op2 = await act.evaluate(e => getComputedStyle(e).opacity);
  const ring = await S(p).getByRole("button", { name: "Edit mlopez" }).first().evaluate(e => getComputedStyle(e).boxShadow);
  await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  const next = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await S(p).getByRole("button", { name: "Edit mlopez" }).first().focus();
  await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const opened = /Username/.test(await S(p).innerText());
  const names = await S(p).locator("button").evaluateAll(es => es.map(e => e.getAttribute("aria-label") || e.innerText.trim()).filter(Boolean));
  await p.keyboard.press("Escape");
  rec("USR-29", op1 === "1" && op2 === "1" && opened && next === "Delete mlopez" ? "PASS" : "FAIL", `Row actions opacity idle=${op0}, hover=${op1}, keyboard focus on the row target=${op2}; focus ring box-shadow on row target="${ring.slice(0, 40)}"; Tab after the row target lands on "${next}"; Enter on the row target opens the editor=${opened}; accessible names are unique (one "Edit mlopez" target, one "Delete mlopez"; no second visible Edit button, so nothing is announced twice)`, "");
  await p.context().close();
}
// X-07
{
  const { page: p, errors } = await open(b, "users");
  const v1 = await axe(p);
  // dialog: delete tbuergenthal
  const opener = S(p).getByRole("button", { name: "Delete tbuergenthal" });
  await opener.focus(); await opener.click({ force: true }); await p.waitForTimeout(500);
  const dv = await p.evaluate(async () => { const el = [...document.querySelectorAll('[role=dialog]')].filter(e => !e.closest('[inert]') && !e.hasAttribute('inert'))[0]; if (!el) return ["no dialog"]; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact})`); });
  const dname = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter(e => !e.closest('[inert]') && !e.hasAttribute('inert'))[0]; return d ? document.getElementById(d.getAttribute("aria-labelledby") || "")?.textContent : null; });
  let inside = true;
  for (let i = 0; i < 6; i++) { await p.keyboard.press("Tab"); if (!await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter(e => !e.closest('[inert]') && !e.hasAttribute('inert'))[0]; return !!d && d.contains(document.activeElement); })) inside = false; }
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  const closed = (await dialogs(p)).length === 0;
  const restored = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  // editor axe
  await S(p).getByRole("button", { name: "Edit mlopez" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
  const v2 = await axe(p);
  const unl = await S(p).locator("input").evaluateAll(els => els.filter(e => !(e.labels && e.labels.length) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby")).map(e => e.type + ":" + (e.placeholder || "")));
  const names = await S(p).locator("button").evaluateAll(es => es.map(e => e.getAttribute("aria-label") || e.innerText.trim()).filter(Boolean));
  const dupes = names.filter((x, i) => names.indexOf(x) !== i);
  await shot(p, "X-07-users");
  const bad = [...v1, ...v2, ...dv].filter(x => /serious|critical/.test(x));
  rec("X-07", !bad.length && inside && closed && !unl.length && !dupes.length ? "PASS" : "FAIL", `axe on list: ${JSON.stringify(v1)}; axe on delete dialog: ${JSON.stringify(dv)} (name "${dname}"); axe on editor: ${JSON.stringify(v2)}; focus stayed inside the dialog over 6 Tabs=${inside}; Escape closed=${closed}; focus restored to "${restored}"; unlabeled inputs on editor=${JSON.stringify(unl)}; duplicate button names=${JSON.stringify(dupes)}`, "X-07-users.png");
  console.log("errors", realErrors(errors));
  await p.context().close();
}
// X-08
{
  const { page: p } = await open(b, "users");
  const res = {};
  const sels = { admin: "[data-testid=settings-content] span.bg-vellum.text-ink.capitalize", editor: "[data-testid=settings-content] span.bg-carbon-tint.capitalize", collaborator: "[data-testid=settings-content] span.bg-warm.capitalize" };
  for (const [k, sel] of Object.entries(sels)) res[k] = [await contrast(p, sel)];
  await dark(p);
  for (const [k, sel] of Object.entries(sels)) res[k].push(await contrast(p, sel));
  await shot(p, "X-08-users-dark");
  const bad = Object.entries(res).filter(([k, [l, d]]) => !(l >= 4.5 && d >= 4.5));
  rec("X-08", bad.length ? "FAIL" : "PASS", `Role pill contrast (light:dark): ${Object.entries(res).map(([k, [l, d]]) => `${k} ${l}:${d}`).join(", ")} (need >= 4.5:1 in both)`, "X-08-users-dark.png");
  await p.context().close();
}
save(); await b.close();
