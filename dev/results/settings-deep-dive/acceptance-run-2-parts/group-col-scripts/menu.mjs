import { S, rail, dialogs, notifTitles } from "./lib.mjs";
export const PANEL = "[data-component=MenuItemPanel]";
export const titles = (p) => S(p).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => { const t = r.querySelector(".font-medium.truncate"); const ind = !!t.closest("div.ps-6"); return (ind ? "  " : "") + t.textContent.trim(); }));
export const urls = (p) => S(p).locator("[data-part=row]").evaluateAll((rs) => rs.map((r) => r.querySelector("[dir=ltr]")?.textContent.trim() ?? "[group]"));
export const rowOf = (p, title) => S(p).locator("[data-part=row]").filter({ has: p.locator("span.font-medium.truncate", { hasText: new RegExp("^" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }) }).first();
export const addBtn = (p, n) => S(p).getByRole("button", { name: n, exact: true });
export const saveBtn = (p) => S(p).getByRole("button", { name: "Save", exact: true });
export const openAdd = async (p, kind) => { await addBtn(p, kind === "group" ? "Add group" : "Add link").click(); await p.waitForTimeout(400); };
export const panelHeading = (p) => p.locator(`${PANEL} h2`).first().innerText();
export const fill = async (p, { title, url, group }) => {
  if (title !== undefined) await p.locator(PANEL).getByLabel("Title").fill(title);
  if (url !== undefined) await p.locator(PANEL).getByLabel("URL").fill(url);
  if (group !== undefined) { await p.locator("#menu-item-group").click(); await p.waitForTimeout(250); await p.getByRole("option", { name: group, exact: true }).click(); await p.waitForTimeout(200); }
};
export const submit = async (p, name) => { await p.locator(PANEL).getByRole("button", { name, exact: true }).click(); await p.waitForTimeout(350); };
export const addLink = async (p, o) => { await openAdd(p, "link"); await fill(p, o); await submit(p, "Add"); };
export const addGroup = async (p, title) => { await openAdd(p, "group"); await fill(p, { title }); await submit(p, "Add"); };
export const edit = async (p, title) => { await rowOf(p, title).getByRole("button", { name: "Edit " + title }).click(); await p.waitForTimeout(400); };
export const storedMenu = (p, corpus = "mock") => p.evaluate((c) => { try { const k = Object.keys(sessionStorage).find((x) => new RegExp(":menu:" + c + "$").test(x)); return k ? JSON.parse(sessionStorage.getItem(k)) : null; } catch (e) { return "ERR"; } }, corpus);
export const storedKey = (p) => p.evaluate(() => Object.keys(sessionStorage).find((x) => /:menu:/.test(x)) ?? null);
export const navbar = (p) => p.evaluate(() => [...document.querySelectorAll("nav[data-part=primary-nav] a, nav[data-part=primary-nav] > * button:not([data-part]), nav[data-part=primary-nav] button:not([data-part])")].filter((e) => e.getBoundingClientRect().height).map((e) => e.textContent.trim()));
export const saved = async (p) => { await saveBtn(p).click(); await p.waitForTimeout(450); };
export const openBeacon = async (p) => { await p.locator("button[data-part=trigger]").first().click(); await p.waitForTimeout(500); };
export const closeBeacon = async (p) => { await p.keyboard.press("Escape"); await p.waitForTimeout(400); };
export const selText = (p) => S(p).getByText(/^Selected \d+ of \d+$/).first();
