import fs from "fs";
export function recorder(page) {
  const rows = [];
  const add = (id, result, evidence, shot = "") => { rows.push({ id, result, evidence, shot }); console.log(`${id} | ${result} | ${evidence.slice(0, 3000)}`); };
  const save = () => process.env.ONLY ? null : fs.writeFileSync(new URL(`./results/${page}.json`, import.meta.url), JSON.stringify(rows, null, 1));
  return { add, save, rows };
}
export const run = async (r, id, fn) => { if (process.env.ONLY && !process.env.ONLY.split(",").some((o) => id.startsWith(o))) return; try { await fn(); } catch (e) { r.add(id, "FAIL", "script error: " + String(e.message).split("\n")[0].slice(0, 300)); } };
export const pf = (ok) => (ok ? "PASS" : "FAIL");
export const noise = (errs) => errs.filter((e) => !/atomFamily/i.test(e));
