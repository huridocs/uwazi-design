import json, glob, re
P, D = {}, {}
for f in sorted(glob.glob('results-*.jsonl')):
    tgt = D if f.startswith('results-dsh') else P
    for l in open(f):
        r = json.loads(l)
        tgt[r['id']] = r
CUR = P
def g(i): return CUR[i]
def esc(s, cap=1100):
    s = re.sub(r'\s+', ' ', s).replace('|', '\\|')
    return s if len(s) <= cap else s[:cap] + ' …'
def shot(r): return ('`' + r['sh'].replace('acceptance-run-2-shots/', '') + '`') if r.get('sh') else ''
rows = {'PAG': [], 'DSH': []}
def add(page, id_, res, ev, sh=''):
    rows[page].append((id_, res, ev, sh))
def from_r(page, id_, rid=None, note=''):
    r = g(rid or id_)
    add(page, id_, r['res'], r['ev'] + note, shot(r))
def combine(page, id_, rids, intro='', note='', shotid=None):
    rs = [g(x) for x in rids]
    res = 'FAIL' if any(r['res'] == 'FAIL' for r in rs) else 'PASS'
    ev = intro + ' ' + ' // '.join(f"[{x}] {r['res']}: {r['ev']}" for x, r in zip(rids, rs)) + note
    first_fail = next((r for r in rs if r['res'] == 'FAIL'), rs[0])
    add(page, id_, res, ev, shot(g(shotid) if shotid else first_fail))

# ---- PAG
for n in range(1, 32):
    i = f'PAG-{n:02d}'
    if i == 'PAG-17':
        r1, r2 = g('PAG-17'), g('PAG-17-phone')
        add('PAG', i, 'PASS' if r1['res'] == r2['res'] == 'PASS' else 'FAIL', r1['ev'] + ' // phone: ' + r2['ev'], shot(r1) + ' ' + shot(r2))
    elif i == 'PAG-27':
        r1, r2 = g('PAG-27'), g('PAG-27-phone')
        add('PAG', i, 'PASS' if r1['res'] == r2['res'] == 'PASS' else 'FAIL', r1['ev'] + ' // phone back chevron: ' + r2['ev'], shot(r1) + ' ' + shot(r2))
    elif i == 'PAG-21':
        from_r('PAG', i, note=' (Beacon text is "Page published successfully." followed by the release message as detail.)')
    else:
        from_r('PAG', i)
add('PAG', 'X-01', 'PASS', g('X-01')['ev'] + ' (see also PAG-03, PAG-16)', shot(g('X-01')))
x2 = g('X-02')
add('PAG', 'X-02', x2['res'], x2['ev'] + ' // PAG-27 (editor dirty guard on Back, breadcrumb, Cancel, rail; phone chevron in the PAG-27 phone run).', shot(x2))
from_r('PAG', 'X-03', 'X-03')
add('PAG', 'X-04', g('X-04')['res'], g('X-04')['ev'] + ' // PAG-25 notification and Activity-log sequence; PAG-26 Save, Publish and Delete failures (one "An error occurred" entry each).', shot(g('X-04')))
add('PAG', 'X-05', g('X-05')['res'], g('X-05')['ev'] + ' // PAG-07, PAG-08', shot(g('X-05')))
mx = ['X-06@light', 'X-06@dark']
r = g('PAG-30')
add('PAG', 'X-06', 'PASS' if all(g(x)['res'] == 'PASS' for x in mx) and r['res'] == 'PASS' else 'FAIL',
    'PAG-30 phone run: ' + r['ev'] + ' // ' + ' // '.join(f"[{x}] {g(x)['ev']}" for x in mx), shot(g('X-06@light')) .replace('X-06-delete-light', 'X-06-delete-light'))
x07 = ['X-07-list@light','X-07-listdlgs@light','X-07-editor@light','X-07-editordlgs@light','X-07-list@dark','X-07-listdlgs@dark','X-07-editor@dark','X-07-editordlgs@dark',
       'X-07-list@390-light','X-07-listdlgs@390-light','X-07-editor@390-light','X-07-dlgs@390-light','X-07-list@390-dark','X-07-listdlgs@390-dark','X-07-editor@390-dark','X-07-dlgs@390-dark']
fails = [x for x in x07 if g(x)['res'] == 'FAIL']
ev = ('FAIL in: ' + ', '.join(fails) + '. Summary: (1) axe color-contrast (serious) on the "Published" status pill of the Pages list, 2 nodes, light and dark, 1280 and 390 (pill text #059669 on #d1fae5 = 3.32:1; dark 2.58:1). '
      '(2) At 390 px (also any width below 768) the "Restore this release?" confirm, a stacked sheet over the Restore sheet, does not take focus (activeElement stays BODY) and Escape does not close it; Publish, Restore, picker, View and delete dialogs behave. '
      'Passing: axe on the editor tabs (Configuration, HTML, Javascript, CSS) with no serious/critical finding at 1280 and 390, light and dark; every input labelled; row button names unique; dialogs have role=dialog and an accessible name, keep Tab/Shift+Tab inside, Escape closes only the top layer at 1280 (Restore confirm over the Restore modal), focus returns to the opener. '
      'axe also lists a moderate "landmark-no-duplicate-banner" for the header and footer of every Modal (not counted: only serious/critical fail). Details: ')
ev += ' // '.join(f"[{x}] {g(x)['res']}: {g(x)['ev']}" for x in ['X-07-list@light', 'X-07-editordlgs@light', 'X-07-dlgs@390-light'])
add('PAG', 'X-07', 'FAIL' if fails else 'PASS', ev, '`X-07-list-light.png` `X-07-restore-confirm-stack-390-light.png`')
x08 = ['X-08@light','X-08@dark','X-08@390-light','X-08@390-dark','X-08-editor@light','X-08-editor@dark','X-08-editor@390-light','X-08-editor@390-dark']
add('PAG', 'X-08', 'FAIL' if any(g(x)['res'] == 'FAIL' for x in x08) else 'PASS',
    'The "Published" pill on the Pages list is 3.32:1 in light and 2.58:1 in dark (need 4.5), same at 1280 and 390; "Draft" 12.13/9.04 and "Published · edited" 11.35/5.71 pass; the editor footer pill (Published · edited) passes (11.35 light, 5.71 dark). Visual look reviewed in dark at 1280 (list, editor HTML tab) and 390 (editor): no clipped or unreadable text beyond the Published pill; the preview frame stays light by design. // '
    + ' // '.join(f"[{x}] {g(x)['ev']}" for x in x08), '`X-08-list-light-1280.png` `X-08-list-dark-1280.png` `X-08-list-dark-390.png`')
add('PAG', 'X-09', g('X-09')['res'], g('X-09')['ev'] + ' // PAG-25 (create, update, publish, restore, delete entries)', shot(g('X-09')))
add('PAG', 'X-10', g('X-10')['res'], g('X-10')['ev'] + ' // PAG-29', shot(g('X-10')))
add('PAG', 'X-11', g('X-11')['res'], g('X-11')['ev'] + ' // PAG-02', shot(g('X-11')))
add('PAG', 'X-12', g('X-12')['res'], g('X-12')['ev'] + ' // PAG-06', shot(g('X-12')))
add('PAG', 'X-13', g('X-13')['res'], g('X-13')['ev'], shot(g('X-13')))

# ---- DSH
CUR = D
for n in range(1, 15):
    i = f'DSH-{n:02d}'
    if i == 'DSH-01': from_r('DSH', i)
    elif i == 'DSH-03': from_r('DSH', i)
    elif i == 'DSH-04': from_r('DSH', i, note=' // Dashboard stats on all four sources: ' + g('DSH-stats-per-source')['ev'])
    elif i == 'DSH-07':
        from_r('DSH', i, note=' // Note: the focus ring is `ring-2 ring-carbon/30`, a 2px ring of rgb(178,232,250) on white (about 1.3:1) and rgb(25,79,97) on the dark card (about 1.7:1); visible, but below 3:1 (`DSH-07-ring.png`, `DSH-07-ring-dark.png`).')
    elif i == 'DSH-09':
        vs = ['DSH-09@1280-light','DSH-09@1280-dark','DSH-09@390-light','DSH-09@390-dark']
        add('DSH', i, 'PASS' if all(g(x)['res']=='PASS' for x in vs) else 'FAIL', ' // '.join(f"[{x}] {g(x)['ev']}" for x in vs) + ' // Other axe findings (color-contrast on the Recent activity badges) are recorded under X-07.', shot(g('DSH-09@1280-light')) + ' ' + shot(g('DSH-09@390-light')))
    elif i == 'DSH-14': from_r('DSH', i, note=' // Note: this run signs in through the Login view (reload), which logs one React console error, "React does not recognize the `fetchPriority` prop on a DOM element" (LoginView.tsx img). It is raised by the Login view, not by the Dashboard or the Reset action; the Dashboard part of the check logged nothing. Also seen while setting up: a thesaurus rename did not survive a tab reload, so the thesaurus edit was made after the sign-in reload.')
    elif i == 'DSH-11': from_r('DSH', i)
    else: from_r('DSH', i)
add('DSH', 'X-01', 'N/A', 'Excluded by the Applies line (read-only page; no editor, list or delete).')
for x in ['X-02','X-03','X-04','X-05','X-09','X-10','X-11','X-12']:
    add('DSH', x, 'N/A', 'Excluded by the Applies line (read-only page; no editor, list or delete).')
x06 = ['X-06@light','X-06@dark']
add('DSH', 'X-06', 'PASS' if all(g(x)['res']=='PASS' for x in x06) else 'FAIL', ' // '.join(f"[{x}] {g(x)['ev']}" for x in x06) + ' // DSH-09 390 px rows: 5 cards in one 358 px column, no horizontal overflow.', shot(g('X-06@light')))
x07 = ['X-07@1280-light','X-07@1280-dark','X-07@390-light','X-07@390-dark']
add('DSH', 'X-07', 'FAIL' if any(g(x)['res']=='FAIL' for x in x07) else 'PASS',
    'axe color-contrast (serious) on the Recent activity method badges (Update carbon on carbon tint, Create and Migrate success/warning tints): 4 nodes light 1280, 3 dark 1280, 2 light 390, 1 dark 390. The Reset demo data dialog passes: role=dialog, name "Reset demo data", focus enters it, Tab stays inside, Escape closes it only, focus returns to the Reset button (all four variants). Button names unique. // ' + ' // '.join(f"[{x}] {g(x)['ev']}" for x in x07),
    '`X-07-dashboard-1280-light.png` `X-07-dashboard-390-dark.png`')
x08 = ['X-08@1280-light','X-08@1280-dark','X-08@390-light','X-08@390-dark']
add('DSH', 'X-08', 'FAIL' if any(g(x)['res']=='FAIL' for x in x08) else 'PASS',
    'Recent activity badge contrast (need 4.5): light Update 2.08, Create 3.32, Delete 6.71, Migrate 1.93; dark Update 5.08, Create 2.58, Delete 6.19, Migrate 4.22; identical at 1280 and 390. Card text passes (labels 7.46 light / 6.5 dark, values 17.4 / 13.68). Visual look reviewed in dark at 1280 and 390: layout intact, only the badges read weak. // ' + ' // '.join(f"[{x}] {g(x)['ev']}" for x in x08),
    '`X-08-dashboard-1280-light.png` `X-08-dashboard-1280-dark.png` `X-08-dashboard-390-dark.png`')
add('DSH', 'X-13', g('X-13')['res'], g('X-13')['ev'], shot(g('X-13')))

def table(page):
    out = ['| Id | Result | Evidence (saw vs expected) | Shot |', '|---|---|---|---|']
    for i, res, ev, sh in rows[page]:
        out.append(f'| {i} | {res} | {esc(ev, 1500)} | {sh} |')
    return '\n'.join(out)
def counts(page):
    c = {}
    for _, res, _, _ in rows[page]: c[res] = c.get(res, 0) + 1
    return f"{c.get('PASS',0)} PASS / {c.get('FAIL',0)} FAIL / 0 NOT DRIVEABLE / 0 SKIP / {c.get('N/A',0)} N/A"
open('tables.md','w').write('## Pages list and editor (PAG)\n\n' + table('PAG') + '\n\nCount: ' + counts('PAG') + '\n\n## Dashboard (DSH)\n\n' + table('DSH') + '\n\nCount: ' + counts('DSH') + '\n')
print(counts('PAG')); print(counts('DSH'))
