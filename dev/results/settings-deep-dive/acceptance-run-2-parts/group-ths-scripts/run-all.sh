#!/bin/zsh
# Re-runs every script of group-ths in order. Needs the dev server at http://localhost:1438/.
cd "$(dirname "$0")"
mkdir -p logs
for s in ths-1 ths-2 ths-3 ths-4 ths-5 ths-6 ths-7 ths-8 ths-9 ths-10 ths-11 ths-12 flt-1 flt-2 flt-3 flt-4 flt-5 flt-6 flt-7 flt-8 rel-1 rel-2 rel-3 rel-4 rel-5 rel-5b rel-6 rel-7 rel-8; do
  echo "== $s" >> logs/run-all.log
  node $s.mjs > logs/$s.log 2>&1
  echo "done $s" >> logs/run-all.log
done
echo ALLDONE >> logs/run-all.log
