import { atom } from "jotai";
import { cejilReadyAtom, dataSourceAtom, libraryEntitiesAtom, travesiaReadyAtom } from "./dataSource";
import { usersAtom } from "./users";
import { referencesAtom } from "./references";
import { templatesAtom } from "./templates";
import { languages } from "./languages";
import { uploadsAtom } from "./uploads";
import { getEntityProfile } from "../data/entityProfiles";
import { cejilStats } from "../data/cejil/aggregates";
import { artworkStats } from "../data/artworks/artworks";
import { travesiaCorpus } from "../data/travesia/load";

/** Settings › Dashboard's figures for the collection shown, read from the
 *  stores the rest of Settings and the Library write: users by role (one
 *  account list for every collection), entities as the Library counts them,
 *  relationships, files (entity files plus Uploads) and their size, templates
 *  and installed languages.
 *  A figure the collection does not record is null, never a stand-in zero:
 *  CEJIL's and Travesía's file records carry no sizes. */
export interface DashboardStats {
  users: { total: number; admin: number; editor: number; collaborator: number };
  entities: number;
  relationships: number | null;
  files: number;
  /** Bytes, or null where the files' sizes are not recorded. */
  storage: number | null;
  templates: number;
  languages: number;
}

const UNIT: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
/** "213 KB" → bytes. */
export function parseSize(size: string): number {
  const m = /^([\d.]+)\s*(B|KB|MB|GB)$/i.exec(size.trim());
  return m ? Number(m[1]) * UNIT[m[2].toUpperCase()] : 0;
}
/** Bytes as "12.34 MB", two decimals. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const [v, u] = n >= 1024 ** 3 ? [n / 1024 ** 3, "GB"] : n >= 1024 ** 2 ? [n / 1024 ** 2, "MB"] : [n / 1024, "KB"];
  return `${v.toFixed(2)} ${u}`;
}

export const dashboardStatsAtom = atom<DashboardStats>((get) => {
  const corpus = get(dataSourceAtom);
  const users = get(usersAtom);
  const entities = get(libraryEntitiesAtom);
  // Settings › Uploads' store, so a deleted upload leaves both figures.
  const uploadList = get(uploadsAtom);
  const uploads = { count: uploadList.length, bytes: uploadList.reduce((n, u) => n + u.size, 0) };

  // Entity files: the profiles where the collection has them, CEJIL's count
  // from its import (4,398 profiles would be built for one figure).
  let files = 0;
  let bytes: number | null = 0;
  if (corpus === "cejil") {
    files = cejilStats.files;
    bytes = null;
  } else if (corpus === "artworks") {
    files = artworkStats.artworks;
    bytes = artworkStats.imageBytes;
  } else {
    for (const e of entities) {
      const list = getEntityProfile(e.id).files ?? [];
      files += list.length;
      if (bytes !== null) for (const f of list) bytes += parseSize(f.size);
    }
    if (corpus === "travesia") bytes = null;
  }

  const relationships =
    corpus === "mock"
      ? get(referencesAtom).length
      : corpus === "cejil"
        ? cejilStats.relationships
        : corpus === "artworks"
          ? artworkStats.artworks // each artwork links its artist
          : get(travesiaReadyAtom)
            ? (travesiaCorpus()?.relationships.length ?? null)
            : null;

  return {
    users: {
      total: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      editor: users.filter((u) => u.role === "editor").length,
      collaborator: users.filter((u) => u.role === "collaborator").length,
    },
    // CEJIL's records (26 MB) load only where a usage count needs them; until
    // then its import count is the Library's total.
    entities: corpus === "cejil" && !get(cejilReadyAtom) ? cejilStats.entities : entities.length,
    relationships,
    files: files + uploads.count,
    storage: bytes === null ? null : bytes + uploads.bytes,
    templates: get(templatesAtom(corpus)).length,
    languages: get(languages.listOfAtom(corpus)).length,
  };
});
