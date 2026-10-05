import type { LatLng } from "../data/geo";

/** A coordinate written the way a coordinate is written: degrees, minutes and
 *  seconds, with a hemisphere letter.
 *
 *  `13.68935, -89.18718` is a number ABOUT a place; `13° 41' 22" N, 89° 11' 14" W`
 *  is the place. Uwazi's own product prints the second, and on a card — where
 *  there is room for one line and the reader is scanning — the difference is
 *  whether the row reads as data or as a location. Decimal degrees stay the
 *  storage format; this is only for display.
 *
 *  Seconds are whole. A second of latitude is ~31m, which is finer than any of
 *  this corpus's coordinates are actually known to, and a decimal place on the
 *  seconds would be a precision the record does not have. */
export function formatDMS({ lat, lng }: LatLng): string {
  return `${dms(lat, "N", "S")}, ${dms(lng, "E", "W")}`;
}

function dms(value: number, positive: string, negative: string): string {
  const hemisphere = value < 0 ? negative : positive;
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.floor((abs - deg) * 60);
  let sec = Math.round(((abs - deg) * 60 - min) * 60);
  // Rounding seconds can carry: 41' 59.7" is 42' 00", not 41' 60".
  if (sec === 60) {
    sec = 0;
    min += 1;
  }
  if (min === 60) {
    min = 0;
    deg += 1;
  }
  return `${deg}° ${min}' ${sec}" ${hemisphere}`;
}

/** The card's place row: the coordinate, named where the name adds something.
 *
 *  A standalone Geolocalización record's TITLE is already the place, so naming
 *  it again in its own property row would print "Colindres" twice on one card.
 *  A Causa that reached its coordinate through a connection has no such title,
 *  and the name is most of what the row is worth — that is the case the colon
 *  form is for. */
export function formatPlace(coords: LatLng, placeName?: string): string {
  const dmsText = formatDMS(coords);
  return placeName ? `${placeName}: ${dmsText}` : dmsText;
}
