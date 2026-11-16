import fs from "fs";
export function mk(name) {
  const f = new URL(`./results-${name}.json`, import.meta.url).pathname;
  const res = {};
  return {
    rec(id, result, evidence = "", shotName = "") { res[id] = { id, result, evidence, shot: shotName }; console.log(result, "|", id, "|", evidence.slice(0, 400)); },
    save() { fs.writeFileSync(f, JSON.stringify(res, null, 1)); },
    res,
  };
}
// console errors other than the Jotai atomFamily baseline
export const realErr = (errors) => errors.filter((e) => !/atomFamily is deprecated/i.test(e));
