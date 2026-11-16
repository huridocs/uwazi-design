#!/usr/bin/env python3
"""OCR bundled PDFs that have no usable text layer (scans, legacy-font text) with Tesseract (Nepali `nep`, English `eng`).
Writes docs/<id>/pages/NNN.txt and updates meta.json. A degraded original text layer is kept in pages_textlayer/."""
import json, os, shutil, subprocess, sys, tempfile, glob
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = f"{ROOT}/docs"
TESSDATA = "/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/3e644fc2-413e-47cd-ac5e-6d498eb004ca/scratchpad/tessdata"
env = dict(os.environ, TESSDATA_PREFIX=TESSDATA)
ver = subprocess.run(["tesseract", "--version"], capture_output=True, text=True).stdout.splitlines()[0]

def ocr_page(args):
    did, pdf, n, lang = args
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdftoppm", "-r", "250", "-f", str(n), "-l", str(n), "-png", pdf, f"{td}/p"], check=True, capture_output=True)
        img = sorted(glob.glob(f"{td}/p*.png"))[0]
        out = subprocess.run(["tesseract", img, "stdout", "-l", lang, "--psm", "3"], capture_output=True, text=True, env=env)
        return n, out.stdout

todo = []
for mp in sorted(glob.glob(f"{DOCS}/*/meta.json")):
    meta = json.load(open(mp)); did = os.path.basename(os.path.dirname(mp))
    if meta.get("text_source") == "ocr": continue
    if meta.get("text_layer") and meta.get("text_quality") != "degraded": continue
    todo.append((did, meta))
print(len(todo), "documents to OCR", flush=True)
for did, meta in todo:
    pdf = f"{DOCS}/{did}/doc.pdf"
    lang = "eng" if meta.get("language") == "en" else "nep+eng"
    pages = meta.get("pages") or 1
    with ThreadPoolExecutor(4) as ex:
        res = dict(ex.map(ocr_page, [(did, pdf, n, lang) for n in range(1, pages + 1)]))
    pdir = f"{DOCS}/{did}/pages"
    if meta.get("text_layer") and os.path.isdir(pdir):
        shutil.move(pdir, f"{DOCS}/{did}/pages_textlayer")
    os.makedirs(pdir, exist_ok=True)
    chars = 0
    for n in range(1, pages + 1):
        t = res[n]; chars += len(t.strip())
        open(f"{pdir}/{n:03d}.txt", "w").write(t)
    meta.update(text_source="ocr", ocr={"engine": ver, "language": lang, "dpi": 250, "quality": "unreviewed; machine OCR, expect errors in Devanagari conjuncts and numerals"},
                text_quality="ocr-unreviewed", ocr_characters=chars)
    json.dump(meta, open(f"{DOCS}/{did}/meta.json", "w"), indent=1, ensure_ascii=False)
    print("done", did, pages, "pages", chars, "chars", flush=True)
