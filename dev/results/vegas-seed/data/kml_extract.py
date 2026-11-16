"""Stage 1: read the map's KML (victims folder already removed) into plain records.

Run from anywhere: python3 kml_extract.py   (writes extract.json)
Nothing here is published: extract.json holds raw map text and is an intermediate.
"""
import xml.etree.ElementTree as ET, re, html, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
KML = os.path.join(HERE, "..", "raw", "map-without-victims-folder.kml")
NS = {"k": "http://www.opengis.net/kml/2.2"}

FOLDER_KIND = {
    "Videos taken on foot": "phone-video",
    "Videos taken from inside vehicles": "vehicle-video",
    "Videos Taken by CCTV": "cctv",
    "Videos Taken from Air": "aerial",
    "LVMPD Body Worn Cameras": "body-camera",
    "Audio (911 calls)": "911-call",
    "Places of Interest": "place-of-interest",
    "Las Vegas Village - Venue Features": "venue-feature",
}

def txt(p, t):
    e = p.find("k:" + t, NS)
    return (e.text or "") if e is not None else ""

def clean_html(desc):
    t = re.sub(r"<br\s*/?>", "\n", desc)
    t = re.sub(r"<a href[^>]*><img[^>]*></a>", "", t)
    t = re.sub(r"<img[^>]*>", "", t)
    t = re.sub(r"<[^>]+>", "", t)
    return html.unescape(t).replace("\xa0", " ")

def geometry(p):
    for g in p:
        tag = g.tag.split("}")[1]
        if tag in ("Point", "LineString", "Polygon"):
            if tag == "Polygon":
                c = g.find(".//k:outerBoundaryIs//k:coordinates", NS)
            else:
                c = g.find(".//k:coordinates", NS)
            pts = [tuple(float(x) for x in t.split(",")[:2]) for t in c.text.split()]
            return tag, pts
    return None, []

def main():
    doc = ET.parse(KML).getroot().find("k:Document", NS)
    out = {"map_name": txt(doc, "name"), "map_description": txt(doc, "description"), "items": []}
    for f in doc.findall("k:Folder", NS):
        fn = txt(f, "name")
        assert fn != "Victims", "the victims folder must not be in the working copy"
        for i, p in enumerate(f.findall("k:Placemark", NS)):
            gt, pts = geometry(p)
            raw_desc = txt(p, "description")
            out["items"].append({
                "folder": fn, "kind": FOLDER_KIND[fn], "index": i,
                "name": re.sub(r"[ \t]+", " ", txt(p, "name").replace("\xa0", " ")).strip(),
                "desc_text": clean_html(raw_desc),
                "desc_raw": raw_desc,
                "geom": gt, "coords": pts,
            })
    json.dump(out, open(os.path.join(HERE, "extract.json"), "w"), ensure_ascii=False)
    print(len(out["items"]), "placemarks")

if __name__ == "__main__":
    main()
