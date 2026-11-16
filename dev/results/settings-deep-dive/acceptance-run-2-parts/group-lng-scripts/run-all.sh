#!/bin/sh
# Re-runs every group-lng script (retrying a script up to 3 times if it crashes, e.g. when another agent's
# cleanup closes the shared browser); results land in *.json (and *.out). Dev server must be on :1438.
cd "$(dirname "$0")"
for f in ${@:-lng-a lng-b lng-c lng-d lng-x trn-a trn-b trn-c trn-d trn-e trn-f}; do
  echo "== $f"
  n=0; until node $f.mjs > $f.out 2>&1 || [ $n -ge 3 ]; do n=$((n+1)); echo "   retry $f ($n)"; done
done
echo "== done"
