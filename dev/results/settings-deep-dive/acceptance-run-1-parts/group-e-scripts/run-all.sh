#!/bin/zsh
# Re-runs every group-e check. Needs the dev server on :1438. Writes results.jsonl (last write wins per id).
cd "$(dirname "$0")"
rm -f results.jsonl
node e-flt.mjs a; node e-flt.mjs b; node e-flt.mjs c; node e-flt.mjs d; node e-flt.mjs e; node e-flt.mjs f; node e-flt.mjs g
node e-flt2.mjs a; node e-flt2.mjs b; node e-flt3.mjs
node e-ths-a.mjs a; node e-ths-a.mjs b; node e-ths-6.mjs
node e-ths-b.mjs a; node e-ths-b.mjs b; node e-ths-b.mjs c; node e-ths-b.mjs d
node e-ths-c.mjs a; node e-ths-c.mjs b; node e-ths-d.mjs a
node e-ths-e.mjs a; node e-ths-e.mjs b; node e-ths-e.mjs c; node e-ths-e.mjs d
node e-rel-a.mjs a; node e-rel-a.mjs b; node e-rel-c.mjs a; node e-rel-c.mjs b; node e-rel-c.mjs c
node e-rel-d.mjs a; node e-rel-d.mjs b; node e-rel-e.mjs a; node e-rel-e.mjs b; node e-rel-e.mjs c; node e-rel-f.mjs
