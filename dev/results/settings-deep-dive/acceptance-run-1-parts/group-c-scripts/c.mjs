import fs from "fs";
import { shot as _shot } from "./lib.mjs";
export * from "./lib.mjs";
export * from "./h.mjs";
export const DIR = new URL(".", import.meta.url).pathname;
export const NOISE = /atomFamily is deprecated/;
export function makeRec(code) {
  const rows = [];
  const add = (id, res, ev, shotName = "") => {
    rows.push({ id, res, ev, shot: shotName });
    console.log(res, "|", id, "|", ev.slice(0, 300));
  };
  const save = () => fs.writeFileSync(`${DIR}results-${code}.json`, JSON.stringify(rows, null, 1));
  return { rows, add, save };
}
export const realErrors = (errors) => errors.filter((e) => !NOISE.test(e));
export const sh = async (page, name) => { await _shot(page, name); return `acceptance-run-1-shots/${name}.png`; };
export const wait = (p, ms = 300) => p.waitForTimeout(ms);
export const goImport = async (page) => {
  await page.getByRole("button", { name: /Tools/ }).first().click();
  await page.waitForTimeout(300);
};
export async function signInAs(page, user, view = "library") {
  await page.evaluate(() => sessionStorage.setItem("uwazi:appView", JSON.stringify("login")));
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.locator("input").first().fill(user);
  await page.locator('input[type=password]').first().fill("password1").catch(()=>{});
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.evaluate((v) => sessionStorage.setItem("uwazi:appView", JSON.stringify(v)), view);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1200);
}
export const toolsMenu = async (page) => { await page.getByRole("button", { name: /^Tools/ }).first().click(); await page.waitForTimeout(300); };
export const menuItems = (page) => page.evaluate(() => [...document.querySelectorAll("button")].filter(b=>!b.closest("[inert]") && b.getBoundingClientRect().width>0 && b.getBoundingClientRect().top<330 && b.getBoundingClientRect().left>270 && b.getBoundingClientRect().left<330).map(b=>b.innerText.trim()));
export const setDark = async (page) => {
  for (let i = 0; i < 3; i++) {
    if (await page.evaluate(() => document.documentElement.classList.contains("dark"))) return true;
    await page.locator('button[aria-label^="Theme"]').click(); await page.waitForTimeout(250);
  }
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
};
export const axeAll = async (page, scopeSel, rules) => {
  const { axeSrc } = await import("./lib.mjs");
  await page.evaluate(axeSrc);
  return page.evaluate(async ([sel, rules]) => {
    const el = document.querySelector(sel) || document.body;
    const opt = rules ? { runOnly: rules, resultTypes: ["violations"] } : { resultTypes: ["violations"] };
    const r = await window.axe.run(el, opt);
    return r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ").slice(0, 80)).join(" | ")}`);
  }, [scopeSel, rules]);
};
export const csvOpen = async (page) => {
  await toolsMenu(page);
  await page.getByRole("button", { name: "Import CSV", exact: true }).first().click();
  await page.waitForTimeout(700);
};
export const hasHScroll = (page) => page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - innerWidth }));
export const beacon = async (page) => {
  await page.locator('button[aria-label^="Notifications"]').click(); await page.waitForTimeout(400);
  const t = await page.evaluate(() => document.body.innerText);
  return t;
};
export const phoneNav = async (page, name) => {
  await page.getByRole("button", { name: "Open menu" }).tap(); await page.waitForTimeout(500);
  await page.getByRole("button", { name, exact: true }).first().tap(); await page.waitForTimeout(900);
};
