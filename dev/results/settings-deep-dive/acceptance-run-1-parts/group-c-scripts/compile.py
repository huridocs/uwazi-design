import json, re, os, glob
D = os.path.dirname(os.path.abspath(__file__))
SHOTS = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-shots/"
def load(*names):
    out = {}
    for n in names:
        for r in json.load(open(f"{D}/results-{n}.json")):
            out[r["id"]] = r
    return out
def shotp(s):
    if not s: return ""
    b = os.path.basename(s)
    return f"acceptance-run-1-shots/{b}" if os.path.exists(SHOTS + b) else ""
def esc(t): return re.sub(r"\s+", " ", t.replace("|", "\\|")).strip()

csv = load("CSV", "CSV2", "CSV3", "CSV4")
for k in list(csv):
    if "::" in k: csv.pop(k)
seed = json.load(open(f"{D}/seedinfo.json"))
def add(d, id, res, ev, shot=""): d[id] = {"id": id, "res": res, "ev": ev, "shot": shot}

add(csv, "CSV-08", "SKIP", "Needs M8 (templates editable in Settings > Templates); not driven.")
add(csv, "CSV-12", "FAIL", f"Opened each seeded status page. hearings-2026.csv: pill \"Pending\" and its Open button is disabled, so its page cannot be opened (expected \"Queued\" / \"This import is waiting in queue.\"). locations.csv: pill \"Processing\", Stepper \"{seed['locations.csv']['stepper']}\" (3 steps Upload, Process, Complete; expected the 8 named stages, plus Retrying and Cancelled). cases.csv: \"Completed\"; judges-import.zip: \"Failed\"; witnesses.csv: \"Warnings\" (expected \"Completed with errors\"). No page shows a description sentence (\"Import finished successfully.\", \"Import failed. Review details below.\" and so on): description text found on any page: {any(v.get('hasDesc') for v in seed.values())}.", "CSV-13-cases.png")
add(csv, "CSV-13", "FAIL", f"cases.csv page: breadcrumb \"Import CSV\" > \"cases.csv\" (ok); file name with status pill (ok) but no description; meta line reads \"{seed['cases.csv']['meta']}\" (expected \"Template\", \"Date\", \"Last updated\"; there is no Last updated); progress section reads \"{seed['cases.csv']['progress']}\" with a bar, not \"Processed rows: N%\"; footer buttons {json.dumps(seed['cases.csv']['footer'])} (expected \"Back\"; Delete import is extra). Bar colours seen on the list (CSV-03 shot): green completed (ok), red failed (ok), blue for processing (expected grey) and green for completed-with-warnings (expected warning colour).", "CSV-13-cases.png")
add(csv, "CSV-14", "FAIL", f"Stat cards on cases.csv and judges-import.zip: {json.dumps(seed['cases.csv']['cards'])} (5 cards, expected 6 in the order Entities created, Entities updated, Rows processed, Rows failed, Thesauri values created, Related entities created; \"Entities updated\" is missing, \"Thesauri touched\" and \"Relationships\" replace the thesauri/related-entities cards). A zero value shows \"0\" (judges-import.zip: Thesauri touched 0, Relationships 0), expected \"-\". Thesauri values created appears only under \"Extraction details\".", "CSV-15-judges.png")
add(csv, "CSV-15", "FAIL", f"judges-import.zip (failed): banner \"{seed['judges-import.zip']['banner'][0]}\" and an Issues table; there is no \"Failure details\" card with Stage, Code and Retryable (text search for \"Failure details\"/\"Retryable\": {seed['judges-import.zip']['failureCard']}). cases.csv shows no such card (ok).", "CSV-15-judges.png")
add(csv, "CSV-16", "FAIL", f"witnesses.csv: section \"Issues (3)\" / \"Import issues\" with columns {json.dumps(seed['witnesses.csv']['tableHeads'])} and 3 field-level warnings (phone_number, address, email); expected a \"Failure details\" table with columns Row (spreadsheet row number), Property and Message, one line per row issue. For cases.csv, which has no issues, the page shows a \"Created entities\" table instead of no table.", "CSV-16-witnesses.png")
add(csv, "CSV-17", "FAIL", "No \"Download failed rows\" button on witnesses.csv (2 failed rows, expected the button) or on cases.csv (ok, none expected); button count 0 on all five status pages.", "CSV-16-witnesses.png")
add(csv, "X-04", csv["X-04"]["res"], csv["X-04"]["ev"], "")
# N/A rows
for x, why in [("X-01","not listed in the Import CSV Applies line (state is view-local; see CSV-10)"),("X-02","Applies line: does not apply (no form)"),("X-03","Applies line: does not apply (no form)"),("X-05","Applies line: does not apply (no guarded delete; Delete import has its own confirm)"),("X-10","not listed in the Applies line (empty state is CSV-20)"),("X-11","Applies line: does not apply (no search)"),("X-12","Applies line: does not apply"),("X-13","Applies line: does not apply")]:
    add(csv, x, "N/A", why)

pag = load("PAG1", "PAG2", "PAG3", "PAG4", "PAG5", "PAG6", "PAG7")
add(pag, "X-05", "FAIL", f"Used page (Methodology): the delete dialog states the menu usage and the effect: \"Delete page Delete “Methodology”? Linked from the menu: Methodology. The link stays and will lead nowhere.\" (ok). Unused page (Partners): dialog reads \"Delete page Delete “Partners”? Cancel Delete\" with no statement that nothing else changes (expected). No usage counts are shown, only the link names.", "PAG-07.png")
for k in list(pag):
    if "::" in k: pag.pop(k)

act = load("ACT1", "ACT2", "ACT3", "ACT4")
for k in list(act):
    if "::" in k: act.pop(k)
act["ACT-12"]["ev"] += " Persistence: after reload the 11 rows are still there; Dashboard Recent activity lists the same newest entries in the same order (shot ACT-12-dashboard); Reset demo data returns the log to the 7 seed entries."
add(act, "X-09", "FAIL", "This page shows the entries, and they are incomplete: after one action each (ACT-12) only the page save and the Collection saves are logged; the first page save reads \"Updated page “QA page”\" (Uwazi: \"Created page\"), Publish has no separate line, a page delete is not logged, and upload, Preserve token and CSV import log nothing. Template saves also log nothing visible in the editor footer (ACT-18).", "ACT-12.png")
act["X-10"]["res"] = "NOT DRIVEABLE"
for x, why in [("X-01","Applies line: does not apply"),("X-02","Applies line: does not apply"),("X-03","Applies line: does not apply"),("X-04","Applies line: does not apply"),("X-05","Applies line: does not apply"),("X-11","Applies line: does not apply (page-specific search covered by ACT-06)"),("X-12","Applies line: does not apply"),("X-13","Applies line: does not apply")]:
    add(act, x, "N/A", why)

def key(i):
    m = re.match(r"([A-Z]+)-(\d+)", i)
    return (0 if m.group(1) != "X" else 1, int(m.group(2)))
def section(title, d, code, nmax, exp_x):
    rows = sorted(d.values(), key=lambda r: key(r["id"]))
    ids = {r["id"] for r in rows}
    miss = [f"{code}-{i:02d}" for i in range(1, nmax + 1) if f"{code}-{i:02d}" not in ids] + [f"X-{i:02d}" for i in range(1, 14) if f"X-{i:02d}" not in ids]
    errs = [r["id"] for r in rows if r["res"] in ("ERR",)]
    cnt = {}
    for r in rows: cnt[r["res"]] = cnt.get(r["res"], 0) + 1
    out = [f"## {title}\n", "| Id | Result | Evidence (saw vs expected) | Shot |", "|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['id']} | {r['res']} | {esc(r['ev'])} | {shotp(r.get('shot'))} |")
    line = f"\nCounts: PASS {cnt.get('PASS',0)} / FAIL {cnt.get('FAIL',0)} / NOT DRIVEABLE {cnt.get('NOT DRIVEABLE',0)} / SKIP {cnt.get('SKIP',0)} (plus N/A {cnt.get('N/A',0)})."
    out.append(line + "\n")
    print(title, cnt, "missing:", miss, "errs:", errs)
    return "\n".join(out), rows

# default shots for rows without one
defaults = {"PAG": {"PAG-23":"PAG-21.png","PAG-24":"PAG-21.png","X-01":"PAG-03.png","X-02":"PAG-27.png","X-03":"PAG-31.png","X-04":"PAG-25.png","X-09":"PAG-25.png","X-10":"PAG-29-empty.png","X-11":"PAG-02.png","X-12":"PAG-06.png","X-13":"X-13-pag.png","X-07":"X-07-pag.png","X-08":"X-08-pag-dark.png","PAG-15":"PAG-14.png","PAG-09":"PAG-09-methodology.png","PAG-12":"PAG-12.png"},
 "CSV": {"CSV-19":"CSV-18-locations.png","CSV-22":"CSV-20.png","X-04":"CSV-11.png","X-09":"CSV-11.png","X-07":"X-07-csv.png","X-08":"X-08-csv-dark.png","X-06":"X-06-csv-detail-phone.png","CSV-04":"CSV-04-phone.png","CSV-14":"CSV-15-judges.png"},
 "ACT": {"ACT-13":"ACT-12.png","X-09":"ACT-12.png","X-08":"ACT-03-dark.png","X-07":"X-07-act.png","X-06":"ACT-19-phone.png","X-10":"X-10-act.png","ACT-18":"ACT-18-template.png"}}
for code, d in (("PAG", pag), ("CSV", csv), ("ACT", act)):
    for i, s in defaults[code].items():
        if i in d and not d[i].get("shot"): d[i]["shot"] = s

head = """# Group C acceptance run: Pages (PAG), Import CSV (CSV), Activity log (ACT)

Target: playground 73a13827 at http://localhost:1438/. Run on 2026-10-04 with Playwright (scripts in `group-c-scripts/`; `compile.py` builds this file from the per-page JSON results).

Notes for the reader:
- Result values: PASS, FAIL, NOT DRIVEABLE, SKIP (Needs M3 to M9, defer or drop; only CSV-08 here), N/A (the X check is not in the page's Applies line).
- Needs F1 to F4 and M1 checks were driven as asked. The prototype does not match most of these checklist rows, so most are FAIL with the observed behaviour.
- Console: every page logs the warning "atomFamily is deprecated" (jotai); not counted. The harness init script (`lib.mjs`) reads `sessionStorage` in every frame, which throws "Failed to read the 'sessionStorage' property ... sandboxed" inside the page-editor preview iframe (`sandbox="allow-scripts"`). That uncaught error is a harness artefact, not an app error, and was ignored. No other console errors appeared except the ones forced in PAG-26.
- ACT-02 used 101 log entries written straight into `sessionStorage` (`uwazi:settings:activity`); a loop of 101 Settings saves was not practical.
- PAG-26 forced failures by patching `Storage.prototype.setItem` to throw.
- Phone checks used a 390x844 touch context. Dark mode via the navbar Theme button.
- Pages and Import CSV keep their lists in component state: leaving the view (or reloading) resets them to the seed.

"""
p, prow = section("Pages list and editor (PAG)", pag, "PAG", 31, True)
c, crow = section("Import CSV (CSV)", csv, "CSV", 22, True)
a, arow = section("Activity log (ACT)", act, "ACT", 19, True)

ranked = """## FAILs ranked by severity

Owner: Code = behaviour or data; Design = layout, copy, contrast, a11y, phone presentation.

1. PAG-26 / X-04: when storage writes fail, Save and Publish raise uncaught exceptions, add no "An error occurred" entry and the editor then reads clean (unsaved text can be lost). Owner: Code.
2. PAG-03, PAG-04, PAG-05, PAG-08, PAG-16, X-01: the Pages list is component state and edits live only in a session store that a reload clears (HTML, JS, CSS and titles are gone after reload; deleted pages return). "Create page" adds a list row before any Save (an orphan row remains after leaving); the list never shows a renamed title. Owner: Code.
3. CSV-10, CSV-09, CSV-11, CSV-22, X-04, X-09 (Import CSV): the import list is view-local state, so a started import vanishes when the user opens the Library and returns; no Beacon task or notification, no Activity log entry for register, finish or delete; a new import is "Uploading", not "Queued", and jumps to the detail page. Owner: Code.
4. CSV-01: a non-admin (afarah, collaborator) still sees the Library footer "Import CSV" link and it opens the New import dialog; the Import CSV view also shows the Settings rail. Owner: Code (role gating).
5. PAG-20, PAG-21, PAG-23, PAG-24, PAG-25: Publish has no release message modal, no release list and no Restore; notification and log wording differs ("Draft saved — the public page is unchanged", "Updated page" for every page action, page delete not logged). Owner: Code.
6. PAG-18, PAG-19: Global CSS is not applied in the page preview; page JavaScript runs inside the preview frame (`__pageJs` is a number there; expected stored, never run). Owner: Code.
7. CSV-18, CSV-19, CSV-12 to CSV-17, CSV-02: no Cancel action or Cancelled status, status pages lack descriptions, failure details card, row-level error table with Row/Property/Message, "Download failed rows", six stat cards, 8-stage stepper. Owner: Code (data and views).
8. ACT-02, ACT-04, ACT-07, ACT-09, ACT-15, ACT-17, ACT-08, ACT-01: no pagination, no date range, no sorting, single-select upper-case Action filter, no Clear filters, no Export CSV, no error/Retry state, no columns or "Showing 1-7 of 7". Owner: Code.
9. ACT-10, ACT-11, ACT-12, ACT-13, ACT-18, X-09 (Activity log): seed rows show a made-up "Request (example)" line instead of "No details recorded"; entries carry no before/after fields; only 2 of 5 actions are logged; templates show no "Saved just now by admin"; Preserve, upload, CSV import log nothing. Owner: Code.
10. PAG-01, PAG-06, PAG-02, X-12: the Pages table has no checkboxes, no selection bar, no View/Edit buttons, no empty header text, URL without id, and the search does not match "/partners". Owner: Code (list structure) with Design for the headers.
11. PAG-10, PAG-11, PAG-14, PAG-15, PAG-13, PAG-09: no required-title validation, URL field is editable and does not follow the title, no Configuration tab or banners, Tab key traps focus after Escape, editor font 12px vs 14px in Global CSS & JS, language selector fixed to EN/ES/FR/AR (ignores Languages, never hides). Owner: Code.
12. PAG-27, PAG-28, X-02: guard dialogs exist but copy differs ("Discard unsaved changes?" / "Keep editing" / "Discard"; footer Discard disabled when clean, stays in editor after confirm; no footer Cancel). Owner: Design (copy and flow).
13. Contrast: ACT-03 / X-08 (Activity log pills: UPDATE 2.08:1, CREATE 3.32:1 light and 2.57:1 dark, MIGRATE 1.92:1 light), X-08 (Pages "Published" pill 3.32:1 light, 2.57:1 dark), X-07 / X-08 (Import CSV: "Auto-refreshing" and current-page span, template placeholder, status badges in dark detail view). Owner: Design.
14. Phone: ACT-19 / X-06 (user and time hidden on rows until expanded, no Export), PAG-30 / X-06 (no View per row; discard confirm is a centred card; footer status pill overlaps Discard when dirty), CSV-04 Open button 51x27 px. Owner: Design.
15. Copy: PAG-02/PAG-29 no-match ("Nothing matches" vs "No pages match"), ACT-06 placeholder, ACT-16 empty text, CSV-05 labels ("New import", "CSV File", "Import" vs "Import CSV", "Accept"), CSV-20 hint text, CSV-03 dates in MM/DD/YYYY. Owner: Design.
"""
open(f"{D}/../group-c.md", "w").write(head + p + "\n" + c + "\n" + a + "\n" + ranked)
