# Official documents to download by hand

LVMPD's server answers 403 to automated requests, so these have to be saved from a browser. Save each file
into this folder (`dev/results/vegas-seed/raw/official/`) under the file name given. Do not rename or edit them.
Written 2026-10-07. The addresses come from search results and Wikipedia; open them in a browser and check that
the title page matches.

| Save as | Document | Address |
|---|---|---|
| `lvmpd-criminal-investigative-report-2018-08-03.pdf` | LVMPD Criminal Investigative Report, 1 October Mass Casualty Shooting (released 3 Aug 2018; over 10 MB) | https://www.lvmpd.com/home/showpublisheddocument/134/638298568313170000 |
| `lvmpd-preliminary-investigative-report-2018-01-18.pdf` | LVMPD Preliminary Investigative Report (FIT report, 81 pages, 18 Jan 2018) | https://www.lvmpd.com/en-us/Documents/1_October_FIT_Report_01-18-2018_Footnoted.pdf |
| `after-action-report-2018-08-24.pdf` | 1 October After-Action Report (Clark County Fire Department, LVMPD, FEMA National Exercise Division; 24 Aug 2018) | https://www.policinginstitute.org/wp-content/uploads/2018/09/1OctoberAfterActionReport.pdf |
| `fbi-bau-report-2019-01.pdf` | FBI Behavioral Analysis Unit report, three pages (released 29 Jan 2019) | No address found in phase 1. Search the FBI Vault (vault.fbi.gov) or fbi.gov for "Las Vegas" "Behavioral Analysis Unit". NPR's coverage: https://www.npr.org/2019/01/29/689760960/fbi-analysis-of-las-vegas-shooting-ends-without-a-clear-motive-identified |

Mirrors, if the LVMPD address stays blocked (check that the mirror is the whole, unaltered report):

| Document | Mirror |
|---|---|
| Criminal Investigative Report | https://dig.abclocal.go.com/wls/documents/2018/080318-wls-iteam-vegas-report-doc.pdf ; page: https://publicintelligence.net/lvmpd-route-91-shooting-final-report/ |
| Preliminary Investigative Report | https://www.workingwithcrowds.com/wp-content/uploads/2018/01/Las-Vegas-Police-Report-on-Oct-1.pdf |

## What to take from them (phase 3, once the files are here)

1. The timeline entries with clock times to the second, if the report gives them: first shots, the volleys if listed, the guard, the first officers on the 31st and 32nd floors, last shots, the breach. Replace the five `finding:*` and `moment:*` official entries (now "from summary") and set `read_status` to `read`.
2. The round counts and how they are defined (total, per weapon is not needed), and the injured count with its basis.
3. Any statement on how video and audio times were synchronised or on camera clock error, to compare with `data/sync-check.md`.
4. Page numbers for every quote, for `finding.page` and the reference anchors.
5. Whether the report names the time the hotel security guard was shot; update `claim:guard-shot-time`.

Names of victims, officers and the gunman in these documents are not copied into the seed.
