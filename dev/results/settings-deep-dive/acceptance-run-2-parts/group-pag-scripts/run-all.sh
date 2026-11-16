#!/bin/sh
# Re-runs every script of group-pag (one chromium at a time). Output per script in <name>.out, results in results-<name>.jsonl
cd "$(dirname "$0")"
for s in pag-a pag-b pag-c pag-d pag-e pag-f pag-g pag-x pag-a11y pag-m pag-mx dsh-a dsh-b dsh-rel dsh-c dsh-d dsh-x; do
  echo "== $s"; node $s.mjs > $s.out 2>&1
done
echo done
