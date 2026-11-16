"""Clock, offset and annotation parsing for the map's placemarks."""
import re
from datetime import datetime, timedelta, timezone

PDT = timezone(timedelta(hours=-7))          # Las Vegas on 1 Oct 2017 is on daylight time
DAY0 = datetime(2017, 10, 1, 0, 0, 0, tzinfo=PDT)
T2200 = datetime(2017, 10, 1, 22, 0, 0, tzinfo=PDT)

def to_dt(h, m, s, date=(2017, 10, 1)):
    return datetime(*date, h, m, s, tzinfo=PDT)

def iso(dt):
    return dt.isoformat(timespec="seconds") if dt else None

def secs_of(dt):
    return (dt - DAY0).total_seconds()

def clock_to_dt(h, m, s):
    """Annotation clocks carry no AM/PM: 6-11 are PM of 1 Oct, 12 and 1-5 are after midnight."""
    if 6 <= h <= 11:
        return to_dt(h + 12, m, s)
    if h == 12:
        return to_dt(0, m, s, (2017, 10, 2))
    return to_dt(h, m, s, (2017, 10, 2))

def parse_offset(tok):
    """':04' -> 4, '1:21' -> 81, '1:17:23' -> 4643"""
    tok = tok.strip()
    parts = tok.split(":")
    if parts[0] == "":
        parts = parts[1:]
    nums = [int(x) if x else 0 for x in parts]
    total = 0
    for n in nums:
        total = total * 60 + n
    return total

# --- the title: "<date> <time> [AM|PM] - <volleys> - <label> [*]" --------------------------------
DATE_RE = re.compile(r"^\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*")
TIME_RE = re.compile(r"^(~)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\b\s*", re.I)
WINDOW_RE = re.compile(r"(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)", re.I)
VOLLEY_SPEC_RE = re.compile(
    r"^[-–—\s]*((?:1st Shots?|Single Gunshots?|\d+(?:th|st|nd|rd)?(?:\s*(?:,|&|Thru|thru|and)\s*\d+(?:th|st|nd|rd)?)*(?:\s*&\s*\d+)?))\s*(?=[-–—])")

def parse_title(name, kind):
    """Return dict: date, clock (datetime|None), precision, approx, volley_spec, label, starred, window"""
    s = name.replace("\n", " ")
    res = {"starred": s.rstrip().endswith("*") or " *" in s[-3:], "approx": False, "precision": None,
           "clock": None, "date": None, "volley_spec": None, "window": None, "date_inconsistent": False}
    m = DATE_RE.match(s)
    rest = s
    if m:
        mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        res["date"] = (y, mo, d)
        rest = s[m.end():]
        t = TIME_RE.match(rest)
        if t:
            approx, h, mi, se, ap = t.group(1), int(t.group(2)), int(t.group(3)), t.group(4), t.group(5)
            res["approx"] = bool(approx)
            res["precision"] = "second" if se else "minute"
            se = int(se) if se else 0
            if ap:
                ap = ap.upper()
                if ap == "PM" and h != 12: h += 12
                if ap == "AM" and h == 12: h = 0
            else:
                # no AM/PM written: the event is the evening of the 1st
                if 6 <= h <= 11: h += 12
            res["clock"] = datetime(y, mo, d, h, mi, se, tzinfo=PDT)
            rest = rest[t.end():]
        else:
            res["precision"] = "day"
    else:
        res["precision"] = None
    w = WINDOW_RE.search(s)
    if w:
        def mk(h, m_, ap, day):
            h = int(h); ap = ap.upper()
            if ap == "PM" and h != 12: h += 12
            if ap == "AM" and h == 12: h = 0
            return h, int(m_)
        h1, m1 = mk(w.group(1), w.group(2), w.group(3), 1)
        h2, m2 = mk(w.group(4), w.group(5), w.group(6), 1)
        start = to_dt(h1, m1, 0, (2017, 10, 1) if h1 >= 12 else (2017, 10, 2))
        end = to_dt(h2, m2, 0, (2017, 10, 2))
        res["window"] = (start, end)
    v = VOLLEY_SPEC_RE.match(rest)
    if v:
        res["volley_spec"] = re.sub(r"\s+", " ", v.group(1)).strip()
        rest = rest[v.end():]
    label = re.sub(r"^[-–—\s]+", "", rest)
    label = re.sub(r"\s*\*+\s*$", "", label).strip()
    res["label_raw"] = label
    return res

# --- annotations in the description -----------------------------------------------------------
ANN_SPLIT = re.compile(r"(?<=:\d{2})(?=\d{1,2}[:;]\d{2}[:;]\d{2}\s)")
ANN_RE = re.compile(r"^\s*(\d{1,2})[:;](\d{2})[:;](\d{2})\s+(.*?)\s*((?:\d+:)?\d{0,2}:\d{2})?\s*$")
ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8,
       "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12}
QUAL_RE = re.compile(r"\(([^)]*(?:sec|in|of|last)[^)]*)\)", re.I)

def classify(label):
    l = label.lower()
    m = re.search(r"(\d+)(?:st|nd|rd|th)\s+volley", l)
    if m: return "volley", int(m.group(1))
    m = re.search(r"\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+volley", l)
    if m: return "volley", ORD[m.group(1)]
    if re.search(r"single\s*(gun)?\s*shot", l): return "single-shot", None
    if re.search(r"first\s+shots?", l): return "first-shots", None
    if re.search(r"down[\s-]*the[\s-]*hall", l): return "corridor-shots", None
    if "ricochet" in l: return "ricochet", None
    if "close bullet" in l: return "bullet-pass", None
    return "other", None

def parse_annotations(desc_text):
    out = []
    for line in desc_text.split("\n"):
        line = line.replace(" ", " ")
        if not re.search(r"\d{1,2}[:;]\d{2}[:;]\d{2}\s", line):
            continue
        for piece in ANN_SPLIT.split(line):
            m = ANN_RE.match(piece)
            if not m:
                continue
            h, mi, se, label, off = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4).strip(), m.group(5)
            if not label or re.match(r"https?:", label):
                continue
            kind, n = classify(label)
            q = QUAL_RE.search(label)
            out.append({
                "clock": clock_to_dt(h, mi, se), "label": re.sub(r"\s+", " ", label),
                "offset_s": parse_offset(off) if off else None,
                "type": kind, "volley": n, "qualifier": q.group(1).strip() if q else None,
            })
    return out
