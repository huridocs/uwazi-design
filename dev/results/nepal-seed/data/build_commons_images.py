#!/usr/bin/env python3
"""Download the selected openly licensed Wikimedia Commons images (max 1600 px long edge) and write
parts/media-images.json. Metadata comes from the Commons API (extmetadata); nothing is invented."""
import hashlib, html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = f"{ROOT}/media/images"
os.makedirs(OUT, exist_ok=True)
INFO = json.load(open("/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/3e644fc2-413e-47cd-ac5e-6d498eb004ca/scratchpad/media/info_all.json"))
ENTS = {e["id"]: e for e in json.load(open(f"{HERE}/entities.json"))}
UA = {"User-Agent": "uwazi-research-prototype/1.0 (juanmnlcornejo@gmail.com; open-licence media research)"}
TODAY = "2026-10-05"

P8 = "event:2025-09-08-gen-z-protests-in-other-cities"
CH9 = "event:2025-09-09-chitwan-and-kanchanpur-offices-burned"
PARL = "event:2025-09-09-parliament-building-set-on-fire"
# title, slug, depicts, documents, extra caption note, recorded date, precision, geolocate-from-location
ITEMS = [
 ("GenZ protest against government in chitwan(1), 8 september 2025.jpg", "chitwan-protest-8-sep-1", [P8, "location:chitwan-district"], [], "2025-09-08", "day", "location:chitwan-district",
  "Protest march in Chitwan on 8 September 2025. The uploader's description gives the date as 23 Bhadra 2082 (Nepali calendar), which is 8 September 2025."),
 ("GenZ protest against government in chitwan(3), 8 september 2025.jpg", "chitwan-protest-8-sep-3", [P8, "location:chitwan-district"], [], "2025-09-08", "day", "location:chitwan-district",
  "Protesters gathered in Chitwan on 8 September 2025, per the uploader's title and Nepali-calendar description."),
 ("2025 Nepalese Gen Z movement protesters in Chitwan District 02.jpg", "chitwan-protesters-9-sep-02", [CH9, "location:chitwan-district"], [], "2025-09-09", "day", "location:chitwan-district",
  "Protesters in Chitwan District on 9 September 2025 (Commons upload date and category)."),
 ("2025 Nepalese Gen Z movement protesters set fire to Chitwan District Court.jpg", "chitwan-district-court-fire", [CH9, "location:chitwan-district"], [], "2025-09-09", "day", "location:chitwan-district",
  "Fire at the Chitwan District Court during the 9 September 2025 protests, as titled by the uploader."),
 ("2025 Nepalese Gen Z movement protesters set fire to Chitwan District traffic office.jpg", "chitwan-traffic-office-fire", [CH9, "location:chitwan-district"], [], "2025-09-09", "day", "location:chitwan-district",
  "Fire at the Chitwan District traffic office during the 9 September 2025 protests, as titled by the uploader."),
 ("2025 Nepalese Gen Z movement protesters set fire to Chitwan revenue office 02.jpg", "chitwan-revenue-office-fire", [CH9, "location:chitwan-district"], [], "2025-09-09", "day", "location:chitwan-district",
  "Fire at the Chitwan revenue office during the 9 September 2025 protests, as titled by the uploader."),
 ("2025 Nepalese Gen Z protesters set fire to Bharatpur Metropolitan City office.jpg", "bharatpur-metropolitan-office-fire", [CH9, "location:bharatpur"], [], "2025-09-09", "day", "location:bharatpur",
  "Fire at the Bharatpur Metropolitan City office on 9 September 2025, as titled by the uploader."),
 ("2025 Nepalese Gen Z protesters infront of Bharatpur mahanagarpalika office.jpg", "bharatpur-metropolitan-office-crowd", [CH9, "location:bharatpur"], [], "2025-09-09", "day", "location:bharatpur",
  "Crowd in front of the Bharatpur Metropolitan City office on 9 September 2025, as titled by the uploader."),
 ("Main entrance of Sansad Bhavan of Nepal After GenZ Protest-070A6043.jpg", "sansad-bhavan-main-entrance-after", [PARL, "location:federal-parliament-building"], ["claim:parliament-building-still-stands"], "2025-09-20", "day", "location:federal-parliament-building",
  "Main entrance of the Sansad Bhavan (Federal Parliament building) after the 8 to 9 September 2025 protests; the Commons description dates the photograph to 20 September 2025 and labels the event 8, 9 September 2025."),
 ("Sansad Bhavan of Nepal (International Convention Centre Nepal) After GenZ Protest-070A6053.jpg", "sansad-bhavan-after-6053", [PARL, "location:federal-parliament-building"], ["claim:parliament-building-still-stands"], "2025-09-20", "day", "location:federal-parliament-building",
  "The Sansad Bhavan after the September 2025 protests, photographed 20 September 2025 per Commons metadata."),
 ("Sansad Bhavan of Nepal (International Convention Centre Nepal) After GenZ Protest-070A6031.jpg", "sansad-bhavan-after-6031-bw", [PARL, "location:federal-parliament-building"], [], "2025-09-20", "day", "location:federal-parliament-building",
  "Black-and-white photograph of the Sansad Bhavan after the September 2025 protests, per the Commons description."),
 ("Department of Transport Management, Nepal after Genz Protest-070A6048.jpg", "transport-management-after", ["event:2025-09-09-ministries-and-state-offices-burned-in-kathmandu"], [], "2025-09-20", "day", None,
  "The Department of Transport Management building after the Gen Z protest, photographed 20 September 2025 per Commons metadata."),
 ("Demonstrations and protests in Nepal in 2025-070A6047.jpg", "protest-aftermath-070a6047", ["event:2025-09-09-ministries-and-state-offices-burned-in-kathmandu"], [], "2025-09-20", "day", None,
  "Burned government premises after the September 2025 protests; the Commons file is in the category Demonstrations and protests in Nepal in 2025 and was taken on 20 September 2025."),
 ("Office of government attorney after Gen Z protest in nepal.jpeg", "government-attorney-office-after", ["event:2025-09-09-ministries-and-state-offices-burned-in-kathmandu"], [], "2025-09-15", "day", None,
  "The office of the government attorney after the Gen Z protest, per the Commons title; taken 15 September 2025 per metadata."),
 ("Sansad Bhavan of Nepal (International Convention Centre Nepal)-070A4427.jpg", "sansad-bhavan-before-june-2025", ["location:federal-parliament-building"], [], "2025-06-07", "day", "location:federal-parliament-building",
  "The Sansad Bhavan (Federal Parliament building) on 7 June 2025, before the protests; useful as a before-image for the 9 September fire."),
 ("The Singha Durbar Western Gate (Main Gate), Nepal. (2).jpg", "singha-durbar-western-gate-2026", ["location:singha-durbar"], [], "2026-04-22", "day", "location:singha-durbar",
  "The Western Gate (main gate) of Singha Durbar, photographed 22 April 2026, after the 9 September 2025 fire."),
 ("1st parliament building of nepal Government office नेपालको पहिलो संसद भवन सिंहदरवार 2.jpg", "singha-durbar-august-2025", ["location:singha-durbar"], [], "2025-08-16", "day", "location:singha-durbar",
  "Singha Durbar (first parliament building) photographed 16 August 2025, three weeks before the fire."),
 ("Baluwatar Kathmandu बालुवाटार Pm Residence New Building Of Nepal.jpg", "baluwatar-pm-residence-feb-2025", ["location:baluwatar"], [], "2025-02-15", "day", "location:baluwatar",
  "The prime minister's residence complex at Baluwatar, photographed 15 February 2025."),
 ("Balen with Rabi.webp", "balen-shah-rabi-lamichhane-rally-2026", ["person:balendra-shah", "person:rabi-lamichhane", "event:2026-03-05-house-of-representatives-election"], [], "2026-02-28", "day", None,
  "Balen Shah and Rabi Lamichhane at a rally in the Kathmandu Valley ahead of the 5 March 2026 election, per the Commons description."),
 ("Official Portrait of Prime Minister Balendra Shah, 2026.jpg", "balendra-shah-official-portrait-2026", ["person:balendra-shah", "event:2026-03-27-balendra-shah-sworn-in-as-prime-minister"], [], "2026-03-31", "day", None,
  "Official portrait of Prime Minister Balendra Shah, 2026."),
 ("PM Balen with António Guterres.jpg", "balen-shah-guterres-unga-2026", ["person:balendra-shah", "person:antonio-guterres"], ["action:2026-09-24-pm-balendra-shah-address-to-un-general-assembly"], "2026-09-24", "day", None,
  "Prime Minister Balen Shah with UN Secretary-General António Guterres during the 81st UN General Assembly, 24 September 2026."),
 ("Council of Ministers during Cabinet meeting.jpg", "balen-shah-cabinet-meeting-2026", ["person:balendra-shah"], [], "2026-09-29", "day", None,
  "A cabinet meeting under Prime Minister Balen Shah, 29 September 2026."),
 ("President Putin meeting PM of Nepal Oli at 2025 SCO Summit.jpg", "oli-putin-sco-1-sep-2025", ["person:kp-sharma-oli"], [], "2025-09-01", "day", None,
  "Prime Minister Oli meeting President Putin at the 2025 SCO Summit, 1 September 2025, a week before the protests."),
 ("PM in a bilateral meeting with the Prime Minister of Nepal, Shri KP Sharma Oli at Bangkok, in Thailand on April 04, 2025.jpg", "oli-modi-bimstec-4-apr-2025", ["person:kp-sharma-oli", "person:narendra-modi"], [], "2025-04-04", "day", None,
  "Prime Minister Oli in a bilateral meeting with Indian Prime Minister Modi at Bangkok, 4 April 2025."),
 ("Gyanendra2025.png", "gyanendra-shah-2025", ["person:gyanendra-shah"], [], "2025-04-13", "day", None,
  "Gyanendra Shah, former king, 2025 (the pro-monarchy rallies of March to April 2025 centred on him)."),
 ("Gagan Thapa गगन थापा Member of Parliament, Pratinidhi Sabha (cropped).jpg", "gagan-thapa-mp-2024", ["person:gagan-thapa"], [], "2024-12-12", "day", None,
  "Gagan Thapa, member of the House of Representatives, December 2024."),
 ("SherBahadurDeuba.jpg", "sher-bahadur-deuba-2025", ["person:sher-bahadur-deuba"], [], "2025-03-21", "day", None,
  "Sher Bahadur Deuba, Nepali Congress president, 2025."),
 ("Action-against-rabi-lamichhane.png", "committee-document-lamichhane-2024", ["person:rabi-lamichhane", "event:2024-09-16-parliamentary-committee-finds-lamichhane-complicit"], [], "2024-09-17", "day", None,
  "Image of the document submitted by the parliamentary committee on action against Rabi Lamichhane (cooperative fraud case), September 2024, per the Commons description."),
 ("Balen Shah - Mayor of Kathmandu.png", "balen-shah-mayor-2024", ["person:balendra-shah"], [], "2024-05-30", "day", None,
  "Balen Shah, then Mayor of Kathmandu, during a media briefing in 2024."),
]

def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def licence_class(short):
    s = (short or "").upper()
    if "CC0" in s: return "bundled-cc0"
    if "PUBLIC DOMAIN" in s: return "bundled-public-domain"
    if "GODL" in s or "OGL" in s: return "bundled-open-government"
    if "BY-SA" in s: return "bundled-cc-by-sa"
    if s.startswith("CC BY"): return "bundled-cc-by"
    return None

def dims(path):
    try:
        out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path], capture_output=True, text=True).stdout
        return int(re.search(r"pixelWidth: (\d+)", out).group(1)), int(re.search(r"pixelHeight: (\d+)", out).group(1))
    except Exception:
        return None, None

entities, references, sources = [], [], {}
total = 0
for title, slug, depicts, documents, rec, prec, geoloc, caption in ITEMS:
    key = "File:" + title
    v = INFO[key]; m = v["meta"]
    rc = licence_class(m.get("LicenseShortName"))
    if not rc:
        print("SKIP licence", title, m.get("LicenseShortName")); continue
    w, h = v["w"], v["h"]
    tw = 1600 if w >= h else max(1, round(1600 * w / h))
    tw = min(tw, w)
    ext = os.path.splitext(title)[1].lower().replace(".jpeg", ".jpg")
    path = f"{OUT}/{slug}{ext}"
    if ext == ".webp":  # sips cannot write webp: keep a jpg
        ext = ".jpg"; webp = path; path = f"{OUT}/{slug}.jpg"
        if not os.path.exists(path):
            if not os.path.exists(webp):
                url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title.replace(" ", "_")) + f"?width={tw}"
                open(webp, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read())
            subprocess.run(["sips", "-s", "format", "jpeg", "-Z", "1600", webp, "--out", path], capture_output=True)
            os.remove(webp)
    if not os.path.exists(path):
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title.replace(" ", "_")) + f"?width={tw}"
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
                open(path, "wb").write(data); break
            except Exception as e:
                print("retry", title, e); time.sleep(5)
        time.sleep(1.5)
    if not os.path.exists(path): print("FAILED", title); continue
    pw, ph = dims(path)
    if pw and ph and max(pw, ph) > 1600:
        subprocess.run(["sips", "-Z", "1600", path], capture_output=True)  # Commons snaps thumbnails to standard steps (1920); cap the long edge at 1600
        pw, ph = dims(path)
    size = os.path.getsize(path); total += size
    author = clean(m.get("Artist")) or clean(m.get("Credit")) or "unknown"
    lic = m.get("LicenseShortName"); licurl = m.get("LicenseUrl")
    attrib = f"{author}, {lic}, via Wikimedia Commons" if rc in ("bundled-cc-by", "bundled-cc-by-sa") else f"{author} ({lic}), via Wikimedia Commons"
    sid = f"source:commons-{slug}"
    page = v.get("descurl") or ("https://commons.wikimedia.org/wiki/" + urllib.parse.quote(key.replace(" ", "_")))
    mid = f"media:photo-{rec}-{slug}"
    geo = None
    loc = ENTS.get(geoloc) if geoloc else None
    if loc and loc["properties"].get("geolocation"):
        g = loc["properties"]["geolocation"]; geo = {"lat": g["lat"], "lon": g["lon"], "label": loc["title"]}
    c = v.get("coords")
    if c:
        geo = {"lat": c[0]["lat"], "lon": c[0]["lon"], "label": "Commons file coordinates"}
    method = ("Place and date are those the Commons uploader gives in the file title, description and metadata (taken " + rec + "); "
              "not independently geolocated. " + ("Coordinates are those of the named place, not of the camera position. " if geo and not c else "")
              + ("Coordinates are the file's own Commons coordinates. " if c else "")).strip()
    sources[sid] = {
        "id": sid, "template": "source", "title": f"Wikimedia Commons: {title}",
        "properties": {"publisher": "Wikimedia Commons", "publisher_type": "other", "medium": "photo", "published": None,
                       "accessed": TODAY, "url": {"url": page, "label": f"Wikimedia Commons file page (accessed {TODAY})"}, "language": "en"},
        "evidence": [],
    }
    props = {
        "caption": caption, "media_kind": "graphic" if "map" in slug or "document" in slug else "photo",
        "page_url": {"url": page, "label": "Wikimedia Commons file page"}, "platform": "commons", "outlet": "Wikimedia Commons",
        "creator": author, "rights": rc, "licence": lic, "attribution": attrib,
        "recorded": rec, "recorded_precision": prec, "language": "en", "content_warning": "none",
        "location_method": method, "verified_by": "Commons uploader (unverified by a third party)",
        "verification": "single-source", "file_size_bytes": size,
        "file": {"path": f"media/images/{slug}{ext}", "width": pw, "height": ph, "bytes": size, "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(),
                 "original_width": w, "original_height": h, "commons_file": title},
    }
    if licurl: props["licence_url"] = {"url": licurl, "label": lic}
    if geo: props["geolocation"] = geo
    ev = [{"property": ["caption", "media_kind", "page_url", "platform", "outlet", "creator", "rights", "licence", "licence_url", "attribution", "file", "file_size_bytes", "language", "content_warning"], "sources": [sid], "verification": "single-source", "note": "Commons file page metadata"},
          {"property": ["recorded", "recorded_precision", "location_method", "verified_by", "verification"] + (["geolocation"] if geo else []), "sources": [sid], "verification": "single-source", "note": "Date and place as stated by the Commons uploader"}]
    entities.append({"id": mid, "template": "media", "title": caption.split(".")[0][:110], "properties": props, "evidence": ev})
    for t in depicts:
        references.append({"id": f"ref:{slug}-depicts-{t.split(':',1)[1][:40]}", "from": mid, "to": t, "type": "depicts", "date": None, "anchor": None, "sources": [sid], "verification": "single-source", "note": ""})
    for t in documents:
        references.append({"id": f"ref:{slug}-documents-{t.split(':',1)[1][:40]}", "from": mid, "to": t, "type": "documents", "date": None, "anchor": None, "sources": [sid], "verification": "single-source",
                           "note": ("Photograph of the building after the protests; it bears on the dispute over whether the Parliament building survived." if t.startswith("claim:") else "")})
    references.append({"id": f"ref:{slug}-published-in", "from": mid, "to": sid, "type": "published_in", "date": None, "anchor": None, "sources": [sid], "verification": "single-source", "note": ""})
    print("ok", slug, size // 1000, "KB", pw, ph)
part = {"topic": "media-images", "entities": list(sources.values()) + entities, "references": references}
json.dump(part, open(f"{HERE}/parts/media-images.json", "w"), indent=1, ensure_ascii=False)
print(len(entities), "images,", total / 1e6, "MB")
