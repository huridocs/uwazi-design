import json, re, collections
CHK = '/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-checklist.md'
RES = '/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-parts/group-d-scripts/results.jsonl'
OUT = '/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/acceptance-run-1-parts/group-d.md'
res = {}
for l in open(RES):
    d = json.loads(l); res[d['id']] = d
lines = open(CHK).read().split('\n')
def table(start_marker, end_marker):
    s = next(i for i,l in enumerate(lines) if l.startswith(start_marker))
    e = next(i for i,l in enumerate(lines) if i > s and l.startswith(end_marker))
    rows = []
    for l in lines[s:e]:
        m = re.match(r'\| ((?:TPL|TED)-\d+) \|(.*)\|\s*$', l)
        if m:
            cells = [c.strip() for c in l.strip().strip('|').split(' | ')]
            rows.append((cells[0], cells[-1]))
    return rows
tpl = table('## Templates list (TPL)', '## Template editor')
ted = table('## Template editor and property dialog (TED)', '## Filters (FLT)')
import os
def fixshot(p):
    return p if (not p or os.path.exists('/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/settings-deep-dive/'+p)) else ''
def esc(s): return re.sub(r'\s+', ' ', s).replace('|', '\\|')
def build(name, rows, prefix):
    out = [f'## {name}', '', '| Id | Result | Evidence (saw vs expected) | Shot |', '|---|---|---|---|']
    cnt = collections.Counter(); fails = []
    for cid, needs in rows:
        d = res.get(cid)
        if d:
            r, ev, shot = d['result'], d['evidence'], d['shot']
        else:
            r, ev, shot = 'SKIP', f'Needs {needs}', ''
        if r == 'SKIP' and not ev.startswith('Needs'): ev = f'Needs {needs}'
        cnt[r] += 1
        if r == 'FAIL': fails.append(cid)
        out.append(f'| {cid} | {r} | {esc(ev)} | {fixshot(shot)} |')
    for x in sorted(k for k in res if k.startswith(prefix + ':X-') and not k.endswith('b')):
        d = res[x]; cid = x.split(':')[1]
        cnt[d['result']] += 1
        if d['result'] == 'FAIL': fails.append(cid + f' ({prefix})')
        ev = d['evidence']
        if x == 'TPL:X-04': ev += ' Also driven: creating a template gave the Beacon entry "Template created just now"; deleting an unused template gave "QA delete me deleted just now" (expected "Template deleted."); the Activity log stayed empty after both.'
        out.append(f"| {cid} | {d['result']} | {esc(ev)} | {fixshot(d['shot'])} |")
    out.append('')
    out.append(f"Counts: PASS {cnt['PASS']} / FAIL {cnt['FAIL']} / NOT DRIVEABLE {cnt['NOT DRIVEABLE']} / SKIP {cnt['SKIP']} / N/A {cnt['N/A']}")
    out.append('')
    return out, cnt, fails
o1, c1, f1 = build('Templates list (TPL)', tpl, 'TPL')
o2, c2, f2 = build('Template editor and property dialog (TED)', ted, 'TED')
head = ['# Group D acceptance run: Templates list and Template editor', '',
 'Target: playground 73a13827 at http://localhost:1438/. Driven with Playwright (scripts in `group-d-scripts/`, shots in `acceptance-run-1-shots/`). Desktop 1280x800; phone 390x844 with touch where a check says phone.',
 'Console: every page logs the warning "[DEPRECATED] atomFamily is deprecated ..." (jotai); it is app-wide and not counted as a per-check error. No console errors were seen.',
 'Rows marked SKIP carry the check\'s Needs entry (M3 to M9 or combinations including M8). Checks whose only Needs are M8 are all SKIP, so the M2-only combinations (TED-11, TED-12, TED-23 and others) are SKIP too.', '']
tail = open(OUT.replace('group-d.md','group-d-scripts/ranked.md')).read()
open(OUT, 'w').write('\n'.join(head + o1 + o2) + '\n' + tail)
print('TPL', dict(c1)); print('TED', dict(c2))
print('FAIL ids TPL', len(f1), 'TED', len(f2))
