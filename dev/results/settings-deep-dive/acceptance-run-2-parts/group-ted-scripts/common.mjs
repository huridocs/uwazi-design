import fs from "fs";
import { OUT } from "./lib.mjs";
export * from "./lib.mjs";
export * from "./h.mjs";
export const RES = new URL("./results.jsonl", import.meta.url).pathname;
// rec(id, result, evidence, shotName): prints and appends to results.jsonl (later lines override earlier ones for the same id)
export function rec(id, result, evidence = "", shotName = "") {
  const line = { id, result, evidence, shot: shotName ? `acceptance-run-2-shots/${shotName}.png` : "" };
  fs.appendFileSync(RES, JSON.stringify(line) + "\n");
  console.log(result, "|", id, "|", evidence.slice(0, 500));
}
export const realErrors = (errors) => errors.filter((e) => !/atomFamily is deprecated/.test(e));
export const wait = (p, ms = 300) => p.waitForTimeout(ms);
