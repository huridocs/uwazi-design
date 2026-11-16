import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
SHOTS = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-2-shots"
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "results.jsonl")
last = {}
for l in open(src):
    d = json.loads(l); last[d["id"]] = d
extra27 = last.pop("TED-27c", None)
if extra27 and "TED-27" in last:
    last["TED-27"]["evidence"] += " | CEJIL País properties removed one at a time: " + extra27["evidence"].split("removed one at a time: ", 1)[-1]
# X rows excluded on this page
last.setdefault("X-10", {"id": "X-10", "result": "N/A", "evidence": "Excluded by the page's Applies line (the editor has no list with zero rows; property search is TED-20).", "shot": ""})
last.setdefault("X-11", {"id": "X-11", "result": "N/A", "evidence": "Excluded by the page's Applies line (property search is checked on the page as TED-20).", "shot": ""})
ids = [f"TED-{i:02d}" if i < 100 else f"TED-{i}" for i in range(1, 110)] + [f"X-{i:02d}" for i in range(1, 14)]
rows = []; counts = {}
def clean(t, n=950):
    t = re.sub(r"\s+", " ", t).replace("|", "\\|").strip()
    return t if len(t) <= n else t[:n].rstrip() + " ..."
for i in ids:
    d = last.get(i)
    if d is None:
        d = {"result": "FAIL", "evidence": "No result recorded by the scripts.", "shot": ""}
    res = d["result"]; counts[res] = counts.get(res, 0) + 1
    shot = d.get("shot") or ""
    if shot:
        p = os.path.join(SHOTS, os.path.basename(shot))
        shot = "`" + os.path.basename(shot) + "`" if os.path.exists(p) else ""
    rows.append((i, res, clean(d["evidence"]), shot))
ted = [r for r in rows if r[0].startswith("TED")]; xs = [r for r in rows if r[0].startswith("X-")]
def cnt(rs):
    c = {}
    for r in rs: c[r[1]] = c.get(r[1], 0) + 1
    return c
out = []
out.append("| Id | Result | Evidence (saw vs expected) | Shot |")
out.append("|---|---|---|---|")
for r in rows: out.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |")
open(os.path.join(here, "table.md"), "w").write("\n".join(out) + "\n")
print("TED", cnt(ted), "X", cnt(xs), "all", cnt(rows))
for r in rows:
    if r[1] not in ("PASS", "N/A"): print(r[0], r[1])
