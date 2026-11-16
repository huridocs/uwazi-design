#!/usr/bin/env python3
"""Write ../disputed-notes.json: why each `disputed` reference is disputed, from the seed itself.

Reads references.json, entities.json and status-corrections.json. Edits none of them. Run: python3 build_disputed_notes.py

For each reference with verification == "disputed" it records
  note               one plain sentence (the seed's own note, when it has one)
  opposingSourceIds  sources on the other side of the contest, relative to this reference's stance
  pairedRefIds       references to the same claim with the opposite stance (supports <-> disputes), and, where the
                     claim only conflicts with another claim, the supports references of that claim
  status             explained | unexplained
  basis              how the note was found (see README section "Disputed-reference notes")
  missing            unexplained only: what the seed lacks
Nothing is written that is not in the seed. Privacy: a reference that touches a casualty record with a withheld
identity or an age under 18 carries no quote and no name beyond that record's own title.
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "disputed-notes.json")

R = json.load(open(f"{HERE}/references.json"))
E = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
FIX = json.load(open(f"{HERE}/status-corrections.json")).get("downgrade", {})
REF = {r["id"]: r for r in R}

# reference-status-corrections.json and parts/disputes-research-*.json reach references.json only through merge.py
# (with the hook in merge-patch-reference-corrections.diff). Say so when a run happens before that.
_corr = os.path.join(HERE, "reference-status-corrections.json")
if os.path.exists(_corr):
    _pending = [i for i in json.load(open(_corr)).get("recompute", {}) if REF.get(i, {}).get("verification") == "disputed"]
    if _pending:
        print(f"WARNING: {len(_pending)} references in reference-status-corrections.json are still `disputed` in "
              "references.json: apply merge-patch-reference-corrections.diff and run merge.py first.")

MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def pub(sid):
    e = E.get(sid)
    if not e:
        return sid
    p = e["properties"]
    name = p.get("publisher") or e["title"]
    d = p.get("published") or ""
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", d)
    if m:
        return f"{name} ({int(m.group(3))} {MONTHS[int(m.group(2)) - 1]} {m.group(1)})"
    return name


def pubs(sids, limit=3):
    names = []
    for s in sids:
        n = pub(s)
        if n not in names:
            names.append(n)
    if not names:
        return ""
    if len(names) > limit:
        return ", ".join(names[:limit]) + f" and {len(names) - limit} more"
    return ", ".join(names[:-1]) + (" and " if len(names) > 1 else "") + names[-1]


def quote_of(r):
    a = r.get("anchor") or {}
    return (a.get("quote") or "").strip()


def private(eid):
    e = E.get(eid)
    if not e or e["template"] != "casualty":
        return False
    p = e["properties"]
    age = p.get("age")
    return p.get("identity_status") == "withheld" or (isinstance(age, (int, float)) and age < 18)


def touches_private(r):
    return private(r["from"]) or private(r["to"]) or any(
        private(x) for c in (r["from"], r["to"]) if c.startswith("claim:") for x in claim_targets(c))


def claim_targets(cid):
    return [r["to"] for r in by_end[cid] if r["from"] == cid and r["type"] == "concerns"]


def tidy(s):
    s = re.sub(r"\s+", " ", (s or "").strip())
    return s


def lead_sentences(s, n=300):
    """The seed's note up to the sentence that crosses n characters; never cut inside a sentence."""
    s = tidy(s)
    if len(s) <= n:
        return s
    out = ""
    for part in re.split(r"(?<=[.!?])\s+", s):
        if out and len(out) + len(part) > n:
            break
        out = (out + " " + part).strip()
    return out


def sentence(s):
    s = tidy(s)
    return s if s.endswith((".", "!", "?", '"', "”")) else s + "."


def clip(s, n=170):
    s = tidy(s)
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(",;:") + "…"


# ---- indexes ------------------------------------------------------------------------------------------------------
by_end = collections.defaultdict(list)
for r in R:
    by_end[r["from"]].append(r)
    by_end[r["to"]].append(r)


def claim_refs(cid, rtype, source_end=True):
    return [r for r in by_end[cid] if r["type"] == rtype and r["to"] == cid and r["from"].startswith("source:")]


def supports_of(cid):
    return claim_refs(cid, "supports")


def disputes_of(cid):
    return claim_refs(cid, "disputes")


def asserting_sources(cid):
    """Sources that put the claim forward: supports references, claimed_by sources, statement evidence."""
    out = [r["from"] for r in supports_of(cid)]
    out += [r["to"] for r in by_end[cid] if r["from"] == cid and r["type"] == "claimed_by" and r["to"].startswith("source:")]
    for ev in E[cid]["evidence"]:
        props = ev["property"] if isinstance(ev["property"], list) else [ev["property"]]
        if "statement" in props and not ev.get("inferred"):
            out += ev.get("sources", [])
    return list(dict.fromkeys(out))


def conflicts_of(cid):
    """(other claim id, note) from conflicts_with references."""
    out = []
    for r in by_end[cid]:
        if r["type"] == "conflicts_with":
            other = r["to"] if r["from"] == cid else r["from"]
            out.append((other, tidy(r.get("note"))))
    return out


def ctitle(cid):
    return E[cid]["title"] if cid in E else cid


def cstatus(cid):
    return E[cid]["properties"].get("verification_status")


def cnote(cid):
    return tidy(E[cid]["properties"].get("verification_note"))


def downgraded(cid):
    return cid.split(":", 1)[1] in {k.split(":", 1)[1] if ":" in k else k for k in FIX}


# ---- explanation of the contest over one claim ----------------------------------------------------------------------
def contest(cid, own_source=None):
    """Return (opposing source ids, conflicting claim ids, clause) for a claim, from the point of view of a source
    that supports or reports it (own_source) or of the claim itself (None)."""
    disp = [r for r in disputes_of(cid) if r["from"] != own_source]
    same = [r for r in disputes_of(cid) if r["from"] == own_source] if own_source and not disp else []
    conf = conflicts_of(cid)
    opp = list(dict.fromkeys(r["from"] for r in disp))
    if same:
        opp = [own_source]
    conf_ids = [c for c, _ in conf]
    for c in conf_ids:
        if c in E:
            for s in asserting_sources(c):
                if s != own_source and s not in opp and s not in asserting_sources(cid):
                    opp.append(s)
    parts = []
    if disp:
        q = quote_of(disp[0])
        first = disp[0]["from"]
        rest = [r["from"] for r in disp if r["from"] != first]
        also = f"; {pubs(rest)} also dispute{'s' if len(set(rest)) == 1 else ''} it" if rest else ""
        if q and not touches_private_claim(cid):
            parts.append(f"{pub(first)} disputes it: \"{clip(q, 140)}\"{also}")
        else:
            parts.append(f"{pub(first)} disputes it{also}")
    if same:
        q = quote_of(same[0])
        if q and not touches_private_claim(cid):
            parts.append(f"the same source also disputes it: \"{clip(q, 140)}\"")
        else:
            parts.append("the same source also disputes it")
    for c, note in conf:
        if c not in E:
            continue
        why = note.rstrip(".") if note else clip(E[c]["properties"].get("statement", ""), 140)
        parts.append(f"it conflicts with the claim \"{clip(ctitle(c), 90)}\" ({why})")
    return opp, conf_ids, "; ".join(parts)


def touches_private_claim(cid):
    return any(private(t) for t in claim_targets(cid))


# ---- pairing -------------------------------------------------------------------------------------------------------
def pairs_for(r):
    """Same claim, opposite stance; or the competing claim's supports references."""
    paired, via = [], set()
    for c in (r["from"], r["to"]):
        if not c.startswith("claim:") or c not in E:
            continue
        if r["type"] == "supports" and r["to"] == c:
            for x in disputes_of(c):
                paired.append(x["id"]); via.add("dispute-link")
        elif r["type"] == "disputes" and r["to"] == c:
            for x in supports_of(c):
                paired.append(x["id"]); via.add("dispute-link")
        if r["type"] in ("supports", "disputes", "reports_on") and r["to"] == c:
            for other, _ in conflicts_of(c):
                if other in E:
                    for x in supports_of(other):
                        paired.append(x["id"]); via.add("conflicting-claim")
    paired = [p for p in dict.fromkeys(paired) if p != r["id"]]
    return paired, ("both" if len(via) == 2 else next(iter(via), None))


# ---- entity evidence (references with no claim end) -----------------------------------------------------------------
CLAIM_BY_SLUG = {cid.split(":", 1)[1]: cid for cid in E if cid.startswith("claim:")}


def claims_named_in(text):
    return [cid for slug, cid in CLAIM_BY_SLUG.items() if len(slug) > 12 and re.search(r"(?<![\w-])" + re.escape(slug) + r"(?![\w-])", text)]


def entity_evidence_note(r):
    """Disputed evidence entries with a note on the non-source ends of r. Returns (entity id, entry) or None."""
    rs = set(r["sources"]) | ({r["from"]} if r["from"].startswith("source:") else set())
    best = None
    for end in (r["to"], r["from"]):
        e = E.get(end)
        if not e or e["template"] == "source":
            continue
        for ev in e["evidence"]:
            if ev.get("verification") != "disputed" or ev.get("inferred") or not tidy(ev.get("note")):
                continue
            tied = bool(rs & set(ev.get("sources", [])))
            if best is None or (tied and not best[2]):
                best = (end, ev, tied)
    return best


# ---- main ----------------------------------------------------------------------------------------------------------
records = []
for r in R:
    if r["verification"] != "disputed":
        continue
    rid = r["id"]
    rec = {"refId": rid, "note": "", "opposingSourceIds": [], "pairedRefIds": [], "status": "unexplained",
           "basis": "", "missing": ""}
    paired, via = pairs_for(r)
    rec["pairedRefIds"] = paired
    if via:
        rec["pairedVia"] = via
    seed_note = tidy(r.get("note"))
    claims = [x for x in (r["from"], r["to"]) if x.startswith("claim:") and x in E]
    src_end = r["from"] if r["from"].startswith("source:") else None
    priv = touches_private(r)

    # opposing sources and conflicting claims, whatever the basis
    opp, conf_ids, clause = [], [], ""
    for c in claims:
        o, k, cl = contest(c, own_source=src_end if r["to"] == c else None)
        opp += [s for s in o if s not in opp]
        conf_ids += [x for x in k if x not in conf_ids]
        clause = clause or cl
    rec["opposingSourceIds"] = opp
    if conf_ids:
        rec["conflictingClaimIds"] = conf_ids

    if seed_note:
        rec.update(note=seed_note, status="explained", basis="seed-note")
        records.append(rec)
        continue

    if claims:
        c = claims[0]
        t = ctitle(c)
        stale = downgraded(c) or cstatus(c) != "disputed"
        if len(claims) == 2:
            # claim to claim: the two accounts
            a, b = claims
            conf = [n for o, n in conflicts_of(a) if o == b and n]
            why = conf[0].rstrip(".") if conf else clip(cnote(a), 160)
            if stale and not conf:
                rec.update(status="unexplained", basis="claim-claim",
                           missing=f"No conflict recorded between the two claims; the seed later set \"{ctitle(a)}\" to {cstatus(a)}.")
            else:
                rec.update(note=sentence(f"The claims \"{clip(ctitle(a), 80)}\" and \"{clip(ctitle(b), 80)}\" give different accounts: {why}"),
                           status="explained", basis="claim-conflict")
            records.append(rec); continue
        if r["type"] == "disputes" and r["to"] == c:
            q = quote_of(r)
            sup = pubs([x["from"] for x in supports_of(c)])
            ass = pubs(asserting_sources(c)) if not sup else sup
            tail = f"; {sup} support{'s' if len(set(x['from'] for x in supports_of(c))) == 1 else ''} it" if sup else (f"; the claim comes from {ass}" if ass else "")
            if q and not priv:
                rec.update(note=sentence(f"{pub(r['from'])} disputes the claim \"{clip(t, 90)}\": \"{clip(q, 140)}\"{tail}"))
            else:
                rec.update(note=sentence(f"{pub(r['from'])} is recorded as disputing the claim \"{clip(t, 90)}\"{tail}"))
            rec["basis"] = "source-stance"
            rec["opposingSourceIds"] = [s for s in asserting_sources(c) if s != r["from"]]
            if stale:
                rec["claimStatus"] = cstatus(c)
        elif stale and not opp and not conf_ids:
            fix = FIX.get(c, "")
            rec.update(status="unexplained", basis="claim-reclassified",
                       missing=f"The claim \"{clip(t, 80)}\" was set to {cstatus(c)} in the seed's status review "
                               f"({fix.rstrip('.') or 'no reason recorded'}); no opposing source or conflicting claim is recorded. "
                               "The reference kept `disputed`.")
            records.append(rec); continue
        elif not clause:
            rec.update(status="unexplained", basis="claim",
                       missing=f"The claim \"{clip(t, 80)}\" is marked {cstatus(c)} but has no disputes reference and no conflicting claim.")
            records.append(rec); continue
        elif r["to"] == c and src_end:
            verb = {"supports": "supports", "reports_on": "reports"}.get(r["type"], "reports")
            rec.update(note=sentence(f"{pub(src_end)} {verb} the claim \"{clip(t, 90)}\", which is contested: {clause}"),
                       basis="source-stance")
        else:
            rec.update(note=sentence(f"Inherited from the claim \"{clip(t, 90)}\", which is contested: {clause}"),
                       basis="claim-inherited")
        rec["status"] = "explained"
        records.append(rec)
        continue

    # no claim end: the entity's own disputed evidence
    hit = entity_evidence_note(r)
    if hit:
        end, ev, tied = hit
        named = claims_named_in(ev["note"])
        txt = lead_sentences(ev["note"])
        label = clip(E[end]["title"], 80)
        live = [c for c in named if cstatus(c) == "disputed" or conflicts_of(c) or disputes_of(c)]
        if named and not live:
            pointed = ", ".join("\"" + clip(ctitle(c), 80) + "\"" for c in named)
            rec.update(status="unexplained", basis="entity-pointer",
                       missing=f"The seed's note on \"{label}\" names {pointed}, "
                               f"which the seed later set to {cstatus(named[0])}; no competing account remains recorded.")
            records.append(rec); continue
        named = live
        if named:
            rec["conflictingClaimIds"] = named
            opp_src = []
            for c in named:
                for s2 in asserting_sources(c) + [x["from"] for x in disputes_of(c)]:
                    if s2 not in opp_src and s2 not in r["sources"] and s2 != src_end:
                        opp_src.append(s2)
            rec["opposingSourceIds"] = opp_src
            accounts = "; ".join(f"\"{clip(E[c]['properties'].get('statement') or E[c]['title'], 110)}\"" for c in named[:4])
            lead = "" if tied else "Inherited from the record: "
            rec.update(note=sentence(f"{lead}The record \"{label}\" has a disputed fact; the seed records these competing accounts: {accounts}"),
                       status="explained", basis="entity-evidence" if tied else "entity-evidence-untied")
            records.append(rec); continue
        if re.match(r"^\s*(see|cf\.?)\b", txt, re.I) and len(txt) < 140:
            rec.update(status="unexplained", basis="entity-pointer",
                       missing=f"The seed's note on \"{label}\" only points elsewhere (\"{txt}\") and names no claim that resolves.")
            records.append(rec); continue
        lead = "" if tied else "Inherited from the record: "
        rec.update(note=sentence(f"{lead}The record \"{label}\" has a disputed fact: {txt}"),
                   status="explained", basis="entity-evidence" if tied else "entity-evidence-untied")
        records.append(rec); continue

    # a disputed entity with no note anywhere
    ends = [x for x in (r["to"], r["from"]) if x in E and E[x]["template"] != "source"]
    dis = [ev for x in ends for ev in E[x]["evidence"] if ev.get("verification") == "disputed" and not ev.get("inferred")]
    miss = ("The linked record has disputed evidence entries but none carries a note." if dis else
            "No disputed evidence entry on either record and no opposing source.")
    rec.update(status="unexplained", basis="entity", missing=miss)
    records.append(rec)

json.dump(records, open(OUT, "w"), ensure_ascii=False, indent=1)
st = collections.Counter((r["basis"], r["status"]) for r in records)
for k, v in sorted(st.items()):
    print(k, v)
print("total", len(records), "explained", sum(r["status"] == "explained" for r in records),
      "unexplained", sum(r["status"] == "unexplained" for r in records))
