import fs from "fs";
const dir = new URL("./", import.meta.url).pathname;
const SH = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-shots/";
const load = (names) => { const m = new Map(); for (const n of names) for (const r of JSON.parse(fs.readFileSync(dir + n + ".results.json", "utf8"))) m.set(r.id, r); return m; };
const pages = [
  { code: "ACC", title: "Account (ACC)", files: ["acc", "acc2", "acc3"], n: 23, applies: ["X-01", "X-02", "X-03", "X-04", "X-06", "X-07", "X-08", "X-09"], na: "no list, no delete; the account is global" },
  { code: "USR", title: "Users & Groups (USR)", files: ["usr1", "usr2", "usr3", "usr4"], n: 30, applies: ["X-01", "X-02", "X-03", "X-04", "X-05", "X-06", "X-07", "X-08", "X-09", "X-10", "X-11", "X-12", "X-13"], na: "" },
  { code: "DSH", title: "Dashboard (DSH)", files: ["dsh", "dsh2"], n: 14, applies: ["X-06", "X-07", "X-08", "X-13"], na: "read-only page; no editor, list or delete" },
  { code: "NAV", title: "Navigation and role gating (NAV)", files: ["nav"], n: 16, applies: ["X-06", "X-07", "X-08"], na: "the rail has no editor, list or delete; other X checks do not apply to the rail" },
];
const X = Array.from({ length: 13 }, (_, i) => "X-" + String(i + 1).padStart(2, "0"));
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
let out = `# Acceptance run 1, group A: Account, Users & Groups, Dashboard, Navigation and role gating

Target: playground 73a13827 at http://localhost:1438/ (read-only run; no tracked code changed). Harness: \`acceptance-run-1-tools/lib.mjs\` plus helpers in \`group-a-scripts/\` (re-run with \`node <script>.mjs\`; \`build.mjs\` regenerates this file from the \`*.results.json\` files). Viewports 1280x800 desktop, 390x844 touch for phone checks; every check group used a fresh browser context. Shots are in \`acceptance-run-1-shots/\` (column "Shot").

Notes that apply to the whole group:
- Every check in these four sections has Needs in {--, F1..F4}; none was SKIPped. Result "N/A" is an X row the page's "Applies:" line excludes.
- Where a check says "dev panel", no dev panel exists (NAV-01), so role changes were driven by signing in as another seed user (mlopez editor, afarah collaborator) and the result says so.
- Console: no console errors in any driven flow (swept separately in \`console-sweep.mjs\`). The only console message is a jotai warning at every load, "[DEPRECATED] atomFamily is deprecated and will be removed in v3", which is a warning and was not counted as a failure.
- The app is well behind the checklist's target text for these pages (the F1 to F4 foundations are not reflected in the served commit for these pages), so most FAIL rows are missing features or different copy. Behaviours that already match are marked PASS.

`;
const totals = {};
const fails = [];
for (const pg of pages) {
  const res = load(pg.files);
  out += `## ${pg.title}\n\n| Id | Result | Evidence (saw vs expected) | Shot |\n|---|---|---|---|\n`;
  const c = { PASS: 0, FAIL: 0, "NOT DRIVEABLE": 0, SKIP: 0, "N/A": 0 };
  const ids = Array.from({ length: pg.n }, (_, i) => `${pg.code}-${String(i + 1).padStart(2, "0")}`);
  for (const id of [...ids, ...X]) {
    let r = res.get(id);
    if (!r && X.includes(id)) { if (pg.applies.includes(id)) throw new Error("missing " + pg.code + " " + id); r = { id, res: "N/A", ev: `Not applicable: the page's Applies line excludes it (${pg.na || "see header"}).`, shot: "" }; }
    if (!r) throw new Error("missing " + id);
    c[r.res] = (c[r.res] || 0) + 1;
    const shot = r.shot && fs.existsSync(SH + r.shot) ? "`" + r.shot + "`" : "";
    out += `| ${id} | ${r.res} | ${esc(r.ev)} | ${shot} |\n`;
    if (r.res === "FAIL") fails.push(id);
  }
  out += `\nCount ${pg.code}: PASS ${c.PASS} / FAIL ${c.FAIL} / NOT DRIVEABLE ${c["NOT DRIVEABLE"]} / SKIP ${c.SKIP} (N/A X rows: ${c["N/A"]})\n\n`;
  totals[pg.code] = c;
}
out += fs.readFileSync(dir + "ranked.md", "utf8");
fs.writeFileSync("/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-parts/group-a.md", out);
console.log(JSON.stringify(totals));
console.log("FAIL ids:", fails.join(" "));
