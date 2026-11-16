"""Neutral labels for recordings. The map's titles are the uploaders' titles: many name a private
videographer or an eyewitness, describe a person who was hit, carry the gunman's name, or repeat a
conspiracy claim. Rules, in order:
  1. a manual override (OVERRIDE, keyed by folder kind and index in the folder) wins;
  2. otherwise the generic clean-up below;
  3. the validator then fails the build on any denylisted name, handle or word.
No label is carried for 911 calls at all."""
import re

BOILER = [r"Las Vegas Mass Shooting", r"Las Vegas Shooting", r"Las Vegas Shooter", r"Las Vegas shooting", r"Las vegas shooting",
          r"Vegas Mass Shooting", r"Vegas Shooting", r"Vegasshooting", r"VegasShooting", r"#Vegasshooting", r"LV Shooting"]

def generic(label):
    s = label
    for b in BOILER:
        s = re.sub(r"^\s*" + b + r"\s*[-–—:]*\s*", "", s)
    s = re.sub(r"\s*[-–—]{1,2}\s*$", "", s)
    s = re.sub(r"\s+", " ", s).strip(" -–—")
    return s

def release_label(raw):
    """LVMPD release items: 'Batch 6 Body Cam Video #8', 'Release #10 (Body Worn Camera 3 of 6)'."""
    m = re.search(r"(?:Batch|Release)\s*#?\s*(\d+)", raw, re.I)
    n = re.search(r"#\s*0*(\d+)\s*\)?\s*$|,\s*#(\d+)|Video\s*#(\d+)|Cam\w*\s*#(\d+)|\(#0*(\d+)\)", raw)
    part = re.search(r"\((\d+) of (\d+)\)", raw)
    out = "LVMPD release" + (f" {m.group(1)}" if m else "")
    if n:
        num = next(g for g in n.groups() if g)
        out += f", item {num}"
    if part:
        out += f", part {part.group(1)} of {part.group(2)}"
    return out

# (kind, index) -> label.  Each entry replaces a title that names a private person, describes a person
# who was hit or helped, repeats an unsupported claim, or carries the gunman's name.
OVERRIDE = {
 ("vehicle-video", 0): "From a car along Mandalay Bay Road",
 ("vehicle-video", 3): "Taxi dash video",
 ("vehicle-video", 6): "Aftermath, rescue truck",
 ("vehicle-video", 11): "From a taxi on the way to a hospital",
 ("phone-video", 3): "Phone video, venue",
 ("phone-video", 17): "Closest video to the hotel suite",
 ("phone-video", 21): "Aftermath, venue",
 ("phone-video", 23): "Centre of the venue",
 ("phone-video", 26): "East venue, towards a hotel",
 ("phone-video", 27): "From a high floor of the hotel, above the suite",
 ("phone-video", 34): "Stage left, middle of the catwalk",
 ("phone-video", 35): "From the 16th floor, opposite end of the hotel",
 ("phone-video", 44): "Arco AM/PM, Tropicana and Las Vegas Blvd.",
 ("phone-video", 49): "Behind the stage",
 ("phone-video", 53): "Behind the stage catwalk, first shots",
 ("phone-video", 55): "Under a VIP tent, west venue",
 ("phone-video", 57): "From Tropicana, front of hotel",
 ("phone-video", 59): "West side of venue, close to the catwalk, first shots",
 ("phone-video", 70): "East side of venue",
 ("phone-video", 72): "Back bleacher area, east side",
 ("phone-video", 79): "Luxor, pointing out gunfire locations",
 ("phone-video", 84): "Phone video",
 ("phone-video", 93): "Live stream inside Luxor (3 of 3)",
 ("phone-video", 94): "Live stream at Mandalay Bay (part 1)",
 ("phone-video", 95): "Live stream at Mandalay Bay (part 2)",
 ("phone-video", 96): "Live stream from a rooftop",
 ("phone-video", 105): "Escaping the venue",
 ("phone-video", 106): "West venue",
 ("phone-video", 108): "Close left of centre stage, first shots",
 ("phone-video", 109): "Against a wall near Las Vegas Blvd.",
 ("phone-video", 110): "Behind a wall along Las Vegas Blvd.",
 ("phone-video", 113): "East venue near the catwalk, first shots",
 ("phone-video", 116): "West venue, near the stage and road box",
 ("phone-video", 118): "Performance before the shooting",
 ("phone-video", 122): "Inside venue, pocket recording",
 ("phone-video", 123): "Morning after, Bellagio",
 ("phone-video", 125): "Eyewitness interview in a parking garage",
 ("phone-video", 126): "Memorial crosses, one year later",
 ("phone-video", 130): "Mobile footage from Mandalay Bay",
 ("phone-video", 4): "North venue",
 ("body-camera", 24): "LVMPD body camera after the breach, enhanced copy",
}
CALL_LABEL = None   # no label for 911 calls

OVERRIDE.update({
 ("phone-video", 10): "Phone video",
 ("phone-video", 19): "Voices during a volley",
 ("phone-video", 37): "Desert Oasis Motel",
 ("phone-video", 56): "First shots",
 ("phone-video", 99): "VIP seats",
 ("phone-video", 114): "East venue, first volley",
 ("phone-video", 121): "Bellagio, night of the shooting",
 ("phone-video", 127): "Near the front, west venue",
 ("phone-video", 128): "West venue towards Giles Road",
 ("phone-video", 129): "Inside the venue",
 ("phone-video", 131): "Luxor parking lot",
 ("cctv", 0): "Security camera, parking lot",
 ("body-camera", 28): "Officer body-worn camera",
 ("aerial", 3): "Aerial, aftermath, with time stamp",
})

def sentence_case(s):
    letters = [c for c in s if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.6:
        s = s.lower()
        s = s[:1].upper() + s[1:]
    return s
