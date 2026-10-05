// The Best Artworks corpus's two vocabularies, built from its own values: the
// genres (on artworks and artists) and the nationalities. Decision for step
// M5: genres and nationalities are multiselects on these thesauri, so the
// record and the form hold value ids rather than free text.
import type { SettingsThesaurus, ThesaurusValue } from "../settings";
import { artworks, artworkArtists } from "./artworks";

export const ART_GENRES = "art-genres";
export const ART_NATIONALITIES = "art-nationalities";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const genreId = (label: string) => `${ART_GENRES}-${slug(label)}`;
export const nationalityId = (label: string) => `${ART_NATIONALITIES}-${slug(label)}`;

const uniqueSorted = (lists: string[][]) => [...new Set(lists.flat())].sort((a, b) => a.localeCompare(b));

let built: { list: SettingsThesaurus[]; values: Record<string, ThesaurusValue[]> } | null = null;
/** Built on first read, like the template seeds. */
export function artworkThesauri() {
  if (built) return built;
  const genres = uniqueSorted([...artworks.map((w) => w.genres), ...artworkArtists.map((a) => a.genres)]);
  const nationalities = uniqueSorted([...artworks.map((w) => w.nationalities), ...artworkArtists.map((a) => a.nationalities)]);
  built = {
    list: [
      { id: ART_GENRES, name: "Genres", itemCount: genres.length },
      { id: ART_NATIONALITIES, name: "Nationalities", itemCount: nationalities.length },
    ],
    values: {
      [ART_GENRES]: genres.map((label) => ({ id: genreId(label), label })),
      [ART_NATIONALITIES]: nationalities.map((label) => ({ id: nationalityId(label), label })),
    },
  };
  return built;
}
