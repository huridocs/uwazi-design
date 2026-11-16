#!/bin/bash
# Re-runs every TED script against http://localhost:1438/ (sequential, one chromium at a time) and rebuilds results.jsonl.
# Later lines override earlier ones for the same check id (m1c after m1b, e3b after e3).
cd "$(dirname "$0")"
rm -f results.jsonl
for f in ted-a ted-b ted-c ted-d ted-e1 ted-e2 ted-e3 ted-e3b ted-e4 ted-e5 ted-m1a ted-m1b ted-m1c ted-g ted-f ted-x1 ted-x2; do
  echo "== $f"; node $f.mjs > $f.log 2>&1
done
echo finished > run-all.done
