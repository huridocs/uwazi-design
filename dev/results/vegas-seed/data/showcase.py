"""Pick the showcase subset (about 60 recordings) and write showcase/{entities,references,ids,stats}.json."""
import json, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, "entities.json"))); R = json.load(open(os.path.join(HERE, "references.json")))
by_id = {e["id"]: e for e in E}
rec = [e for e in E if e["template"] == "recording"]
def P(e): return e["properties"]
def vols(e): return set(P(e).get("volleys_covered", []))
def flags(e): return set(P(e).get("sync_flags", []))

chosen = []
def take(e):
    if e["id"] not in {c["id"] for c in chosen}: chosen.append(e)

# 1. must-include: one of each situation the features have to show
must = []
vid = [e for e in rec if P(e)["media_kind"] not in ("911-call", "911-compilation")]
for fl, n in (("title-mismatch", 2), ("drift", 2), ("outlier", 1), ("clock-note", 2), ("date-inconsistent", 1)):
    must += [e for e in vid if fl in flags(e)][:n]
must += [e for e in vid if P(e).get("platform") in ("facebook", "twitter")][:2]
must += [e for e in vid if P(e).get("availability") == "unavailable"]
must += [e for e in vid if P(e).get("clock_precision") == "day"][:2]
must += [e for e in vid if P(e)["media_kind"] == "cctv" and P(e).get("clock_end")][:2]
for e in must: take(e)

quota = {"body-camera": 16, "phone-video": 22, "vehicle-video": 5, "cctv": 4, "aerial": 3}
covered = set()
for e in chosen: covered |= vols(e)
for kind, q in quota.items():
    pool = [e for e in vid if P(e)["media_kind"] == kind and e["id"] not in {c["id"] for c in chosen}]
    have = sum(1 for c in chosen if P(c)["media_kind"] == kind)
    while have < q and pool:
        # prefer new volleys, then more anchors, then consistent ones; skip flagged unless needed
        pool.sort(key=lambda e: (-len(vols(e) - covered), 1 if flags(e) - {"qualified-annotation"} else 0, -P(e).get("sync_anchor_count", 0)))
        e = pool.pop(0); take(e); covered |= vols(e); have += 1

calls = [e for e in rec if P(e)["media_kind"] == "911-call"]
yt = [c for c in calls if P(c)["platform"] == "youtube"]; ar = [c for c in calls if P(c)["platform"] == "archive-org"]
step = max(1, len(yt) // 6)
for c in yt[::step][:6] + ar[:2]: take(c)

ids = {c["id"] for c in chosen}
# 2. everything they point at
changed = True
refs_in = [r for r in R if r["from"] in ids and r["to"] in by_id]
for r in refs_in: ids.add(r["to"])
# all moments of the corpus' main sequence, the static records, the places the event happened at
for e in E:
    if e["template"] in ("source", "claim", "finding", "organisation"): ids.add(e["id"])
    if e["id"].startswith("moment:volley-") or e["id"].startswith("moment:") and P(e).get("time_basis") == "official-report-summary": ids.add(e["id"])
ids |= {"place:mandalay-bay-hotel", "place:las-vegas-village"}
# compilations for the chosen calls
for r in R:
    if r["from"] in ids and r["type"] == "derived_from": ids.add(r["to"])
# singles and other moments that two or more chosen recordings annotate
cnt = collections.Counter(r["to"] for r in R if r["type"] == "captures" and r["from"] in {c["id"] for c in chosen})
subset = [by_id[i] for i in by_id if i in ids]
subset_ids = {e["id"] for e in subset}
sub_refs = [r for r in R if r["from"] in subset_ids and r["to"] in subset_ids]
# a moment is only in the subset if some chosen recording captures it, or it is a volley or official
keep_moments = {r["to"] for r in sub_refs if r["type"] == "captures"} | {e["id"] for e in subset if e["id"].startswith("moment:volley-") or P(e).get("time_basis") == "official-report-summary"}
subset = [e for e in subset if e["template"] != "moment" or e["id"] in keep_moments]
subset_ids = {e["id"] for e in subset}
sub_refs = [r for r in R if r["from"] in subset_ids and r["to"] in subset_ids]
os.makedirs(os.path.join(HERE, "showcase"), exist_ok=True)
json.dump(subset, open(os.path.join(HERE, "showcase", "entities.json"), "w"), indent=1, ensure_ascii=False)
json.dump(sub_refs, open(os.path.join(HERE, "showcase", "references.json"), "w"), indent=1, ensure_ascii=False)
rec_ids = sorted(e["id"] for e in subset if e["template"] == "recording")
json.dump({"recordings": rec_ids}, open(os.path.join(HERE, "showcase", "ids.json"), "w"), indent=1)
kinds = collections.Counter(P(e)["media_kind"] for e in subset if e["template"] == "recording")
stats = {"entities": len(subset), "references": len(sub_refs), "by_template": dict(collections.Counter(e["template"] for e in subset)), "recording_kinds": dict(kinds),
         "volleys_covered": sorted({v for e in subset if e["template"] == "recording" for v in P(e).get("volleys_covered", [])}, key=int),
         "flagged_recordings": sum(1 for e in subset if e["template"] == "recording" and P(e).get("sync_flags"))}
json.dump(stats, open(os.path.join(HERE, "showcase", "stats.json"), "w"), indent=1)
print(json.dumps(stats, indent=1))
