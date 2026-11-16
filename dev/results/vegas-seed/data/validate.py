"""Privacy, harm and consistency checks on the seed. Exit status 1 on any failure.
    python3 validate.py [entities.json references.json]
The same rules are what the app's build script must enforce (see README section 10)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ent_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "entities.json")
ref_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "references.json")
E = json.load(open(ent_path)); R = json.load(open(ref_path))
TPL = {t["id"]: t for t in json.load(open(os.path.join(HERE, "schema", "templates.json")))}
RT = {r["id"]: r for r in json.load(open(os.path.join(HERE, "schema", "relationTypes.json")))}
THES = json.load(open(os.path.join(HERE, "schema", "thesauri.json")))
deny = [l.strip().lower() for l in open(os.path.join(HERE, "privacy-denylist.txt")) if l.strip() and not l.startswith("#")]
ALLOWED_EMAIL = {"vegasmapprojectteam@googlegroups.com"}
fails = []; warns = []
def fail(m): fails.append(m)

def strings(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items(): yield from strings(v, f"{path}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o): yield from strings(v, f"{path}[{i}]")
    elif isinstance(o, str):
        yield path, o

by_id = {e["id"]: e for e in E}
assert len(by_id) == len(E), "duplicate entity ids"
GRAPHIC = re.compile(r"\b(victims?|bod(?:y|ies)(?![- ]?(?:cam|worn))|dead|dying|blood\w*|wound\w*|shot in|lady shot|wheelbarrow|hit stage|corpse|killed)\b", re.I)
for e in E:
    ctx = e["id"]
    # 1. denylist, contacts, links, graphic words, in every string of the entity
    for path, s in strings(e):
        low = s.lower()
        for d in deny:
            if re.search(r"(?<![a-z])" + re.escape(d) + r"(?![a-z])", low):
                fail(f"{ctx}{path}: denylisted string '{d}'")
        for m in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}", s):
            if m.lower() not in ALLOWED_EMAIL: fail(f"{ctx}{path}: e-mail address {m}")
        if re.search(r"\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b", s): fail(f"{ctx}{path}: phone number")
        for u in re.findall(r"https?://\S+", s):
            if re.search(r"facebook\.com/(?!watch/\?v=\d+$)", u) or re.search(r"twitter\.com/(?!i/status/\d+$)", u):
                fail(f"{ctx}{path}: social profile or handle link {u}")
            if re.search(r"img\.youtube\.com|ytimg\.com|googleusercontent|usercontent\.google|mymaps", u): fail(f"{ctx}{path}: image or thumbnail link {u}")
    if e["template"] == "recording":
        p = e["properties"]
        if "content_warning" not in p: fail(f"{ctx}: no content warning")
        if p.get("content_warning") not in ("graphic", "distressing"): fail(f"{ctx}: content warning is not graphic or distressing")
        for bad in ("file", "thumbnail", "image", "poster"):
            if bad in p: fail(f"{ctx}: property '{bad}' (no media is bundled)")
        lab = p.get("map_label", "")
        if GRAPHIC.search(lab) and p.get("media_kind") != "911-compilation": fail(f"{ctx}: label describes a person or injury: {lab}")
        if p.get("media_kind") == "911-call":
            if "map_label" in p: fail(f"{ctx}: a 911 call carries a label")
            g = p.get("camera_position")
            if g and (round(g["lat"], 3) != g["lat"] or round(g["lon"], 3) != g["lon"]): fail(f"{ctx}: call position not generalised")
        for k in ("embed",):
            v = p.get(k)
            if v and not re.match(r"https://(www\.youtube\.com/watch\?v=[\w-]{11}(&t=[\dhms]+)?|www\.facebook\.com/watch/\?v=\d+|twitter\.com/i/status/\d+|archive\.org/details/|www\.ktuu\.com/)", v["url"]):
                fail(f"{ctx}: unexpected embed address {v['url']}")
    # 2. select values exist in their thesaurus
    t = TPL[e["template"]]
    for pd in t["properties"]:
        if pd["type"] in ("select", "multiselect") and pd["name"] in e["properties"]:
            ids = {x["id"] for x in THES[pd["content"]]}
            vals = e["properties"][pd["name"]]
            for v in (vals if isinstance(vals, list) else [vals]):
                if v not in ids: fail(f"{ctx}: {pd['name']} value '{v}' not in thesaurus {pd['content']}")
    unknown = set(e["properties"]) - {pd["name"] for pd in t["properties"]} - {"title"}
    if unknown: fail(f"{ctx}: properties not in the template: {sorted(unknown)}")
    if e["template"] == "claim" and e["properties"].get("claim_type") == "count" and not e["properties"].get("as_of"):
        warns.append(f"{ctx}: count claim without a date")
    for ev in e["evidence"]:
        for s in ev["sources"]:
            if s not in by_id: fail(f"{ctx}: evidence source {s} missing")
for r in R:
    for end in ("from", "to"):
        if r[end] not in by_id: fail(f"{r['id']}: {end} {r[end]} missing")
    if r["type"] not in RT: fail(f"{r['id']}: unknown relationship type {r['type']}"); continue
    ft, tt = by_id[r["from"]]["template"], by_id[r["to"]]["template"]
    if ft not in RT[r["type"]]["from"] or tt not in RT[r["type"]]["to"]:
        fail(f"{r['id']}: {r['type']} from {ft} to {tt} is not allowed")
    for s in r["sources"]:
        if s not in by_id: fail(f"{r['id']}: source {s} missing")
    for path, s in strings(r):
        low = s.lower()
        for d in deny:
            if re.search(r"(?<![a-z])" + re.escape(d) + r"(?![a-z])", low): fail(f"{r['id']}{path}: denylisted string '{d}'")
# 2b. 911 calls: closed category list, audio links, nothing but the allowed properties (no title text)
sys.path.insert(0, HERE)
from call_categories import IDS as CALL_CATS
if [x["id"] for x in THES["call_categories"]] != CALL_CATS: fail("thesaurus call_categories differs from call_categories.py")
CALL_PROPS = {"media_kind", "call_number", "content_warning", "verification", "availability", "camera_position", "position_basis", "call_category",
              "embed", "platform", "provenance", "compilation_offset_seconds", "audio_url", "audio_basis"}
AUDIO = re.compile(r"^https://archive\.org/details/(LasVegasShooting911Calls|Vegas_Shoooting_Batch_7-911Calls)/171001003519_\(\d+\)\.wma$")
for e in E:
    p = e["properties"]
    if p.get("media_kind") == "911-call":
        if p.get("call_category") not in CALL_CATS: fail(f"{e['id']}: call_category '{p.get('call_category')}' is not in the closed list")
        extra = set(p) - CALL_PROPS
        if extra: fail(f"{e['id']}: a call carries properties that could hold title text: {sorted(extra)}")
        if not re.fullmatch(r"911 call #\d+", e["title"]): fail(f"{e['id']}: call title is not the neutral form: {e['title']}")
        if "audio_url" in p:
            if not AUDIO.match(p["audio_url"]["url"]): fail(f"{e['id']}: unexpected audio address {p['audio_url']['url']}")
            if p.get("audio_basis") not in ("map-link", "matched-by-number"): fail(f"{e['id']}: audio_basis missing")
            note = " ".join(ev["note"] for ev in e["evidence"] if "audio_url" in (ev["property"] if isinstance(ev["property"], list) else [ev["property"]]))
            if not all(w in note for w in ("credited to LVMPD", "private account", "no licence stated", "Linked only")): fail(f"{e['id']}: audio evidence note incomplete")
            mm = AUDIO.match(p["audio_url"]["url"])
            if mm and mm.group(1) not in note: fail(f"{e['id']}: audio evidence note lacks the item id")
        elif "audio_basis" in p: fail(f"{e['id']}: audio_basis without audio_url")
    elif "call_category" in p or "audio_url" in p:
        fail(f"{e['id']}: call_category or audio_url on a record that is not a call")
# 3. the raw copy never holds the victims folder
raw = open(os.path.join(HERE, "..", "raw", "map-without-victims-folder.kml"), encoding="utf8").read()
if "<name>Victims</name>" in raw or "Burial:" in raw or "Residence:" in raw: fail("raw KML still holds the Victims folder")
# 4. the gunman is never named anywhere in the output files
for f in ("entities.json", "references.json", "sync-check.md", "sync-check.json", "stats.json"):
    p = os.path.join(HERE, f)
    if os.path.exists(p) and re.search(r"paddock|stephen", open(p).read(), re.I): fail(f"{f}: names the gunman")
n_rec = sum(1 for e in E if e["template"] == "recording")
print(f"checked {len(E)} entities ({n_rec} recordings) and {len(R)} references")
for w in warns: print("warning:", w)
if fails:
    print(f"FAILED: {len(fails)} problem(s)")
    for f in fails[:80]: print(" -", f)
    sys.exit(1)
print("OK: all privacy and consistency checks pass")
