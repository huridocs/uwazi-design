import fs from "fs";
import { shot } from "./lib.mjs";
const RES = new URL("./results/", import.meta.url).pathname;
fs.mkdirSync(RES, { recursive: true });
export function recorder(page) {
  let rows = []; try { rows = JSON.parse(fs.readFileSync(RES + page + '.json','utf8')); } catch {}
  const flush = () => fs.writeFileSync(RES + page + ".json", JSON.stringify(rows, null, 1));
  const r = (id, res, ev, shotName = "") => {
    const i = rows.findIndex((x) => x.id === id);
    const row = { id, res, ev: String(ev).replace(/\|/g, "\\|").replace(/\s+/g, " "), shot: shotName };
    if (i >= 0) rows[i] = row; else rows.push(row);
    console.log(res, "|", id, "|", row.ev.slice(0, 300));
    flush();
  };
  return r;
}
// Run fn; on throw record FAIL/NOT DRIVEABLE with the error.
export const run = async (r, id, fn) => { try { await fn(); } catch (e) { r(id, "FAIL", "script error while driving: " + e.message.split("\n")[0]); } };
export const pass = (c) => (c ? "PASS" : "FAIL");
export const noise = (errors) => errors.filter((e) => !/atomFamily is deprecated/.test(e));
