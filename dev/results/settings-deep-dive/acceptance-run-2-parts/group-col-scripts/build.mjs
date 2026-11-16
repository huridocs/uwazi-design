import fs from "fs";
const dir = new URL("./results/", import.meta.url).pathname;
const SHOTS = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-2-shots/";
const load = (n) => { try { return JSON.parse(fs.readFileSync(dir + n + ".json", "utf8")); } catch { return []; } };
const pages = [
  { code: "COL", title: "Collection (COL)", files: ["col-a", "col-b", "col-c", "col-d", "col-e", "col-f"], ids: Array.from({ length: 33 }, (_, i) => "COL-" + String(i + 1).padStart(2, "0")),
    xs: { "X-01": 1, "X-02": 1, "X-03": 1, "X-04": 1, "X-05": 0, "X-06": 1, "X-07": 1, "X-08": 0, "X-09": 1, "X-10": 0, "X-11": 0, "X-12": 0, "X-13": 1 },
    na: { "X-05": "No delete or list on Collection (excluded by the page's Applies line).", "X-08": "Not in the page's Applies line: no status pills or badges. Dark mode was driven anyway: axe in X-07 (light and dark, 1280 and 390) and screenshots COL-dark-1280, COL-dark-390.", "X-10": "No list (excluded by the Applies line).", "X-11": "No list (excluded by the Applies line).", "X-12": "No list (excluded by the Applies line)." } },
  { code: "CSS", title: "Global CSS & JS (CSS)", files: ["css"], ids: Array.from({ length: 16 }, (_, i) => "CSS-" + String(i + 1).padStart(2, "0")),
    xs: { "X-01": 1, "X-02": 1, "X-03": 1, "X-04": 1, "X-05": 0, "X-06": 1, "X-07": 1, "X-08": 0, "X-09": 1, "X-10": 0, "X-11": 0, "X-12": 0, "X-13": 0 },
    na: { "X-05": "No delete or list (excluded by the page's Applies line).", "X-08": "Not in the page's Applies line: no status pills or badges. Dark mode was driven anyway: axe in X-07 and screenshots CSS-desktop-dark, CSS-mobile-dark.", "X-10": "No list.", "X-11": "No list.", "X-12": "No list.", "X-13": "Not listed for this page (the Global JS flag lives on Collection); the page's content is stored per data source but the checklist excludes X-13 here." } },
  { code: "MEN", title: "Menu (MEN)", files: ["men-a", "men-b", "men-c", "men-d", "men-e"], ids: Array.from({ length: 20 }, (_, i) => "MEN-" + String(i + 1).padStart(2, "0")),
    xs: { "X-01": 1, "X-02": 1, "X-03": 1, "X-04": 1, "X-05": 0, "X-06": 1, "X-07": 1, "X-08": 0, "X-09": 1, "X-10": 1, "X-11": 0, "X-12": 1, "X-13": 1 },
    na: { "X-05": "Menu deletes use Undo and no usage counts (excluded by the page's Applies line).", "X-08": "Not in the page's Applies line: no status pills or badges (the Group tag passes axe contrast in X-07). Dark mode driven: screenshots MEN-dark-1280, MEN-dark-390.", "X-11": "Excluded by the page's Applies line (five-row tree, no search field)." } },
];
const XORDER = ["X-01", "X-02", "X-03", "X-04", "X-05", "X-06", "X-07", "X-08", "X-09", "X-10", "X-11", "X-12", "X-13"];
const esc = (t) => String(t ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {3,}/g, "  ").replace(/\|/g, "\\|").trim();
const shotCell = (name) => { if (!name) return ""; const f = name + ".png"; return fs.existsSync(SHOTS + f) ? `acceptance-run-2-shots/${f}` : ""; };
const out = []; const fails = [];
out.push("# Settings acceptance run 2, group col: Collection, Global CSS & JS, Menu");
out.push("");
out.push("Target: playground 956db631 at http://localhost:1438/. Driven with Playwright (chromium, 1280x800 and 390x844 touch), light and dark. Scripts: `acceptance-run-2-parts/group-col-scripts/` (`run-all.sh` re-runs them; `build.mjs` writes this file from `results/*.json`). Shots: `acceptance-run-2-shots/`.");
out.push("");
const summary = [];
for (const pg of pages) {
  const all = pg.files.flatMap((f) => load(f).map((r) => ({ ...r, src: f })));
  const byId = {};
  for (const r of all) { (byId[r.id] ||= []).push(r); }
  const last = (id) => (byId[id] || []).at(-1);
  const rows = [];
  const merge = (id, extraIds) => {
    const base = last(id); if (!base) return null;
    let { result, evidence, shot } = base;
    for (const x of extraIds) for (const e of byId[x] || []) { evidence += ` || ${x}: ${e.evidence}`; if (e.result === "FAIL" && result === "PASS") result = "FAIL"; }
    return { id, result, evidence, shot };
  };
  for (const id of pg.ids) {
    const m = merge(id, [id + "b", id + "m", id.replace(/^(\w+)-(\d+)$/, "$1-$2") + "x"]);
    rows.push(m || { id, result: "NOT RUN", evidence: "no result recorded", shot: "" });
  }
  for (const x of XORDER) {
    if (!pg.xs[x]) { rows.push({ id: x, result: "N/A", evidence: pg.na[x], shot: "" }); continue; }
    const m = merge(x, x === "X-02" ? ["X-02p"] : x === "X-03" ? ["X-03b"] : []);
    rows.push(m || { id: x, result: "NOT RUN", evidence: "no result recorded", shot: "" });
  }
  const cnt = { PASS: 0, FAIL: 0, "NOT DRIVEABLE": 0, SKIP: 0, "N/A": 0, other: 0 };
  for (const r of rows) (cnt[r.result] !== undefined ? cnt[r.result]++ : cnt.other++);
  out.push(`## ${pg.title}`); out.push("");
  out.push("| Id | Result | Evidence (saw vs expected) | Shot |"); out.push("|---|---|---|---|");
  for (const r of rows) { out.push(`| ${r.id} | ${r.result} | ${esc(r.evidence)} | ${shotCell(r.shot)} |`); if (r.result === "FAIL" || r.result === "NOT RUN") fails.push({ page: pg.code, ...r }); }
  out.push("");
  out.push(`Count: ${cnt.PASS} PASS, ${cnt.FAIL} FAIL, ${cnt["NOT DRIVEABLE"]} NOT DRIVEABLE, ${cnt.SKIP} SKIP, ${cnt["N/A"]} N/A${cnt.other ? ", " + cnt.other + " other" : ""}.`);
  out.push("");
  summary.push(`${pg.code}: ${cnt.PASS} PASS, ${cnt.FAIL} FAIL, ${cnt["NOT DRIVEABLE"]} NOT DRIVEABLE, ${cnt.SKIP} SKIP, ${cnt["N/A"]} N/A`);
}
const rank = JSON.parse(fs.readFileSync(new URL("./ranking.json", import.meta.url), "utf8"));
out.push("## FAILs ranked by severity"); out.push("");
out.push("Owner: Code = behaviour or data; Design = layout, copy or accessibility.");
out.push("");
out.push("| Rank | Ids | What failed | Owner |"); out.push("|---|---|---|---|");
const covered = new Set();
rank.forEach((x, i) => { x.ids.forEach((id) => covered.add(id)); out.push(`| ${i + 1} | ${x.ids.join(", ")} | ${esc(x.what)} | ${x.owner} |`); });
const missing = fails.filter((f) => !covered.has(`${f.page}:${f.id}`) && ![...covered].includes(f.id));
out.push("## Other observations (driven, not scored as a check)"); out.push("");
out.push("- Collection, keyboard (COL-32): after \"Add map layer\" Tab enters the world map and stops on 176 country paths before leaving it, although MapPointPicker documents itself as not focusable. Design (a11y).");
out.push("- Every dialog (favicon picker, Discard changes, link panel, Reset) shows axe landmark-no-duplicate-banner (moderate) because the dialog header is a banner landmark. Below the serious/critical bar of X-07. Design (a11y).");
out.push("- Menu on a phone (MEN-20): smallest row-button tap dimension measured 18 px (reorder grip and chevrons are below the 44 px used on the footer). Design.");
out.push("- Collection favicon gallery (COL-07): the seed Uploads hold logo-iachr.svg (160x160) which passes the size rule and is listed next to the added 64x64 PNG; cover-banner.jpg is correctly hidden. A 2.1 MB 512x512 PNG is accepted by the picker (Uploads itself refuses files over 2 MB).");
out.push("- Switching the data source from Settings lands on the Library view, not on the same Settings page (COL-04, X-13 drove it with a return through Settings).");
out.push("- Seed Menu is Library, About, Resources (group: Methodology, Contact), not the A, B, G, G1, G2 of the checklist; A = Library, B = About, G = Resources.");
out.push("");
fs.writeFileSync("/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-2-parts/group-col.md", out.join("\n") + "\n");
console.log(summary.join("\n"));
console.log("FAIL rows:", fails.map((f) => f.page + ":" + f.id).join(", "));
console.log("FAILs not in ranking.json:", missing.map((f) => f.page + ":" + f.id).join(", "));
