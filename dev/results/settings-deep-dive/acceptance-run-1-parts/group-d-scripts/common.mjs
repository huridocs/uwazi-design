import fs from "fs";
import { OUT } from "./lib.mjs";
export * from "./lib.mjs";
export * from "./h.mjs";
export const RES = new URL("./results.jsonl", import.meta.url).pathname;
export const SHOTDIR = OUT;
// rec(id, result, evidence, shotName) -> prints + appends to results.jsonl (later lines override earlier for the same id)
export function rec(id, result, evidence = "", shotName = "") {
  const line = { id, result, evidence, shot: shotName ? `acceptance-run-1-shots/${shotName}.png` : "" };
  fs.appendFileSync(RES, JSON.stringify(line) + "\n");
  console.log(result, "|", id, "|", evidence.slice(0, 400));
}
// Console errors only (the atomFamily deprecation warning is app-wide baseline, reported separately).
export const realErrors = (errors) => errors.filter((e) => !/atomFamily is deprecated/.test(e));
export const wait = (p, ms = 300) => p.waitForTimeout(ms);
