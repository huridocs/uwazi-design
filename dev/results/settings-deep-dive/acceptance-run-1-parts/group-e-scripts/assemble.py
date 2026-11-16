import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
d = {}
for l in open(os.path.join(HERE, 'results.jsonl')):
    r = json.loads(l); d[r['id']] = r

def ev(i, n=900):
    r = d[i]; t = r['ev'].replace('|', '\\|').replace('\n', ' ')
    return t if len(t) <= n else t[:n] + '...'
def shot(i):
    s = d[i]['sh']
    return ('[shot](' + '../' + s + ')') if s else ''

SKIP = {
 'FLT-03': 'SKIP | Needs M8, F1 (M8 has not landed: Settings > Templates is not on the store).',
 'FLT-16': 'SKIP | Needs F1 and the Library reader (not in this run\'s scope).',
 'FLT-17': 'SKIP | Needs F1 and the Library reader (not in this run\'s scope).',
 'FLT-18': 'SKIP | Needs F1 and the Library reader (not in this run\'s scope).',
 'FLT-19': 'SKIP | Needs M8, F1.',
 'FLT-24': 'SKIP | Needs M8.',
 'THS-02': 'SKIP | Needs M8.',
 'THS-21': 'SKIP | Needs F3, M3b.',
 'THS-23': 'SKIP | Needs M3b, F3.',
 'THS-24': 'SKIP | Needs M3b, F3.',
 'THS-26': 'SKIP | Needs M8.',
 'REL-02': 'SKIP | Needs M1, M8.',
 'REL-08': 'SKIP | Needs M8.',
 'REL-16': 'SKIP | Needs M8.',
 'REL-18': 'SKIP | Needs M8.',
}
ND = {
 'THS-05': 'The editor is opened from list state only (no route or URL), so an editor on a missing id cannot be reached from the browser. Not driven.',
 'THS-25': 'The Sample entity edit form (Court Case, opened from the Library > View entity > Edit) has no field for the Court Case "Status" property that uses Case status (labels: Title, Template, Description, Victim, Country, Place of the incident, Date of the incident, Date of judgment, Type, Series, Petitioner, Respondent, Articles invoked, Issuing body, Bench, ...). Sample forms are not template-driven until M4, so there is no Case status picker to test. "Pending review" was added to Case status and saved; the entity form could not show it.',
 'THS-37': 'No failure switch is available in the app, so a failed save, delete or import cannot be forced.',
}
NA = {
 'FLT': {'X-05': 'N/A | Page line: no pills, delete is undo.', 'X-08': 'N/A | Page line: no pills or badges.', 'X-10': 'N/A | Page line: covered by FLT-20.', 'X-11': 'N/A | Page line: no search.', 'X-12': 'N/A | Page line: no bulk bar.'},
}
XORDER = ['X-%02d' % i for i in range(1, 14)]
PAGES = [
 ('FLT', 'Filters (FLT)', 24, ['X-01','X-02','X-03','X-04','X-05','X-06','X-07','X-08','X-09','X-10','X-11','X-12','X-13']),
 ('THS', 'Thesauri list and editor (THS)', 41, XORDER),
 ('REL', 'Relationship types (REL)', 22, XORDER),
]
def row(page, cid):
    key = cid
    if cid.startswith('X-'):
        key = cid + '@' + page
    # static
    if cid in SKIP and not cid.startswith('X-'):
        res, e = SKIP[cid].split(' | ', 1); return res, e, ''
    if cid in ND and not cid.startswith('X-'):
        return 'NOT DRIVEABLE', ND[cid], ''
    if page in NA and cid in NA[page]:
        res, e = NA[page][cid].split(' | ', 1); return res, e, ''
    if page == 'THS' and cid == 'X-08':
        return 'NOT DRIVEABLE', 'The Thesauri list has no Templates pills (the column does not exist, see THS-01) and no status pills, so there is nothing to measure in light or dark.', ''
    if page == 'REL' and cid == 'X-05':
        return 'PASS', 'Delete dialogs state usage and the effect. Unused type: "Delete Unused type? No references or relationship fields use it." Used by a template property ("Victim"): refused with "Cannot delete type being used in templates: Court Case 6 references use this type. Relationship field: Court Case > Victims." Used by references only ("Mentions", 100): the dialog says "100 references use this type" and offers to move them. Wording and the move option differ from the checklist (see REL-09, REL-10, REL-11), but each dialog gives counts and either blocks or states what changes.', 'acceptance-run-1-shots/REL-10.png'
    if page == 'REL' and cid == 'X-02':
        r = d[key]
        extra = ' Phone: ' + d['PHONE-CHEVRON@REL']['ev']
        return r['res'], r['ev'] + extra, r['sh']
    if page == 'THS' and cid == 'X-02':
        r = d[key]
        extra = ' Phone: ' + d['PHONE-CHEVRON@THS']['ev']
        return r['res'], r['ev'] + extra, r['sh']
    if page == 'FLT' and cid == 'FLT-15':
        r = d[key]; r2 = d['FLT-15-phone']
        return r['res'], r['ev'].replace(' Mobile chevron: see X-02 phone check', '') + ' Phone: ' + r2['ev'], r['sh']
    if page == 'FLT' and cid == 'FLT-12':
        r = d[key]
        return r['res'], r['ev'] + '. The failure path ("An error occurred" entry, edits kept) could not be driven: no failure switch.', r['sh']
    if page == 'FLT' and cid == 'FLT-14':
        r = d[key]; return r['res'], r['ev'] + '. Restores the saved state as expected; only the label differs from the checklist.', r['sh']
    if page == 'FLT' and cid == 'FLT-21':
        r = d[key]; return r['res'], r['ev'] + '. The "group dialog is a sheet" part has no subject: adding a group is an inline chip on the page (see FLT-04). Rows have name, Show checkbox, group select and Move up/down buttons.', r['sh']
    if key not in d:
        return 'MISSING', 'not driven', ''
    r = d[key]
    return r['res'], r['ev'], r['sh']

out = []
out.append('# Group E acceptance run: Filters, Thesauri, Relationship types\n')
out.append('Target: playground 73a13827 at http://localhost:1438/. Driven with Playwright, desktop 1280x800 and phone 390x844 touch, one fresh context per check group. Scripts: `group-e-scripts/` (`run-all.sh` re-runs everything; `assemble.py` builds this file from `results.jsonl`). Screenshots are in `../acceptance-run-1-shots/`.\n')
out.append('Run notes:\n')
out.append('- Console: no console errors or page errors in any check on the three pages. The jotai warning "atomFamily is deprecated" prints on every page load and is not counted.')
out.append('- Switching the data source from the navbar leaves Settings for the Library in this app, so checks that switch source reopen Settings afterwards (X-13, X-02 switch route, THS-06).')
out.append('- There is no failure switch, so the "An error occurred" paths (X-04 failure, FLT-12, THS-37, REL-15 failed save) were not driven.')
out.append('- On the Sample, the relationship-type registry survived a tab reload (REL-05, X-01); thesauri did not (THS-09, THS-40, X-01).')
out.append('- The "Cancel" button on the thesaurus and relationship-type editors leaves without the discard dialog even when the form is dirty (THS-36, REL-15, X-02).')
out.append('- "Library reader" checks (FLT-16 to FLT-18) were skipped as another unavailable item, not tested.\n')
counts = {}
fails = []
for page, title, n, xs in PAGES:
    out.append('## ' + title + '\n')
    out.append('| Id | Result | Evidence (saw vs expected) | Shot |')
    out.append('|---|---|---|---|')
    c = {'PASS': 0, 'FAIL': 0, 'NOT DRIVEABLE': 0, 'SKIP': 0, 'N/A': 0}
    ids = ['%s-%02d' % (page, i) for i in range(1, n + 1)] + xs
    for cid in ids:
        res, e, s = row(page, cid)
        c[res] = c.get(res, 0) + 1
        if res == 'FAIL': fails.append((page, cid))
        e = e.replace('|', '\\|').replace('\n', ' ')
        if len(e) > 1100: e = e[:1100] + '...'
        out.append('| %s | %s | %s | %s |' % (cid, res, e, ('[shot](../' + s + ')') if s else ''))
    counts[page] = c
    out.append('\n%s: PASS %d, FAIL %d, NOT DRIVEABLE %d, SKIP %d, N/A %d.\n' % (page, c['PASS'], c['FAIL'], c['NOT DRIVEABLE'], c['SKIP'], c['N/A']))
open(os.path.join(HERE, '_tables.md'), 'w').write('\n'.join(out))
json.dump({'counts': counts, 'fails': fails}, open(os.path.join(HERE, '_summary.json'), 'w'))
print(counts); print(len(fails))
print(fails)
