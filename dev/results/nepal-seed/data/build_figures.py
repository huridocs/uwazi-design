#!/usr/bin/env python3
"""Structured figures for claims: the reviewed decisions, and the generator of parts/claim-figures.json.

Each decision was made by reading the claim's statement and its anchor quotes (not by pattern matching).
Fields written on the claim:
  figure       integer (NPR for damage-NPR)
  unit         killed | injured | arrested | detained | missing | damage-NPR | other   (thesaurus figure_units)
  unit_detail  required when unit is other, e.g. "inmates escaped"
  qualifier    exact | at-least | about
  scope        national | Kathmandu | Kathmandu Valley | a named place | a hospital | ...
  as_of        the date the count was stated FOR (not published). ISO date.
  as_of_time   time of day, free text, only when the source gives one
  as_of_basis  stated (in the statement) | derived (from the event or period named) | published (only the
               publication date is known, used as a stand-in) | unknown (no as_of)
  figure_more  other figures in the same statement, as text
The evidence entry for these fields cites the sources of the claim's own statement.

Claims of claim_type casualty-figure that are not counts are left untouched (SKIPPED below).
Run: python3 build_figures.py, then python3 merge.py.
"""
import json, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
EX, AL, AB = "exact", "at-least", "about"
S, D, P, U = "stated", "derived", "published", "unknown"
K, I, DM, OT = "killed", "injured", "damage-NPR", "other"
N = "national"
KT = "Kathmandu"
# key (claim id without "claim:"), figure, unit, qualifier, as_of, basis, scope, time, unit_detail, more, uncertain
R = [
 # ---- 8 September, hour by hour and by evening ----
 ("toll-one-dead-early-afternoon", 1, K, EX, "2025-09-08", P, "Civil Hospital, New Baneshwor", "early afternoon", None, None, "Time of day only: 'early afternoon'."),
 ("toll-two-dead-mid-afternoon", 2, K, EX, "2025-09-08", P, KT, "mid-afternoon", None, None, None),
 ("toll-six-dead", 6, K, EX, "2025-09-08", P, KT, None, None, "4 at the National Trauma Centre; 1 at Civil Hospital; 1 at Kathmandu Medical College", None),
 ("toll-eight-dead", 8, K, AL, "2025-09-08", P, KT, None, None, None, None),
 ("death-toll-14-2025-09-08", 14, K, AL, "2025-09-08", S, KT, "about 16:00", None, "Counted from hospital reports", None),
 ("toll-fourteen-dead", 14, K, EX, "2025-09-08", S, "not stated", "16:00", None, None, "The statement names no place; the same count is Kathmandu in death-toll-14-2025-09-08."),
 ("death-toll-17-kathmandu-2025-09-08", 17, K, EX, "2025-09-08", S, KT, None, None, "Plus 2 outside the capital, in Itahari", None),
 ("toll-seventeen-dead-in-kathmandu", 17, K, AL, "2025-09-08", P, KT, None, None, None, None),
 ("hospital-split-8-3-3-2-1", 17, K, EX, "2025-09-08", P, "Kathmandu hospitals", None, None, "8 National Trauma Centre; 3 Everest Hospital; 3 Civil Hospital; 2 Kathmandu Medical College; 1 Tribhuvan University Teaching Hospital", "Hospital split differs from hospital-split-himalpress-6-5-3-2-1 for the same 17."),
 ("hospital-split-himalpress-6-5-3-2-1", 17, K, EX, "2025-09-08", P, "Kathmandu hospitals", None, None, "6 National Trauma Centre; 5 Everest Hospital; 3 Civil Hospital; 2 Kathmandu Medical College; 1 Tribhuvan University Teaching Hospital", "Hospital split differs from hospital-split-8-3-3-2-1 for the same 17."),
 ("valley-sixteen-and-itahari-two", 16, K, EX, "2025-09-08", P, "Kathmandu Valley", None, None, "2 more in Itahari; forensic experts received 16 bodies for autopsy", "The statement gives 16 + 2; the 18 total is not stated and not used as the figure."),
 ("death-toll-18-2025-09-08", 18, K, EX, "2025-09-08", S, N, "evening", None, "200 to 256 injured", None),
 ("death-toll-19-2025-09-08", 19, K, AL, "2025-09-08", S, N, "night", None, "17 in Kathmandu and 2 in Itahari", None),
 ("toll-nineteen-nationwide", 19, K, EX, "2025-09-08", S, N, None, None, "17 in Kathmandu and 2 in Itahari", None),
 ("19-killed-in-kathmandu-on-8-september", 19, K, AL, "2025-09-08", S, KT, None, None, None, "The statement puts all 19 in Kathmandu; other claims put 17 in Kathmandu and 2 in Itahari, so the scope is the statement's, not confirmed."),
 ("two-8-september-deaths-were-in-jhapa", 2, K, EX, "2025-09-08", S, "Jhapa", None, None, "19 demonstrators died on 8 September; 17 in Kathmandu", "Figure follows the claim title (two deaths in Jhapa); an earlier pass recorded the 19 nationwide. Other claims place the two outside the capital at Itahari."),
 ("amnesty-19-killed-300-injured-at-kathmandu-assembly", 19, K, AL, "2025-09-08", D, "Kathmandu assembly", None, None, "more than 300 injured", "as_of derived from 'the 8 September assembly'; the Amnesty statement itself is dated 2025-12-08 in asserted_on."),
 ("death-toll-20-on-8-sep-pm-secretariat", 20, K, EX, "2025-09-08", S, N, None, None, "37 on 9 September and 20 more in the following days, total 77", "A daily count, not the running total of that date."),
 ("death-toll-21-on-8-sep", 21, K, EX, "2025-09-08", S, N, None, None, "39 on 9 September and 12 over the next seven days", None),
 # ---- cumulative tolls ----
 ("toll-29-dead-by-10-september", 29, K, AL, "2025-09-10", S, N, None, None, None, None),
 ("death-toll-30-2025-09-10", 30, K, EX, "2025-09-10", S, N, "evening", None, None, None),
 ("death-toll-reported-on-11-september", 30, K, EX, "2025-09-11", S, N, None, None, "31 (Al Jazeera, local media); 34 (The Tribune, citing the health ministry)", "Three sources, three figures, one statement: the first (Ada Derana) is the primary figure."),
 ("death-toll-31-2025-09-11", 31, K, EX, "2025-09-11", S, "Kathmandu Valley", None, None, None, None),
 ("toll-more-than-50-dead-by-12-september", 50, K, AL, "2025-09-12", S, N, None, None, None, None),
 ("death-toll-at-least-51-on-12-september", 51, K, AL, "2025-09-12", S, N, None, None, "21 protesters, 9 prisoners, 3 police officers", None),
 ("death-toll-51-2025-09-12", 51, K, EX, "2025-09-12", D, N, None, None, None, "Statement says 'by 12 to 13 September'; 12 September used (the claim's asserted_on)."),
 ("death-breakdown-police-2025-09-12", 51, K, EX, "2025-09-12", S, N, None, None, "21 protesters; 9 prisoners; 3 police officers; 18 others", "51 is the sum of the four groups; the statement does not state a total."),
 ("death-breakdown-51-mohp-gunshot-2025-09-13", 51, K, EX, "2025-09-13", S, N, None, None, "30 killed by gunshots; 21 died from burns, wounds and other injuries", None),
 ("official-death-toll-36-ministry-of-health-12-september", 36, K, EX, "2025-09-12", S, N, None, None, "1,760 injured nationwide", "Ministry of Health, hospital data: 36 against police's 51 on the same date."),
 ("death-toll-60-2025-09-14-republica", 59, K, EX, "2025-09-14", S, N, None, None, "almost 60 after two protesters with head gunshot wounds died at Bir Hospital", "The claim id says 60; the statement gives 59 rising to 'almost 60'. 59 used."),
 ("death-toll-72-2025-09-14", 72, K, EX, "2025-09-14", S, N, None, None, "59 protesters; 10 prison inmates; 3 security personnel", None),
 ("death-toll-73-2025-09-16", 73, K, EX, "2025-09-16", D, N, None, None, None, "Date taken from 'before the Koteshwor body was found on 17 September'."),
 ("death-toll-74-2025-09-17", 74, K, EX, "2025-09-17", S, N, None, None, "over 1,800 injured (Kathmandu Post, 19 September)", None),
 ("death-toll-72-to-74-by-21-september", 74, K, AL, "2025-09-21", S, N, None, None, "72 on 14 September (Al Jazeera)", "Two counts in one statement; the later one is primary."),
 ("74-deaths-nationwide", 74, K, EX, "2025-09-26", S, N, None, None, "more than 2,000 injured", None),
 ("death-toll-75-2025-10", 75, K, EX, "2025-10-01", P, N, None, None, None, "A retrospective photo-gallery caption; the count's own date is unknown, 'about a month after' used."),
 ("death-breakdown-army-2025-10-17", 76, K, EX, "2025-10-17", S, N, None, None, "22 protesters shot by police; 3 police officers; 10 prisoners; 41 others", None),
 ("death-toll-76-2025-11", 76, K, AL, "2025-11-04", P, N, None, None, None, "Sources are dated 4 November and 20 November; 4 November used."),
 ("death-toll-76-for-8-9-september", 76, K, AL, "2025-11-04", P, N, None, None, None, None),
 ("toll-76-dead-over-8-9-september", 76, K, AL, "2025-11-19", P, N, None, None, "more than 2,000 injured nationwide", None),
 ("76-deaths-nationwide", 76, K, AL, None, U, N, None, None, None, "No date in the statement or the claim."),
 ("77-deaths-nationwide", 77, K, AL, None, U, N, None, None, None, "No date in the statement or the claim."),
 ("death-toll-77-2025-12-11", 77, K, EX, "2025-12-11", P, N, None, None, "2,429 injured", None),
 ("death-toll-77-for-8-9-september", 77, K, EX, "2026-09-09", P, N, None, None, None, "Retrospective article of September 2026; the count's date is not given."),
 ("martyr-list-45-2025-11-03", 45, OT, EX, "2025-11-03", S, N, None, "declared martyrs by the Cabinet", "further studies on more cases were to follow", "Counts people recognised, a subset of the dead, so unit other."),
 ("three-police-killed-by-mobs-2025-09-09", 3, K, EX, "2025-09-09", S, KT, None, None, None, None),
 ("bhatbhateni-chuchhepati-six-bodies-2025-09-14", 6, K, EX, "2025-09-14", S, "Bhatbhateni Supermarket, Chuchhepati", None, None, "charred human remains", None),
 ("bhatbhateni-chuchhepati-seven-bodies-2025-09-17", 7, K, EX, "2025-09-17", S, "Bhatbhateni Supermarket, Chuchhepati", None, None, "kept at Tribhuvan University Teaching Hospital", None),
 ("naubasta-five-juvenile-inmates-killed-2025-09-09", 5, K, EX, "2025-09-09", S, "Naubasta juvenile correctional home, Banke", "night", None, "4 more seriously injured", None),
 ("ramechhap-prison-three-killed-2025-09-11", 3, K, EX, "2025-09-11", S, "Ramechhap District Prison", None, None, "13 injured", "Two sources give 3 killed / 13 injured and 2 killed / 12 injured for the same clash."),
 ("ramechhap-prison-two-killed-2025-09-11", 2, K, EX, "2025-09-11", S, "Ramechhap District Prison", None, None, "12 injured", None),
 ("33-protesters-killed-by-live-bullets", 33, K, AL, "2025-09-26", P, "bodies examined at the TU Institute of Medicine forensic department", None, None, "34 bodies with bullet wounds: 10 head; 18 chest; 4 stomach; 2 neck", "as_of is the claim's date; the examination period is not given."),
 ("hrw-35-gunshot-deaths-of-47-bodies", 35, K, EX, "2025-11-20", P, "Kathmandu morgue (47 bodies received over the two days)", None, None, None, None),
 # ---- injured ----
 ("injuries-100-plus-2025-09-08", 100, I, AL, "2025-09-08", S, N, None, None, "at least 19 dead", "Place not stated (Kathmandu assembly or national)."),
 ("injured-more-than-100", 100, I, AL, "2025-09-09", P, N, None, None, None, None),
 ("injuries-145-2025-09-08", 145, I, AL, "2025-09-08", S, N, None, None, "including 28 officers", None),
 ("injuries-256-2025-09-08", 256, I, AL, "2025-09-08", S, N, None, None, None, None),
 ("injuries-300-plus-2025-09-08", 300, I, AL, "2025-09-08", S, N, None, None, None, None),
 ("injuries-347-2025-09-08", 347, I, EX, "2025-09-08", S, N, "evening", None, None, None),
 ("injured-347", 347, I, AL, "2025-09-08", P, N, None, None, None, "Duplicate of injuries-347-2025-09-08 with no date of its own."),
 ("injuries-453-2025-09-09", 453, I, AL, "2025-09-09", S, N, None, None, "hospital counts listed", "INSEC reported on 9 September about the 8 September protests; the count is as of the report."),
 ("injuries-1033-2025-09-10", 1033, I, EX, "2025-09-10", S, N, None, None, "713 already discharged", None),
 ("injuries-1300-2025-09-12", 1300, I, AL, "2025-09-12", S, N, None, None, None, None),
 ("injuries-1800-2025-09-19", 1800, I, AL, "2025-09-19", S, N, None, None, "196 still under care at 32 hospitals", None),
 ("196-injured-still-under-care-at-32-hospitals", 196, I, EX, "2025-09-19", S, "32 hospitals", None, None, "28 at the National Trauma Centre", None),
 ("injuries-2000-on-8-sep-hamro", 2000, I, AB, "2025-09-08", D, N, None, None, "21 killed", "Retrospective article of September 2026; 'nearly 2,000' on 8 September is far above the 347 to 1,000 of 2025."),
 ("injuries-2429-2025-12-11", 2429, I, EX, "2025-12-11", S, N, None, None, "17 under 13 years old; 1,433 between 13 and 28", None),
 ("wounded-2522-in-commission-report", 2522, I, EX, "2026-03-26", P, N, None, None, "76 killed", None),
 ("injured-2660-verified-list", 2660, I, EX, "2026-05-01", S, N, None, None, None, None),
 ("tinkune-injured-45", 45, I, EX, "2025-03-28", S, "Tinkune", None, None, "2 dead", None),
 # ---- 2024 floods ----
 ("2024-floods-death-toll-224", 224, K, EX, "2024-10-01", S, N, None, None, "158 injured; 24 missing", None),
 ("2024-floods-death-toll-219", 219, K, AL, "2024-10-02", P, N, None, None, "over 12,000 families displaced", None),
 ("2024-floods-death-toll-249", 249, K, EX, "2025-05-05", P, N, None, None, "177 injured; more than 10,000 families displaced", "Final toll of the 2024 floods; the count's own date is not given."),
 # ---- prison escapes ----
 ("central-jail-sundhara-1400-escaped", 1400, OT, EX, "2025-09-11", P, "Central Prison, Sundhara", None, "inmates escaped", None, None),
 ("central-jail-sundhara-3003-escaped", 3003, OT, EX, "2025-09-12", P, "Central Prison, Sundhara", None, "inmates escaped", "from a capacity of about 3,800", None),
 ("lalitpur-jail-1280-escaped", 1280, OT, EX, "2025-09-12", P, "Lalitpur jail", None, "inmates escaped", None, None),
 ("nakkhu-prison-3300-escaped", 3300, OT, AL, "2025-09-11", P, "Nakkhu Prison", None, "inmates escaped", None, None),
 ("nearly-900-inmates-escaped-two-western-prisons", 900, OT, AB, None, U, "two prisons in western Nepal", None, "inmates escaped", None, "No date in the statement or the claim."),
 ("prison-escapes-over-13500-nepal-police", 13500, OT, AL, "2025-09-10", P, N, None, "inmates escaped", None, None),
 ("prison-escapes-14507-nepal-police", 14507, OT, EX, "2025-09-11", P, N, None, "inmates escaped", "573 detainees fled police custody", None),
 ("prison-escapes-over-15000-kathmandu-post", 15000, OT, AL, "2025-09-11", P, N, None, "inmates escaped", "from more than 25 prisons", None),
 ("prisoners-at-large-12533-on-12-sept", 12533, OT, EX, "2025-09-12", S, N, None, "inmates still at large", "about 13,500 had escaped", None),
 ("prison-department-says-13591-inmates-and-964-children-escaped", 13591, OT, EX, "2025-09-19", S, N, None, "inmates escaped", "of 29,212 inmates; 964 of 1,422 children escaped; 8,816 still unaccounted for", None),
 ("prison-escapes-14549-department-of-prison-management", 14549, OT, EX, "2025-09-26", P, N, None, "inmates escaped", "from 37 facilities; 8,054 returned; 6,494 at large", None),
 ("prisoners-at-large-6494-on-26-sept", 6494, OT, EX, "2025-09-26", P, N, None, "inmates still at large", "5,872 from prisons; 622 from correction centres", None),
 ("prison-escapes-14558-department-of-prison-management", 14558, OT, EX, "2025-09-28", P, N, None, "inmates escaped", "7,735 returned; 6,813 still absconding", None),
 ("prisoners-at-large-6813-on-28-sept", 6813, OT, EX, "2025-09-28", P, N, None, "inmates still at large", "7,735 returned", None),
 ("14555-inmates-escaped", 14555, OT, EX, "2025-09-09", D, N, None, "inmates escaped", None, "Commission total for the unrest; date taken as 9 September, the day of the breaks, and escapes continued on 10 September."),
 # ---- other counts ----
 ("more-than-a-dozen-media-outlets-attacked-on-9-september", 12, OT, AL, "2025-09-09", S, N, None, "media outlets attacked", "three journalists' organisations also attacked", "'More than a dozen' read as at least 12."),
 ("fnj-26-press-freedom-incidents-in-protest-days", 26, OT, EX, "2025-09-08", D, N, None, "press-freedom incidents", "more than 100 journalists and media institutions affected", "FNJ report dated 2025-12-31; 8 September is the protest day named."),
 ("supreme-court-20000-case-files-lost", 20000, OT, AB, None, U, "Supreme Court", None, "case files lost", "more than 450,000 court files burned overall", "Search-result summary of SCMP; no date."),
 ("supreme-court-60000-case-files-burned", 60000, OT, AL, "2025-09-10", P, "Supreme Court", None, "case files burned", None, None),
 ("crowdfunding-funds-slow-to-reach-victims", 25870000, OT, EX, "2025-11-12", S, N, None, "NPR raised by crowdfunding campaigns", "57 campaigns with a target of Rs102.8 million", None),
 ("26-platforms-were-blocked", 26, OT, EX, "2025-09-04", D, N, None, "platforms blocked", "about two dozen (AP); 27 (India Today)", "Not a casualty-figure claim; a count with disagreeing sources."),
 ("expected-turnout-was-about-8000", 8000, OT, AB, "2025-09-07", P, KT, None, "expected protest attendance", "6,000 to 7,000 (Oli); 3,500 to 5,000 (NID chief); 3,000 to 5,000 (Kathmandu SSP)", "Not a casualty-figure claim; an expectation, not a count."),
 ("tinkune-turnout-hardly-5000", 5000, OT, AB, "2025-03-28", D, "Tinkune", None, "protest attendance", None, "Not a casualty-figure claim; 'hardly 5,000'."),
 ("ammunition-13182-rounds-over-two-days", 13182, OT, EX, "2025-09-09", D, N, None, "rounds fired by police", "2,642 live bullets; 1,884 rubber rounds; 6,279 tear-gas shells", "Period count for 8 and 9 September; the sum of the three types (10,805) is below the total, the remainder is not itemised."),
 # ---- damage (NPR) ----
 ("bhat-bhateni-loss-10-85-billion", 10850000000, DM, EX, "2025-09-24", P, "Bhat-Bhateni", None, None, None, None),
 ("bhat-bhateni-loss-over-11-billion", 11000000000, DM, AL, "2026-09-21", P, "Bhat-Bhateni", None, None, "more than Rs500 million of goods looted", None),
 ("collateral-damage-3-trillion-economists", 3000000000000, DM, AB, "2025-09-14", P, N, None, None, None, "Economists' estimate of collateral damage."),
 ("hilton-kathmandu-damage-8-billion", 8000000000, DM, AB, "2025-09-14", P, "Hilton Kathmandu", None, None, "about US$56 million (AFP)", None),
 ("insurance-claims-20-7-billion-by-16-sept", 20700000000, DM, EX, "2025-09-16", S, N, None, "insurance claims received", "1,984 claims", None),
 ("insurance-claims-22-26-billion", 22256500000, DM, EX, "2025-09-24", P, N, None, "insurance claims received", "Bagmati Province Rs 17,977,200,000", None),
 ("major-business-damage-over-60-billion-cni", 60000000000, DM, AL, "2025-09-19", P, "major business enterprises", None, None, None, None),
 ("private-sector-loss-80-to-100-billion-fnccii", 80000000000, DM, AB, "2025-09-21", P, "private sector", None, None, "FNCCI initial estimate NPR 80 to 100 billion; Kantipur about NPR 80 billion", "A range; the low end is the figure."),
 ("total-losses-25-billion-afp", 25000000000, DM, AB, "2025-09-16", P, N, None, None, "US$177 million; more than 2,000 workers affected", None),
]
SKIPPED = [  # casualty-figure claims that are not counts
 ("chitrakar-died-on-9-september", "one named individual; not a figure"),
 ("chitrakar-survived-with-burn-injuries", "one named individual; not a figure"),
 ("child-among-the-dead", "an age, not a count"),
 ("one-indian-national-killed-2025-09-09", "one named individual; not a figure"),
 ("early-deaths-from-rubber-bullets", "a cause, not a count"),
 ("police-fired-live-ammunition-on-8-september", "an act, not a count"),
 ("thousands-of-prisoners-freed", "'thousands' has no integer"),
 ("tinkune-injured-hundreds", "'hundreds' has no integer"),
]

def main():
    ents = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
    out, uncertain, seen = [], [], set()
    for key, fig, unit, qual, as_of, basis, scope, time, detail, more, unc in R:
        cid = "claim:" + key
        assert cid not in seen, key
        seen.add(cid)
        e = ents.get(cid)
        assert e, f"missing claim {cid}"
        props = {"figure": fig, "unit": unit, "qualifier": qual, "scope": scope, "as_of_basis": basis}
        if as_of: props["as_of"] = as_of
        if time: props["as_of_time"] = time
        if detail: props["unit_detail"] = detail
        if more: props["figure_more"] = more
        st = [ev for ev in e["evidence"] if not ev.get("inferred") and "statement" in (ev["property"] if isinstance(ev["property"], list) else [ev["property"]])]
        srcs = sorted({s for ev in st for s in ev["sources"]}) or sorted({s for ev in e["evidence"] for s in ev["sources"]})
        ver = "disputed" if e["properties"].get("verification_status") == "disputed" else "single-source"
        out.append({"id": cid, "properties": props,
                    "evidence": [{"property": list(props), "sources": srcs, "verification": ver,
                                  "note": "Figure read from the claim's statement and anchor quote (manual pass)."}]})
        if unc: uncertain.append((key, unc))
    json.dump({"entity_additions": out}, open(f"{HERE}/parts/claim-figures.json", "w"), indent=1, ensure_ascii=False)
    print(len(out), "claims with figures;", len(uncertain), "flagged;", collections.Counter(r[2] for r in R))
    json.dump({"uncertain": uncertain, "skipped": SKIPPED}, open(f"{HERE}/figures-review.json", "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__":
    main()
