#!/usr/bin/env python3
"""Builds ../group-ths.md from the results-*.jsonl files the scripts write."""
import json, glob, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
rows = {}   # (page, id) -> dict
order = ["ths-1","ths-2","ths-3","ths-4","ths-5","ths-6","ths-7","ths-8","ths-9","ths-10","ths-11","ths-12","flt-1","flt-2","flt-3","flt-4","flt-5","flt-6","flt-7","flt-8","rel-1","rel-2","rel-3","rel-4","rel-5","rel-5b","rel-6","rel-7","rel-8"]
console_notes = []
for name in order:
    p = os.path.join(here, f"results-{name}.jsonl")
    if not os.path.exists(p): continue
    for line in open(p):
        line = line.strip()
        if not line: continue
        r = json.loads(line)
        rid = r["id"]
        if rid.startswith("CONSOLE@"):
            if r["res"] == "FAIL": console_notes.append((name, r["ev"]))
            continue
        page = name.split("-")[0].upper()
        base = rid.split("@")[0]
        if re.match(r"^(THS|FLT|REL)-\d+$", base) and not base.startswith(page): continue
        if re.match(r"^X-\d+[a-z]?$", base) and "@" in rid and rid.split("@")[1] != page: continue
        if re.search(r"-\d+$", base) and "@" in rid and not rid.startswith("X-"): continue
        rows[(page, base)] = {"res": r["res"], "ev": r["ev"], "sh": r["sh"], "script": name}

X_NA = {
 "THS": {"X-08": "N/A"},
 "FLT": {"X-05": "N/A", "X-08": "N/A", "X-11": "N/A", "X-12": "N/A"},
 "REL": {},
}
X_NA_TEXT = {
 ("THS", "X-08"): "The Thesauri list and editor show no status pills or badges (the Templates pills of THS-01 do not exist, see THS-01). Dark-mode contrast of what the page does show: no axe color-contrast violations in dark for the list or the clean editor (see X-07); the green enabled Save button fails 4.5:1 in light and dark (3.76, see X-07).",
 ("FLT", "X-05"): "Listed in the Applies line as not applicable (no pills, no search, delete is undo, not a bulk bar). Not driven as a check; group removal is FLT-11.",
 ("FLT", "X-08"): "Listed as not applicable (no pills or badges on Filters). Dark mode was still looked at: acceptance-run-2-shots/X-08-FLT-dark-1280.png and X-08-FLT-dark-390.png; axe finds no serious or critical colour-contrast violation in dark (see X-07).",
 ("FLT", "X-11"): "Listed as not applicable (no search on Filters).",
 ("FLT", "X-12"): "Listed as not applicable (no bulk selection bar on Filters).",
}
PAGES = [
 ("THS", "Thesauri list and editor (THS)", [f"THS-{i:02d}" for i in range(1, 42)]),
 ("FLT", "Filters (FLT)", [f"FLT-{i:02d}" for i in range(1, 25)]),
 ("REL", "Relationship types (REL)", [f"REL-{i:02d}" for i in range(1, 23)]),
]
XIDS = [f"X-{i:02d}" for i in range(1, 14)]

def cell(s):
    s = (s or "").replace("\n", " ").replace("|", "\\|")
    return s

def shot_cell(sh):
    if not sh: return "-"
    m = re.search(r"acceptance-run-2-shots/[^ ]+\.png", sh)
    return f"`{m.group(0)}`" if m else "-"

out = []
counts = {}
def emit_page(code, title, ids):
    c = {"PASS": 0, "FAIL": 0, "NOT DRIVEABLE": 0, "SKIP": 0, "N/A": 0}
    out.append(f"## {title}\n")
    out.append("| Id | Result | Evidence (saw vs expected) | Shot |")
    out.append("|---|---|---|---|")
    for i in ids + XIDS:
        if i.startswith("X-") and i in X_NA.get(code, {}):
            res, ev, sh = "N/A", X_NA_TEXT[(code, i)], ""
        else:
            r = rows.get((code, i))
            if not r:
                res, ev, sh = "NOT DRIVEABLE", "no result recorded: the script that drives it did not finish (see the script log)", ""
            else:
                res, ev, sh = r["res"], r["ev"], r["sh"]
                if i == "X-07":
                    m = rows.get((code, "X-07m"))
                    if m:
                        ev += " | PHONE (390x844): " + m["ev"]
                        if m["res"] == "FAIL": res = "FAIL"
                if i == "X-02":
                    m = rows.get((code, "X-02b"))
                    if m:
                        ev += " | Clean page: " + m["ev"]
                        if m["res"] == "FAIL": res = "FAIL"
        c[res] = c.get(res, 0) + 1
        out.append(f"| {i} | {res} | {cell(ev)} | {shot_cell(sh)} |")
    counts[code] = c
    out.append("")
    out.append(f"{title.split(' (')[0]}: {c['PASS']} PASS, {c['FAIL']} FAIL, {c['NOT DRIVEABLE']} NOT DRIVEABLE, {c['SKIP']} SKIP, {c['N/A']} N/A.\n")

hdr = open(os.path.join(here, "header.md")).read() if os.path.exists(os.path.join(here, "header.md")) else ""
out.append(hdr)
for code, title, ids in PAGES:
    emit_page(code, title, ids)
tail = open(os.path.join(here, "tail.md")).read() if os.path.exists(os.path.join(here, "tail.md")) else ""
out.append(tail)
dest = os.path.join(here, "..", "group-ths.md")
open(dest, "w").write("\n".join(out))
print(json.dumps(counts))
for n, e in console_notes: print("CONSOLE", n, e[:160])
