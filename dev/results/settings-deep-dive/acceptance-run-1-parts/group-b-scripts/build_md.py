import json, os, re
D = os.path.dirname(os.path.abspath(__file__))
SHOTS = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-shots"
pages = [
 ("COL","Collection (COL)",33,["X-01","X-02","X-03","X-04","X-06","X-07","X-09","X-13"],"COL-01",{"X-02":"X-02-COL","X-06":"COL-33","X-01":"COL-28","X-03":"COL-28","X-04":"COL-28","X-09":"COL-28","COL-02":"COL-28","COL-29":"COL-28","COL-30":"COL-28","COL-31":"COL-28","COL-04":"COL-04-login","COL-11":"COL-11-Table"}),
 ("CSS","Global CSS & JS (CSS)",16,["X-01","X-02","X-03","X-04","X-06","X-07","X-09"],"CSS-03",{"CSS-02":"CSS-01","CSS-13":"CSS-01","X-02":"CSS-08","X-06":"CSS-16","CSS-05":"CSS-04","CSS-06":"CSS-04","CSS-07":"CSS-04","CSS-09":"CSS-04","CSS-11":"CSS-04","CSS-12":"CSS-10","CSS-15":"CSS-10","X-01":"CSS-04","X-03":"CSS-04","X-04":"CSS-04","X-07":"CSS-03","X-09":"CSS-14"}),
 ("MEN","Menu (MEN)",20,["X-01","X-02","X-03","X-04","X-06","X-07","X-09","X-10","X-12","X-13"],"MEN-01",{"MEN-04":"MEN-03","MEN-15":"MEN-03","X-02":"MEN-03","MEN-02":"MEN-01","MEN-08":"MEN-07","MEN-09":"MEN-01","MEN-10":"MEN-01","MEN-11":"MEN-01","MEN-13":"MEN-12","MEN-14":"MEN-01","MEN-17":"MEN-01","MEN-18":"MEN-01","X-10":"MEN-19","X-06":"MEN-20","X-12":"MEN-01","X-03":"MEN-01","X-01":"MEN-05","X-04":"MEN-05","X-09":"MEN-05"}),
 ("UPL","Uploads (UPL)",17,["X-01","X-04","X-05","X-06","X-07","X-08","X-09","X-10","X-11","X-12"],"UPL-01",{"UPL-02":"UPL-01","UPL-03":"UPL-01","UPL-06":"UPL-04","UPL-07":"UPL-04","UPL-08":"UPL-01","UPL-09":"UPL-01","UPL-10":"UPL-01","UPL-13":"UPL-01","UPL-16":"UPL-11","X-01":"UPL-11","X-04":"UPL-11","X-09":"UPL-11","X-05":"UPL-12","X-06":"UPL-17-list","X-08":"X-08-UPL","X-10":"UPL-14","X-11":"UPL-01","X-12":"UPL-01","X-07":"UPL-01","UPL-17":"UPL-17-list"}),
 ("PRV","Preserve (PRV)",9,["X-01","X-04","X-06","X-07","X-08","X-09"],"PRV-01",{"PRV-03":"PRV-01","PRV-04":"PRV-01","PRV-05":"PRV-01","PRV-06":"","PRV-07":"PRV-01","PRV-08":"PRV-01","PRV-09":"PRV-09","PRV-02":"PRV-02-editor","X-06":"PRV-09","X-08":"X-08-PRV","X-01":"PRV-01","X-04":"PRV-01","X-07":"PRV-01","X-09":"PRV-01"}),
]
ALLX = [f"X-{i:02d}" for i in range(1,14)]
NA = "Not in this page's Applies line, so not driven"
out = ["# Group B acceptance run (Collection, Global CSS & JS, Menu, Uploads, Preserve)\n",
 "Target: playground 73a13827 at http://localhost:1438/. Driven with Playwright (scripts in `group-b-scripts/`, one script per page). Desktop 1280x800, phone 390x844 touch, fresh context per check group (each starts from the seed). Screenshots are in `../acceptance-run-1-shots/`; where a check found a control missing, the shot is the page state at that point (the page overview).\n",
 "Console: during the interaction sweep (`console.mjs`: edit, save, add/delete, dialogs, phone) there were no console errors. Every page load logs one warning, `[DEPRECATED] atomFamily is deprecated ... jotai-family` (Jotai); it is the same on every route and is not counted as a check failure.\n",
 "Judging notes: Expect text was matched verbatim; copy that differs is a FAIL even where the behaviour works (named in the evidence). Result values: PASS, FAIL, NOT DRIVEABLE, SKIP, N/A.\n"]
summary = {}
for code, head, n, xs, defshot, shotmap in pages:
    d = {x["id"]: x for x in json.load(open(f"{D}/results/{code}.json"))}
    out.append(f"\n## {head}\n\n| Id | Result | Evidence (saw vs expected) | Shot |\n|---|---|---|---|")
    counts = {"PASS":0,"FAIL":0,"NOT DRIVEABLE":0,"SKIP":0,"N/A":0}
    ids = [f"{code}-{i:02d}" for i in range(1,n+1)] + ALLX
    for i in ids:
        if i.startswith("X-"):
            if i in d: row = d[i]
            else: row = {"id": i, "res": "N/A", "ev": NA, "shot": ""}
        else:
            row = d[i]
        res = row["res"]
        if i == "MEN-X": pass
        if code == "MEN" and i == "X-05":
            res, ev = "N/A", "Not in Menu's Applies line. Observed anyway: " + row["ev"]
        else: ev = row["ev"]
        sh = row.get("shot") or shotmap.get(i, defshot)
        if res in ("SKIP","N/A") and not row.get("shot") and i not in shotmap: sh = ""
        if sh and not os.path.exists(f"{SHOTS}/{sh}.png"): sh = defshot if os.path.exists(f"{SHOTS}/{defshot}.png") else ""
        shot = f"acceptance-run-1-shots/{sh}.png" if sh else "-"
        counts[res] += 1
        out.append(f"| {i} | {res} | {ev} | {shot} |")
    summary[code] = counts
    out.append(f"\nCount: PASS {counts['PASS']}, FAIL {counts['FAIL']}, NOT DRIVEABLE {counts['NOT DRIVEABLE']}, SKIP {counts['SKIP']} (plus {counts['N/A']} X rows N/A).\n")
json.dump(summary, open(f"{D}/results/summary.json","w"))
open(f"{D}/_body.md","w").write("\n".join(out))
print(json.dumps(summary))
