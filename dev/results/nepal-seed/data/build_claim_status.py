#!/usr/bin/env python3
"""Make claim status and dispute links agree.

A claim is `disputed` only when something links it to a dispute: a source that disputes it (`disputes`) or a claim
that gives an incompatible account of the same fact (`conflicts_with`, claim to claim). The 42 claims that were
disputed with neither were reviewed one by one against their statement and note:
  CONFLICTS: a real conflict between accounts: a conflicts_with reference is added (parts/claim-conflicts.json).
  DOWNGRADE: the note describes a difference of counting date, scope or definition, or a gap in sourcing, not an
             incompatible account: the status is recomputed from the claim's sources (status-corrections.json,
             applied by merge.py). The note is kept and gains one sentence saying why.
Run: python3 build_claim_status.py, then python3 merge.py.
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
# claim id -> (claims it conflicts with, why)
CONFLICTS = {
 "14555-inmates-escaped": (["prison-escapes-14549-department-of-prison-management", "prison-escapes-14558-department-of-prison-management", "prison-escapes-14507-nepal-police"], "Different national totals of escaped inmates (14,555 against 14,549, 14,558 and 14,507)."),
 "2024-floods-death-toll-219": (["2024-floods-death-toll-224"], "219 on 2 October 2024 against 224 on 1 October."),
 "amnesty-19-killed-300-injured-at-kathmandu-assembly": (["death-toll-17-kathmandu-2025-09-08"], "19 killed in Kathmandu (Amnesty) against 17 in Kathmandu and 2 in Itahari."),
 "arrest-warrants-were-urgent-and-awaiting-validation": (["arrest-warrants-were-issued-by-the-court"], "Warrants awaiting a judge's validation against warrants already issued by the court."),
 "charge-under-sections-181-and-182": (["charge-under-sections-281-to-283"], "Sections 181-182 (up to 10 years) against sections 281-283 (up to 3 years)."),
 "commission-report-is-1000-pages": (["commission-report-is-8000-to-10000-pages"], "1,000 pages against 8,000-10,000 pages."),
 "death-toll-76-for-8-9-september": (["death-toll-77-for-8-9-september", "death-toll-77-2025-12-11"], "Final toll of 76 against 77."),
 "first-day-writ-petitions-more-than-seven": (["writ-petitions-received-14-on-15-october"], "More than seven petitions on 14 October against 14 petitions on 15 October."),
 "home-minister-says-arrest-is-not-revenge": (["oli-says-arrest-was-retaliatory"], "The arrest as justice against the arrest as retaliation."),
 "joint-embassy-statement-seven-signatories": (["joint-embassy-statement-nine-signatories"], "Seven signatories against nine."),
 "lamichhane-release-letter-counterfeit": (["lamichhane-release-letter-genuine"], "Counterfeit release letter against a genuine one."),
 "oli-and-lekhak-arrested-on-27-march": (["oli-and-lekhak-arrested-on-28-march"], "Arrest dated 27 March against 28 March."),
 "telegram-ban-followed-refusal-to-hand-over-user-data": (["telegram-ban-reason-online-fraud-and-money-laundering"], "Two stated reasons for the Telegram ban."),
 "tinkune-injured-45": (["tinkune-injured-hundreds"], "45 injured against hundreds injured."),
 "two-8-september-deaths-were-in-jhapa": (["death-toll-19-2025-09-08"], "Two of the 8 September deaths outside the capital in Jhapa against in Itahari."),
}
# claim id -> reason the status is recomputed
DOWNGRADE = {
 "74-deaths-nationwide": "An earlier tally (26 September), not a conflicting one.",
 "balen-shah-and-kulman-ghising-declined-interim-pm-role": "The statement itself records the differing reports; no other claim or source disputes it.",
 "bhat-bhateni-loss-10-85-billion": "Figures from September 2025 and September 2026; the later one is an update.",
 "bhat-bhateni-loss-over-11-billion": "A later figure for the same loss; an update, not a conflict.",
 "collateral-damage-3-trillion-economists": "Includes indirect effects; it measures something other than direct losses.",
 "death-toll-72-to-74-by-21-september": "The claim records a toll rising with the counting date.",
 "death-toll-reported-on-11-september": "The claim records tallies taken at different times of one day.",
 "education-minister-resigned-over-teachers-demands-rift": "The note records a sourcing gap (no named source for the cost estimate), not a conflict.",
 "fnj-26-press-freedom-incidents-in-protest-days": "FNJ counts a wider category than CPJ or RSF; a difference of definition.",
 "injured-2660-verified-list": "A finalised list of May 2026 after the March 2026 report tally; an update.",
 "injuries-100-plus-2025-09-08": "Same-day counts differ by hour and source; they form a running count.",
 "insurance-claims-20-7-billion-by-16-sept": "Claims by 16 September, later 22.26 billion; different dates.",
 "insurance-claims-22-26-billion": "Claims by 24 September, after the 20.7 billion of 16 September; different dates.",
 "karki-ineligible-as-non-member-and-former-chief-justice": "An argument made in writs; no source says the petitioners did not make it.",
 "more-than-a-dozen-media-outlets-attacked-on-9-september": "RSF, CPJ and FNJ count different things; a difference of definition.",
 "relief-amount-for-victims-families": "Possibly different items (relief against the total package); no incompatible account is established.",
 "thousands-of-prisoners-freed": "The note records that HRW gives no count; no source disputes the claim.",
 "toll-29-dead-by-10-september": "29 on 10 September fits the Ministry's 30 on the same date; the earlier conflict named is a different date.",
 "two-media-offices-set-on-fire-on-9-september": "CPJ, RSF and FNJ cover different scopes; not a direct conflict.",
 "wounded-2522-in-commission-report": "The commission's March 2026 tally; the May 2026 list of 2,660 is a later update.",
}

def main():
    ents = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
    cid = lambda k: "claim:" + k
    refs = []
    for a, (bs, why) in CONFLICTS.items():
        for b in bs:
            assert cid(a) in ents and cid(b) in ents, (a, b)
            def srcs(k):
                e = ents[cid(k)]
                st = [ev for ev in e["evidence"] if not ev.get("inferred")]
                return {s for ev in st for s in ev["sources"]}
            refs.append({"id": f"ref:conflict-{a[:48]}-{b[:48]}", "from": cid(a), "to": cid(b), "type": "conflicts_with",
                         "sources": sorted(srcs(a) | srcs(b)), "verification": "single-source", "note": why})
    json.dump({"references": refs}, open(f"{HERE}/parts/claim-conflicts.json", "w"), indent=1, ensure_ascii=False)
    for k in DOWNGRADE: assert cid(k) in ents, k
    json.dump({"downgrade": {cid(k): v for k, v in DOWNGRADE.items()}}, open(f"{HERE}/status-corrections.json", "w"), indent=1, ensure_ascii=False)
    print(len(refs), "conflicts_with references;", len(DOWNGRADE), "downgrades")

if __name__ == "__main__":
    main()
