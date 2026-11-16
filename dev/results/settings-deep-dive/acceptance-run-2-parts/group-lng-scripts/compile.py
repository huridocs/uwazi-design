#!/usr/bin/env python3
"""Builds ../group-lng.md from the *.json results written by the scripts."""
import json, glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
R = {}
src = {}
for f in sorted(glob.glob(os.path.join(here, "*.json"))):
    if f.endswith("compile.errs.json"): continue
    for r in json.load(open(f)):
        R.setdefault(r["id"], []).append(r); src[r["id"]] = os.path.basename(f)
def one(i):
    return R[i][-1] if i in R else None

def row(i, r):
    shot = f"`{r['shot']}`" if r.get("shot") else "—"
    return f"| {i} | {r['result']} | {r['evidence']} | {shot} |"

def merge_x08(prefix):
    d = one(f"{prefix} (desktop)"); m = one(f"{prefix} (mobile)")
    res = "PASS" if d["result"] == "PASS" and m["result"] == "PASS" else "FAIL"
    ev = f"1280: {d['evidence']} || 390: {m['evidence']}"
    shots = [x for x in (d.get("shot"), m.get("shot")) if x]
    return {"result": res, "evidence": ev, "shot": ", ".join(shots)}

lng_ids = [f"LNG-{n:02d}" for n in range(1, 20)] + ["LNG-PO1", "LNG-PO2", "LNG-PO3"] + [f"X-{n:02d}" for n in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)]
trn_ids = [f"TRN-{n:02d}" for n in range(1, 22)] + ["TRN-PO1"] + [f"X-{n:02d}" for n in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)]

def build(ids, page):
    out = []; counts = {"PASS": 0, "FAIL": 0, "NOT DRIVEABLE": 0, "SKIP": 0, "N/A": 0}
    for i in ids:
        # X ids live in two pages: pick by page prefix of the file
        r = None
        if i.startswith("X-"):
            files = ("lng-x.json",) if page == "LNG" else ("trn-a.json", "trn-e.json", "trn-f.json")
            for f in files:
                data = json.load(open(os.path.join(here, f)))
                hit = [x for x in data if x["id"] == i]
                if hit: r = hit[-1]
            if i == "X-08":
                pref = "X-08"
                files_x = "lng-x.json" if page == "LNG" else "trn-f.json"
                data = json.load(open(os.path.join(here, files_x)))
                d = [x for x in data if x["id"] == "X-08 (desktop)"][-1]; m = [x for x in data if x["id"] == "X-08 (mobile)"][-1]
                res = "PASS" if d["result"] == "PASS" and m["result"] == "PASS" else "FAIL"
                r = {"result": res, "evidence": f"1280: {d['evidence']} || 390: {m['evidence']}", "shot": ", ".join(x for x in (d.get("shot"), m.get("shot")) if x)}
        else:
            r = one(i)
            if r is None: out.append(f"| {i} | MISSING | no result recorded | — |"); continue
            r = dict(r)
            if i == "TRN-01":
                leg = one("TRN-01 (Filters leg)")
                r["result"] = leg["result"]; r["evidence"] = r["evidence"] + " || " + leg["evidence"]; r["shot"] = leg.get("shot", "") if leg["result"] != "PASS" else ""
            if i == "LNG-09":
                h = one("_info-LNG-09-hook"); r["evidence"] += " || For reference: " + h["evidence"]
        if r is None: out.append(f"| {i} | MISSING | no result recorded | — |"); continue
        out.append(row(i, r)); counts[r["result"]] = counts.get(r["result"], 0) + 1
        if i == "TRN-18":
            e = one("TRN-18 (context with no keys)")
            out.append(row("TRN-18 (no-keys leg)", e)); counts["NOT DRIVEABLE"] += 1
    return out, counts

errs = []
for k, v in R.items():
    if k.startswith("_errs") and any(x["result"] == "FAIL" for x in v):
        errs.append((k, src[k], v[-1]["evidence"][:300]))
open(os.path.join(here, "compile.errs.json"), "w").write(json.dumps(errs, indent=1))
lng, lc = build(lng_ids, "LNG"); trn, tc = build(trn_ids, "TRN")
fmt = lambda c: f"{c['PASS']} PASS / {c['FAIL']} FAIL / {c['NOT DRIVEABLE']} NOT DRIVEABLE / {c['SKIP']} SKIP / {c['N/A']} N/A"
hdr = "| Id | Result | Evidence (saw vs expected) | Shot |\n|---|---|---|---|"
body = f"""# Settings acceptance run 2: group-lng (Languages, Translations)

Commit under test: playground 956db631 at http://localhost:1438/ (Sample data source unless stated). Driven with Playwright, one fresh context per check group, 1280x800 desktop and 390x844 touch phone. Scripts: `group-lng-scripts/` (`run-all.sh` re-runs all of them; `compile.py` builds this file from their JSON results). Screenshots: `acceptance-run-2-shots/group-lng-*.png`.

## Languages (LNG)

{hdr}
""" + "\n".join(lng) + f"""

Count: {fmt(lc)}

## Translations (TRN)

{hdr}
""" + "\n".join(trn) + f"""

Count: {fmt(tc)}
"""
tail = open(os.path.join(here, "tail.md")).read() if os.path.exists(os.path.join(here, "tail.md")) else ""
open(os.path.join(here, "..", "group-lng.md"), "w").write(body + tail)
print(fmt(lc)); print(fmt(tc)); print(errs)
