#!/bin/zsh
# Runs every script in order; a script that dies (browser killed by another process on the shared machine) is retried twice.
cd "$(dirname "$0")"
SCRIPTS=${@:-tpl1 tpl2 tpl3 tpl4 upl1 upl2 upl3 upl4 vis act1 act2}
for n in ${=SCRIPTS}; do
  for try in 1 2 3; do
    node $n.mjs > $n.log 2>&1; rc=$?
    echo "$n try $try exit $rc" >> run-all.status
    [ $rc -eq 0 ] && break
  done
done
echo done >> run-all.status
