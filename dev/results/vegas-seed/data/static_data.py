"""Sources, organisations, claims, findings and official moments carried from the secondary sources read
in phase 1. Every record here that rests on a search summary or a news summary of an official PDF is marked
`read_status: summary-only` or `not-read`, and its evidence note says "from summary, not read at source".
Nothing here names a victim, a bystander, an officer, or the gunman."""

MAP = "source:vegasshootingmap-2026-10-07-google-my-map"
LVMPD_CIR = "source:lvmpd-2018-08-03-criminal-investigative-report"
LVMPD_PRE = "source:lvmpd-2018-01-18-preliminary-investigative-report"
AAR = "source:after-action-report-2018-08-24-1-october"
FBI = "source:fbi-2019-01-bau-report"
NPR = "source:npr-2019-01-29-fbi-analysis-ends-without-clear-motive"
WIKI = "source:wikipedia-2026-10-07-2017-las-vegas-shooting"
VERA = "source:arxiv-2019-05-26-vera-video-event-reconstruction"
FA = "source:goldsmiths-2017-11-15-forensic-architecture-nyt-las-vegas"
CBS_NYT = "source:cbs-news-2017-10-nyt-develops-timeline-of-las-vegas-shooting"
KNPR_NYT = "source:knpr-2017-10-new-york-times-analysis-new-shooting-timeline"
THREAD = "source:threadreader-2017-10-23-nyt-reporter-thread-on-the-timeline"
SUN = "source:las-vegas-sun-2017-12-21-coroner-58-deaths-gunshot"
RJ60 = "source:las-vegas-review-journal-60th-victim"
WT = "source:washington-times-2020-10-01-las-vegas-marks-third-year"
NVIND = "source:nevada-independent-2017-10-sheriff-revises-timeline"
INQ = "source:philadelphia-inquirer-2017-10-13-no-six-minute-gap"
VOA = "source:voa-news-sheriff-gunman-fired-more-than-1100-rounds"
CLICK = "source:clickondetroit-las-vegas-police-release-timeline-of-events"
WMAR = "source:wmar-2018-06-latest-release-of-mass-shooting-materials"
ARCH5 = "source:internet-archive-2018-06-06-lvmpd-batch-5-911-calls"
ARCH7 = "source:internet-archive-2018-06-20-lvmpd-batch-7-911-calls"

ORG = {
    "lvmpd": ("Las Vegas Metropolitan Police Department", "police", "https://www.lvmpd.com/"),
    "clark-county-fire-department": ("Clark County Fire Department", "fire", None),
    "clark-county-coroner": ("Clark County Coroner", "coroner", None),
    "fbi-behavioral-analysis-unit": ("FBI Behavioral Analysis Unit", "federal-agency", "https://www.fbi.gov/"),
    "fema-national-exercise-division": ("FEMA National Exercise Division", "federal-agency", None),
    "mgm-resorts": ("MGM Resorts International", "company", None),
    "the-new-york-times": ("The New York Times", "news", "https://www.nytimes.com/"),
    "forensic-architecture": ("Forensic Architecture (Goldsmiths, University of London)", "academic", None),
    "carnegie-mellon-university": ("Carnegie Mellon University", "academic", "https://vera.cs.cmu.edu/"),
    "internet-archive": ("Internet Archive", "archive", "https://archive.org/"),
    "vegas-map-project-team": ("Vegas Map Project Team (VegasShootingMap.com)", "community", "https://vegasshootingmap.com/"),
}

# id: (title, publisher, publisher_type, url, published, read_status, licence, pages, note)
SOURCES = {
    MAP: ("VegasShootingMap.com (Google My Maps, 'Vegas Shooting Map')", "Vegas Map Project Team", "community-map", "https://vegasshootingmap.com/", None, "read",
          "None stated. The map description says it is 'meant for research purposes'. Used under the project owner's decision of 2026-10-07 that the map is public; the maintainers have not been asked (see README).", None,
          "Contact for corrections and additions: VegasMapProjectTeam@googlegroups.com. KML export downloaded once on 2026-10-07; the Victims folder was removed and never read into this seed."),
    LVMPD_CIR: ("LVMPD Criminal Investigative Report, 1 October Mass Casualty Shooting", "Las Vegas Metropolitan Police Department", "police",
                "https://www.lvmpd.com/home/showpublisheddocument/134/638298568313170000", "2018-08-03", "not-read", None, None,
                "PDF not yet downloaded (the LVMPD server blocks automated requests). Facts below come from Wikipedia's summary and news summaries."),
    LVMPD_PRE: ("LVMPD Preliminary Investigative Report, 1 October Mass Casualty Shooting (FIT report, 81 pages)", "Las Vegas Metropolitan Police Department", "police",
                "https://www.lvmpd.com/en-us/Documents/1_October_FIT_Report_01-18-2018_Footnoted.pdf", "2018-01-18", "not-read", None, 81,
                "PDF not yet downloaded. A mirror exists at workingwithcrowds.com (see README)."),
    AAR: ("1 October After-Action Report", "Clark County Fire Department, LVMPD and FEMA National Exercise Division", "police",
          "https://www.policinginstitute.org/wp-content/uploads/2018/09/1OctoberAfterActionReport.pdf", "2018-08-24", "summary-only", None, 61,
          "61 pages per a Review-Journal summary. Not read at source."),
    FBI: ("FBI Behavioral Analysis Unit report on the 1 October attack (three-page synopsis)", "FBI", "federal-agency", None, "2019-01-29", "not-read", None, 3,
          "No address found in phase 1. Findings come from news coverage (NPR and others)."),
    NPR: ("NPR: FBI analysis of Las Vegas shooting ends without a clear motive identified", "NPR", "news-media",
          "https://www.npr.org/2019/01/29/689760960/fbi-analysis-of-las-vegas-shooting-ends-without-a-clear-motive-identified", "2019-01-29", "summary-only", None, None, "Search-result summary."),
    WIKI: ("Wikipedia: 2017 Las Vegas shooting", "Wikipedia", "encyclopedia", "https://en.wikipedia.org/wiki/2017_Las_Vegas_shooting", None, "read", "CC BY-SA", None,
           "First 100,000 characters read on 2026-10-07. Living page: published date empty, accessed date set."),
    VERA: ("Technical Report of the Video Event Reconstruction and Analysis (VERA) System: Shooter Localization, Models, Interface, and Beyond", "arXiv (Liang, Aronson, Hauptmann, Carnegie Mellon University)",
           "academic", "https://arxiv.org/abs/1905.13313", "2019-05-26", "read", None, None, "Abstract read. Code: github.com/JunweiLiang/VERA_Shooter_Localization. Live system: vera.cs.cmu.edu."),
    FA: ("Goldsmiths: how Forensic Architecture influenced the Las Vegas shooting reports", "Goldsmiths, University of London", "academic", "https://gold.ac.uk/news/forensic-architecture-nyt", "2017-11-15", "read", None, None,
         "Describes the New York Times video-forensics method: eyewitness video, geolocation, landmarks and the moon used to synchronise videos."),
    CBS_NYT: ("CBS News: The New York Times develops timeline of Las Vegas shooting", "CBS News", "news-media", "https://www.cbsnews.com/news/the-new-york-times-develops-timeline-las-vegas-shooting/", None, "summary-only", None, None,
              "Search-result summary; publication date not shown (October 2017)."),
    KNPR_NYT: ("KNPR: New York Times analysis, new shooting timeline", "KNPR", "news-media", "https://knpr.org/knpr/2017-10/new-york-times-analysis-new-shooting-timeline", None, "summary-only", None, None,
               "Search-result summary; October 2017."),
    THREAD: ("NYT reporter's thread on the Las Vegas timeline analysis (Threadreader copy)", "The New York Times (reporter's thread, copied by Threadreader)", "news-media",
             "https://threadreaderapp.com/thread/922568572643155968.html", "2017-10-23", "read", None, None,
             "Read. States 12 main bursts, three intervals over a minute, one burst of about 40 seconds below the gunman's position, six clock sources within a 3-second window. No burst times."),
    SUN: ("Las Vegas Sun: Coroner, 58 deaths during Vegas mass shooting due to gunshot wounds", "Las Vegas Sun", "news-media", "https://m.lasvegassun.com/news/2017/dec/21/coroner-58-deaths-during-vegas-mass-shooting-due-t/", "2017-12-21", "summary-only", None, None,
          "Search-result summary only."),
    RJ60: ("Las Vegas Review-Journal: Las Vegas woman becomes 60th victim of October 2017 mass shooting", "Las Vegas Review-Journal", "news-media", "https://develop.reviewjournal.com/?p=1948799", None, "summary-only", None, None,
           "Search-result summary only; publication date not shown."),
    WT: ("Associated Press (via The Washington Times): Las Vegas marks third year since deadliest US mass shooting", "Associated Press", "news-media", "https://www.washingtontimes.com/news/2020/oct/1/las-vegas-marks-3rd-year-since-deadliest-us-mass-s/", "2020-10-01", "summary-only", None, None,
         "Search-result summary: the sheriff raised the official toll to 60 after the Review-Journal's reporting."),
    NVIND: ("The Nevada Independent: Sheriff revises shooting timeline and says death toll may rise", "The Nevada Independent", "news-media", "https://thenevadaindependent.com/article/sheriff-revises-shooting-timeline-and-says-death-toll-may-rise", None, "summary-only", None, None,
            "Search-result summary only; October 2017."),
    INQ: ("The Philadelphia Inquirer: Las Vegas police now say there was no six-minute gap between first shots and concert massacre", "The Philadelphia Inquirer", "news-media",
          "https://inquirer.com/philly/news/nation_world/las-vegas-police-now-say-there-was-no-6-minute-gap-between-first-shots-concert-massacre-20171013.html", "2017-10-13", "summary-only", None, None,
          "Headline and search-result summary only."),
    VOA: ("VOA News: Sheriff: Las Vegas gunman fired more than 1,100 rounds", "Voice of America", "news-media", "https://www.voanews.com/a/sheriff-las-vegas-gunman-fired-more-than-1100-rounds/4132724.html", None, "summary-only", None, None,
          "Search-result summary only; publication date not shown."),
    CLICK: ("ClickOnDetroit: Las Vegas police release timeline of events for mass shooting", "ClickOnDetroit", "news-media", "https://clickondetroit.com/news/las-vegas-police-release-timeline-of-events-for-mass-shooting", None, "summary-only", None, None,
            "Search-result summary only; publication date not shown. Gives timeline entries from the LVMPD."),
    WMAR: ("WMAR: Latest release of Las Vegas mass shooting materials contains hours of video, 911 calls", "WMAR", "news-media", "https://www.wmar2news.com/news/las-vegas-shooting/latest-release-of-las-vegas-mass-shooting-materials-contains-hours-of-video-911-calls", None, "summary-only", None, None,
          "Search-result summary: about 30 video files and about 500 911 recordings released on 13 June 2018 after a media lawsuit."),
    ARCH5: ("Internet Archive item: Vegas Shooting Evidence (Batch 5) 911 Calls (518)", "Internet Archive (community upload, credited to LVMPD)", "archive", "https://archive.org/details/LasVegasShooting911Calls", "2018-06-06", "read", "None stated on the item", None,
            "Item metadata read through the Internet Archive metadata API on 2026-10-07; no file downloaded. Uploader account not recorded here."),
    ARCH7: ("Internet Archive item: Vegas Shooting Evidence (Batch 7) 911 Calls (130)", "Internet Archive (community upload, credited to LVMPD)", "archive", "https://archive.org/details/Vegas_Shoooting_Batch_7-911Calls", "2018-06-20", "read", "None stated on the item", None,
            "Item metadata read through the Internet Archive metadata API on 2026-10-07; no file downloaded. Uploader account not recorded here."),
}

# official / press timeline moments: id suffix -> (label, type, ISO clock, precision, basis, findings sources, finding text)
OFFICIAL_MOMENTS = [
    ("first-shots-official", "First shots, as the LVMPD timeline gives them", "first-shots", "2017-10-01T22:05:00-07:00", "minute",
     "The gunman began firing at about 10:05 p.m., as seen on closed-circuit television from the concert venue.", [CLICK, WIKI, LVMPD_CIR], "timeline-entry"),
    ("officers-on-31st-floor", "Two officers on the 31st floor report gunfire coming from above", "response", "2017-10-01T22:12:00-07:00", "minute",
     "At about 10:12 p.m. the first two officers on the 31st floor reported the sound of gunfire directly above them.", [CLICK, WIKI, LVMPD_CIR], "timeline-entry"),
    ("last-shots-official", "Last shots, as the LVMPD timeline gives them", "last-shots", "2017-10-01T22:15:00-07:00", "minute",
     "The last shots were fired at about 10:15 p.m., according to body-worn camera video.", [CLICK, WIKI, LVMPD_CIR], "timeline-entry"),
    ("officers-on-32nd-floor", "The first two officers reach the 32nd floor", "response", "2017-10-01T22:17:00-07:00", "minute",
     "The first two officers reached the 32nd floor at about 10:17 p.m.", [AAR, LVMPD_CIR], "timeline-entry"),
    ("suite-breach", "Strike team breaches the suite", "breach", "2017-10-01T23:20:00-07:00", "minute",
     "At about 11:20 p.m. a strike team made an explosive breach of the suite and entered; the gunman was found dead of a self-inflicted wound.", [AAR, WIKI, LVMPD_CIR], "timeline-entry"),
]

OTHER_FINDINGS = [
    ("rounds-1058", "A total of 1,058 rounds were fired from the suite, according to the Criminal Investigative Report.", "count", "2018-08-03", [WIKI, LVMPD_CIR]),
    ("killed-58", "Fifty-eight people were killed at the venue or died in the days after; the coroner found all died of gunshot wounds.", "count", "2017-12-21", [SUN, AAR]),
    ("fbi-no-single-motive", "The FBI Behavioral Analysis Unit found no single or clear motivating factor, and no manifesto or other communication.", "conclusion", "2019-01-29", [NPR, FBI]),
    ("after-action-response", "The After-Action Report found numerous communication problems and some protocols not followed, and described the response as efficient and coordinated.", "conclusion", "2018-08-24", [AAR]),
]

# claim slug -> dict
CLAIMS = [
    dict(slug="killed-58-as-of-2017-12", title="58 killed (coroner, December 2017)", statement="58 people were killed in the attack; the Clark County Coroner confirmed on 21 December 2017 that all died of gunshot wounds.",
         claim_type="count", figure=58, unit="killed", qualifier="exact", as_of="2017-12-21", as_of_basis="official-count", scope="venue and the days after",
         status="confirmed", note="Two official origins: the coroner and the After-Action Report. Both read from summaries only.", sources=[SUN, AAR], supports=[SUN, AAR]),
    dict(slug="killed-60-as-of-2020-10", title="60 killed (official count, October 2020)", statement="After two women injured on 1 October 2017 died of their injuries (15 November 2019 and 26 May 2020), the LVMPD raised the official death toll to 60, shooter excluded.",
         claim_type="count", figure=60, unit="killed", qualifier="exact", as_of="2020-10-01", as_of_basis="official-count", scope="including two later deaths, shooter excluded",
         status="single-source", note="One origin, the sheriff's announcement, reported by several outlets. Replaces the count of 58; not a contradiction. Wikipedia dates the two additions to the count 24 August and 1 October 2020.", sources=[RJ60, WT, WIKI], supports=[RJ60, WT, WIKI]),
    dict(slug="killed-61-including-gunman", title="61 deaths including the perpetrator (Wikipedia)", statement="Wikipedia's infobox gives 61 deaths 'including the perpetrator'. A court case in 2023 reportedly referred to a further death; that is not carried here.",
         claim_type="count", figure=61, unit="deaths", qualifier="exact", as_of="2026-10-07", as_of_basis="publication-date", scope="including the gunman",
         status="single-source", note="A different counting basis from 60, not a conflict with it.", sources=[WIKI], supports=[WIKI]),
    dict(slug="injured-867", title="About 867 injured, at least 413 by gunshot or shrapnel (Wikipedia)", statement="About 867 people were injured, at least 413 of them with gunshot wounds or shrapnel injuries.",
         claim_type="count", figure=867, unit="injured", qualifier="about", as_of="2026-10-07", as_of_basis="publication-date", scope="all injuries",
         status="single-source", note="", sources=[WIKI], supports=[WIKI]),
    dict(slug="injured-over-850-after-action", title="More than 850 injured (After-Action Report)", statement="The After-Action Report gives more than 850 people injured, including first responders.",
         claim_type="count", figure=850, unit="injured", qualifier="more-than", as_of="2018-08-24", as_of_basis="report-date", scope="including first responders",
         status="single-source", note="From a summary, not read at source.", sources=[AAR], supports=[AAR]),
    dict(slug="rounds-1058", title="1,058 rounds fired (Criminal Investigative Report)", statement="The Criminal Investigative Report counts 1,058 rounds fired in total.",
         claim_type="count", figure=1058, unit="rounds", qualifier="exact", as_of="2018-08-03", as_of_basis="report-date", scope="total",
         status="disputed", note="Other counts: more than 1,100 (sheriff) and more than 900 into the crowd (NYT). The bases differ (total, stated, into the crowd). From a summary, not read at source.", sources=[WIKI, LVMPD_CIR], supports=[WIKI]),
    dict(slug="rounds-over-1100-sheriff", title="More than 1,100 rounds (sheriff)", statement="The sheriff said the gunman fired more than 1,100 rounds.",
         claim_type="count", figure=1100, unit="rounds", qualifier="more-than", as_of=None, as_of_basis="unknown", scope="total",
         status="disputed", note="Publication date not shown in the search result.", sources=[VOA], supports=[VOA]),
    dict(slug="rounds-over-900-nyt", title="More than 900 rounds into the crowd (NYT analysis)", statement="The New York Times counted more than 900 rounds fired into the crowd, from audio across 30 videos.",
         claim_type="count", figure=900, unit="rounds", qualifier="more-than", as_of="2017-10", as_of_basis="publication-date", scope="into the crowd",
         status="disputed", note="Counts only the rounds heard into the crowd.", sources=[CBS_NYT, KNPR_NYT], supports=[CBS_NYT, KNPR_NYT]),
    dict(slug="twelve-bursts", title="Twelve main bursts of gunfire", statement="The gunfire into the crowd came in twelve main bursts (volleys). The NYT identified them from 30 videos; the map numbers volleys 1 to 12.",
         claim_type="sequence", figure=12, unit="bursts", qualifier="exact", as_of="2017-10", as_of_basis="publication-date", scope="into the crowd",
         status="confirmed", note="The NYT and the map agree. The map may follow the NYT numbering, which is not known; the sync check shows the map's own annotations cluster into 12 separate times.", sources=[CBS_NYT, THREAD, MAP], supports=[CBS_NYT, THREAD, MAP]),
    dict(slug="three-gaps-over-a-minute", title="Three intervals of more than a minute between bursts", statement="Between the twelve bursts there were three intervals of more than one minute.",
         claim_type="sequence", figure=3, unit="intervals", qualifier="exact", as_of="2017-10", as_of_basis="publication-date", scope="between bursts",
         status="single-source", note="Checked against the map in sync-check.md.", sources=[THREAD], supports=[THREAD]),
    dict(slug="burst-40s-in-building", title="One burst of about 40 seconds below the gunman's position", statement="A burst of about 40 seconds appears in footage filmed directly below the gunman's position but not in simultaneous festival recordings, which suggests gunfire inside the building. The map's 'down-the-hall' annotations may be the same event; that is not established.",
         claim_type="sequence", figure=40, unit="seconds", qualifier="about", as_of="2017-10-23", as_of_basis="publication-date", scope="inside the hotel",
         status="single-source", note="From the reporter's thread; no clock time is given.", sources=[THREAD], supports=[THREAD]),
    dict(slug="guard-shot-time", title="When the hotel security guard was shot", statement="The NYT analysis places the shooting of the hotel security guard at about 10:06 p.m., one minute into the attack, which differed from the investigators' timeline of the time. The official time is not carried until the reports are read.",
         claim_type="time", figure=None, unit=None, qualifier=None, as_of="2017-10", as_of_basis="publication-date", scope="hotel corridor",
         status="disputed", note="The official timeline was revised more than once in October 2017. From summaries only.", sources=[CBS_NYT, NVIND], supports=[CBS_NYT], disputes=[NVIND]),
    dict(slug="no-six-minute-gap", title="No six-minute gap in the timeline (police, 13 October 2017)", statement="On 13 October 2017 police said there was no six-minute gap between the first shots and the concert shooting (headline of the Philadelphia Inquirer).",
         claim_type="sequence", figure=None, unit=None, qualifier=None, as_of="2017-10-13", as_of_basis="publication-date", scope="official timeline",
         status="single-source", note="Headline wording; the article was not read.", sources=[INQ], supports=[INQ]),
]
# claim relations: (from slug, type, to slug)
CLAIM_LINKS = [
    ("killed-60-as-of-2020-10", "supersedes", "killed-58-as-of-2017-12"),
    ("rounds-over-1100-sheriff", "contradicts", "rounds-over-900-nyt"),
    ("rounds-1058", "contradicts", "rounds-over-1100-sheriff"),
]
