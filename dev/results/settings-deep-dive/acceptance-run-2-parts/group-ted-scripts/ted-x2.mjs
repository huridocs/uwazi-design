// X-06, X-07, X-08 on the template editor: light/dark x 1280/390, axe, dialog behaviour, contrast, phone layout
import { launch, openEditorPhone, pickOpt, S, rec, wait, strip, shot, openEditor, saveBtn, propRows, propNames, dlg, openAdd, pickType, errs, guardFor, ONLY, dialogs, axeSrc, rowPills } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const confirmSel = "[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)";
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const el = document.querySelector(sel) || document.body; const r = await window.axe.run(el, { resultTypes: ["violations"] }); return r.violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`); }, sel); };
const panelSel = "[role=dialog][data-part=panel]:not([inert]):not([inert] *)";
const inside = (p, sel) => p.evaluate((sel) => !!document.querySelector(sel)?.contains(document.activeElement), sel);
const active = (p) => p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText?.trim().slice(0, 40) || document.activeElement?.tagName);
const theme = async (p, dark) => { if (dark) await p.evaluate(() => document.documentElement.classList.add("dark")); await wait(p, 250); };
const contrastScan = (p, scope) => p.evaluate((scope) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) chain.push(c); if (c[3] === 1) break; } let base = [255, 255, 255, 1]; if (!chain.length || chain[chain.length - 1][3] < 1) base = rgba(getComputedStyle(document.documentElement).backgroundColor)[3] ? rgba(getComputedStyle(document.documentElement).backgroundColor) : (document.documentElement.classList.contains("dark") ? [20, 20, 20, 1] : [255, 255, 255, 1]); for (let i = chain.length - 1; i >= 0; i--) base = over(chain[i], base); return base; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const root = document.querySelector(scope);
  const out = [];
  for (const el of root.querySelectorAll("*")) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(" ");
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || el.closest("[inert]")) continue;
    let fg = rgba(cs.color); const bg = bgOf(el); fg = over(fg, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const pill = /rounded/.test(el.className) || /rounded/.test(el.parentElement?.className || "");
    out.push({ t: own.slice(0, 30), ratio: Math.round(ratio * 100) / 100, pill: pill && !el.closest("footer") && own.length > 1, size: cs.fontSize, footer: !!el.closest("footer") });
  }
  return out;
}, scope);

const combos = [["desktop", false], ["desktop", true], ["mobile", false], ["mobile", true]];
const x7 = {}, x8 = {}, x6 = {};
for (const [vp, dark] of combos) {
  const key = `${vp === "desktop" ? 1280 : 390}${dark ? "-dark" : "-light"}`;
  const c = vp === "mobile" ? await openEditorPhone(b, "Court Case") : await openEditor(b, "Court Case", vp); const p = c.page; await theme(p, dark);
  const r = { dialogs: {} };
  // page
  r.page = await axeOn(p, "[data-testid=settings-content]");
  await shot(p, "X-07-page-" + key);
  // row names, labels
  r.dupNames = await p.evaluate(() => { const names = [...document.querySelectorAll("[data-testid=settings-content] [data-part=property] button, [data-testid=settings-content] [data-part=property] input[type=checkbox]")].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.getAttribute("aria-label") || e.innerText || "").trim()); const seen = {}; for (const n of names) seen[n] = (seen[n] || 0) + 1; return Object.entries(seen).filter(([k, v]) => v > 1 && k).map(([k, v]) => k + " x" + v); });
  r.unlabelled = await p.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input, [data-testid=settings-content] select, [data-testid=settings-content] textarea")].filter(e => e.type !== "hidden" && e.getBoundingClientRect().width > 0 && !(e.labels && e.labels.length) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby")).map(e => (e.id || e.name || e.type)));
  // dialogs
  const dialogCases = [
    ["Add property", async () => { await S(p).getByRole("button", { name: "Add property" }).click(); }, panelSel, async () => { await dlg(p).getByRole("button", { name: "Cancel" }).click(); }, "Add property"],
    ["Add property (Relationship)", async () => { await S(p).getByRole("button", { name: "Add property" }).click(); await wait(p, 300); await pickType(p, "Relationship"); }, panelSel, async () => { await p.keyboard.press("Escape"); }, "Add property"],
    ["Edit property", async () => { await S(p).getByRole("button", { name: "Edit Case number", exact: true }).click(); }, panelSel, async () => { await p.keyboard.press("Escape"); }, "Edit Case number"],
    ["Add thesaurus", async () => { await S(p).getByRole("button", { name: "Add thesaurus" }).click(); }, panelSel, async () => { await dlg(p).getByRole("button", { name: "Cancel" }).click(); }, "Add thesaurus"],
    ["Add relationship type", async () => { await S(p).getByRole("button", { name: "Add relationship type" }).click(); }, panelSel, async () => { await p.keyboard.press("Escape"); }, "Add relationship type"],
    ["Template colour", async () => { await S(p).getByRole("button", { name: "Template color" }).click(); }, "[role=dialog][aria-label='Template color']", async () => { await p.keyboard.press("Escape"); }, "Template color"],
  ];
  for (const [name, open, sel, close, openerName] of dialogCases) {
    const d = {};
    await open(); await wait(p, 450);
    const el = p.locator(sel).last();
    d.exists = await el.count();
    if (d.exists) {
      d.role = await el.getAttribute("role"); d.name = (await el.getAttribute("aria-label")) || (await el.getAttribute("aria-labelledby")) || null;
      d.focusIn = await inside(p, sel);
      let stay = true; for (let i = 0; i < 24; i++) { await p.keyboard.press("Tab"); if (!(await inside(p, sel))) { stay = false; break; } }
      d.trap = stay;
      d.axe = await axeOn(p, sel);
      if (key === "1280-light" || key === "390-dark") await shot(p, "X-07-dialog-" + name.replace(/[^A-Za-z]+/g, "") + "-" + key);
      await close(); await wait(p, 450);
      d.closed = (await p.locator(sel).count()) === 0;
      d.restored = await active(p);
      d.restoredOk = new RegExp(openerName.replace(/[()]/g, "")).test(d.restored || "") || (name === "Template colour" && /Template color/.test(d.restored || ""));
    }
    r.dialogs[name] = d;
  }
  // confirm dialogs: save impact and refused removal
  await S(p).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(p, 400);
  await pickOpt(p, "Thesaurus", "Countries");
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  await saveBtn(p).click(); await wait(p, 700);
  const cd = p.locator(confirmSel).first();
  r.impact = { exists: await cd.count() };
  if (r.impact.exists) { const dd = cd.locator("[role=dialog]").first(); r.impact.role = await dd.getAttribute("role"); r.impact.name = (await dd.getAttribute("aria-label")) || (await dd.getAttribute("aria-labelledby")); r.impact.axe = await axeOn(p, "[data-component=ConfirmDelete] [role=dialog], [data-component=ConfirmDialog] [role=dialog]"); r.impact.focusIn = await p.evaluate(() => { const d = [...document.querySelectorAll("[data-component=ConfirmDelete],[data-component=ConfirmDialog]")].find(e => !e.closest("[inert]") && e.querySelector("[role=dialog]")); return !!d?.contains(document.activeElement); }); await shot(p, "X-07-confirm-" + key); await p.keyboard.press("Escape"); await wait(p, 400); r.impact.closedByEsc = (await p.locator(confirmSel).count()) === 0; r.impact.restored = await active(p); }
  // Escape closes only the top layer: panel + open Select list
  await S(p).getByRole("button", { name: "Add property" }).click(); await wait(p, 300);
  await dlg(p).getByRole("button", { name: /Property type/ }).click(); await wait(p, 250);
  await p.keyboard.press("Escape"); await wait(p, 300);
  r.escLayer = { listClosed: (await p.locator("[role=listbox]").count()) === 0, panelStill: (await p.locator(panelSel).count()) === 1 };
  await p.keyboard.press("Escape"); await wait(p, 300);
  r.escLayer.panelClosed = (await p.locator(panelSel).count()) === 0;
  x7[key] = r;
  // X-08 contrast on the property rows and footer
  const sc = await contrastScan(p, "[data-testid=settings-content]");
  const pills = sc.filter(x => x.pill), all = sc;
  x8[key] = { n: all.length, pills: pills.length, minAll: Math.min(...all.map(x => x.ratio)), minPill: pills.length ? Math.min(...pills.map(x => x.ratio)) : null, low: all.filter(x => x.ratio < 4.5).map(x => x.t + " " + x.ratio + " " + x.size + (x.footer ? " footer" : "")).slice(0, 8), lowPills: pills.filter(x => x.ratio < 4.5).map(x => x.t + " " + x.ratio).slice(0, 8) };
  await shot(p, "X-08-" + key);
  if (vp === "mobile") {
    const lay = await p.evaluate(() => { const pane = document.querySelector("[data-testid=settings-content]"); const aside = pane.querySelector("aside"); const rows = [...pane.querySelectorAll("[data-part=property]")]; const last = rows[rows.length - 1]; const ar = aside && aside.getBoundingClientRect(); const lr = last.getBoundingClientRect(); const small = [...pane.querySelectorAll("button,input[type=checkbox],a,[role=checkbox]")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[inert]") && (r.width < 24 || r.height < 24); }).map(e => (e.getAttribute("aria-label") || e.innerText || e.tagName).trim().slice(0, 30) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)); return { docScrollW: document.documentElement.scrollWidth, innerW: innerWidth, paneScrollW: pane.scrollWidth, paneClientW: pane.clientWidth, asideBelow: !!ar && ar.top >= lr.bottom - 2, asideLeft: ar && Math.round(ar.left), rowLeft: Math.round(lr.left), small: small.slice(0, 12), smallN: small.length }; });
    x6[key] = lay;
  }
  if (vp === "mobile") {
    await S(p).getByRole("checkbox", { name: "Select Victim", exact: true }).check(); await wait(p, 300);
    x6[key].selFooter = await S(p).locator("footer").evaluate(f => { const els = [...f.querySelectorAll("button,[role=status],[data-part=last-saved]")].filter(e => e.getBoundingClientRect().width > 0 && e.innerText.trim()); const boxes = els.map(e => ({ t: e.innerText.trim().slice(0, 24), r: e.getBoundingClientRect() })); const over = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].r, b = boxes[j].r; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 2 && h > 2) over.push(boxes[i].t + " x " + boxes[j].t + " " + Math.round(w) + "px"); } return { items: boxes.map(b => b.t), overlaps: over }; });
    await shot(p, "X-06-selection-footer-" + key);
  }
  r.errs = errs(c.errors).filter(x => !/same key/.test(x));
  await c.ctx.close();
}
const fmt = (o) => JSON.stringify(o);
// X-07
const allAxe = []; const behaviour = [];
for (const [key, r] of Object.entries(x7)) {
  if (r.page.length) allAxe.push(`${key} page: ${r.page.join("; ")}`);
  for (const [n, d] of Object.entries(r.dialogs)) { if (d.axe && d.axe.length) allAxe.push(`${key} ${n}: ${d.axe.join("; ")}`); if (!d.exists || d.role !== "dialog" || !d.name || !d.focusIn || !d.trap || !d.closed || !d.restoredOk) behaviour.push(`${key} ${n}: ${fmt({ role: d.role, name: d.name, focusIn: d.focusIn, trap: d.trap, closed: d.closed, restored: d.restored })}`); }
  if (r.impact.axe && r.impact.axe.length) allAxe.push(`${key} confirm: ${r.impact.axe.join("; ")}`);
  if (!(r.impact.exists && r.impact.role && r.impact.name && r.impact.focusIn && r.impact.closedByEsc)) behaviour.push(`${key} confirm: ${fmt(r.impact)}`);
  if (!(r.escLayer.listClosed && r.escLayer.panelStill && r.escLayer.panelClosed)) behaviour.push(`${key} escape layers ${fmt(r.escLayer)}`);
}
const dups = [...new Set(Object.values(x7).flatMap(r => r.dupNames))];
const unl = [...new Set(Object.values(x7).flatMap(r => r.unlabelled))];
const errsAll = Object.values(x7).flatMap(r => r.errs);
rec("X-07", !allAxe.length && !behaviour.length && !dups.length && !unl.length && !errsAll.length ? "PASS" : "FAIL", `axe-core (serious/critical) over the page and 7 dialogs (Add property, Add property as Relationship, Edit property, Add thesaurus, Add relationship type, colour picker, Save impact confirm) at 1280 and 390, light and dark: violations ${fmt(allAxe)}. Dialog behaviour (role=dialog, accessible name, focus lands inside, Tab trapped over 24 presses, closes, focus returns to the opener, Escape closes only the top layer): exceptions ${fmt(behaviour)}. Row buttons or checkboxes sharing an accessible name: ${fmt(dups)}. Inputs without a label: ${fmt(unl)}. Console errors: ${fmt(errsAll)}.`, "X-07-page-1280-light");
// X-08
const lowAny = Object.entries(x8).filter(([, v]) => v.lowPills.length || v.minPill !== null && v.minPill < 4.5);
rec("X-08", lowAny.length === 0 ? "PASS" : "FAIL", `Contrast of every text run in the editor (pills and badges flagged separately) per mode: ${fmt(Object.fromEntries(Object.entries(x8).map(([k, v]) => [k, { runs: v.n, pills: v.pills, minPill: v.minPill, minAll: v.minAll, belowAA: v.low }])))}. Visual look: screenshots acceptance-run-2-shots/X-08-<width>-<mode>.png.`, "X-08-1280-dark");
// X-06
const m = x6["390-light"], md = x6["390-dark"];
rec("X-06", m && m.docScrollW <= m.innerW && m.paneScrollW <= m.paneClientW + 1 && m.asideBelow && m.smallN === 0 && m.selFooter && m.selFooter.overlaps.length === 0 && Object.entries(x7).filter(([k]) => k.startsWith("390")).every(([, r]) => Object.values(r.dialogs).every(d => d.exists)) ? "PASS" : "FAIL", `Phone 390x844: document scrollWidth ${m.docScrollW} of ${m.innerW}, pane ${m.paneScrollW}/${m.paneClientW} (no horizontal scroll); preview aside below the property rows (single column)=${m.asideBelow}; touch targets under 24x24 px: ${m.smallN} ${fmt(m.small)}; dark ${fmt({ docScrollW: md.docScrollW, small: md.smallN })}. Footer while a row is ticked: items ${fmt(m.selFooter && m.selFooter.items)}, overlapping pairs ${fmt(m.selFooter && m.selFooter.overlaps)} (dark ${fmt(md.selFooter && md.selFooter.overlaps)}). Dialog and sheet sizes, the draft guard and the Back chevron are in TED-33, TED-108 and TED-109 (same run).`, "X-07-page-390-light");
await b.close();
