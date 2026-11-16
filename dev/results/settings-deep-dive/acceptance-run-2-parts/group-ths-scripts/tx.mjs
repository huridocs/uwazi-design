import { S, wait, clean, nlist, strip, rail, sh, rec, guardInfo } from "./g.mjs";
import { commitBtn, nameInput, vrows, addVals, listRows, openThes, newThes, saveThes, cancelBtn } from "./tlib.mjs";
export * from "./g.mjs"; export * from "./dev.mjs";
export { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, valueCount, secTitle, saveThes, guard, toThesauri, makeThes } from "./tlib.mjs";
export const label = (p, t) => S(p).getByRole("button", { name: `${t}, rename`, exact: true });
export const rowOf = (p, name) => S(p).locator("li[data-row-id]").filter({ has: p.getByRole("button", { name: `${name}, rename`, exact: true }) }).first();
export const footerTxt = async (p) => clean(await S(p).locator("footer").innerText());
export const saveClick = (p) => commitBtn(p).click({ force: true });
/** notifications newer than a snapshot (timestamps stripped) */
export const fresh = async (p, before) => { const cnt = new Map(); for (const t of before.map(strip)) cnt.set(t, (cnt.get(t) || 0) + 1); const out = []; for (const t of (await nlist(p)).map(strip)) { if (/\d+%$|^Uploading|^Processing/.test(t)) continue; const c = cnt.get(t) || 0; if (c > 0) cnt.set(t, c - 1); else out.push(t); } return out; };
export const actName = (p) => p.evaluate(() => { const a = document.activeElement; return a === document.body ? "BODY" : (a.getAttribute("aria-label") || a.innerText || a.tagName); });
/** create + save a thesaurus quickly, returns to list */
export async function make(p, name, labels = []) { await newThes(p, name); if (labels.length) await addVals(p, labels); await saveThes(p); }
export const enabled = (p, loc) => loc.isEnabled();
export const addGroup = async (p, name, kids = []) => {
  await S(p).getByRole("button", { name: "Add group", exact: true }).first().click(); await wait(p, 200);
  await p.keyboard.type(name); await p.keyboard.press("Enter"); await wait(p, 150);
  for (const k of kids) { await p.keyboard.type(k); await p.keyboard.press("Enter"); await wait(p, 120); }
  await p.keyboard.press("Escape"); await wait(p, 200);
};
export const tick = async (p, name) => { await S(p).getByRole("checkbox", { name: `Select ${name}` }).check(); await wait(p, 100); };
export const openBeacon = async (p) => { await p.getByRole("button", { name: /^Notifications/ }).click(); await wait(p, 400); };
export async function goLibrary(p) { await p.locator("button", { hasText: "Library" }).first().click(); await wait(p, 2500); }
/** the Library card text of Case 10.488 (STATUS line) */
export const caseCard = (p) => p.evaluate(() => { const b = document.querySelector('button[aria-label="Preview Case 10.488 (Ellacuría)"]'); if (!b) return null; const card = b.parentElement; return card.innerText.replace(/\s+/g, " ").trim(); });
export async function openCaseEdit(p) {
  await p.getByRole("button", { name: "Preview Case 10.488 (Ellacuría)" }).click({ force: true }); await wait(p, 1200);
  await p.getByRole("button", { name: /View entity/ }).click(); await wait(p, 1500);
  await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 1200);
}
export const dialogText = async (p) => clean(await p.evaluate(() => [...document.querySelectorAll("[data-component=ConfirmDelete],[data-component=ConfirmDialog],[data-component=Modal]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText).join(" | ")));
export const errMark = (p) => (p.__errors ? p.__errors.length : 0);
export const errNew = (p, m) => { const c = new Map(); for (const e of (p.__errors || []).slice(m)) { if (/atomFamily is deprecated|fetchPriority|TextLayer task cancelled/.test(e)) continue; const k = e.replace(/\s+/g, " ").replace(/^(error: Warning: Encountered two children with the same key).*?%s ([^ ]+) at .*$/, "$1 `$2` (stack: TemplateEditor PropertyRow)").slice(0, 140); c.set(k, (c.get(k) || 0) + 1); } return [...c].map(([k, n]) => k + " x" + n); };
export const rowDelete = async (p, name) => { const r = S(p).locator("[data-part=row]").filter({ hasText: name }).first(); await r.hover(); await r.getByRole("button", { name: `Delete ${name}` }).click(); await wait(p, 400); };
export const dark = (p) => p.evaluate(() => document.documentElement.classList.add("dark"));
export const light = (p) => p.evaluate(() => document.documentElement.classList.remove("dark"));
export const serious = (arr) => arr.filter((v) => /\((serious|critical)\)/.test(v));
import { axeSrc as _axeSrc } from "./lib.mjs";
/** axe on the open dialog element(s) only (all violations, any impact) */
export const axeDialog = async (p) => { await p.evaluate(_axeSrc); return p.evaluate(async () => { const els = [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")); const out = []; for (const el of els) { const r = await window.axe.run(el, { resultTypes: ["violations"] }); for (const v of r.violations) out.push(`${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ").slice(0, 70) + " [" + (n.any[0]?.data?.contrastRatio ?? "") + "]").join(" | ")}`); } return out; }); };
/** axe color-contrast on the whole page for any impact, with ratios */
export const axeContrast = async (p) => { await p.evaluate(_axeSrc); return p.evaluate(async () => { const r = await window.axe.run(document.body, { runOnly: ["color-contrast"] }); return r.violations.flatMap((v) => v.nodes.map((n) => `${n.html.slice(0, 90).replace(/\s+/g, " ")} ratio ${n.any[0]?.data?.contrastRatio} (${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor})`)); }); };
export { libFacet, facetTop, facetGroups, newTemplate } from "./lib2.mjs";
export const showBox = (p, name) => S(p).getByRole("checkbox", { name: `Show ${name}`, exact: true });
export const saveF = (p) => S(p).locator("footer").getByRole("button", { name: /^Save$/ });
export const discardF = (p) => S(p).locator("footer").getByRole("button", { name: /^Discard changes$/ });
export const fRows = (p) => S(p).locator("[data-part=row]").filter({ has: p.locator('input[aria-label^="Show "]') }).evaluateAll((rs) => rs.map((r) => { const name = (r.querySelector('[role=checkbox],input[type=checkbox]')?.getAttribute("aria-label") || "").replace(/^Show /, ""); const on = !!r.querySelector('[role=checkbox][aria-checked=true],input[type=checkbox]:checked'); return `${on ? "+" : "-"}${name}`; }));
export const fHeader = async (p) => clean(await S(p).locator("h2").first().innerText());
export const frow = (p, name) => S(p).locator("[data-part=row]").filter({ has: p.locator(`input[aria-label="Show ${name}"]`) }).first();
export const groupSel = (p, name) => frow(p, name).locator('button[aria-label^="Move to group"]');
export async function setGroupOf(p, name, group) { await groupSel(p, name).click(); await wait(p, 250); await p.getByRole("option", { name: group, exact: true }).click(); await wait(p, 250); }
export const newGroup = async (p, name) => { await S(p).getByRole("button", { name: "New group" }).click(); await wait(p, 200); const inputs = S(p).locator('input[aria-label="Group name"]'); const i = inputs.last(); if (name !== undefined) await i.fill(name); await wait(p, 100); return i; };
export const groupNames = (p) => S(p).locator('input[aria-label="Group name"]').evaluateAll((e) => e.map((x) => x.value));
export const kbValue = (p) => p.evaluate(() => ({ kb: document.documentElement.style.getPropertyValue("--kb"), ih: innerHeight, vvh: window.visualViewport?.height }));
/** Workaround for the stuck --kb: make the app recompute it. */
export const refreshKb = (p) => p.evaluate(() => window.visualViewport?.dispatchEvent(new Event("resize")));
export const panelGeo = (p) => p.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !/Notifications/.test(e.getAttribute("aria-label") || "")).pop(); if (!d) return null; const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottomGap: Math.round(innerHeight - r.bottom), vw: innerWidth, btn: [...d.querySelectorAll("button")].map((x) => { const q = x.getBoundingClientRect(); return `${(x.innerText || x.getAttribute("aria-label") || "").trim().slice(0, 14)} ${Math.round(q.width)}x${Math.round(q.height)}`; }) }; });
export const relRows = (p) => S(p).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
export const relNames = (p) => S(p).locator("[data-part=row] [data-column=name]").evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
export const relPills = (p, name) => S(p).locator("[data-part=row]").filter({ has: p.locator("[data-column=name]", { hasText: name }) }).first().locator("[data-column=templates]").innerText().then((t) => t.replace(/\s+/g, " ").trim());
export const addTypeBtn = (p) => S(p).locator("footer").getByRole("button", { name: /Add relationship type/ });
export const relName = (p) => S(p).getByLabel("Name", { exact: true });
export const relSave = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create relationship type|Add)$/ });
export async function addRelType(p, name) { await addTypeBtn(p).click(); await wait(p, 400); await relName(p).fill(name); await relSave(p).click({ force: true }); await wait(p, 600); }
export const openRel = async (p, name) => { await S(p).locator("[data-part=row]").filter({ hasText: name }).first().click(); await wait(p, 500); };
export const delRel = async (p, name) => { const r = S(p).locator("[data-part=row]").filter({ hasText: name }).first(); await r.hover(); await r.getByRole("button", { name: `Delete ${name}` }).click(); await wait(p, 400); };
import { rail as _rail } from "./lib.mjs";
/** toSettings that survives a left-open overlay: Escape and a modal Cancel/Close, then retry */
export async function toSettingsSafe(p, item) {
  for (let i = 0; i < 4; i++) {
    try { await p.locator('button:has-text("Settings")').first().click({ timeout: 3000 }); break; }
    catch (e) { await sh(p, "dbg-overlay-" + i); await p.keyboard.press("Escape"); await wait(p, 300); const m = p.locator("[data-component=CreateRelationshipModal],[role=dialog]:not([inert] *)").getByRole("button", { name: /^(Cancel|Close)$/ }).first(); if (await m.count()) await m.click({ timeout: 1500 }).catch(() => {}); await wait(p, 300); if (i === 3) throw e; }
  }
  await wait(p, 250); await p.getByRole("button", { name: /System settings/ }).click(); await wait(p, 600); if (item) await _rail(p, item); await wait(p, 400);
}
