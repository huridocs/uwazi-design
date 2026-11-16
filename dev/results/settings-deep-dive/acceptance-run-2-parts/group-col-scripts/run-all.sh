#!/bin/sh
# Re-runs every script of the group; each writes results/<name>.json and results/<name>.out.
# A script is repeated (up to 3 runs) when chromium itself died ("has been closed").
cd "$(dirname "$0")"
for s in "$@"; do :; done
LIST="${*:-col-a col-b col-c col-d col-e col-f css men-a men-b men-c men-d men-e}"
for s in $LIST; do
  n=0
  while [ $n -lt 3 ]; do
    node $s.mjs > results/$s.out 2>&1
    n=$((n+1))
    grep -q "has been closed" results/$s.out || break
  done
  echo "$s done $(date +%T) runs=$n" >> results/progress.log
done
echo ALLDONE >> results/progress.log
