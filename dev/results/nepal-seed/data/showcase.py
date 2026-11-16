#!/usr/bin/env python3
"""Cut a demo-sized subset (a few hundred entities) from the full merged corpus, keeping the densest-linked
entities per template and the sources that anchor them. The full corpus stays in entities.json / references.json."""
import collections, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ents = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
refs = json.load(open(f"{HERE}/references.json"))
QUOTA = {"media": 40, "event": 110, "person": 70, "organisation": 55, "location": 50, "action": 40, "claim": 60, "casualty": 40}
deg = collections.Counter()
for r in refs:
    if r["from"].startswith("source:") or r["to"].startswith("source:"):
        # a source link adds half a point: structure between non-source entities counts most
        deg[r["from"]] += 0.5; deg[r["to"]] += 0.5
    else:
        deg[r["from"]] += 1; deg[r["to"]] += 1
keep = set()
for t, q in QUOTA.items():
    ids = sorted((i for i, e in ents.items() if e["template"] == t), key=lambda i: (-deg[i], i))
    keep |= set(ids[:q])
# keep every claim with a structured figure (the claim matrix's figure column needs them)
keep |= {i for i, e in ents.items() if e["template"] == "claim" and e["properties"].get("figure") is not None}
# keep every bundled (openly licensed) media item in the demo
keep |= {i for i, e in ents.items() if e['template'] == 'media' and str(e['properties'].get('rights', '')).startswith('bundled')}
# every selected non-source entity keeps its place; add the sources that anchor them
score = collections.Counter()
for r in refs:
    if r["from"].startswith("source:") and r.get("anchor") and r["to"] in keep:
        score[r["from"]] += 1
srcs = {s for s, _ in score.most_common(160)}
keep |= srcs
out_e = []
for i in sorted(keep):
    e = json.loads(json.dumps(ents[i]))
    for ev in e["evidence"]:
        ev["sources"] = [s for s in ev["sources"] if s in keep]
    out_e.append(e)
out_r = []
for r in refs:
    if r["from"] in keep and r["to"] in keep:
        r = dict(r); r["sources"] = [s for s in r["sources"] if s in keep]
        if not r["sources"] and r["from"].startswith("source:"): r["sources"] = [r["from"]]
        if r["sources"]: out_r.append(r)
os.makedirs(f"{HERE}/showcase", exist_ok=True)
json.dump(out_e, open(f"{HERE}/showcase/entities.json", "w"), indent=1, ensure_ascii=False)
json.dump(out_r, open(f"{HERE}/showcase/references.json", "w"), indent=1, ensure_ascii=False)
def dates(e):
    p = e["properties"]; t = e["template"]
    if t == "event" and isinstance(p.get("when"), dict): return [p["when"].get("from")]
    return [p.get("date") if t == "action" else None]
ds = sorted(d[:10] for e in out_e for d in dates(e) if isinstance(d, str))
st = collections.Counter(ev["verification"] for e in out_e for ev in e["evidence"] if not ev.get("inferred")) + collections.Counter(r["verification"] for r in out_r)
tot = sum(st.values())
stats = {"entities": len(out_e), "by_template": dict(collections.Counter(e["template"] for e in out_e)),
         "references": len(out_r), "by_type": dict(collections.Counter(r["type"] for r in out_r).most_common()),
         "event_action_span": [ds[0], ds[-1]], "verification_share": {k: round(v / tot, 3) for k, v in st.items()},
         "references_with_anchor": sum(1 for r in out_r if r.get("anchor"))}
json.dump(stats, open(f"{HERE}/showcase/stats.json", "w"), indent=1)
print(json.dumps(stats, indent=1))
