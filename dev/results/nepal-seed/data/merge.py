#!/usr/bin/env python3
"""Merge parts/*.json into entities.json, references.json, CSVs and a validation report.

Rules (also in README.md):
 - entities with the same id are merged; first non-empty property value wins, differing values are logged.
 - verification is recomputed from the cited sources: a fact is `confirmed` only if it cites at least two
   independent publishers (same publisher, or a story syndicated from the same wire, counts once);
   `disputed` is kept as set by the researcher.
"""
import csv, datetime, glob, json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(HERE, "schema")
templates = {t["id"]: t for t in json.load(open(f"{S}/templates.json"))}
rtypes = {r["id"]: r for r in json.load(open(f"{S}/relationTypes.json"))}
thes = json.load(open(f"{S}/thesauri.json"))
thes_ids = {k: {v["id"] for v in vs} for k, vs in thes.items()}
PROPS = {t: {p["name"]: p for p in tpl["properties"]} for t, tpl in templates.items()}
COMMON = {"title", "creationDate", "editDate"}

report = collections.defaultdict(list)
def warn(kind, msg): report[kind].append(msg)

ents, refs = {}, {}
additions = []
# Stub ids the casualties part used before the events existed, mapped to the defined events.
ALIAS = {
    "event:2025-09-08-police-fire-on-protesters-new-baneshwar": "event:2025-09-08-police-fire-on-protesters-at-parliament-and-new-baneshwar",
    "event:2025-09-09-arson-and-attacks-kathmandu": "event:2025-09-09-arson-and-attacks-on-state-buildings",
    "event:2025-09-09-prison-unrest-and-mass-escapes": "event:2025-09-09-prison-breaks",
    # Same entity under two ids (found by title comparison across parts).
    "organisation:office-of-the-president-nepal": "organisation:office-of-the-president-of-nepal",
    "person:raja-ram-basnet": "person:rajaram-basnet",
    "location:everest-hospital-new-baneshwar": "location:everest-hospital-kathmandu",
    "person:prakash-man-singh-raut": "person:prakash-man-singh",
}
def al(x): return ALIAS.get(x, x)
# Property-name aliases per template (a part used `profile` for organisations and locations).
PROP_ALIAS = {("organisation", "profile"): "description", ("location", "profile"): "description"}
for path in sorted(glob.glob(f"{HERE}/parts/*.json")):
    try:
        part = json.load(open(path))
    except Exception as e:
        warn("bad_json", f"{os.path.basename(path)}: {e}")
        continue
    name = os.path.basename(path)
    for e in part.get("entities", []):
        eid = al(e.get("id"))
        e["id"] = eid
        if not eid:
            warn("no_id", f"{name}: entity without id"); continue
        cur = ents.get(eid)
        if cur is None:
            if e.get("_addition"):
                warn("addition_without_entity", f"{name}: {eid}"); continue
            ents[eid] = {"id": eid, "template": e.get("template"), "title": e.get("title"),
                         "properties": dict(e.get("properties") or {}), "evidence": list(e.get("evidence") or []),
                         "parts": [name]}
        else:
            cur["parts"].append(name)
            for k, v in (e.get("properties") or {}).items():
                if k not in cur["properties"] or cur["properties"][k] in (None, "", []):
                    cur["properties"][k] = v
                elif cur["properties"][k] != v:
                    warn("property_conflict", f"{eid}.{k}: {cur['properties'][k]!r} vs {v!r} ({name})")
            cur["evidence"] += list(e.get("evidence") or [])
            if not cur.get("title") and e.get("title"): cur["title"] = e["title"]
    additions.extend((name, dict(a, _addition=True)) for a in part.get("entity_additions", []))
    for r in part.get("references", []):
        rid = r.get("id") or f"ref:{r.get('from')}>{r.get('type')}>{r.get('to')}"
        r["from"], r["to"] = al(r.get("from")), al(r.get("to"))
        key = (r.get("from"), r.get("to"), r.get("type"), json.dumps(r.get("date"), sort_keys=True))
        if key in refs:
            cur = refs[key]
            cur["sources"] = sorted(set(cur["sources"]) | set(r.get("sources") or []))
            if r.get("anchor") and not cur.get("anchor"): cur["anchor"] = r["anchor"]
            cur["parts"].append(name)
            if r.get("verification") == "disputed": cur["verification"] = "disputed"
        else:
            refs[key] = {"id": rid, "from": r.get("from"), "to": r.get("to"), "type": r.get("type"),
                         "date": r.get("date"), "anchor": r.get("anchor"), "sources": sorted(set(r.get("sources") or [])),
                         "verification": r.get("verification"), "note": r.get("note", ""), "parts": [name]}

for name, e in additions:
    eid = e.get("id")
    cur = ents.get(eid)
    if cur is None:
        warn("addition_without_entity", f"{name}: {eid}"); continue
    cur["parts"].append(name)
    for k, v in (e.get("properties") or {}).items():
        if k not in cur["properties"] or cur["properties"][k] in (None, "", []):
            cur["properties"][k] = v
        elif cur["properties"][k] != v:
            warn("property_conflict", f"{eid}.{k}: {cur['properties'][k]!r} vs {v!r} ({name})")
    cur["evidence"] += list(e.get("evidence") or [])

# ---- tenure consolidation --------------------------------------------------
# One person can hold one office (held_office) or one membership (member_of) of one body once at a time. Parts
# record the same tenure several times (undated, open-ended, closed). Overlapping tenures of the same person,
# body and type are merged into one; an undated one is absorbed by the tenure that covers the protest week (or the
# latest). Touching tenures (one ends the day another starts) stay separate. Conflicting end dates: the one with
# more sources wins, then the earlier. Every merge is logged.
TENURE_TYPES = ("held_office", "member_of")
PROTEST_DAY = "2025-09-08"
def _pad(d, hi=False):
    if not d: return "9999-12-31" if hi else "0000-01-01"
    return (d + "-01-01"[len(d) - 4:]) if len(d) < 10 else d
def _span(r):
    d = r.get("date") or {}
    return d.get("from"), d.get("to")
def _overlap(a, b):
    # Overlapping dates make two records one tenure, except when one is open-ended and the other closed and both
    # have a start that differs: that is a second post held within the first (a justice who is acting chief
    # justice), not a duplicate; it is reported as tenure_second_post.
    (af, at), (bf, bt) = _span(a), _span(b)
    if not (_pad(af) < _pad(bt, True) and _pad(bf) < _pad(at, True)): return False
    if af and bf and af != bf and (at is None) != (bt is None): return False
    return True
def _absorb(base, other):
    base["sources"] = sorted(set(base["sources"]) | set(other["sources"]))
    if other.get("anchor") and not base.get("anchor"): base["anchor"] = other["anchor"]
    base["parts"] = base["parts"] + [x for x in other["parts"] if x not in base["parts"]]
    if other.get("verification") == "disputed": base["verification"] = "disputed"
    if other.get("note") and other["note"] not in (base.get("note") or ""):
        base["note"] = ((base.get("note") or "") + (" " if base.get("note") else "") + other["note"]).strip()
    base.setdefault("merged_ids", []).append(other["id"])
    base["merged_ids"] += other.get("merged_ids", [])
groups = collections.defaultdict(list)
for k, r in refs.items():
    if r["type"] in TENURE_TYPES: groups[(r["from"], r["to"], r["type"])].append((k, r))
n_tenure_merged = collections.Counter()
for gk, items in groups.items():
    rs = [r for _, r in items]
    dated = [r for r in rs if any(_span(r))]
    undated = [r for r in rs if not any(_span(r))]
    clusters = []
    for r in sorted(dated, key=lambda r: (_pad(_span(r)[0]), r["id"])):
        hit = [c for c in clusters if any(_overlap(r, m) for m in c)]
        if hit:
            for c in hit[1:]: hit[0].extend(c); clusters.remove(c)
            hit[0].append(r)
        else: clusters.append([r])
    final = []
    for c in clusters:
        base = sorted(c, key=lambda r: (-len(r["sources"]), r["id"]))[0]
        fr = [f for f, _ in map(_span, c) if f]
        tos = collections.Counter()
        for m in c:
            if _span(m)[1]: tos[_span(m)[1]] += len(m["sources"])
        if len(tos) > 1:
            warn("tenure_end_conflict", f"{gk[0]} {gk[2]} {gk[1]}: ends {dict(tos)}; kept {max(tos.items(), key=lambda kv: (kv[1], [-ord(ch) for ch in kv[0]]))[0]}")
        to = max(tos.items(), key=lambda kv: (kv[1], [-ord(ch) for ch in kv[0]]))[0] if tos else None
        for m in c:
            if m is not base: _absorb(base, m)
        base["date"] = {"from": min(fr, key=_pad) if fr else None, "to": to}
        if to and base.get("note"):  # "End date not covered here." no longer holds
            base["note"] = re.sub(r"\s*End date[^.]*\.", "", base["note"]).strip()
        if len(c) > 1: n_tenure_merged["overlapping"] += len(c) - 1; warn("tenure_merged", f"{gk[0]} {gk[2]} {gk[1]}: {[m['id'] for m in c]} -> {base['id']}")
        final.append(base)
    if undated:
        target = None
        if final:
            cover = [b for b in final if _pad(_span(b)[0]) <= PROTEST_DAY <= _pad(_span(b)[1], True)]
            target = (cover or [max(final, key=lambda b: _pad(_span(b)[0]))])[0]
        else:
            target = max(undated, key=lambda r: (len(r["sources"]), r["id"]))
            final.append(target)
        for u in undated:
            if u is target: continue
            _absorb(target, u); n_tenure_merged["undated"] += 1
            warn("tenure_merged", f"{gk[0]} {gk[2]} {gk[1]}: undated {u['id']} -> {target['id']}")
    keep = {id(r) for r in final}
    for k, r in items:
        if id(r) not in keep: del refs[k]
if n_tenure_merged: warn("tenure_summary", f"{dict(n_tenure_merged)} references merged")

# ---- publisher independence ------------------------------------------------
def norm(s): return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()
def origin(srcid):
    e = ents.get(srcid)
    if not e: return None
    p = e["properties"]
    syn = norm(p.get("syndicated_from"))
    return syn or norm(p.get("publisher"))
def independent(src_ids):
    return len({o for o in (origin(s) for s in src_ids) if o})
def settle(status, src_ids, what):
    n = independent(src_ids)
    if status == "disputed": return "disputed"
    new = "confirmed" if n >= 2 else "single-source"
    if status != new:
        warn("verification_recomputed", f"{what}: {status!r} -> {new!r} ({n} independent publishers)")
    return new

# ---- claim status corrections ------------------------------------------------
# A claim is `disputed` only if a source disputes it or another claim conflicts with it (checked below). Claims
# whose note describes a difference of date, scope or definition were reviewed (build_claim_status.py) and
# get the status their own sources support.
REF_FIX = {}
if os.path.exists(f"{HERE}/reference-status-corrections.json"):
    REF_FIX = json.load(open(f"{HERE}/reference-status-corrections.json")).get("recompute", {})
STATUS_FIX = json.load(open(f"{HERE}/status-corrections.json")) if os.path.exists(f"{HERE}/status-corrections.json") else {}
n_status_fixed = 0
# A downgrade says the claim had no dispute link. A `disputes` reference added later (disputes-research part) voids it.
DISPUTED_CLAIMS = {r["to"] for r in refs.values() if r["type"] == "disputes" and r["to"].startswith("claim:")}
for cid, why in STATUS_FIX.get("downgrade", {}).items():
    e = ents.get(cid)
    if not e or e["properties"].get("verification_status") != "disputed": continue
    if al(cid) in DISPUTED_CLAIMS:
        warn("status_downgrade_void", f"{cid}: a source now disputes it")
        continue
    st_srcs = {s for ev in e["evidence"] for s in ev.get("sources", []) if "statement" in (ev["property"] if isinstance(ev["property"], list) else [ev["property"]])}
    new = "confirmed" if independent(st_srcs) >= 2 else "single-source"
    e["properties"]["verification_status"] = new
    note = (e["properties"].get("verification_note") or "").strip()
    e["properties"]["verification_note"] = (note + " " if note else "") + f"Status was 'disputed' with no dispute link; set to '{new}': {why}"
    for ev in e["evidence"]:
        if ev.get("verification") == "disputed": ev["verification"] = new
    n_status_fixed += 1
    warn("status_corrected", f"{cid}: disputed -> {new} ({why})")

# Sources that are living pages (Wikipedia, OpenStreetMap, institutional sites) have no publication date; the
# researchers entered the access date as `published`. Move it to `accessed` and leave `published` empty.
ACCESS_RX = re.compile(r"wikipedia|wikidata|wikimedia|commons|openstreetmap|nominatim", re.I)
for eid, e in ents.items():
    if e["template"] != "source": continue
    pr = e["properties"]
    label = (pr.get("url") or {}).get("label", "") if isinstance(pr.get("url"), dict) else ""
    if ACCESS_RX.search(pr.get("publisher") or "") or re.search(r"accessed", label, re.I) or "accessed" in eid:
        if not pr.get("accessed"):
            pr["accessed"] = pr.get("published") or "2026-10-05"
        pr["published"] = None
        warn("moved_to_accessed", eid)

# Privacy: a post URL on X or TikTok carries the account handle. Handles of anything but news outlets are removed
# (X accepts /i/status/<id>; TikTok redirects /@/video/<id>), so the data holds no private person's handle.
OUTLET_X = {"online_khabar", "setopati", "kathmandupost", "ekantipur", "himalayantimes", "myrepublica", "bbcnepali", "aljazeera", "reuters", "ap", "afp", "bbcnews", "dwnews", "france24", "hrw", "amnesty", "cpj"}
def scrub(v):
    if isinstance(v, str):
        def x(m):
            return m.group(0) if m.group(2).lower() in OUTLET_X else f"{m.group(1)}/i/status/"
        v = re.sub(r"(https?://(?:www\.|mobile\.)?(?:x|twitter)\.com)/([A-Za-z0-9_]+)/status/", x, v)
        v = re.sub(r"(https?://(?:www\.)?tiktok\.com)/@[^/\s]+/video/", r"\1/@/video/", v)
        return v
    if isinstance(v, dict): return {k: scrub(x_) for k, x_ in v.items()}
    if isinstance(v, list): return [scrub(x_) for x_ in v]
    return v
n_scrubbed = 0
for e in ents.values():
    new = scrub(e["properties"])
    if new != e["properties"]: n_scrubbed += 1
    e["properties"] = new
    for ev in e["evidence"]: ev["note"] = scrub(ev.get("note", ""))
for r in refs.values():
    r["note"] = scrub(r.get("note", ""))
if n_scrubbed: warn("handles_scrubbed_from_urls", f"{n_scrubbed} entities")

# ---- validate and settle entities ------------------------------------------
birthmarks = collections.Counter()
for eid, e in ents.items():
    t = e["template"]
    for (tt, old), new in PROP_ALIAS.items():
        if t == tt and old in e["properties"]:
            v = e["properties"].pop(old)
            if not e["properties"].get(new): e["properties"][new] = v
            for ev in e["evidence"]:
                pr = ev.get("property")
                ev["property"] = [new if x == old else x for x in pr] if isinstance(pr, list) else (new if pr == old else pr)
    if t not in templates:
        warn("bad_template", f"{eid}: {t!r}"); continue
    if not eid.startswith(t + ":"): warn("id_prefix", f"{eid} (template {t})")
    for k, v in list(e["properties"].items()):
        if k in COMMON: continue
        p = PROPS[t].get(k)
        if not p:
            warn("unknown_property", f"{eid}.{k}"); continue
        if p["type"] == "relationship":
            warn("relationship_in_properties", f"{eid}.{k}"); continue
        if p["type"] == "select" and v not in thes_ids.get(p["content"], set()):
            warn("bad_select", f"{eid}.{k}={v!r}")
        if p["type"] == "multiselect":
            for x in (v if isinstance(v, list) else [v]):
                if x not in thes_ids.get(p["content"], set()): warn("bad_select", f"{eid}.{k}={x!r}")
    for p in templates.get(t, {}).get("properties", []):
        if p.get("required") and p["type"] != "relationship" and e["properties"].get(p["name"]) in (None, "", []):
            warn("missing_required", f"{eid}.{p['name']}")
    # structured figures on claims
    if t == "claim":
        cp = e["properties"]
        if any(k in cp for k in ("figure", "unit", "as_of", "scope", "qualifier", "as_of_basis", "unit_detail")):
            fg = cp.get("figure")
            if not (isinstance(fg, int) and not isinstance(fg, bool) and fg >= 0): warn("figure_not_integer", f"{eid}: {fg!r}")
            if cp.get("unit") not in thes_ids["figure_units"]: warn("figure_unit_invalid", f"{eid}: {cp.get('unit')!r}")
            if cp.get("unit") == "other" and not cp.get("unit_detail"): warn("figure_unit_other_without_detail", eid)
            if cp.get("qualifier") not in thes_ids["figure_qualifiers"]: warn("figure_qualifier_invalid", f"{eid}: {cp.get('qualifier')!r}")
            if not cp.get("scope"): warn("figure_without_scope", eid)
            ao = cp.get("as_of")
            if ao is not None:
                try: datetime.date.fromisoformat(ao)
                except Exception: warn("as_of_not_a_date", f"{eid}: {ao!r}")
            if cp.get("as_of_basis") not in thes_ids["as_of_bases"]: warn("as_of_basis_invalid", f"{eid}: {cp.get('as_of_basis')!r}")
            if (ao is None) != (cp.get("as_of_basis") == "unknown"): warn("as_of_basis_mismatch", f"{eid}: as_of={ao!r}, basis={cp.get('as_of_basis')!r}")
            if not any("figure" in (ev["property"] if isinstance(ev["property"], list) else [ev["property"]]) and not ev.get("inferred") for ev in e["evidence"]):
                warn("figure_without_evidence", eid)
    # evidence
    covered = set()
    for ev in e["evidence"]:
        props = ev.get("property")
        for pr in (props if isinstance(props, list) else [props]): covered.add(pr)
        ev["sources"] = [s for s in ev.get("sources", []) if s in ents or warn("evidence_source_missing", f"{eid}: {s}")]
        ev["verification"] = settle(ev.get("verification"), ev["sources"], f"{eid}.{props}") if ev["sources"] else "single-source"
        if not ev["sources"]: warn("evidence_no_source", f"{eid}.{props}")
    # Properties no evidence entry names: attach the sources of the entity's other evidence entries (or, if it has
    # none, the sources that report on it), flagged `inferred`. Counted separately in stats.
    missing = [k for k in e["properties"] if k not in covered and k not in COMMON and t != "source"]
    if missing:
        pool = sorted({s for ev in e["evidence"] for s in ev["sources"]})
        if not pool:
            pool = sorted({r["sources"][0] for r in refs.values() if r["to"] == eid and r["from"].startswith("source:") and r["sources"]} |
                          {r["from"] for r in refs.values() if r["to"] == eid and r["from"].startswith("source:") and r["from"] in ents})
        if pool:
            st = "confirmed" if independent(pool) >= 2 else "single-source"
            if any(ev["verification"] == "disputed" for ev in e["evidence"]): st = "disputed" if len(e["evidence"]) == 1 else st
            e["evidence"].append({"property": missing, "sources": pool, "verification": st, "note": "inferred: sources of the entity's other facts or of references that report on it", "inferred": True})
        else:
            warn("no_evidence", f"{eid}: {missing}")
    # the entity-level `verification` select mirrors the status of its core fact
    core = {"event": "when", "action": "date", "casualty": "occurred"}.get(t)
    if core and "verification" in PROPS[t]:
        st = None
        for ev in e["evidence"]:
            pr = ev["property"] if isinstance(ev["property"], list) else [ev["property"]]
            if core in pr and not ev.get("inferred"): st = ev["verification"]
        if st is None:
            sts = [ev["verification"] for ev in e["evidence"]]
            st = "disputed" if "disputed" in sts else ("confirmed" if sts and all(x == "confirmed" for x in sts) else ("single-source" if sts else None))
        if st: e["properties"]["verification"] = st
    # minors
    if t == "casualty":
        age = e["properties"].get("age")
        if isinstance(age, (int, float)) and age < 18 and e["properties"].get("full_name"):
            warn("minor_named", f"{eid}: age {age}, name blanked")
            e["properties"]["full_name"] = None
            e["properties"]["identity_status"] = "withheld"
            e["title"] = f"Minor, {int(age)}"
    if t == "source":
        for k in ("url", "publisher"):
            if not e["properties"].get(k): warn("source_missing_" + k, eid)
        if not e["properties"].get("published") and not e["properties"].get("accessed"): warn("source_no_date", eid)

# ---- references ------------------------------------------------------------
final_refs = []
for key, r in refs.items():
    rt = rtypes.get(r["type"])
    if not rt: warn("bad_ref_type", f"{r['id']}: {r['type']}"); continue
    f, to = ents.get(r["from"]), ents.get(r["to"])
    if not f: warn("dangling_from", f"{r['id']}: {r['from']}"); continue
    if not to: warn("dangling_to", f"{r['id']}: {r['to']}"); continue
    if f["template"] not in rt["from"]: warn("ref_from_template", f"{r['id']}: {r['type']} from {f['template']}")
    if to["template"] not in rt["to"]: warn("ref_to_template", f"{r['id']}: {r['type']} to {to['template']}")
    r["sources"] = [s for s in r["sources"] if s in ents]
    if not r["sources"]: warn("ref_no_source", r["id"]); r["verification"] = "single-source"
    else: r["verification"] = settle(r.get("verification"), r["sources"], r["id"])
    # reference-status-corrections.json: a reference kept `disputed` with no opposing source or conflicting claim
    # takes the status its own sources give (confirmed with 2+ independent publishers, else single-source).
    if r["id"] in REF_FIX and r["verification"] == "disputed" and r["sources"]:
        new = "confirmed" if independent(r["sources"]) >= 2 else "single-source"
        r["note"] = ((r.get("note") or "") + (" " if r.get("note") else "") +
                     f"Status was 'disputed' with no opposing source or conflicting claim; set to '{new}' on review: {REF_FIX[r['id']]}").strip()
        warn("reference_status_corrected", f"{r['id']}: disputed -> {new}")
        r["verification"] = new
    if r.get("anchor") and not (r["anchor"].get("quote") and r["anchor"].get("source") in ents):
        warn("bad_anchor", r["id"]); r["anchor"] = None
    if r.get("anchor") and not (r["from"].startswith("source:") and r["anchor"]["source"] == r["from"]):
        # An anchor is a passage in the source at the "from" end; a quote about some other record is not one.
        warn("anchor_dropped_not_on_source_end", f"{r['id']} ({r['type']} {r['from']} -> {r['to']}; quote came from {r['anchor']['source']})")
        r["note"] = (r.get("note") or "") + (" " if r.get("note") else "") + "Passage from " + r["anchor"]["source"] + " (not an anchor on this record): " + r["anchor"]["quote"]
        r["anchor"] = None
    final_refs.append(r)

# ---- consistency rules on the final references -----------------------------------
# (a) one person, body and type: no two overlapping tenures, and no undated tenure beside a dated one;
# (b) a claim marked disputed has a dispute link: a source that disputes it, or a conflicting claim;
# (c) a conflicts_with link joins two claims and at least one of them is disputed.
tg = collections.defaultdict(list)
for r in final_refs:
    if r["type"] in TENURE_TYPES: tg[(r["from"], r["to"], r["type"])].append(r)
for gk, rs in tg.items():
    for i, a in enumerate(rs):
        fa, ta = _span(a)
        if fa and ta and _pad(fa) > _pad(ta): warn("tenure_inverted", f"{a['id']}: {fa} > {ta}")
        for b in rs[i + 1:]:
            if _overlap(a, b): warn("tenure_overlap", f"{gk[0]} {gk[2]} {gk[1]}: {a['id']} and {b['id']}")
            elif _pad(_span(a)[0]) < _pad(_span(b)[1], True) and _pad(_span(b)[0]) < _pad(_span(a)[1], True):
                warn("tenure_second_post", f"{gk[0]} {gk[2]} {gk[1]}: {a['id']} ({a.get('note')}) and {b['id']} ({b.get('note')})")
    if len(rs) > 1 and any(not any(_span(r)) for r in rs): warn("tenure_undated_beside_dated", f"{gk[0]} {gk[2]} {gk[1]}: {[r['id'] for r in rs]}")
linked = set()
for r in final_refs:
    if r["type"] == "disputes" and r["to"].startswith("claim:"): linked.add(r["to"])
    if r["type"] == "conflicts_with":
        linked |= {r["from"], r["to"]}
        a, b = ents[r["from"]], ents[r["to"]]
        if a["template"] != "claim" or b["template"] != "claim": warn("conflict_not_between_claims", r["id"])
        if "disputed" not in (a["properties"].get("verification_status"), b["properties"].get("verification_status")):
            warn("conflict_link_on_undisputed_claims", r["id"])
for eid, e in ents.items():
    if e["template"] == "claim" and e["properties"].get("verification_status") == "disputed" and eid not in linked:
        warn("disputed_without_dispute_link", eid)

# ---- documents: attach primary files, re-anchor quotes to {file, page, text} --------------------------
DOCS = os.path.join(os.path.dirname(HERE), "docs")
doc_pages = {}   # doc id -> list of (page number, normalised text)
def _norm(t):
    t = html_unescape(t)
    t = t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2013", "-").replace("\u2014", "-")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", " ", t.lower())).strip()
import html as _html
def html_unescape(t): return _html.unescape(t)
doc_of_entity = {}
if os.path.exists(f"{DOCS}/index.json"):
    for rec in json.load(open(f"{DOCS}/index.json")):
        eid, did = al(rec.get("entity")), rec.get("doc")
        if eid not in ents: warn("doc_entity_missing", f"{did}: {eid}"); continue
        mp = f"{DOCS}/{did}/meta.json"
        meta = json.load(open(mp)) if os.path.exists(mp) else {}
        f = {"id": did, "path": f"docs/{did}/doc.pdf", "role": rec.get("role", "primary"), "title": meta.get("title"),
             "language": meta.get("language"), "pages": meta.get("pages"), "bytes": meta.get("bytes"), "sha256": meta.get("sha256"),
             "licence_basis": meta.get("licence_basis"), "text_layer": meta.get("text_layer", True), "translation_of": meta.get("translation_of"),
             "source_url": meta.get("source_url")}
        ents[eid].setdefault("files", []).append(f)
        doc_of_entity.setdefault(eid, []).append(did)
        if did not in doc_pages:
            pages = []
            pdir = f"{DOCS}/{did}/pages"
            if os.path.isdir(pdir):
                for fn in sorted(os.listdir(pdir)):
                    if fn.endswith(".txt"): pages.append((int(fn[:-4]), _norm(open(f"{pdir}/{fn}", errors="ignore").read())))
            doc_pages[did] = pages
    if os.path.exists(f"{DOCS}/linkonly.json"):
        for rec in json.load(open(f"{DOCS}/linkonly.json")):
            eid = al(rec.get("entity"))
            if eid in ents: ents[eid].setdefault("link_only_documents", []).append({k: rec.get(k) for k in ("url", "publisher", "title", "date", "language", "reason")})
reanchored = collections.Counter(); not_found = []
for r in final_refs:
    a = r.get("anchor")
    if not a: continue
    dids = doc_of_entity.get(a["source"], [])
    if not dids: continue
    q = _norm(a["quote"])
    hit = None
    for did in dids:
        for n, txt in doc_pages.get(did, []):
            if q and q in txt: hit = (did, n); break
        if hit: break
    if hit:
        a["file"], a["page"], a["text"] = hit[0], hit[1], a["quote"]
        reanchored[hit[0]] += 1
    else:
        not_found.append(r["id"])
if not_found: warn("anchor_not_found_in_attached_document", ", ".join(not_found[:60]) + (f" … ({len(not_found)})" if len(not_found) > 60 else ""))

# ---- privacy scan ----------------------------------------------------------
pats = {"email": r"[\w.+-]+@[\w-]+\.[\w.]+", "phone": r"(?<!\d)(\+?977[\s-]?)?9[78]\d{8}(?!\d)", "handle": r"(?<![\w/])@[A-Za-z0-9_]{3,}"}
for e in ents.values():
    blob = json.dumps(e["properties"], ensure_ascii=False)
    for n, p in pats.items():
        if re.search(p, blob): warn("privacy_" + n, e["id"])
for r in final_refs:
    q = (r.get("anchor") or {}).get("quote", "")
    for n, p in pats.items():
        if re.search(p, q): warn("privacy_" + n, r["id"])

# ---- outputs ---------------------------------------------------------------
out_ents = sorted(ents.values(), key=lambda e: (e["template"] or "", e["id"]))
json.dump(out_ents, open(f"{HERE}/entities.json", "w"), indent=1, ensure_ascii=False)
json.dump(final_refs, open(f"{HERE}/references.json", "w"), indent=1, ensure_ascii=False)

os.makedirs(f"{HERE}/csv", exist_ok=True)
for t, tpl in templates.items():
    cols = ["id", "title"] + [p["name"] for p in tpl["properties"] if p["type"] != "relationship"] + ["verification_by_property", "source_ids"]
    with open(f"{HERE}/csv/{t}.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(cols)
        for e in out_ents:
            if e["template"] != t: continue
            row = [e["id"], e["title"]]
            for p in tpl["properties"]:
                if p["type"] == "relationship": continue
                v = e["properties"].get(p["name"])
                row.append(json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else ("" if v is None else v))
            ver = {}
            srcs = set()
            for ev in e["evidence"]:
                for pr in (ev["property"] if isinstance(ev["property"], list) else [ev["property"]]): ver[pr] = ev["verification"]
                srcs |= set(ev["sources"])
            row += [json.dumps(ver, ensure_ascii=False), ";".join(sorted(srcs))]
            w.writerow(row)
with open(f"{HERE}/csv/references.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["id", "from", "type", "to", "date", "anchor_source", "anchor_quote", "sources", "verification", "note"])
    for r in final_refs:
        a = r.get("anchor") or {}
        w.writerow([r["id"], r["from"], r["type"], r["to"], json.dumps(r["date"]) if r["date"] else "", a.get("source", ""), a.get("quote", ""),
                    ";".join(r["sources"]), r["verification"], r.get("note", "")])

# ---- stats -----------------------------------------------------------------
def dates_of(e):
    p = e["properties"]; t = e["template"]; out = []
    if t == "event" and isinstance(p.get("when"), dict): out += [p["when"].get("from"), p["when"].get("to")]
    if t == "action": out.append(p.get("date"))
    if t == "claim": out.append(p.get("asserted_on"))
    if t == "casualty": out.append(p.get("occurred"))
    if t == "source": out.append(p.get("published"))
    return [d[:10] for d in out if isinstance(d, str) and re.match(r"\d{4}-\d{2}-\d{2}", d)]
ev_dates = sorted(d for e in out_ents if e["template"] in ("event", "action") for d in dates_of(e))
all_dates = sorted(d for e in out_ents for d in dates_of(e))
fact_status = collections.Counter(ev["verification"] for e in out_ents for ev in e["evidence"] if not ev.get("inferred"))
inferred_status = collections.Counter(ev["verification"] for e in out_ents for ev in e["evidence"] if ev.get("inferred"))
ref_status = collections.Counter(r["verification"] for r in final_refs)
by_year = collections.Counter(d[:4] for d in ev_dates)
stats = {
    "entities": len(out_ents),
    "entities_by_template": dict(collections.Counter(e["template"] for e in out_ents)),
    "references": len(final_refs),
    "references_by_type": dict(collections.Counter(r["type"] for r in final_refs).most_common()),
    "references_with_anchor_quote": sum(1 for r in final_refs if r.get("anchor")),
    "event_action_date_span": [ev_dates[0], ev_dates[-1]] if ev_dates else None,
    "event_action_dates_by_year": dict(by_year),
    "all_date_span": [all_dates[0], all_dates[-1]] if all_dates else None,
    "entity_fact_verification_explicit": dict(fact_status),
    "entity_fact_verification_inferred": dict(inferred_status),
    "evidence_entries": {"explicit": sum(fact_status.values()), "inferred": sum(inferred_status.values())},
    "reference_verification": dict(ref_status),
    "combined_verification": dict(fact_status + ref_status),
}
tot = sum(stats["combined_verification"].values()) or 1
stats["combined_verification_share"] = {k: round(v / tot, 3) for k, v in stats["combined_verification"].items()}
media = [e for e in out_ents if e["template"] == "media"]
def cnt(k): return dict(collections.Counter(e["properties"].get(k) for e in media))
bundled = [e for e in media if str(e["properties"].get("rights", "")).startswith("bundled")]
stats["media"] = {"items": len(media), "by_kind": cnt("media_kind"), "by_rights": cnt("rights"), "by_verification": cnt("verification"),
                  "by_platform": cnt("platform"), "by_content_warning": cnt("content_warning"),
                  "bundled_items": len(bundled), "bundled_bytes": sum((e["properties"].get("file") or {}).get("bytes", 0) for e in bundled),
                  "with_geolocation": sum(1 for e in media if e["properties"].get("geolocation")),
                  "with_segment": sum(1 for e in media if e["properties"].get("segment_start") is not None)}
docs = [(e["id"], f) for e in out_ents for f in e.get("files", [])]
stats["documents"] = {"bundled": len({f["id"] for _, f in docs}), "bytes": sum({f["id"]: f.get("bytes") or 0 for _, f in docs}.values()),
                      "by_language": dict(collections.Counter(f.get("language") for _, f in {f["id"]: (e, f) for e, f in docs}.values())),
                      "link_only": sum(len(e.get("link_only_documents", [])) for e in out_ents),
                      "references_page_anchored": sum(reanchored.values()), "page_anchored_by_doc": dict(reanchored)}
figs = [e for e in out_ents if e["template"] == "claim" and e["properties"].get("figure") is not None]
fgroups = collections.defaultdict(set)
for e in figs:
    cp = e["properties"]
    if cp.get("as_of"): fgroups[(cp["unit"], cp.get("unit_detail") or "", cp["scope"], cp["as_of"])].add(cp["figure"])
stats["claim_figures"] = {"claims_with_figure": len(figs), "by_unit": dict(collections.Counter(e["properties"]["unit"] for e in figs)),
                          "by_as_of_basis": dict(collections.Counter(e["properties"]["as_of_basis"] for e in figs)),
                          "by_qualifier": dict(collections.Counter(e["properties"]["qualifier"] for e in figs)),
                          "groups_same_unit_scope_as_of": len(fgroups),
                          "groups_with_disagreement": sum(1 for v in fgroups.values() if len(v) > 1)}
json.dump(stats, open(f"{HERE}/stats.json", "w"), indent=1)
with open(f"{HERE}/validation-report.md", "w") as fh:
    fh.write("# Validation report (generated by merge.py)\n\n")
    for k, v in sorted(report.items()):
        fh.write(f"## {k} ({len(v)})\n" + "\n".join(f"- {x}" for x in v[:200]) + ("\n- …" if len(v) > 200 else "") + "\n\n")
print(json.dumps(stats, indent=1)); print({k: len(v) for k, v in report.items()})
