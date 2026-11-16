#!/usr/bin/env python3
"""Builds ../group-tpl.md from the *.results.json files written by the scripts."""
import json, glob, os, re
D = os.path.dirname(os.path.abspath(__file__))
def load(names):
    out = {}
    for n in names:
        p = f"{D}/{n}.results.json"
        if os.path.exists(p):
            out.update(json.load(open(p)))
    return out
tpl = load(["tpl1", "tpl2", "tpl3", "tpl4"])
vis = load(["vis"])
upl = load(["upl1", "upl2", "upl3", "upl4"])
act = load(["act1", "act2"])
tpl.update({k: v for k, v in vis.items() if k.startswith("X-08")})
upl.update({k: v for k, v in vis.items() if k.startswith("X-04")})

CAP = 520
def short(t):
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= CAP else t[:CAP].rstrip() + " [...]"

def row(cid, src, keys, note="", na=None, skip=None):
    if na: return (cid, "N/A", na, "")
    if skip: return (cid, "SKIP", skip, "")
    got = [(k, src[k]) for k in keys if k in src]
    if not got: return (cid, "NOT DRIVEN", "no result recorded", "")
    res = "FAIL" if any(v["result"] == "FAIL" for _, v in got) else "PASS"
    ev = " // ".join((f"[{k}] " if len(got) > 1 else "") + short(v["evidence"]) for k, v in got)
    if note: ev = note + " " + ev
    def fix(p):
        p = p if p.endswith(".png") else p + ".png"
        return p
    shots = [fix(v["shot"]) for _, v in got if v.get("shot")]
    return (cid, res, ev, shots[0] if shots else "")

NOTES = json.load(open(f"{D}/notes.json")) if os.path.exists(f"{D}/notes.json") else {}
def N(page, cid): return NOTES.get(page, {}).get(cid, "")

def table(page, rows):
    lines = ["| Id | Result | Evidence (saw vs expected) | Shot |", "|---|---|---|---|"]
    counts = {}
    for cid, res, ev, shot in rows:
        counts[res] = counts.get(res, 0) + 1
        n = N(page, cid)
        if n: ev = n + " " + ev if res == "FAIL" else ev + " " + n
        lines.append(f"| {cid} | {res} | {ev.replace('|', chr(92)+'|')} | {('`'+shot+'`') if shot else ''} |")
    c = lambda k: counts.get(k, 0)
    lines.append("")
    lines.append(f"Count: {c('PASS')} PASS, {c('FAIL')} FAIL, {c('NOT DRIVEABLE')} NOT DRIVEABLE, {c('SKIP')} SKIP, {c('N/A')} N/A ({sum(counts.values())} rows).")
    return "\n".join(lines), counts

# ---------- TPL
T = []
single = {"TPL-%02d" % i: ["TPL-%02d" % i] for i in range(1, 28)}
single["TPL-13"] = ["TPL-13", "TPL-13b"]
single["TPL-18"] = ["TPL-18a", "TPL-18"]
for cid, keys in single.items(): T.append(row(cid, tpl, keys))
T += [
    row("X-01", tpl, ["X-01", "X-01-reset"]),
    row("X-02", tpl, [], na="N/A: the page has no form (checklist)"),
    row("X-03", tpl, [], na="N/A: the page has no form (checklist)"),
    row("X-04", tpl, ["X-04", "X-04-fail-delete", "X-04-fail-delete-still-armed", "X-04-fail-save"]),
    row("X-05", tpl, ["X-05"]),
    row("X-06", tpl, ["X-06"]),
    row("X-07", tpl, ["X-07"]),
    row("X-08", tpl, ["X-08", "X-08-1280", "X-08-390"]),
    row("X-09", tpl, ["X-09-default", "X-09-create", "X-09-delete"]),
    row("X-10", tpl, ["X-10"]),
    row("X-11", tpl, ["X-11"]),
    row("X-12", tpl, ["X-12"]),
    row("X-13", tpl, ["X-13"]),
]
# ---------- UPL
U = [row("UPL-%02d" % i, upl, ["UPL-%02d" % i] + (["UPL-06-leave"] if i == 6 else [])) for i in range(1, 18)]
U += [
    row("X-01", upl, ["X-01", "X-01-delete"]),
    row("X-02", upl, [], na="N/A: no form page (checklist)"),
    row("X-03", upl, [], na="N/A: no form page (checklist)"),
    row("X-04", upl, ["X-04", "X-04-delete", "X-04-fail", "X-04-fail-rename", "X-04-fail-delete-upload"]),
    row("X-05", upl, ["X-05"]),
    row("X-06", upl, ["X-06"]),
    row("X-07", upl, ["X-07"]),
    row("X-08", upl, ["X-08", "X-08-phone"]),
    row("X-09", upl, ["X-09"]),
    row("X-10", upl, ["X-10"]),
    row("X-11", upl, ["X-11"]),
    row("X-12", upl, ["X-12"]),
    row("X-13", upl, [], na="N/A: Uploads is not in X-13's list (checklist)"),
]
# ---------- ACT
A = []
for i in range(1, 20):
    k = ["ACT-%02d" % i] + (["ACT-17b"] if i == 17 else [])
    A.append(row("ACT-%02d" % i, act, k))
for x in ["X-01", "X-02", "X-03", "X-04", "X-05"]:
    A.append(row(x, act, [], na="N/A: read-only page, excluded by the page's Applies line"))
A += [row("X-06", act, ["X-06"]), row("X-07", act, ["X-07"]), row("X-08", act, ["X-08"]),
      row("X-09", act, ["X-09-collab"]), row("X-10", act, ["X-10"])]
for x in ["X-11", "X-12", "X-13"]:
    A.append(row(x, act, [], na="N/A: excluded by the page's Applies line (search and filters are page-specific, ACT-04 to ACT-08)"))

head = open(f"{D}/head.md").read() if os.path.exists(f"{D}/head.md") else "# Settings acceptance run 2: Templates list, Uploads, Activity log (group-tpl)\n"
tail = open(f"{D}/tail.md").read() if os.path.exists(f"{D}/tail.md") else ""
out = [head]
for title, page, rows in [("Templates list (TPL)", "TPL", T), ("Uploads (UPL)", "UPL", U), ("Activity log (ACT)", "ACT", A)]:
    t, c = table(page, rows)
    out += [f"## {title}", "", t, ""]
out.append(tail)
open(f"{D}/../group-tpl.md", "w").write("\n".join(out))
print("written")
