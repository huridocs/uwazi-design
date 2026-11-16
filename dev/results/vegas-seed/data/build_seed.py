"""Build the Vegas seed (Nepal's file shapes) from raw/map-without-victims-folder.kml.

    python3 kml_extract.py && python3 build_seed.py

Writes: entities.json, references.json, stats.json, sync-check.json, sync-check.md, schema/*, showcase/*.
Everything is derived from the map's own annotations plus the secondary sources in static_data.py.
"""
import json, os, re, sys, statistics, math, collections
from datetime import timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeparse import *
from labels import OVERRIDE, generic, release_label, sentence_case
import static_data as SD
from call_categories import categorize
import schema_def

HERE = os.path.dirname(os.path.abspath(__file__))
ACCESSED = "2026-10-07"
EXTRACT = json.load(open(os.path.join(HERE, "extract.json")))

def slug(s, n=60):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", " and ")).strip("-")
    return s[:n].strip("-") or "x"

entities = {}
refs = []
def add_entity(eid, template, title, props, evidence=None):
    assert eid not in entities, eid
    props = {k: v for k, v in props.items() if v is not None and v != [] and v != ""}
    entities[eid] = {"id": eid, "template": template, "title": title, "properties": props, "evidence": evidence or []}
def add_ref(frm, typ, to, sources, verification, note="", date=None, anchor=None, **extra):
    r = {"id": f"ref:vegas-{len(refs)+1:05d}", "from": frm, "to": to, "type": typ, "date": date, "anchor": anchor,
         "sources": sources, "verification": verification, "note": note}
    r.update(extra)
    refs.append(r)
    return r

# ------------------------------------------------------------------------------------------------------------
# 1. static entities: organisations, sources
# ------------------------------------------------------------------------------------------------------------
for k, (name, typ, url) in SD.ORG.items():
    add_entity(f"organisation:{k}", "organisation", name, {"org_type": typ, "website": {"url": url, "label": name} if url else None})
for sid, (title, pub, ptype, url, published, read, licence, pages, note) in SD.SOURCES.items():
    props = {"publisher": pub, "publisher_type": ptype, "published": published, "accessed": ACCESSED,
             "url": {"url": url, "label": title} if url else None, "licence": licence, "pages": pages, "language": "en", "read_status": read}
    if sid == SD.MAP:
        props["contact"] = "VegasMapProjectTeam@googlegroups.com"   # the only address allowed in the corpus (a project group address)
    add_entity(sid, "source", title, props, [{"property": "read_status", "sources": [sid], "verification": "single-source", "note": note}] if note else [])

# ------------------------------------------------------------------------------------------------------------
# 2. places
# ------------------------------------------------------------------------------------------------------------
PLACE_TYPE_BY_NAME = [
    (r"Hotel|Casino|Tropicana|Excalibur|Luxor|MGM|Delano|Hooters|Mandalay", "hotel-casino"),
    (r"Hospital|Medical Center", "hospital"),
    (r"Healing Garden", "memorial"),
    (r"Shrine|McCarran|Welcome to Fabulous|Bus Stop|Skyvue", "public-place"),
    (r"ARCO|Maverick|Pizzeria|Beer stand|Stony|Malibu", "business"),
    (r"^RV$|Trailer|Tent|Tour Bus|18 wheeler|Fuel Tank|Police Truck|Billboard|BBQ", "vehicle-or-structure"),
    (r"^Las Vegas Village$", "venue-area"),
]
def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
def poly_area(pts):
    a = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2
def point_in_poly(pt, poly):
    x, y = pt; inside = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside

place_ids = {}      # for lookup
polygons = []       # (area, place id, pts)
seen_slugs = collections.Counter()
for it in EXTRACT["items"]:
    if it["kind"] not in ("place-of-interest", "venue-feature"):
        continue
    name = re.sub(r"\s+", " ", it["name"]).strip().rstrip("?").strip() or "Unnamed feature"
    if name == "":
        name = "Unnamed feature"
    base = slug(name)
    seen_slugs[base] += 1
    pid = f"place:{base}" if seen_slugs[base] == 1 else f"place:{base}-{seen_slugs[base]}"
    ptype = "venue-feature" if it["kind"] == "venue-feature" else "public-place"
    for pat, typ in PLACE_TYPE_BY_NAME:
        if re.search(pat, name):
            ptype = typ
            break
    if name == "Las Vegas Village":
        ptype = "venue-area"
    if it["kind"] == "venue-feature" and ptype in ("hotel-casino", "business") and not re.search(r"Stony|Malibu|Pizzeria|Beer", name):
        ptype = "venue-feature"
    # description: keep plain text only, drop links, street-view and image links
    desc = re.sub(r"https?://\S+", "", it["desc_text"])
    desc = re.sub(r"\s+", " ", desc).strip(" :")
    if re.search(r"TBD|Losers", desc):
        desc = ""
    pts = it["coords"]
    c = centroid(pts) if it["geom"] != "Point" else pts[0]
    props = {"place_type": ptype, "geolocation": {"lat": round(c[1], 6), "lon": round(c[0], 6)}, "description": desc or None,
             "coordinate_basis": "map-estimate"}
    if it["geom"] in ("Polygon", "LineString"):
        gj = {"type": it["geom"], "coordinates": ([pts + [pts[0]]] if it["geom"] == "Polygon" else pts)}
        props["footprint"] = json.dumps(gj, separators=(",", ":"))
    if it["geom"] == "Polygon" and it["kind"] == "venue-feature" or (it["geom"] == "Polygon" and name == "Las Vegas Village"):
        polygons.append((poly_area(pts), pid, pts))
    add_entity(pid, "place", name, props, [{"property": ["place_type", "geolocation", "footprint"], "sources": [SD.MAP], "verification": "single-source", "note": ""}])
    place_ids[name] = pid
polygons.sort()
MB = "place:mandalay-bay-hotel"; LVV = "place:las-vegas-village"
assert MB in entities and LVV in entities, (MB in entities, LVV in entities)

# ------------------------------------------------------------------------------------------------------------
# 3. recordings
# ------------------------------------------------------------------------------------------------------------
YT = re.compile(r"(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([\w-]{11})")
FB = re.compile(r"facebook\.com/[^/\s]+/videos/(\d+)")
TW = re.compile(r"twitter\.com/[^/\s]+/status/(\d+)")
ARC = re.compile(r"(https?://archive\.org/details/[^\s<>\"]+)")
CHECKED = {  # YouTube oEmbed on 2026-10-07 (raw/oembed-sample.txt): the only availability data we have
    "GcIQgyFKcUA": "available", "Wvy5aUFETCw": "unavailable", "ZoCKcMuGwYY": "available", "AJ95BG9Hj2k": "unavailable",
    "HnfgzRi2VyE": "available", "QLt16rs74ec": "available", "kmnpoiYNNLg": "available", "4mwEH2vEcKw": "available"}
KIND_LABEL = {"phone-video": "Phone video", "vehicle-video": "Vehicle video", "body-camera": "Body camera", "cctv": "Surveillance camera", "aerial": "Aerial", "911-call": "911 call"}
KIND_CODE = {"phone-video": "ph", "vehicle-video": "ve", "cctv": "cc", "aerial": "ae", "body-camera": "bw"}
WARNING = {"body-camera": "graphic", "cctv": "graphic", "911-call": "graphic", "911-compilation": "graphic"}

def links_of(it):
    raw = it["desc_raw"] + "\n" + it["desc_text"]
    out = []
    for m in YT.finditer(raw):
        out.append(("youtube", m.group(1), f"https://www.youtube.com/watch?v={m.group(1)}"))
    for m in FB.finditer(raw):
        out.append(("facebook", m.group(1), f"https://www.facebook.com/watch/?v={m.group(1)}"))   # profile name dropped
    for m in TW.finditer(raw):
        out.append(("twitter", m.group(1), f"https://twitter.com/i/status/{m.group(1)}"))        # handle dropped
    for m in ARC.finditer(raw):
        out.append(("archive-org", None, m.group(1)))
    m = re.search(r"https?://(?:www\.)?ktuu\.com/video/\?vid=(\d+)", raw)
    if m:
        out.append(("news-site", None, f"https://www.ktuu.com/video/?vid={m.group(1)}"))
    seen = set(); res = []
    for k, i, u in out:
        if u not in seen:
            seen.add(u); res.append((k, i, u))
    return res

def nums_of_spec(spec):
    if not spec: return []
    out = set()
    for part in re.split(r"\s*(?:,|&|\band\b)\s*", spec):
        m = re.match(r"(\d+)\s*(?:Thru|thru)\s*(\d+)", part.strip())
        if m:
            out.update(range(int(m.group(1)), int(m.group(2)) + 1))
        else:
            m = re.match(r"(\d+)", part.strip())
            if m: out.add(int(m.group(1)))
    return sorted(n for n in out if 1 <= n <= 12)

def known_clock_error(desc_text):
    m = re.search(r"ahead", desc_text, re.I)
    if not m: return None, None
    note = re.sub(r"\s+", " ", re.sub(r"\*+", "", [l for l in desc_text.split("\n") if re.search(r"ahead", l, re.I)][0])).strip()
    n = re.search(r":(\d{2})|~?\s*(\d+)\s*sec", note)
    sec = int(next(g for g in n.groups() if g)) if n else None
    return note, sec

recs = []      # working records
used_ids = set()
def unique(eid):
    base = eid; k = 2
    while eid in used_ids:
        eid = f"{base}-{k}"; k += 1
    used_ids.add(eid); return eid

for it in EXTRACT["items"]:
    if it["kind"] in ("place-of-interest", "venue-feature", "911-call"):
        continue
    t = parse_title(it["name"], it["kind"])
    ann = parse_annotations(it["desc_text"])
    links = links_of(it)
    kind = it["kind"]
    if links:
        k0, i0, u0 = links[0]
        eid = unique(f"recording:{ {'youtube':'yt','facebook':'fb','twitter':'tw'}.get(k0, KIND_CODE[kind]) }-{i0 or str(it['index']).zfill(3)}")
    else:
        eid = unique(f"recording:{KIND_CODE[kind]}-{str(it['index']).zfill(3)}")
    # label
    raw = t["label_raw"]
    if (kind, it["index"]) in OVERRIDE:
        label = OVERRIDE[(kind, it["index"])]
    elif kind in ("body-camera", "aerial") and re.search(r"Batch|Release", raw, re.I):
        label = release_label(raw) if kind == "body-camera" else generic(raw)
    else:
        label = generic(raw)
    label = sentence_case(label).replace("Shooter", "gunman")
    label = re.sub(r"\bpaddock\b", "", label, flags=re.I)
    if not label:
        label = KIND_LABEL[kind]
    batch = None
    m = re.search(r"(?:Batch|Release)\s*#?\s*(\d+)", raw, re.I)
    if m and kind in ("body-camera", "aerial"): batch = m.group(1)
    recs.append(dict(id=eid, it=it, t=t, ann=ann, links=links, label=label, batch=batch, kind=kind))

# date inconsistency: title date says 10/2 but the annotations are volleys of 1 Oct
for r in recs:
    t = r["t"]
    r["date_inconsistent"] = bool(t["date"] and t["date"] != (2017, 10, 1) and any(a["type"] == "volley" for a in r["ann"]) and t["date"][:2] == (2017, 10))
    if r["date_inconsistent"] and t["clock"] is not None:
        t["clock"] = t["clock"].replace(day=1)
    # the memorial video of a year later is not event footage
    r["after_event"] = bool(t["date"] and t["date"][0] != 2017)

# ------------------------------------------------------------------------------------------------------------
# 4. sync: volley medians, residuals, per-recording implied start
# ------------------------------------------------------------------------------------------------------------
def med(xs):
    return statistics.median(xs)
vol_ann = collections.defaultdict(list)       # n -> [(rec index, clock secs, ann)]
for ri, r in enumerate(recs):
    for a in r["ann"]:
        a["secs"] = secs_of(a["clock"])
        if a["type"] == "volley" and a["qualifier"] is None:
            vol_ann[a["volley"]].append((ri, a["secs"], a))
vol_median = {n: med([s for _, s, _ in v]) for n, v in vol_ann.items()}
vol_stats = {}
for n, v in sorted(vol_ann.items()):
    xs = [s for _, s, _ in v]
    m = vol_median[n]
    out = [(recs[ri]["id"], s - m) for ri, s, _ in v if abs(s - m) > 2]
    vol_stats[n] = dict(n=len(xs), median=m, min=min(xs) - m, max=max(xs) - m, spread=max(xs) - min(xs),
                        stdev=statistics.pstdev(xs), mad=med([abs(x - m) for x in xs]), within1=sum(abs(x - m) <= 1 for x in xs),
                        within2=sum(abs(x - m) <= 2 for x in xs), outliers=out)
    for ri, s, a in v:
        a["residual"] = s - m

for r in recs:
    t = r["t"]; ann = r["ann"]
    anchors = [a for a in ann if a["offset_s"] is not None and a["qualifier"] is None]
    implied = [a["secs"] - a["offset_s"] for a in anchors]
    r["anchors"] = len(anchors)
    r["implied_secs"] = med(implied) if implied else None
    r["spread"] = (max(implied) - min(implied)) if implied else None
    first = next((a for a in ann if a["offset_s"] is not None), None)   # first annotation with an offset, any kind
    r["first_implied"] = (first["secs"] - first["offset_s"]) if first else None
    r["title_secs"] = secs_of(t["clock"]) if t["clock"] is not None and t["precision"] in ("second", "minute") and not r["after_event"] else None
    r["title_mismatch"] = (r["first_implied"] is not None and r["title_secs"] is not None and t["precision"] == "second" and abs(r["first_implied"] - r["title_secs"]) > 2)
    res = [a["residual"] for a in ann if a.get("residual") is not None]
    r["residual"] = med(res) if res else None
    r["outlier"] = any(abs(x) > 2 for x in res)
    note, sec = known_clock_error(r["it"]["desc_text"])
    r["clock_note"], r["clock_err"] = note, sec
    r["qualified"] = any(a["qualifier"] for a in ann)

def secs_to_iso(secs, precision="second"):
    from datetime import datetime
    dt = DAY0 + timedelta(seconds=round(secs))
    return iso(dt)

for r in recs:
    t = r["t"]
    if r["after_event"]:
        r.update(clock=None, basis="none", precision=None)
        r["clock_iso"] = f"{t['date'][0]}-{t['date'][1]:02d}-{t['date'][2]:02d}" if t["date"] else None
        r["precision"] = "day"; r["clock_secs"] = None; r["conf"] = "none"
        continue
    if r["implied_secs"] is not None:
        r["clock_iso"] = secs_to_iso(r["implied_secs"]); r["basis"] = "annotations"; r["precision"] = "second"; r["clock_secs"] = r["implied_secs"]
    elif t["window"]:
        r["clock_iso"] = iso(t["window"][0]); r["basis"] = "title-window"; r["precision"] = "minute"; r["clock_secs"] = secs_of(t["window"][0])
    elif t["clock"] is not None and t["precision"] in ("second", "minute"):
        r["clock_iso"] = iso(t["clock"]); r["basis"] = "title"; r["precision"] = t["precision"]; r["clock_secs"] = secs_of(t["clock"])
    elif t["date"] and t["precision"] == "day":
        r["clock_iso"] = f"{t['date'][0]}-{t['date'][1]:02d}-{t['date'][2]:02d}"; r["basis"] = "title"; r["precision"] = "day"; r["clock_secs"] = None
    else:
        r["clock_iso"] = None; r["basis"] = "none"; r["precision"] = None; r["clock_secs"] = None
    if r["anchors"] >= 3 and (r["spread"] or 0) <= 2: conf = "anchored-consistent"
    elif r["anchors"] >= 2 and (r["spread"] or 0) > 2: conf = "anchored-drift"
    elif r["anchors"] >= 1: conf = "one-or-two"
    elif r["basis"] in ("title", "title-window") and r["precision"] != "day": conf = "title-only"
    else: conf = "none"
    r["conf"] = conf
for r in recs:
    r.setdefault("conf", "none")
    flags = []
    if r["title_mismatch"]: flags.append("title-mismatch")
    if r["spread"] is not None and r["spread"] > 2: flags.append("drift")
    if r["outlier"]: flags.append("outlier")
    if r["qualified"]: flags.append("qualified-annotation")
    if r["date_inconsistent"]: flags.append("date-inconsistent")
    if r["clock_note"]: flags.append("clock-note")
    if r["clock_iso"] is None or r["precision"] == "day": flags.append("no-clock")
    r["flags"] = flags

# ------------------------------------------------------------------------------------------------------------
# 5. moments
# ------------------------------------------------------------------------------------------------------------
ORDINAL = lambda n: f"{n}"
moments = {}   # id -> dict(clock_secs, witnesses)
for n in range(1, 13):
    st = vol_stats[n]
    moments[f"moment:volley-{n:02d}"] = dict(kind="volley", n=n, secs=st["median"], count=st["n"], spread=st["spread"],
                                              recs=sorted({recs[ri]["id"] for ri, _, _ in vol_ann[n]}))
cluster_types = {"single-shot": "Single gunshot", "first-shots": "First shots (map annotation)", "corridor-shots": "Shots in the hotel corridor (map annotation)",
                 "ricochet": "Ricochet sound", "bullet-pass": "Bullet passing sound"}
clusters = []
for typ in cluster_types:
    pts = sorted([(a["secs"], r["id"], a) for r in recs for a in r["ann"] if a["type"] == typ and a["qualifier"] is None], key=lambda x: x[0])
    cur = []
    for p in pts:
        if cur and p[0] - cur[-1][0] > 2:
            clusters.append((typ, cur)); cur = []
        cur.append(p)
    if cur: clusters.append((typ, cur))
for typ, cur in clusters:
    secs = med([p[0] for p in cur]); rids = sorted({p[1] for p in cur})
    mid = f"moment:{secs_to_iso(secs)[:19].replace('-', '').replace(':', '').replace('T', 't')}-{typ}"
    k = 2; base = mid
    while mid in moments: mid = f"{base}-{k}"; k += 1
    moments[mid] = dict(kind=typ, secs=secs, count=len(rids), spread=max(p[0] for p in cur) - min(p[0] for p in cur), recs=rids)
    for _, _, a in cur: a["moment"] = mid
for typ in ():
    pass
# attach volley moment ids to the volley annotations (qualified ones too: they belong to the same volley)
for r in recs:
    for a in r["ann"]:
        if a["type"] == "volley":
            a["moment"] = f"moment:volley-{a['volley']:02d}"
        elif a["type"] in cluster_types and "moment" not in a:
            # a qualified single-shot annotation: attach to the nearest cluster of its type within 2 s, else none
            best = None
            for mid, m in moments.items():
                if m["kind"] == a["type"] and abs(m["secs"] - a["secs"]) <= 2:
                    best = mid; break
            if best: a["moment"] = best
vol_ids = [f"moment:volley-{n:02d}" for n in range(1, 13)]
intervals = {n: moments[vol_ids[n - 1]]["secs"] - moments[vol_ids[n - 2]]["secs"] for n in range(2, 13)}

# ------------------------------------------------------------------------------------------------------------
# 6. write recording entities
# ------------------------------------------------------------------------------------------------------------
def fmt_clock(r):
    return (r["clock_iso"] or "")[11:19] if r["clock_iso"] and "T" in r["clock_iso"] else ""
nearest_poly_cache = {}
def containing_place(lon, lat):
    for area, pid, pts in polygons:
        if pid == LVV and False:
            continue
        if point_in_poly((lon, lat), pts):
            return pid
    return None

for r in recs:
    it, t, kind = r["it"], r["t"], r["kind"]
    clock_s = fmt_clock(r)
    title = f"{r['label']} · {clock_s}" if clock_s else r["label"]
    vol_cov = sorted(set(nums_of_spec(t["volley_spec"])) | {a["volley"] for a in r["ann"] if a["type"] == "volley"})
    props = {"map_label": r["label"], "media_kind": kind}
    if r["links"]:
        k0, i0, u0 = r["links"][0]
        props["embed"] = {"url": u0, "label": r["label"]}
        props["platform"] = k0
        if len(r["links"]) > 1:
            props["more_links"] = "\n".join(f"- {u}" for _, _, u in r["links"][1:])
        ytid = i0 if k0 == "youtube" else None
        props["availability"] = CHECKED.get(ytid, "not-checked") if ytid else "not-checked"
        if ytid in CHECKED:
            props["availability_checked"] = ACCESSED
    else:
        props["platform"] = "none"; props["availability"] = "not-checked"
    props["provenance"] = "official-release-reupload" if (kind == "body-camera" and r["batch"]) or (kind == "aerial" and r["batch"]) else "unknown"
    if r["batch"]: props["release_batch"] = r["batch"]
    props["clock_start"] = r["clock_iso"]
    if r.get("clock_secs") is not None and r["precision"] == "second":
        props["sync_offset_seconds"] = round(r["clock_secs"] - secs_of(T2200))
    props["clock_precision"] = r["precision"]
    if t["window"]:
        props["clock_end"] = iso(t["window"][1])
    if t["clock"] is not None and not r["after_event"] and t["precision"] in ("second", "minute"):
        props["clock_start_title"] = iso(t["clock"]) if not r["date_inconsistent"] else iso(t["clock"])
    if r["implied_secs"] is not None:
        props["clock_start_implied"] = secs_to_iso(r["implied_secs"])
    props["clock_start_basis"] = r["basis"]
    props["sync_confidence"] = r["conf"]
    props["sync_anchor_count"] = r["anchors"]
    if r["spread"] is not None: props["sync_spread_seconds"] = round(r["spread"], 1)
    if r["residual"] is not None: props["sync_residual_seconds"] = round(r["residual"], 1)
    if r["clock_note"]:
        props["clock_note"] = r["clock_note"]
        if r["clock_err"] is not None: props["known_clock_error_seconds"] = r["clock_err"]
    if r["flags"]: props["sync_flags"] = r["flags"]
    if vol_cov: props["volleys_covered"] = [str(n) for n in vol_cov]
    props["annotation_count"] = len(r["ann"])
    props["content_warning"] = WARNING.get(kind, "distressing")
    props["verification"] = "single-source"
    # position
    c = it["coords"]
    if c:
        lon, lat = c[0]
        props["camera_position"] = {"lat": round(lat, 6), "lon": round(lon, 6)}
        props["position_basis"] = "start-of-path" if it["geom"] == "LineString" else ("map-estimate-flagged" if t["starred"] else "map-estimate")
        if it["geom"] == "LineString":
            props["camera_path"] = json.dumps({"type": "LineString", "coordinates": [[round(x, 6), round(y, 6)] for x, y in c]}, separators=(",", ":"))
        if kind != "aerial":
            pid = containing_place(lon, lat)
            r["place"] = pid
    ev = [
        {"property": ["clock_start", "clock_start_title", "clock_start_implied", "sync_offset_seconds", "sync_confidence", "volleys_covered", "annotation_count"],
         "sources": [SD.MAP], "verification": "single-source",
         "note": "Clock times and offsets are the map's annotations. Title time and the time implied by the first annotation are kept apart; flags show where they disagree."},
        {"property": ["camera_position", "camera_path", "position_basis"], "sources": [SD.MAP], "verification": "single-source",
         "note": "Map position" + ("; marked as a best estimate on the map" if t["starred"] else "") + "."},
    ]
    r["entity_props"] = props
    add_entity(r["id"], "recording", title, props, ev)

# ------------------------------------------------------------------------------------------------------------
# 7. 911 calls and compilations
# ------------------------------------------------------------------------------------------------------------
comp_ids = {}
ARCH_FILES = {}
for item_id, src in (("LasVegasShooting911Calls", SD.ARCH5), ("Vegas_Shoooting_Batch_7-911Calls", SD.ARCH7)):
    ARCH_FILES[item_id] = (src, json.load(open(os.path.join(HERE, "..", "raw", f"archive-files-{item_id}.json")))["files"])
def archive_audio(num, url_from_map):
    """(item id, source id, url, basis) for a call whose audio is on the Internet Archive, else None."""
    if url_from_map:
        item_id = "Vegas_Shoooting_Batch_7-911Calls" if "Batch_7" in url_from_map else "LasVegasShooting911Calls"
        return item_id, ARCH_FILES[item_id][0], url_from_map, "map-link"
    for item_id, (src, files) in ARCH_FILES.items():
        if num is not None and str(num) in files:
            return item_id, src, f"https://archive.org/details/{item_id}/{files[str(num)]}", "matched-by-number"
    return None
def yt_offset(url):
    m = re.search(r"[?&]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", url)
    if not m: return None
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s
COMP_TITLE = {"kmnpoiYNNLg": "911 calls, release batch 5, part 1 of 2 (calls 1 to 260)", "4mwEH2vEcKw": "911 calls, release batch 5, part 2 of 2 (calls 261 to 518)"}
call_recs = []
archive_extra = []
for it in EXTRACT["items"]:
    if it["kind"] != "911-call":
        continue
    m = re.search(r"Cal\s*l\s*#\s*(\d+)", it["name"])
    num = int(m.group(1)) if m else None
    raw = it["desc_raw"] + "\n" + it["desc_text"]
    ym = re.search(r"youtube\.com/watch\?v=([\w-]{11})(?:&amp;|&)t=((?:\d+h)?(?:\d+m)?(?:\d+s)?)", raw)
    am = ARC.search(raw)
    lon, lat = it["coords"][0]
    props = {"media_kind": "911-call", "call_number": num, "content_warning": "graphic", "verification": "single-source", "availability": "not-checked",
             "camera_position": {"lat": round(lat, 3), "lon": round(lon, 3)}, "position_basis": "generalised",
             "call_category": categorize(it["name"])}
    eid = unique(f"recording:call-{num if num is not None else str(it['index']).zfill(3)}")
    ev = [{"property": ["camera_position", "position_basis"], "sources": [SD.MAP], "verification": "single-source",
           "note": "Position generalised to three decimals (about 100 m) because a call can come from a private room; the map's title text is not carried."},
          {"property": ["call_category"], "sources": [SD.MAP], "verification": "single-source",
           "note": "Category chosen by the Research lane from the map's call title with a closed list of keyword rules (data/call_categories.py); no title text is carried."}]
    target = None
    if ym:
        yid, tparam = ym.group(1), ym.group(2)
        off = yt_offset("?t=" + tparam)
        props["embed"] = {"url": f"https://www.youtube.com/watch?v={yid}&t={tparam}", "label": f"911 call #{num}"}
        props["platform"] = "youtube"; props["compilation_offset_seconds"] = off
        props["provenance"] = "official-release-reupload"
        if yid not in comp_ids:
            comp_ids[yid] = f"recording:yt-{yid}"
        target = ("derived", comp_ids[yid], off)
    elif am:
        props["platform"] = "archive-org"; props["provenance"] = "official-release-reupload"
        target = ("archive", None, None)
    else:
        props["platform"] = "none"
    aud = archive_audio(num, am.group(1) if am else None)
    if aud:
        item_id, src, url, basis = aud
        props["audio_url"] = {"url": url, "label": f"911 call #{num}, audio file"}
        props["audio_basis"] = basis
        ev.append({"property": ["audio_url", "audio_basis"], "sources": [src, SD.MAP] if basis == "map-link" else [src], "verification": "single-source",
                   "note": (f"Internet Archive item {item_id}, credited to LVMPD, uploaded by a private account, no licence stated on the item. Linked only: nothing was downloaded or re-hosted. "
                            + ("The map links this file." if basis == "map-link" else "Found by matching the call number to the item's file list; the audio was not listened to."))})
        if target is None or target[0] != "archive":
            archive_extra.append((eid, src, basis))
        target = ("archive", src, basis) if (target is None or target[0] == "archive") else target
    add_entity(eid, "recording", f"911 call #{num}", props, ev)
    call_recs.append((eid, target))
comp_range = collections.defaultdict(list)
for _e in entities.values():
    _p = _e["properties"]
    if _p.get("media_kind") == "911-call" and _p.get("platform") == "youtube" and "compilation_offset_seconds" in _p:
        comp_range[re.search(r"v=([\w-]{11})", _p["embed"]["url"]).group(1)].append(_p["call_number"])
for yid, cid in comp_ids.items():
    _r = comp_range.get(yid) or [0]
    title = COMP_TITLE.get(yid, f"911 call compilation (calls {min(_r)} to {max(_r)} on the map)")
    props = {"media_kind": "911-compilation", "embed": {"url": f"https://www.youtube.com/watch?v={yid}", "label": title}, "platform": "youtube",
             "provenance": "official-release-reupload", "content_warning": "graphic", "verification": "single-source",
             "availability": CHECKED.get(yid, "not-checked"), "availability_checked": ACCESSED if yid in CHECKED else None, "map_label": title}
    add_entity(cid, "recording", title, props, [{"property": "embed", "sources": [SD.MAP], "verification": "single-source", "note": "Duration not known (no YouTube API key). Title from the YouTube oEmbed answer where checked." if yid in CHECKED else "Duration and title not known."}])

# ------------------------------------------------------------------------------------------------------------
# 8. moments as entities
# ------------------------------------------------------------------------------------------------------------
def moment_title(mid, m):
    hhmmss = secs_to_iso(m["secs"])[11:19]
    if m["kind"] == "volley": return f"Volley {m['n']} · {hhmmss}"
    return f"{cluster_types[m['kind']]} · {hhmmss}"
for mid, m in moments.items():
    ver = "confirmed" if m["count"] >= 2 else "single-source"
    props = {"label": moment_title(mid, m).split(" · ")[0], "moment_type": m["kind"], "clock_start": secs_to_iso(m["secs"]), "precision": "second",
             "witness_count": m["count"], "spread_seconds": round(m["spread"], 1), "time_basis": "map-annotation", "verification": ver}
    if m["kind"] == "volley" and m["n"] > 1:
        props["interval_from_previous_seconds"] = round(intervals[m["n"]], 1)
    note = (f"Median of {m['count']} recordings' annotated clock times; spread {m['spread']:.0f} s. "
            "Agreement among recordings counts as confirmation only if they are not copies of one video, which is not checked.")
    add_entity(mid, "moment", moment_title(mid, m), props, [{"property": ["clock_start", "witness_count", "spread_seconds"], "sources": [SD.MAP], "verification": ver, "note": note}])
# official moments
for suffix, label, mtype, clock, prec, text, srcs, ftype in SD.OFFICIAL_MOMENTS:
    mid = f"moment:{suffix}"
    add_entity(mid, "moment", f"{label} · {clock[11:16]}", {"label": label, "moment_type": mtype, "clock_start": clock, "precision": prec, "time_basis": "official-report-summary", "verification": "single-source"},
               [{"property": ["clock_start"], "sources": srcs, "verification": "single-source", "note": "From summary, not read at source (LVMPD PDFs not yet downloaded)."}])

# ------------------------------------------------------------------------------------------------------------
# 9. findings, claims
# ------------------------------------------------------------------------------------------------------------
LV = "organisation:lvmpd"
for suffix, label, mtype, clock, prec, text, srcs, ftype in SD.OFFICIAL_MOMENTS:
    fid = f"finding:{suffix}"
    add_entity(fid, "finding", label, {"text": text, "finding_type": ftype, "clock_time": clock, "precision": prec, "verification": "single-source"},
               [{"property": ["text", "clock_time"], "sources": srcs, "verification": "single-source", "note": "From summary, not read at source."}])
for slug_, text, ftype, date, srcs in SD.OTHER_FINDINGS:
    fid = f"finding:{slug_}"
    add_entity(fid, "finding", text.split(".")[0][:90], {"text": text, "finding_type": ftype, "clock_time": date, "precision": "day", "verification": "single-source"},
               [{"property": ["text"], "sources": srcs, "verification": "single-source", "note": "From summary, not read at source."}])
for c in SD.CLAIMS:
    cid = f"claim:{c['slug']}"
    props = {"statement": c["statement"], "claim_type": c["claim_type"], "figure": c["figure"], "unit": c["unit"], "qualifier": c["qualifier"], "as_of": c["as_of"],
             "as_of_basis": c["as_of_basis"], "scope": c["scope"], "verification_status": c["status"], "verification_note": c["note"]}
    add_entity(cid, "claim", c["title"], props, [{"property": ["statement", "figure", "as_of"], "sources": c["sources"], "verification": c["status"], "note": c["note"]}])

# ------------------------------------------------------------------------------------------------------------
# 10. references
# ------------------------------------------------------------------------------------------------------------
MAPSRC = [SD.MAP]
# captures: one per annotation that belongs to a moment
for r in recs:
    for a in r["ann"]:
        mid = a.get("moment")
        if not mid: continue
        res = a.get("residual")
        q = a["qualifier"]
        mom = moments[mid]
        if q:
            ver, note = "single-source", f"Annotation is marked partial on the map ('{q}'); not used for the volley time."
        elif res is not None and abs(res) > 2:
            ver, note = "disputed", f"This recording's clock differs from the volley's median by {res:+.0f} s."
        elif mom["count"] >= 3:
            ver, note = "confirmed", f"Within 2 s of the median of {mom['count']} recordings."
        else:
            ver, note = "single-source", ""
        add_ref(r["id"], "captures", mid, MAPSRC, ver, note,
                anchor={"recording": r["id"], "offset_seconds": a["offset_s"], "end_seconds": None, "clock": iso(a["clock"]), "label": a["label"], "qualifier": q})
    # provenance
    if r["clock_iso"]:
        add_ref(r["id"], "synced_by", SD.MAP, MAPSRC, "single-source", "Clock times and offsets annotated on the map.")
    if r["it"]["coords"]:
        add_ref(r["id"], "geolocated_by", SD.MAP, MAPSRC, "single-source", "Camera position on the map.")
    if r.get("place"):
        add_ref(r["id"], "recorded_at", r["place"], MAPSRC, "single-source", "Derived: the camera point lies inside the place's footprint.")
    if r["links"] and r["links"][0][0] in ("archive-org",):
        pass
for eid, target in call_recs:
    add_ref(eid, "geolocated_by", SD.MAP, MAPSRC, "single-source", "Call position on the map, generalised to about 100 m.")
    if entities[eid]["properties"].get("audio_url"):
        basis = entities[eid]["properties"]["audio_basis"]
        src = SD.ARCH7 if "Batch_7" in entities[eid]["properties"]["audio_url"]["url"] else SD.ARCH5
        add_ref(eid, "published_in", src, MAPSRC if basis == "map-link" else [src], "single-source",
                "Audio file in this Internet Archive item" + ("." if basis == "map-link" else ", found by call number."))
    if target:
        kind, to, off = target
        if kind == "derived":
            add_ref(eid, "derived_from", to, MAPSRC, "single-source", "A segment of the compilation.",
                    anchor={"recording": to, "offset_seconds": off, "end_seconds": None, "clock": None, "label": "call starts", "qualifier": None})
        else:
            pass
for mid, m in moments.items():
    if m["kind"] == "volley":
        add_ref(mid, "fired_from", MB, [SD.CLICK, SD.WIKI, SD.MAP], "single-source", "From summary: the shooting came from a suite on the 32nd floor.")
        add_ref(mid, "occurred_at", LVV, MAPSRC, "single-source", "")
    elif m["kind"] in cluster_types:
        add_ref(mid, "occurred_at", LVV if m["kind"] != "corridor-shots" else MB, MAPSRC, "single-source", "Place from the kind of sound; not located by the map." )
for n in range(1, 12):
    a, b = vol_ids[n - 1], vol_ids[n]
    add_ref(a, "followed_by", b, MAPSRC, "single-source", f"Interval between volley starts: {intervals[n+1]:.0f} s.", interval_seconds=round(intervals[n + 1], 1))
for suffix, label, mtype, clock, prec, text, srcs, ftype in SD.OFFICIAL_MOMENTS:
    add_ref(f"finding:{suffix}", "documents", f"moment:{suffix}", srcs, "single-source", "From summary, not read at source.")
    add_ref(f"finding:{suffix}", "issued_by", LV if suffix not in ("officers-on-32nd-floor",) else "organisation:clark-county-fire-department", srcs, "single-source", "")
for slug_, text, ftype, date, srcs in SD.OTHER_FINDINGS:
    org = {"rounds-1058": LV, "killed-58": "organisation:clark-county-coroner", "fbi-no-single-motive": "organisation:fbi-behavioral-analysis-unit", "after-action-response": "organisation:fema-national-exercise-division"}[slug_]
    add_ref(f"finding:{slug_}", "issued_by", org, srcs, "single-source", "")
for c in SD.CLAIMS:
    cid = f"claim:{c['slug']}"
    for s in c.get("supports", []):
        add_ref(s, "supports", cid, [s], c["status"] if c["status"] != "disputed" else "single-source", "")
    for s in c.get("disputes", []):
        add_ref(s, "disputes", cid, [s], "single-source", "")
for a, typ, b in SD.CLAIM_LINKS:
    add_ref(f"claim:{a}", typ, f"claim:{b}", [], "single-source", "")
add_ref("claim:guard-shot-time", "contradicts", "claim:no-six-minute-gap", [SD.NVIND, SD.INQ], "single-source", "Both concern the October 2017 timeline revisions; the exact contradiction needs the reports.")

# ------------------------------------------------------------------------------------------------------------
# 11. checks of ids, write
# ------------------------------------------------------------------------------------------------------------
for r in refs:
    assert r["from"] in entities, r["from"]
    assert r["to"] in entities, (r["to"], r)
    for s in r["sources"]: assert s in entities and entities[s]["template"] == "source", s
for e in entities.values():
    for ev in e["evidence"]:
        for s in ev["sources"]: assert s in entities, s

ent_list = list(entities.values())
json.dump(ent_list, open(os.path.join(HERE, "entities.json"), "w"), indent=1, ensure_ascii=False)
json.dump(refs, open(os.path.join(HERE, "references.json"), "w"), indent=1, ensure_ascii=False)
schema_def.write(HERE)

# ------------------------------------------------------------------------------------------------------------
# 12. stats and sync-check
# ------------------------------------------------------------------------------------------------------------
by_t = collections.Counter(e["template"] for e in ent_list)
by_rt = collections.Counter(r["type"] for r in refs)
kinds = collections.Counter(e["properties"].get("media_kind") for e in ent_list if e["template"] == "recording")
conf = collections.Counter(e["properties"].get("sync_confidence") for e in ent_list if e["template"] == "recording" and e["properties"].get("media_kind") not in ("911-call", "911-compilation"))
flags = collections.Counter(f for r in recs for f in r["flags"])
stats = {"entities": len(ent_list), "references": len(refs), "by_template": dict(by_t), "by_reference_type": dict(by_rt), "recording_kinds": dict(kinds),
         "sync_confidence": dict(conf), "sync_flags": dict(flags), "moments": {k: sum(1 for m in moments.values() if m["kind"] == k) for k in cluster_types} | {"volley": 12},
         "annotations": sum(len(r["ann"]) for r in recs), "recordings_with_clock": sum(1 for r in recs if r["clock_iso"] and r["precision"] != "day")}
json.dump(stats, open(os.path.join(HERE, "stats.json"), "w"), indent=1)

# keep the working structures for sync_report.py and showcase.py
import pickle
pickle.dump(dict(recs=[{k: v for k, v in r.items() if k != "it"} | {"folder": r["it"]["folder"], "index": r["it"]["index"], "name": r["it"]["name"]} for r in recs],
                 vol_stats=vol_stats, vol_median=vol_median, intervals=intervals, moments=moments), open(os.path.join(HERE, "working.pkl"), "wb"))
print(json.dumps(stats, indent=1))
