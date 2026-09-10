import type { MetadataField } from "../data/metadata";

/** What a property IS, normalized across the two vocabularies the app carries.
 *
 *  Uwazi's own property types (CEJIL's templates: `multiselect`, `markdown`,
 *  `multidaterange`, …) and the mock record's `MetadataField["type"]`
 *  (`country`, `multiline`, `file-list`, …) describe the same handful of things
 *  in different words. A card that renders a coordinate differently from a
 *  paragraph needs ONE word for each thing, or every consumer learns both
 *  vocabularies and the two drift.
 *
 *  This is deliberately about SHAPE, not about storage: `multidate` and
 *  `multidaterange` are both `dateSpan` because a card draws them the same way,
 *  and `country` is `text` because it is a word. `fieldKind` in
 *  `components/metadata/items.tsx` answers the neighbouring question — how tall
 *  a value renders inside the record — and this does not replace it. */
export type PropertyKind =
  | "text"
  | "long"
  | "select"
  | "chips"
  | "date"
  | "dateSpan"
  | "place"
  | "link"
  | "relationship"
  | "media"
  | "table"
  | "files";

/** Uwazi's raw template property type → the kind a card can render.
 *
 *  `undefined` means "not a property a card has anything to say about":
 *  `preview` and `generatedtoc` configure the viewer, and `image` IS the
 *  thumbnail. Those are the only three; everything else has a kind even where
 *  the card does not yet draw it, because knowing what a value is comes before
 *  deciding whether to show it. */
export function kindOfUwaziType(type: string): PropertyKind | undefined {
  switch (type) {
    case "text":
    case "numeric":
      return "text";
    case "markdown":
      return "long";
    case "select":
      return "select";
    case "multiselect":
      return "chips";
    case "date":
    case "datasection":
      return "date";
    case "multidate":
    case "multidaterange":
      return "dateSpan";
    case "geolocation":
      return "place";
    case "link":
      return "link";
    case "relationship":
      return "relationship";
    case "media":
      return "media";
    case "nested":
      return "table";
    case "preview":
    case "generatedtoc":
    case "image":
      return undefined;
    default:
      return "text";
  }
}

/** The mock record's field type → the same vocabulary. */
export function kindOfFieldType(type: MetadataField["type"]): PropertyKind {
  switch (type) {
    case "date":
      return "date";
    case "link":
      return "link";
    case "multiline":
      return "long";
    case "file-list":
      return "files";
    case "country":
    case "text":
    default:
      return "text";
  }
}
