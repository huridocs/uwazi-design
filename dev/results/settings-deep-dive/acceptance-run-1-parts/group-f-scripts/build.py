import json,glob,re
R={}
def load(f,tag):
    d=json.load(open(f))
    R.setdefault(tag,{})
    for r in d:
        # keep last record per id
        R[tag][r["id"]]=r
load("results-lng.json","LNG")
load("results-trn.json","TRN"); load("results-trn2.json","TRN")
load("results-ixe.json","IXE")
load("results-pxe.json","PXE")
load("results-x06.json","X06")
SH="acceptance-run-1-shots/"
def row(page,id,res=None,ev=None,shot=None,key=None):
    r=R[page].get(key or id)
    if r is None: raise Exception(f"{page} missing {key or id}")
    res=res or r["res"]; ev=ev or r["ev"]; shot=shot if shot is not None else r["shot"]
    return dict(id=id,res=res,ev=ev,shot=shot)
def esc(s): return s.replace("|","\\|")
out=[]
pages={}

# ---- LNG
L=[]
L.append(row("LNG","LNG-01",ev='Title "Languages" ok. No card header "Active languages" (the phrase appears only inside the intro sentence). Rows read "English English [Default]", "Spanish Español" (native name instead of "<English name> (<key>)", no key shown, e.g. no "Spanish (es)"). Columns Language, Translations (progress bar), Default (check or "Set" button), plus row action icons; spec says no separate Default/Reset/Uninstall columns. Clicking the "Language" header does not change the order (list is in seed order English, Spanish, French, Arabic, Portuguese, not sorted by name; no sort toggle). One "Default" badge on English (the Default column adds a second marker). Footer button reads "Install language", spec "Install Language(s)"'))
L.append(row("LNG","LNG-02"))
for i in ["03","04","05","06","07","08","09"]: L.append(row("LNG","LNG-"+i))
L.append(row("LNG","LNG-10")); L[-1]["ev"]=L[-1]["ev"]+" Dashboard LANGUAGES stat stays 5 after the install (seed has 5 languages; expected 6)."
L.append(row("LNG","LNG-11",ev="Confirm dialog (\"Change default language\") reads \"Make Spanish the default language? It is shown to users who haven't chosen a language.\" with Cancel and Make default: it does not name the effect on later installs or on the untranslated reference (spec). Cancel left English as the only Default; Make default moved the badge to Spanish. Beacon showed \"Spanish set as default language\" (spec \"Default language change success\"); Activity log empty (spec: one entry).")); L.append(row("LNG","LNG-12")); L.append(row("LNG","LNG-13"))
L[-1]["ev"]+=" Reset button enabled with an empty input (Reset only logs; no CONFIRM gate on Reset)."
L.append(row("LNG","LNG-14"))
L.append(row("LNG","LNG-15",ev='Could not run the flow: the Translations editor does not persist edits (see TRN-15), so there is no edited System key or template-context key to compare after Reset. Reset in Languages (see LNG-13) only logs "<Language> translations reset" and changes nothing; no "Language reset success" Beacon entry and no Activity log entry (log:false). Expect (edited key returns to predefined text, template edit stays) cannot be observed.'))
L.append(row("LNG","LNG-16"))
L[-1]["ev"]+=" Translations editor after uninstall still lists the column (French in headers: TERM, ENGLISH Source, SPANISH, FRENCH, ARABIC, PORTUGUESE). Dashboard language count not re-checked after uninstall."
L.append(row("LNG","LNG-17"))
L.append(row("LNG","LNG-18")); L[-1]["ev"]+=" (Install, Escape and rail click raised no dialog; note: the installed language is lost after leaving the page, see X-01.)"
L.append(row("LNG","LNG-19"))
L.append(row("LNG","LNG-PO1")); L.append(row("LNG","LNG-PO2"))
L.append(row("LNG","LNG-PO3",res="NOT DRIVEABLE",ev='The Pre needs a header or interface language picker with options EN, ES, FR, AR; no such picker exists in the app header (header controls: Library, Collection, Tools, Notifications, Ask Bert, Settings, Theme). Observed: after installing German and making it default, the Settings rail and page strings were unchanged. The edit-a-System-key step cannot be done (Translations edits are not stored; English column is read-only).',shot=""))
for x in ["X-01","X-04","X-06","X-07","X-08","X-09","X-13"]:
    L.append(row("LNG",x))
L.append(dict(id="X-02, X-03, X-05, X-10, X-11, X-12",res="N/A",ev="Not applicable per the page's Applies line (no form; X-05 replaced by LNG-13/14; no empty list, search or bulk selection).",shot=""))
pages["Languages (LNG)"]=L

# ---- TRN
T=[]
for i in ["01","02","03","04"]: T.append(row("TRN","TRN-"+i))
T.append(dict(id="TRN-05",res="SKIP",ev="Needs M8 (Settings > Templates on the store).",shot=""))
for i in ["06","07","08","09","10","11","12","13","14"]: T.append(row("TRN","TRN-"+i))
T.append(row("TRN","TRN-15")); T.append(row("TRN","TRN-16")); T.append(row("TRN","TRN-17"))
T[-1]["ev"]=T[-1]["ev"].replace("INFO","")
T.append(row("TRN","TRN-18")); T.append(row("TRN","TRN-19")); T.append(row("TRN","TRN-20")); T.append(row("TRN","TRN-21")); T.append(row("TRN","TRN-PO1"))
for x in ["X-01","X-02","X-03","X-04","X-06","X-07","X-08","X-09","X-10","X-13"]:
    T.append(row("TRN",x))
for r in T:
    if r["id"]=="TRN-14": r["ev"]="User Interface editor (6 keys): \"lib\" and \"Lib\" both leave 1 row (case-insensitive); \"Biblioteca\", a value that is not a key, leaves 1 row; \"zzz\" leaves 0 rows with the message \"Nothing matches “zzz”\" and \"Clear search\"; clearing restores all 6 rows. The search row stays at 32px high at the same top (144px) in every state. (Spec says the no-results state; the copy is generic.)"; r["shot"]="TRN-14.png"
    if r["id"]=="X-06": r.update(res="FAIL",ev='Phone 390x844: no horizontal scroll on the list (cards: name, type pill, keys) or the editor (one card per key, languages stacked, Save/Cancel in a fixed footer). But the discard dialog opens as a centered card (358x170 at y=337) with 28px-high buttons ("Keep editing", "Discard"), not a sheet or full screen (reading of "dialogs are sheets or full screen").',shot="X-06-trn-dialog.png")
    if r["id"]=="X-02": r["ev"]="Edit es 'Library' then navigate. Dialog appears for breadcrumb, Back arrow, rail item and data-source switch (stays in editor until chosen), but its copy is \"Discard unsaved changes? Translation edits haven't been saved. Leaving now will discard them.\" with buttons \"Keep editing\" and \"Discard\" (spec: \"Discard changes?\", \"You have unsaved changes. Do you want to continue?\", \"Cancel\", \"Discard changes\"). The editor's own Cancel button leaves with no dialog and silently drops the edit. With no change, no dialog. Mobile chevron and navbar link not separately driven."
    if r["id"]=="TRN-17": r["ev"]=r["ev"].replace("dirty guard per navigation","Dialog copy differs from spec (\"Discard unsaved changes?\", buttons \"Keep editing\"/\"Discard\"); Cancel button in the editor gives no dialog. Dirty guard per navigation")
    if r["id"]=="X-01": r["res"]="FAIL"
    if r["id"]=="X-10": r["res"]="NOT DRIVEABLE"
pages["Translations (TRN)"]=T

# ---- IXE
I=[]
for i in ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","PO1","PO2"]:
    I.append(row("IXE","IXE-"+i))
for x in ["X-01","X-02","X-04"]: I.append(row("IXE",x))
I.append(dict(id="X-06",res="FAIL",ev="Phone 390x844: no horizontal scroll (scrollWidth 390); list rows and the editor are cards and row delete is reachable. The delete dialog is a centered card (358x222 at y=311) with 28px-high buttons (Cancel, Delete), not a sheet or full screen (reading of \"dialogs are sheets or full screen\"). The wizard modal and the suggestions Accept-only row do not exist (IXE-08).",shot="X-06-ixe-dialog.png"))
for x in ["X-07","X-08","X-09"]:
    I.append(row("IXE",x) if x!="X-09" else row("IXE","X-09"))
I.append(row("IXE","X-10",res="PASS",ev='Deleted all 5 extractors: empty state shows title "No extractors yet", the hint "An extractor learns to suggest one property\'s value from document text." and an "Add extractor" action (not the generic "Nothing here yet."). Beacon showed "Extractor deleted". (Label differs from IXE-01\'s "Create Extractor": recorded under IXE-01.)',shot="IXE-01-empty.png"))
I.append(row("IXE","X-12"))
I.append(dict(id="X-03, X-05, X-11, X-13",res="N/A",ev="Not listed in the page's Applies line (X-02 applies to the config modal only; the config is a full page here). For information: Save disabled when clean and enabled after an edit, editor closes on Save, rail click then shows no dialog.",shot=""))
pages["Metadata extraction (IXE)"]=I

# ---- PXE
P=[]
for i in ["01","02","03","04","05","06","07","08","09","10","11","12","13"]:
    P.append(row("PXE","PXE-"+i))
for r in P:
    if r["id"]=="PXE-13": r["ev"]=r["ev"].replace("table paragraph sum NaN","").replace("(list row said","(list row said")+" The list says 1,840 paragraphs for Judgment; the editor header says 754 over 11 documents (neither agrees with the other)."
for x in ["X-01","X-04"]: P.append(row("PXE",x))
P.append(dict(id="X-06",res="PASS",ev=R["X06"]["X-06"]["ev"],shot="PXE-07a.png"))
for x in ["X-07","X-08","X-09","X-10","X-12"]: P.append(row("PXE",x))
P.append(dict(id="X-02, X-03, X-05, X-11, X-13",res="N/A",ev="Not listed in the page's Applies line.",shot=""))
pages["Paragraph extraction (PXE)"]=P

md=["# Group F acceptance results: Languages, Translations, Metadata extraction, Paragraph extraction","",
"Target: playground 73a13827 at http://localhost:1438/. Driven with Playwright (chromium, fresh context per group); scripts in `group-f-scripts/`. Shots in `acceptance-run-1-shots/`.","",
"Notes on method: every context logs one console warning on load (`atomFamily is deprecated`, Jotai); it appears on every page, is a warning and not an error, and is excluded from the per-check console rule. No other console errors or warnings appeared. Dark mode was toggled with `:root.dark` and contrast computed from computed styles (text colour against the first non-transparent ancestor background). `Needs` handling: M1, M2, F1 to F4 checks were driven; the only SKIP is TRN-05 (needs M8). The app has no developer panel, so checks that need a failure switch are NOT DRIVEABLE.",""]
counts={}
fails=[]
for name,rows in pages.items():
    md.append("## "+name); md.append("")
    md.append("| Id | Result | Evidence (saw vs expected) | Shot |"); md.append("|---|---|---|---|")
    c={"PASS":0,"FAIL":0,"NOT DRIVEABLE":0,"SKIP":0,"N/A":0}
    for r in rows:
        res=r["res"]; 
        if res not in c: raise Exception(r)
        c[res]+=1
        shot=("`"+SH+r["shot"]+"`") if r["shot"] else ""
        md.append(f"| {r['id']} | {res} | {esc(r['ev'])} | {shot} |")
        if res=="FAIL": fails.append((name.split("(")[1][:-1],r["id"]))
    md.append("")
    md.append(f"Count: PASS {c['PASS']} / FAIL {c['FAIL']} / NOT DRIVEABLE {c['NOT DRIVEABLE']} / SKIP {c['SKIP']} / N/A {c['N/A']}")
    md.append("")
    counts[name]=c
open("md_body.md","w").write("\n".join(md))
json.dump({"counts":counts,"fails":fails},open("summary.json","w"),indent=1)
print(json.dumps(counts))
print(len(fails))
