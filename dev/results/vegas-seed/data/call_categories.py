"""Neutral category for a 911 call, assigned from the map's call title WITHOUT carrying any of its text.
The title is read only here, to pick one value from a closed list; the rules hold generic words, no names,
rooms or places. A call that names or describes a person or a room gets the category of what it reports,
never the description."""
import re

CATEGORIES = [   # (id, label)
    ("reports-gunfire", "Reports hearing gunfire"),
    ("reports-injury", "Reports an injury or asks for medical help"),
    ("reports-shooter", "Reports a shooter, a gun or a sighting of a shooter"),
    ("reports-explosion-smoke", "Reports an explosion, smoke or breaking glass"),
    ("reports-suspicious-activity", "Reports suspicious activity"),
    ("requests-help", "Hiding or asking for help, information or an update"),
    ("security-or-dispatch", "Exchange with security, staff or a dispatcher"),
    ("other-unclear", "Other or unclear"),
]
IDS = [c[0] for c in CATEGORIES]

RULES = [   # first match wins
    ("security-or-dispatch", r"\bno shots\b"),
    ("reports-explosion-smoke", r"explosion|smoke|falling glass"),
    ("reports-shooter", r"shooters?\b|shoot out|\"shooting\"|(?:with|w/) (?:a )?(?:gun|rifle)\b|gun found|gunman|someone's shooting|shot a man"),
    ("reports-suspicious-activity", r"backpack|trying to hide|changing clothes|suspect|code 419|\bvan\b|man \"hiding\"|hostages"),
    ("reports-injury", r"injur|wound|\bhurt\b|victim|medical|triage|\bgraze\b|foot shot|got shot|was shot|man shot|people shot|1 down|bodies on floor|needs help|gunshot victim"),
    ("reports-gunfire", r"shots?\b|gunshots?|gunfire|\bbang\b|\bpop\b|muzzle|flash|strobe"),
    ("requests-help", r"hiding|hide\b|broke window|closet|how to pick up|calls back|update|scared|lockdown|porta-potty"),
    ("security-or-dispatch", r"security|employee|manager|dispatch|monorail|officer|nurse|cvs"),
]
def categorize(title):
    t = re.sub(r"\s+", " ", title.lower())
    t = re.sub(r"^911 cal\s*l\s*#\s*\d+\s*", "", t)
    for cat, pat in RULES:
        if re.search(pat, t):
            return cat
    return "other-unclear"
