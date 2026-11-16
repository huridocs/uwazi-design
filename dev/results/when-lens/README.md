# When view + Sample showcase seed + CEJIL default

Branch `design/when-lens` from playground 962922e5 (not pushed):
- 02dfe04e Sample seed: v4 showcase hubs, fields, derived Judges and real dates
- f0c20c5b CEJIL: the collection opens on Blake
- b8350b8a Entity dates: datesOf() for the When view, with tests (`npm run check:dates`)
- d0ee17f7 TimeSpine: rows may carry a span end
- c8bffa85 Relationships: a When view — the connections laid on time
- ebbb2196 When view: isolate the mixed-script runs under RTL

## Screens

| File | What |
|---|---|
| when-blake-light / -dark | Blake (CEJIL) When view: 14 dated events, 1993–2014, desktop |
| when-latablada-light / -dark | La Tablada (Sample) When view: 26 dated events, 1948–2011 |
| when-latablada-year-light | Year strip range 1989–1997: 12 events, own events kept |
| when-blake-mobile-light, when-latablada-mobile-dark | 390px |
| when-court-aggregate-light | Corte IDH: 2,231 events, per-year rows instead of the spine |
| when-overlay-light | When inside the entity preview panel; the host stays on List |
| when-latablada-rtl-light | Arabic reading language (RTL) |
| seed-e3-relationships-light | La Tablada's relationships with the seed: Victim 4, Petitioner 2, Respondent State, Judgment, No label |
| seed-e3-metadata-light | La Tablada's record: Victims, Petitioners, Respondent State, Judgments, and the derived Judges × nationality table |
| cejil-landing-light, cejil-landing-bert-light | CEJIL landing (Library); Bert's context shows the focused entity is Blake |
