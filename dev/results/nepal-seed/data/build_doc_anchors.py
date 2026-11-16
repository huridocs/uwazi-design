#!/usr/bin/env python3
"""Page-anchored references from bundled documents: each quote is copied from the OCR/text-layer page file and checked
against it before it is written. merge.py then re-anchors to {file, page, text}."""
import json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__)); DOCS = os.path.join(os.path.dirname(HERE), "docs")
ents = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
def rid(prefix):
    c = [i for i in ents if i.startswith(prefix)]
    assert len(c) == 1, (prefix, c); return c[0]
def norm(t): return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", " ", html.unescape(t).lower())).strip()
ITEMS = [  # doc, action id prefix, quote
 ("gon-cabinet-decisions-2082-bhadra", "action:2025-08-25-cabinet-directs-platforms", "सामाजिक सञ्जाल सञ्चालकलाई जिम्मेवार तथा जवाफदेही बनाउन सात दिनको म्याद दिई सञ्चार तथा"),
 ("gon-cabinet-decisions-2082-bhadra", "action:2025-09-15-cabinet-decisions-martyrs", "मिति २०८२ भदौ २३ र २४ गतेको प्रदर्शनका क्रममा मृत्यु भएका व्यक्तिहरूलाई शहीद"),
 ("gon-cabinet-decisions-2082-asoj", "action:2025-09-21-karki-inquiry-commission-formed", "छानविन गरी प्रतिवेदन पेश गर्न श्री गौरी बहादुर कार्कीको अध्यक्षतामा श्री विज्ञानराज शर्मा र श्री विश्वेश्वर"),
 ("gon-cabinet-decisions-2082-kartik", "action:2025-11-03-cabinet-declares-45", "भएका ४५ जना व्यक्तिहरूलाई राज्यकोतर्फबाट शहीद घोषणा गर्ने।"),
 ("gon-cabinet-decisions-2082-chaitra", "action:2026-03-15-cabinet-receives-inquiry", "गरेको प्रतिवेदन नेपाल सरकार, मन्त्रिपरिषद्ले ग्रहण गर्ने"),
 ("gon-cabinet-decisions-2082-chaitra", "action:2026-03-27-cabinet-decides-to-implement", "नेपाल सरकारसमक्ष पेश गरेको प्रतिवेदन तत्काल कार्यान्वयन गर्न देहायबमोजिम गर्ने-"),
 ("mocit-notice-social-media-listing-2081-10-21", "action:2025-02-03-mocit-notice", "व्यवस्था पालना नभएमा सामाजिक सञ्जाल प्लेटफर्मलाई मन्त्रालयले नेपालभित्र सञ्चालनमा रोक"),
 ("nhrc-press-release-2082-05-20", "action:2025-09-05-nhrc-urges-reconsidering", "सामाजिक सञ्जाल बन्द गर्ने निर्णयमा पुनर्विचार गर"),
 ("nhrc-press-release-2082-05-23", "action:2025-09-08-nhrc-urges-restraint", "प्रदर्शनकारीमाथि अत्यधिक बल प्रयोग गर्ने कार्य बन्द गर"),
 ("nhrc-press-release-2082-05-27-en", "action:2025-09-12-nhrc-urges-president", "A solution should be sought based on human rights, democratic values, and the rule of law"),
 ("sc-press-release-2082-05-26", "action:2025-09-11-supreme-court-press-release", "साधन लगायतमा अकल्पनीय क्षति पुग्न गएको छ। नेपालको न्यायिक इतिहासका महत्वपूर्ण"),
]
index = json.load(open(f"{DOCS}/index.json"))
refs = []
for doc, aprefix, quote in ITEMS:
    action = rid(aprefix)
    src = [r["entity"] for r in index if r["doc"] == doc and r["entity"].startswith("source:")]
    assert len(src) == 1, (doc, src)
    pages = {int(fn[:-4]): norm(open(f"{DOCS}/{doc}/pages/{fn}", errors="ignore").read()) for fn in os.listdir(f"{DOCS}/{doc}/pages") if fn.endswith(".txt")}
    hit = [n for n, t in pages.items() if norm(quote) in t]
    assert hit, ("quote not on any page", doc, quote)
    refs.append({"id": f"ref:docanchor-{doc}-{action.split(':',1)[1][:30]}", "from": src[0], "to": action, "type": "reports_on", "date": None,
                 "anchor": {"source": src[0], "quote": quote}, "sources": [src[0]], "verification": "single-source",
                 "note": f"Quote located on page {hit[0]} of the bundled PDF text (OCR for scanned pages)."})
json.dump({"topic": "media-docs-anchors", "entities": [], "references": refs}, open(f"{HERE}/parts/media-docs-anchors.json", "w"), indent=1, ensure_ascii=False)
print(len(refs), "page-anchored references")
