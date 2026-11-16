#!/bin/zsh
cd "$(dirname "$0")"; mkdir -p logs
for s in flt-1 flt-2 flt-3 flt-4 flt-5 flt-6 flt-7 flt-8; do echo "== $s" >> logs/run-flt.log; node $s.mjs > logs/$s.log 2>&1; echo "done $s" >> logs/run-flt.log; done
echo ALLDONE >> logs/run-flt.log
