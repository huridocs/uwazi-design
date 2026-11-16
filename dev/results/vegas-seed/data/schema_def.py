"""Templates, relationship types and thesauri for the Vegas seed (Nepal's file shapes).
Template ids are bare here; the build adds the `vegas_` prefix, as Nepal's build adds `nepal_`."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def P(tpl, name, label, type_, **kw):
    d = {"id": f"{tpl}:{name}", "name": name, "label": label, "type": type_}
    d.update({k: v for k, v in kw.items() if v is not None})
    return d

def common(tpl):
    return [P(tpl, "title", "Title", "text"), P(tpl, "creationDate", "Date added", "date"), P(tpl, "editDate", "Date modified", "date")]

T = {}
# --- Recording ---------------------------------------------------------------------------------------
t = "recording"
T[t] = {"id": t, "name": "Recording", "color": "#4F6F8F", "isDefault": True, "commonProperties": common(t), "properties": [
    P(t, "map_label", "Label on the map", "text", showInCard=True),
    P(t, "media_kind", "Kind", "select", content="media_kinds", required=True, filter=True, defaultfilter=True, showInCard=True),
    P(t, "embed", "Embedded media", "media"),
    P(t, "more_links", "More links", "markdown"),
    P(t, "platform", "Platform", "select", content="platforms", filter=True),
    P(t, "provenance", "Provenance", "select", content="provenance", filter=True),
    P(t, "release_batch", "Release batch", "text", filter=True),
    P(t, "clock_start", "Clock at start", "date", prioritySorting=True, showInCard=True, filter=True, defaultfilter=True),
    P(t, "clock_end", "Clock at end", "date"),
    P(t, "clock_precision", "Time precision", "select", content="time_precision"),
    P(t, "clock_start_title", "Start clock in the map title", "date"),
    P(t, "clock_start_implied", "Start clock implied by the annotations", "date"),
    P(t, "clock_start_basis", "Start clock taken from", "select", content="clock_basis"),
    P(t, "clock_note", "Note on the clock", "text"),
    P(t, "known_clock_error_seconds", "Camera clock ahead of real time, seconds", "numeric"),
    P(t, "sync_offset_seconds", "Start, seconds after 22:00:00", "numeric", filter=True),
    P(t, "sync_confidence", "Sync confidence", "select", content="sync_confidence", filter=True, defaultfilter=True),
    P(t, "sync_anchor_count", "Time anchors", "numeric"),
    P(t, "sync_spread_seconds", "Spread of the implied start, seconds", "numeric"),
    P(t, "sync_residual_seconds", "Median offset from the other recordings, seconds", "numeric"),
    P(t, "sync_flags", "Sync flags", "multiselect", content="sync_flags", filter=True),
    P(t, "duration_seconds", "Duration, seconds", "numeric"),
    P(t, "call_number", "Call number", "numeric"),
    P(t, "compilation_offset_seconds", "Offset in the compilation, seconds", "numeric"),
    P(t, "call_category", "Call category", "select", content="call_categories", filter=True, defaultfilter=True, showInCard=True),
    P(t, "audio_url", "Audio file (Internet Archive)", "link"),
    P(t, "audio_basis", "Audio file found by", "select", content="audio_basis", filter=True),
    P(t, "camera_position", "Camera position", "geolocation"),
    P(t, "position_basis", "Position taken from", "select", content="position_basis"),
    P(t, "camera_path", "Camera path (GeoJSON line)", "text"),
    P(t, "camera_bearing_degrees", "Camera bearing, degrees", "numeric"),
    P(t, "bearing_basis", "Bearing taken from", "select", content="position_basis"),
    P(t, "volleys_covered", "Volleys covered", "multiselect", content="volleys", filter=True, defaultfilter=True),
    P(t, "annotation_count", "Annotations on the map", "numeric"),
    P(t, "availability", "Availability", "select", content="availability", filter=True),
    P(t, "availability_checked", "Availability checked", "date"),
    P(t, "content_warning", "Content warning", "select", content="content_warnings", required=True, filter=True, defaultfilter=True),
    P(t, "verification", "Verification", "select", content="verification_status", filter=True),
    P(t, "captures", "Captures", "relationship", content="moment", relationType="captures", showInCard=True),
    P(t, "recorded_at", "Recorded at", "relationship", content="place", relationType="recorded_at"),
    P(t, "derived_from", "Part of", "relationship", content="recording", relationType="derived_from"),
    P(t, "synced_by", "Synced by", "relationship", content="source", relationType="synced_by"),
    P(t, "geolocated_by", "Positioned by", "relationship", content="source", relationType="geolocated_by"),
    P(t, "published_in", "Published in", "relationship", content="source", relationType="published_in"),
]}
# --- Moment ------------------------------------------------------------------------------------------
t = "moment"
T[t] = {"id": t, "name": "Moment", "color": "#B5483A", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "label", "What happened", "text", showInCard=True),
    P(t, "moment_type", "Type", "select", content="moment_types", required=True, filter=True, defaultfilter=True, showInCard=True),
    P(t, "clock_start", "Clock at start", "date", required=True, prioritySorting=True, showInCard=True, filter=True, defaultfilter=True),
    P(t, "clock_end", "Clock at end", "date"),
    P(t, "precision", "Time precision", "select", content="time_precision"),
    P(t, "duration_seconds", "Duration, seconds", "numeric"),
    P(t, "interval_from_previous_seconds", "Seconds since the previous volley", "numeric"),
    P(t, "shot_count", "Shots", "numeric"),
    P(t, "cadence_rounds_per_second", "Rounds per second", "numeric"),
    P(t, "witness_count", "Recordings that annotate it", "numeric", filter=True),
    P(t, "spread_seconds", "Spread across recordings, seconds", "numeric"),
    P(t, "time_basis", "Time taken from", "select", content="time_basis", filter=True),
    P(t, "verification", "Verification", "select", content="verification_status", showInCard=True, filter=True),
    P(t, "fired_from", "Fired from", "relationship", content="place", relationType="fired_from"),
    P(t, "occurred_at", "Occurred at", "relationship", content="place", relationType="occurred_at"),
    P(t, "followed_by", "Followed by", "relationship", content="moment", relationType="followed_by"),
    P(t, "part_of", "Part of", "relationship", content="moment", relationType="part_of"),
]}
# --- Place -------------------------------------------------------------------------------------------
t = "place"
T[t] = {"id": t, "name": "Place", "color": "#5E7F5A", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "place_type", "Type", "select", content="place_types", required=True, filter=True, defaultfilter=True, showInCard=True),
    P(t, "geolocation", "Location", "geolocation", showInCard=True),
    P(t, "footprint", "Footprint (GeoJSON)", "text"),
    P(t, "description", "Description", "markdown", fullWidth=True),
    P(t, "coordinate_basis", "Position taken from", "select", content="position_basis"),
]}
# --- Source ------------------------------------------------------------------------------------------
t = "source"
T[t] = {"id": t, "name": "Source", "color": "#8A6E3B", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "publisher", "Publisher", "text", showInCard=True, filter=True),
    P(t, "publisher_type", "Publisher type", "select", content="publisher_types", filter=True, defaultfilter=True),
    P(t, "published", "Published", "date", showInCard=True),
    P(t, "accessed", "Accessed", "date"),
    P(t, "url", "Address", "link"),
    P(t, "licence", "Licence", "text"),
    P(t, "contact", "Contact", "text"),
    P(t, "pages", "Pages", "numeric"),
    P(t, "language", "Language", "text"),
    P(t, "read_status", "How it was read", "select", content="read_status", required=True, filter=True, defaultfilter=True, showInCard=True),
    P(t, "documents", "Documents", "relationship", content="", relationType="documents"),
    P(t, "supports", "Supports", "relationship", content="claim", relationType="supports"),
    P(t, "disputes", "Disputes", "relationship", content="claim", relationType="disputes"),
]}
# --- Claim -------------------------------------------------------------------------------------------
t = "claim"
T[t] = {"id": t, "name": "Claim", "color": "#7A4E8A", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "statement", "Statement", "markdown", required=True, fullWidth=True, showInCard=True),
    P(t, "claim_type", "Type", "select", content="claim_types", filter=True, defaultfilter=True),
    P(t, "figure", "Figure", "numeric"),
    P(t, "unit", "Unit", "text"),
    P(t, "qualifier", "Qualifier", "select", content="figure_qualifiers"),
    P(t, "as_of", "As of", "date", showInCard=True, filter=True),
    P(t, "as_of_basis", "As of taken from", "select", content="as_of_bases"),
    P(t, "scope", "Scope", "text"),
    P(t, "verification_status", "Verification", "select", content="verification_status", showInCard=True, filter=True, defaultfilter=True),
    P(t, "verification_note", "Verification note", "markdown"),
    P(t, "supersedes", "Replaces", "relationship", content="claim", relationType="supersedes"),
    P(t, "contradicts", "Contradicts", "relationship", content="claim", relationType="contradicts"),
]}
# --- Official finding --------------------------------------------------------------------------------
t = "finding"
T[t] = {"id": t, "name": "Official finding", "color": "#3F6F8F", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "text", "Finding", "markdown", required=True, fullWidth=True, showInCard=True),
    P(t, "finding_type", "Type", "select", content="finding_types", filter=True, defaultfilter=True),
    P(t, "clock_time", "Clock time", "date", showInCard=True, prioritySorting=True),
    P(t, "precision", "Time precision", "select", content="time_precision"),
    P(t, "page", "Page", "numeric"),
    P(t, "verification", "Verification", "select", content="verification_status", filter=True),
    P(t, "issued_by", "Issued by", "relationship", content="organisation", relationType="issued_by"),
    P(t, "documents", "Documents", "relationship", content="moment", relationType="documents"),
]}
# --- Organisation ------------------------------------------------------------------------------------
t = "organisation"
T[t] = {"id": t, "name": "Organisation", "color": "#6B6B6B", "isDefault": False, "commonProperties": common(t), "properties": [
    P(t, "org_type", "Type", "select", content="org_types", filter=True, defaultfilter=True, showInCard=True),
    P(t, "website", "Website", "link"),
]}
TEMPLATES = list(T.values())

def rt(id_, label, frm, to, desc, anchor_on_media=False, anchor_on_source=False, dated=False):
    return {"id": id_, "label": label, "from": frm, "to": to, "description": desc,
            "anchorOnSource": anchor_on_source, "anchorOnMedia": anchor_on_media, "datedReference": dated}

RELTYPES = [
    rt("captures", "captures", ["recording"], ["moment"], "The recording contains the moment. The reference carries the offset in the recording.", anchor_on_media=True),
    rt("recorded_at", "recorded at", ["recording"], ["place"], "Camera position inside the place's footprint."),
    rt("depicts", "depicts", ["recording"], ["place"], "A place is visible in the recording."),
    rt("derived_from", "part of", ["recording"], ["recording"], "A call segment inside a compilation, or a re-upload of another recording.", anchor_on_media=True),
    rt("synced_with", "synced with", ["recording"], ["recording"], "Pair checked by hand, with the measured offset difference. Not created for every overlapping pair."),
    rt("occurred_at", "occurred at", ["moment"], ["place"], "Where the moment was heard or took place."),
    rt("fired_from", "fired from", ["moment"], ["place"], "Where the gunfire came from, as the official reports state it."),
    rt("part_of", "part of", ["moment"], ["moment"], "A single shot within a volley."),
    rt("followed_by", "followed by", ["moment"], ["moment"], "Order of the volleys, with the interval between starts."),
    rt("documents", "documents", ["source", "finding"], ["moment", "claim", "finding"], "The source or finding records the moment or the claim.", anchor_on_source=True),
    rt("issued_by", "issued by", ["finding"], ["organisation"], "The organisation that issued the finding."),
    rt("supports", "supports", ["source"], ["claim"], "The source backs the claim.", anchor_on_source=True),
    rt("disputes", "disputes", ["source"], ["claim"], "The source contradicts the claim.", anchor_on_source=True),
    rt("contradicts", "contradicts", ["claim"], ["claim"], "Two claims that cannot both hold."),
    rt("supersedes", "replaces", ["claim"], ["claim"], "A later count or time replaces an earlier one; both stay on record with their dates."),
    rt("geolocated_by", "positioned by", ["recording"], ["source"], "The source that gives the camera position."),
    rt("synced_by", "synced by", ["recording"], ["source"], "The source that gives the clock time and offsets."),
    rt("published_in", "published in", ["recording"], ["source"], "Where the recording is hosted."),
]

def L(*pairs):
    return [{"id": a, "label": b} for a, b in pairs]

THESAURI = {
    "time_precision": L(("second", "Second"), ("minute", "Minute"), ("day", "Day")),
    "verification_status": L(("confirmed", "Confirmed by two or more recordings or publishers"), ("single-source", "Single source"), ("disputed", "Disputed")),
    "media_kinds": L(("phone-video", "Phone video"), ("vehicle-video", "Video from a vehicle"), ("body-camera", "Body camera"), ("cctv", "Surveillance camera"),
                     ("aerial", "Aerial"), ("911-call", "911 call"), ("911-compilation", "911 call compilation")),
    "platforms": L(("youtube", "YouTube"), ("facebook", "Facebook"), ("twitter", "X (Twitter)"), ("archive-org", "Internet Archive"), ("news-site", "News site"), ("none", "No link")),
    "provenance": L(("official-release-reupload", "Re-upload of an official release"), ("unknown", "Not recorded")),
    "clock_basis": L(("annotations", "Median of the annotated times"), ("title", "Time in the map title"), ("title-window", "Time window in the map title"), ("none", "None")),
    "sync_confidence": L(("anchored-consistent", "Three or more anchors, consistent"), ("anchored-drift", "Anchors disagree by more than 2 s"), ("one-or-two", "One or two anchors"),
                         ("title-only", "Title time only"), ("none", "No clock")),
    "sync_flags": L(("title-mismatch", "Title time differs from the annotations by more than 2 s"), ("drift", "Anchors in the recording disagree by more than 2 s"),
                    ("outlier", "A volley time is more than 2 s from the median"), ("qualified-annotation", "An annotation is marked partial"),
                    ("date-inconsistent", "Title date does not fit the volleys"), ("clock-note", "The map notes a camera clock error"), ("no-clock", "No clock time")),
    "position_basis": L(("map-estimate", "Map position"), ("map-estimate-flagged", "Map position marked as an estimate"), ("start-of-path", "First point of the camera path"),
                        ("generalised", "Map position generalised to about 100 m"), ("derived", "Computed")),
    "volleys": L(*[(str(n), f"Volley {n}") for n in range(1, 13)]),
    "availability": L(("available", "Available"), ("unavailable", "Did not load when checked"), ("not-checked", "Not checked")),
    "content_warnings": L(("graphic", "Graphic"), ("distressing", "Distressing")),
    "moment_types": L(("volley", "Volley"), ("first-shots", "First shots"), ("single-shot", "Single shot"), ("corridor-shots", "Shots in the hotel corridor"),
                      ("ricochet", "Ricochet"), ("bullet-pass", "Bullet passing"), ("response", "Response"), ("breach", "Breach"), ("last-shots", "Last shots")),
    "time_basis": L(("map-annotation", "Map annotations"), ("official-report-summary", "Official report, from a summary"), ("press-analysis", "Press analysis")),
    "place_types": L(("venue-area", "Venue area"), ("venue-feature", "Venue feature"), ("hotel-casino", "Hotel or casino"), ("hospital", "Hospital"),
                     ("public-place", "Public place"), ("memorial", "Memorial"), ("business", "Business"), ("vehicle-or-structure", "Vehicle or temporary structure")),
    "publisher_types": L(("police", "Police"), ("fire", "Fire and rescue"), ("coroner", "Coroner"), ("federal-agency", "Federal agency"), ("news-media", "News media"),
                         ("academic", "Academic"), ("encyclopedia", "Encyclopedia"), ("archive", "Archive"), ("community-map", "Community map")),
    "claim_types": L(("count", "Count"), ("time", "Time"), ("sequence", "Sequence")),
    "figure_qualifiers": L(("exact", "Exact"), ("more-than", "More than"), ("at-least", "At least"), ("about", "About")),
    "as_of_bases": L(("official-count", "Date of the official count"), ("report-date", "Date of the report"), ("publication-date", "Date of publication"), ("unknown", "Not known")),
    "finding_types": L(("timeline-entry", "Timeline entry"), ("count", "Count"), ("conclusion", "Conclusion")),
    "org_types": L(("police", "Police"), ("fire", "Fire and rescue"), ("coroner", "Coroner"), ("federal-agency", "Federal agency"), ("company", "Company"),
                   ("news", "News organisation"), ("academic", "Academic"), ("community", "Community project"), ("archive", "Archive")),
    "call_categories": L(*[(i, l) for i, l in __import__("call_categories").CATEGORIES]),
    "audio_basis": L(("map-link", "Linked on the map"), ("matched-by-number", "Matched by call number to the item's file list")),
    "read_status": L(("read", "Read at source"), ("summary-only", "From a summary, not read at source"), ("not-read", "Not read (not yet downloaded)")),
}

def write(base):
    os.makedirs(os.path.join(base, "schema"), exist_ok=True)
    json.dump(TEMPLATES, open(os.path.join(base, "schema", "templates.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(RELTYPES, open(os.path.join(base, "schema", "relationTypes.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(THESAURI, open(os.path.join(base, "schema", "thesauri.json"), "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__":
    write(os.path.dirname(os.path.abspath(__file__)))
