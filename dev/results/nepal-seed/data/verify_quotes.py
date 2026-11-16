#!/usr/bin/env python3
"""Spot-check anchor quotes: fetch the anchor's source URL and test whether the quote appears in the page text.

Usage: verify_quotes.py [N] [seed]. Writes quote-check.json. A miss is not proof of a wrong quote (paywalls,
scripts, translated text, 403s); it marks the quote for manual review.
"""
import json, os, random, re, subprocess, sys, html, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ents = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
refs = [r for r in json.load(open(f"{HERE}/references.json")) if r.get("anchor") and r["anchor"].get("quote")]
if os.environ.get("MEDIA_ONLY"): refs = [r for r in refs if any(p.startswith("media-") for p in r["parts"]) and not r["anchor"].get("file")]  # MEDIA_ONLY
N = int(sys.argv[1]) if len(sys.argv) > 1 else 60
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
# one check per (source, quote)
seen, pool = set(), []
for r in refs:
    k = (r["anchor"]["source"], r["anchor"]["quote"])
    if k not in seen: seen.add(k); pool.append(r)
sample = random.sample(pool, min(N, len(pool)))

def norm(s):
    s = html.unescape(s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", " ", s.lower())).strip()

def fetch(url):
    try:
        out = subprocess.run(["curl", "-sL", "--max-time", "25", "-A", "Mozilla/5.0", "-w", "\n%{http_code}", url], capture_output=True, timeout=40)
        body = out.stdout.decode("utf-8", "ignore"); code = body.rsplit("\n", 1)[-1]
        return code, body.rsplit("\n", 1)[0]
    except Exception as e:
        return "ERR", ""

res = []
for r in sample:
    src = ents.get(r["anchor"]["source"])
    url = ((src or {}).get("properties", {}).get("url") or {}).get("url") if src else None
    if not url: res.append({"ref": r["id"], "result": "no-url"}); continue
    code, body = fetch(url)
    text = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", body)
    text = re.sub(r"<[^>]+>", " ", text)
    q = norm(r["anchor"]["quote"])
    ok = bool(q) and q in norm(text)
    res.append({"ref": r["id"], "url": url, "http": code, "found": ok, "quote": r["anchor"]["quote"][:120]})
    print(code, "FOUND" if ok else "miss", url[:90], flush=True)
c = collections.Counter(("found" if x.get("found") else ("unreachable" if x.get("http") not in ("200",) else "reachable-but-not-found")) for x in res if x.get("url"))
json.dump({"sampled": len(res), "summary": dict(c), "results": res}, open(f"{HERE}/quote-check.json", "w"), indent=1, ensure_ascii=False)
print(dict(c))
